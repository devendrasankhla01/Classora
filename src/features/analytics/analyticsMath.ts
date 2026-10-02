/**
 * Analytics maths.
 *
 * Everything here is derived from real attendance records: no chart point is
 * fabricated. Weeks with no conducted classes are skipped rather than plotted
 * as zero, so the trajectory never lies about a gap in the timetable.
 */
import {
  attendanceWeight,
  isCountable,
  percentageOf,
  roundPercent,
  type AttendanceHealth,
} from '@/lib/attendance';
import { addDaysToKey, dateKeyRange, daysBetween, todayKey, weekRange } from '@/lib/date';
import type { AttendanceRecord, ClassOccurrence, DateKey, Subject } from '@/types/domain';

export type AnalyticsPeriod = 'month' | 'last30' | 'semester';

export function periodRange(
  period: AnalyticsPeriod,
  today: DateKey,
  semester?: { startDate: DateKey; endDate: DateKey },
): { from: DateKey; to: DateKey } {
  if (period === 'month') {
    const [year, month] = today.split('-');
    const first = `${year}-${month}-01`;
    return { from: first, to: today };
  }
  if (period === 'last30') {
    return { from: addDaysToKey(today, -29), to: today };
  }
  return {
    from: semester?.startDate ?? addDaysToKey(today, -120),
    to: semester?.endDate && semester.endDate < today ? semester.endDate : today,
  };
}

export interface WeeklyReport {
  weekStart: DateKey;
  weekEnd: DateKey;
  attended: number;
  conducted: number;
  presenceRate: number | null;
  consistency: number;
  stabilityLabel: string;
  nextClassLabel: string | null;
}

/** How many past decisions the student has actually made, as a percentage. */
function consistencyOf(occurrences: ClassOccurrence[], attendance: AttendanceRecord[], today: DateKey): number {
  const marked = new Set(attendance.map((record) => record.occurrenceId));
  let required = 0;
  let made = 0;

  for (const occurrence of occurrences) {
    if (occurrence.date >= today) continue;
    if (occurrence.scheduleStatus === 'replaced') continue;
    required += 1;
    if (!isCountable(occurrence) || marked.has(occurrence.id)) made += 1;
  }

  return required > 0 ? Math.round((made / required) * 100) : 100;
}

export function buildWeeklyReport(
  occurrences: ClassOccurrence[],
  attendance: AttendanceRecord[],
  subjects: Subject[],
  today: DateKey,
): WeeklyReport {
  const subjectMap = new Map(subjects.map((subject) => [subject.id, subject]));
  const { start, end } = weekRange(new Date(`${today}T00:00:00`));
  const from = todayKey(start);
  const to = todayKey(end);

  let attended = 0;
  let conducted = 0;

  for (const occurrence of occurrences) {
    if (occurrence.date < from || occurrence.date > to) continue;
    if (!isCountable(occurrence)) continue;
    const record = attendance.find((item) => item.occurrenceId === occurrence.id);
    if (!record) continue;

    const subject = subjectMap.get(occurrence.subjectId);
    const weight = subject ? attendanceWeight(subject, occurrence) : Math.max(1, occurrence.periodCount);
    conducted += weight;
    if (record.status === 'present') attended += weight;
  }

  const consistency = consistencyOf(occurrences, attendance, today);
  const upcoming = occurrences
    .filter((occurrence) => occurrence.date > today && isCountable(occurrence))
    .sort((a, b) => a.startDateTime.localeCompare(b.startDateTime))[0];

  const nextSubject = upcoming ? subjectMap.get(upcoming.subjectId) : null;

  return {
    weekStart: from,
    weekEnd: to,
    attended,
    conducted,
    presenceRate: percentageOf(attended, conducted),
    consistency,
    stabilityLabel:
      consistency >= 90 ? 'High Stability' : consistency >= 75 ? 'Moderate Stability' : 'Needs attention',
    nextClassLabel:
      upcoming && nextSubject
        ? `Next class is ${nextSubject.shortName} on ${upcoming.date} at ${upcoming.startTime}`
        : null,
  };
}

export interface TrajectoryPoint {
  label: string;
  weekStart: DateKey;
  /** Moving-average attendance at this point. */
  percentage: number;
  /** Raw attendance up to this week, for the tooltip. */
  raw: number | null;
  value: number;
}

export interface Trajectory {
  points: TrajectoryPoint[];
  windowSize: number;
  domain: [number, number];
}

/**
 * Attendance trajectory: a moving average over the last N weeks of *real*
 * marked classes, with the target drawn as a reference line.
 */
export function buildTrajectory(
  occurrences: ClassOccurrence[],
  attendance: AttendanceRecord[],
  subjects: Subject[],
  range: { from: DateKey; to: DateKey },
  target: number,
  windowSize = 5,
): Trajectory {
  const subjectMap = new Map(subjects.map((subject) => [subject.id, subject]));
  const markedOccurrences = occurrences
    .filter((occurrence) => occurrence.date >= range.from && occurrence.date <= range.to && isCountable(occurrence))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (markedOccurrences.length === 0) {
    return { points: [], windowSize, domain: [0, 100] };
  }

  // Weekly buckets keyed by the Monday of that week.
  const buckets = new Map<DateKey, { attended: number; conducted: number }>();
  for (const occurrence of markedOccurrences) {
    const weekStart = todayKey(weekRange(new Date(`${occurrence.date}T00:00:00`)).start);
    const bucket = buckets.get(weekStart) ?? { attended: 0, conducted: 0 };
    const record = attendance.find((item) => item.occurrenceId === occurrence.id);
    if (record) {
      const subject = subjectMap.get(occurrence.subjectId);
      const weight = subject
        ? attendanceWeight(subject, occurrence)
        : Math.max(1, occurrence.periodCount);
      bucket.conducted += weight;
      if (record.status === 'present') bucket.attended += weight;
    }
    buckets.set(weekStart, bucket);
  }

  const orderedWeeks = [...buckets.keys()].sort();
  const points: TrajectoryPoint[] = [];
  let cumulativeAttended = 0;
  let cumulativeConducted = 0;

  orderedWeeks.forEach((weekStart, index) => {
    const bucket = buckets.get(weekStart)!;
    cumulativeAttended += bucket.attended;
    cumulativeConducted += bucket.conducted;

    const windowStart = Math.max(0, index - windowSize + 1);
    let windowAttended = 0;
    let windowConducted = 0;
    for (let cursor = windowStart; cursor <= index; cursor += 1) {
      const week = orderedWeeks[cursor]!;
      const entry = buckets.get(week)!;
      windowAttended += entry.attended;
      windowConducted += entry.conducted;
    }

    const windowPercentage = percentageOf(windowAttended, windowConducted);
    if (windowPercentage === null) return;

    const isLast = index === orderedWeeks.length - 1;
    points.push({
      label: isLast ? `Wk ${index + 1} (Now)` : `Wk ${index + 1}`,
      weekStart,
      percentage: roundPercent(windowPercentage, 1),
      raw: percentageOf(cumulativeAttended, cumulativeConducted),
      value: windowPercentage,
    });
  });

  const values = points.map((point) => point.percentage);
  const lowest = Math.min(...values, target);
  const highest = Math.max(...values, target);
  const padding = Math.max(3, (highest - lowest) * 0.35);

  return {
    points,
    windowSize,
    domain: [Math.max(0, Math.floor(lowest - padding)), Math.min(100, Math.ceil(highest + padding))],
  };
}

export interface MonthlyComparison {
  current: number | null;
  previous: number | null;
  delta: number | null;
}

/** Current month attendance vs the previous month, from real records. */
export function buildMonthlyComparison(
  occurrences: ClassOccurrence[],
  attendance: AttendanceRecord[],
  subjects: Subject[],
  today: DateKey,
): MonthlyComparison {
  const subjectMap = new Map(subjects.map((subject) => [subject.id, subject]));
  const [yearString, monthString] = today.split('-');
  const year = Number(yearString);
  const month = Number(monthString);

  const previousDate = new Date(year, month - 2, 1);
  const previousPrefix = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}`;
  const currentPrefix = `${yearString}-${monthString}`;

  const tally = (prefix: string) => {
    let attended = 0;
    let conducted = 0;
    for (const occurrence of occurrences) {
      if (!occurrence.date.startsWith(prefix)) continue;
      if (!isCountable(occurrence)) continue;
      const record = attendance.find((item) => item.occurrenceId === occurrence.id);
      if (!record) continue;
      const subject = subjectMap.get(occurrence.subjectId);
      const weight = subject ? attendanceWeight(subject, occurrence) : Math.max(1, occurrence.periodCount);
      conducted += weight;
      if (record.status === 'present') attended += weight;
    }
    return percentageOf(attended, conducted);
  };

  const current = tally(currentPrefix);
  const previous = tally(previousPrefix);

  return {
    current,
    previous,
    delta: current !== null && previous !== null ? roundPercent(current - previous, 1) : null,
  };
}

/* ------------------------------------------------------------------ *
 * Calendar heatmap                                                    *
 * ------------------------------------------------------------------ */

export interface HeatmapDay {
  date: DateKey;
  classes: number;
  present: number;
  absent: number;
  cancelled: number;
  unmarked: number;
  health: AttendanceHealth | 'empty' | 'future' | 'holiday';
}

export function buildHeatmap(
  occurrences: ClassOccurrence[],
  attendance: AttendanceRecord[],
  from: DateKey,
  to: DateKey,
  today: DateKey = todayKey(),
): HeatmapDay[] {
  const byDate = new Map<DateKey, ClassOccurrence[]>();
  for (const occurrence of occurrences) {
    if (occurrence.date < from || occurrence.date > to) continue;
    const bucket = byDate.get(occurrence.date) ?? [];
    bucket.push(occurrence);
    byDate.set(occurrence.date, bucket);
  }

  return dateKeyRange(from, to).map((date) => {
    const dayOccurrences = byDate.get(date) ?? [];
    const records = attendance.filter((record) => record.date === date);

    const cancelled = dayOccurrences.filter(
      (occurrence) => occurrence.scheduleStatus === 'cancelled' || occurrence.scheduleStatus === 'not_conducted',
    ).length;
    const holiday = dayOccurrences.some((occurrence) => occurrence.scheduleStatus === 'holiday');
    const present = records.filter((record) => record.status === 'present').length;
    const absent = records.filter((record) => record.status === 'absent').length;
    const countable = dayOccurrences.filter(
      (occurrence) => isCountable(occurrence) && occurrence.scheduleStatus !== 'holiday',
    ).length;
    const unmarked = Math.max(0, countable - present - absent);

    let health: HeatmapDay['health'] = 'empty';
    if (date > today) health = 'future';
    else if (holiday) health = 'holiday';
    else if (countable === 0) health = 'empty';
    else if (absent === 0 && present > 0) health = 'safe';
    else if (absent > 0 && present > 0) health = 'warning';
    else if (absent > 0) health = 'critical';

    return {
      date,
      classes: countable,
      present,
      absent,
      cancelled,
      unmarked,
      health,
    };
  });
}

export { daysBetween };
