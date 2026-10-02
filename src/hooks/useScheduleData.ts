/**
 * Derived schedule data.
 *
 * Everything here is computed from the store with the pure attendance and
 * schedule engines — no metric is ever hardcoded in a component.
 */
import { useEffect, useMemo, useState } from 'react';

import { useClassora } from '@/app/store';
import {
  aggregate,
  attendanceWeight,
  classifyAttendance,
  isCountable,
  recoveryForecast,
  recoveryPlan,
  safeMisses as computeSafeMisses,
  type AggregateStats,
  type AttendanceSummary,
  type RecoveryForecast,
  type SimulationContext,
} from '@/lib/attendance';
import { toLocalDateTime, todayKey } from '@/lib/date';
import type { ClassOccurrence, DateKey, Subject } from '@/types/domain';

/** Re-renders on an interval so countdowns stay live without a global timer. */
export function useTick(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}

export interface SubjectInsight {
  subject: Subject;
  summary: AttendanceSummary;
  target: number;
  safeMisses: number;
  recovery: ReturnType<typeof recoveryPlan>;
  upcoming: ClassOccurrence[];
  status: ReturnType<typeof classifyAttendance>;
}

/** Occurrences that still matter for the future: countable and not yet over. */
export function isUpcoming(occurrence: ClassOccurrence, now: Date): boolean {
  return (
    isCountable(occurrence) &&
    new Date(occurrence.endDateTime).getTime() > now.getTime()
  );
}

export function useNow(): Date {
  return useTick(20_000);
}

export function useTodayOccurrences(): ClassOccurrence[] {
  const occurrences = useClassora((state) => state.occurrences);
  const today = todayKey();
  return useMemo(
    () =>
      occurrences
        .filter((occurrence) => occurrence.date === today)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [occurrences, today],
  );
}

export interface NextClassInfo {
  occurrence: ClassOccurrence | null;
  subject: Subject | null;
  state: 'in_progress' | 'upcoming' | 'none';
  /** Seconds until the class starts (0 while in progress). */
  secondsUntilStart: number;
  /** 0–100 progress through the interval (used by "80% passed"). */
  intervalProgress: number | null;
  /** Position of this class within today's running order. */
  indexInDay: number;
  dayCount: number;
  isToday: boolean;
}

/**
 * The next valid class after "now": ignores cancelled, holiday, not-conducted
 * and replaced-original classes. Shows the in-progress class when one is live.
 */
export function useNextClass(): NextClassInfo {
  const occurrences = useClassora((state) => state.occurrences);
  const subjects = useClassora((state) => state.subjects);
  const now = useNow();

  return useMemo(() => {
    const valid = occurrences
      .filter(isCountable)
      .sort((a, b) => a.startDateTime.localeCompare(b.startDateTime));

    const inProgress = valid.find(
      (occurrence) =>
        new Date(occurrence.startDateTime).getTime() <= now.getTime() &&
        new Date(occurrence.endDateTime).getTime() > now.getTime(),
    );

    const next =
      inProgress ??
      valid.find((occurrence) => new Date(occurrence.startDateTime).getTime() > now.getTime()) ??
      null;

    if (!next) {
      return {
        occurrence: null,
        subject: null,
        state: 'none' as const,
        secondsUntilStart: 0,
        intervalProgress: null,
        indexInDay: 0,
        dayCount: 0,
        isToday: false,
      };
    }

    const start = new Date(next.startDateTime).getTime();
    const end = new Date(next.endDateTime).getTime();
    const current = now.getTime();
    const isLive = current >= start && current < end;
    const dayOfClass = next.date;
    const dayOccurrences = valid.filter(
      (occurrence) => occurrence.date === dayOfClass && isCountable(occurrence),
    );
    const indexInDay = dayOccurrences.findIndex((occurrence) => occurrence.id === next.id) + 1;

    return {
      occurrence: next,
      subject: subjects.find((subject) => subject.id === next.subjectId) ?? null,
      state: isLive ? ('in_progress' as const) : ('upcoming' as const),
      secondsUntilStart: isLive ? 0 : Math.max(0, Math.round((start - current) / 1000)),
      intervalProgress: isLive ? Math.min(100, Math.max(0, ((current - start) / (end - start)) * 100)) : null,
      indexInDay: Math.max(1, indexInDay),
      dayCount: dayOccurrences.length,
      isToday: dayOfClass === todayKey(),
    };
  }, [occurrences, subjects, now]);
}

/** Full per-subject insights (attendance, safe misses, recovery, upcoming). */
export function useSubjectInsights(): SubjectInsight[] {
  const summaries = useClassora((state) => state.summaries);
  const subjects = useClassora((state) => state.subjects);
  const occurrences = useClassora((state) => state.occurrences);
  const profile = useClassora((state) => state.profile);
  const now = useNow();

  return useMemo(() => {
    const target = profile?.attendanceTarget ?? 75;
    const rows = summaries();

    return rows.map(({ subject, summary }) => {
      const subjectTarget = subject.targetPercentage ?? target;
      const upcoming = occurrences
        .filter((occurrence) => occurrence.subjectId === subject.id && isUpcoming(occurrence, now))
        .sort((a, b) => a.startDateTime.localeCompare(b.startDateTime));

      const upcomingWeights = upcoming.map((occurrence) => attendanceWeight(subject, occurrence));
      const context: SimulationContext = { summary, target: subjectTarget, upcomingWeights };

      return {
        subject,
        summary,
        target: subjectTarget,
        safeMisses: computeSafeMisses(context),
        recovery: recoveryPlan(context),
        upcoming,
        status: classifyAttendance(summary.percentage, subjectTarget, computeSafeMisses(context)),
      };
    });
  }, [summaries, subjects, occurrences, profile, now]);
}

export function useAggregateStats(): AggregateStats & { confidence: number } {
  const summaries = useClassora((state) => state.summaries);
  const profile = useClassora((state) => state.profile);
  const confidence = useClassora((state) => state.confidence);

  return useMemo(() => {
    const target = profile?.attendanceTarget ?? 75;
    const stats = aggregate(
      summaries().map((row) => row.summary),
      target,
    );
    return { ...stats, confidence: confidence() };
  }, [summaries, profile, confidence]);
}

/**
 * How many more classes the student can miss across every subject while each
 * one stays above its own target — simulated per subject, never a formula.
 */
export function useSafeMissTotal(): number {
  const insights = useSubjectInsights();
  return useMemo(
    () => insights.reduce((total, insight) => total + insight.safeMisses, 0),
    [insights],
  );
}

/** Aggregate + confidence for a specific set of subjects (used by filters). */
export function useConfidence(): { percent: number; missingClasses: number } {
  const occurrences = useClassora((state) => state.occurrences);
  const attendance = useClassora((state) => state.attendance);

  return useMemo(() => {
    const today = todayKey();
    let required = 0;
    let made = 0;
    let missing = 0;
    const marked = new Set(attendance.map((record) => record.occurrenceId));

    for (const occurrence of occurrences) {
      if (occurrence.date >= today) continue;
      if (occurrence.scheduleStatus === 'replaced') continue;
      if (!isCountable(occurrence)) {
        required += 1;
        made += 1;
        continue;
      }
      required += 1;
      if (marked.has(occurrence.id)) made += 1;
      else missing += 1;
    }

    return { percent: required > 0 ? Math.round((made / required) * 100) : 100, missingClasses: missing };
  }, [occurrences, attendance]);
}

/** Past classes that still need an attendance decision. */
export function useMissingAttendance(): ClassOccurrence[] {
  const occurrences = useClassora((state) => state.occurrences);
  const attendance = useClassora((state) => state.attendance);
  const now = useNow();

  return useMemo(() => {
    const marked = new Set(attendance.map((record) => record.occurrenceId));
    const today = todayKey();

    return occurrences
      .filter((occurrence) => {
        if (!isCountable(occurrence)) return false;
        if (marked.has(occurrence.id)) return false;
        // Only classes that have already finished.
        return new Date(occurrence.endDateTime).getTime() < now.getTime() && occurrence.date <= today;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || a.startTime.localeCompare(b.startTime));
  }, [occurrences, attendance, now]);
}

/** Recovery date forecast for a subject (ignores holidays/cancellations). */
export function useRecoveryForecast(subjectId: string | null): RecoveryForecast | null {
  const insights = useSubjectInsights();

  return useMemo(() => {
    if (!subjectId) return null;
    const insight = insights.find((item) => item.subject.id === subjectId);
    if (!insight) return null;

    const upcoming = insight.upcoming.map((occurrence) => ({
      date: occurrence.date,
      weight: attendanceWeight(insight.subject, occurrence),
    }));

    return recoveryForecast(
      {
        summary: insight.summary,
        target: insight.target,
        upcomingWeights: upcoming.map((item) => item.weight),
      },
      upcoming,
    );
  }, [insights, subjectId]);
}

/** Weekday buckets for the weekly timetable view. */
export function useWeekSlots(): Map<number, ClassOccurrence[]> {
  const occurrences = useClassora((state) => state.occurrences);
  const now = useNow();
  const today = todayKey();

  return useMemo(() => {
    const anchor = toLocalDateTime(today, '00:00');
    const monday = new Date(anchor);
    monday.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7));

    const buckets = new Map<number, ClassOccurrence[]>();
    for (let index = 0; index < 6; index += 1) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const key = todayKey(date);
      buckets.set(
        index + 1,
        occurrences
          .filter((occurrence) => occurrence.date === key && occurrence.scheduleStatus !== 'holiday')
          .sort((a, b) => a.startTime.localeCompare(b.startTime)),
      );
    }
    void now;
    return buckets;
  }, [occurrences, today, now]);
}

export type { DateKey };
