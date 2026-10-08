/**
 * Notification generation.
 *
 * Alerts are *derived from real state* — unmarked classes, subjects running out
 * of buffer, timetable edits and working Saturdays — never invented, and never
 * duplicated. Ids are deterministic (`notif:<kind>:<anchor>`), so re-running the
 * generator is idempotent: the same situation produces the same id, and the
 * store simply keeps the existing row.
 */
import { addDaysToKey, todayKey } from '@/lib/date';
import { attendanceWeight, countSafeMisses, isCountable, isPast } from '@/lib/attendance';
import type {
  AppNotification,
  AttendanceRecord,
  CalendarOverride,
  ClassOccurrence,
  DateKey,
  Profile,
  Subject,
} from '@/types/domain';

export interface NotificationInput {
  occurrences: readonly ClassOccurrence[];
  attendance: readonly AttendanceRecord[];
  subjects: readonly Subject[];
  overrides: readonly CalendarOverride[];
  profile: Pick<Profile, 'attendanceTarget' | 'safeMarginAlertClasses'> | null;
  /** Local date key; injected so the generator stays testable. */
  today: DateKey;
  now: Date;
}

export type DraftNotification = Omit<AppNotification, 'id' | 'createdAt'> & { id: string };

const MAX_PER_KIND = 6;

export function buildNotifications(input: NotificationInput): DraftNotification[] {
  const { occurrences, attendance, subjects, overrides, profile, today, now } = input;
  const target = profile?.attendanceTarget ?? 85;
  const drafts: DraftNotification[] = [];

  const markedOccurrenceIds = new Set(attendance.map((record) => record.occurrenceId));
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));

  /* ---------------------------------------------------------------- *
   * 1. After-class reminder — today's finished but unmarked classes  *
   * ---------------------------------------------------------------- */
  const finishedToday = occurrences
    .filter(
      (occurrence) =>
        occurrence.date === today &&
        isCountable(occurrence) &&
        isPast(occurrence, now) &&
        !markedOccurrenceIds.has(occurrence.id),
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (finishedToday.length > 0) {
    const names = finishedToday
      .map((occurrence) => subjectById.get(occurrence.subjectId)?.shortName)
      .filter((name): name is string => Boolean(name));

    drafts.push({
      id: `notif:after_class:${today}`,
      userId: '',
      kind: 'after_class',
      title:
        finishedToday.length === 1
          ? `${names[0] ?? 'Your class'} needs marking`
          : `${finishedToday.length} classes need marking`,
      body:
        names.length > 1
          ? `${names.join(', ')} finished today. Marking them keeps every projection accurate.`
          : 'That class has finished. Mark it so your attendance stays accurate.',
      date: today,
      occurrenceIds: finishedToday.map((occurrence) => occurrence.id),
      readAt: null,
    });
  }

  /* ---------------------------------------------------------------- *
   * 2. Missing attendance — older unresolved days                    *
   * ---------------------------------------------------------------- */
  const unresolvedByDate = new Map<DateKey, ClassOccurrence[]>();
  for (const occurrence of occurrences) {
    if (occurrence.date >= today) continue;
    if (!isCountable(occurrence)) continue;
    if (markedOccurrenceIds.has(occurrence.id)) continue;
    const bucket = unresolvedByDate.get(occurrence.date) ?? [];
    bucket.push(occurrence);
    unresolvedByDate.set(occurrence.date, bucket);
  }

  const oldestFirst = [...unresolvedByDate.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [date, items] of oldestFirst.slice(0, MAX_PER_KIND)) {
    drafts.push({
      id: `notif:missing:${date}`,
      userId: '',
      kind: 'missing_attendance',
      title:
        items.length === 1
          ? `${subjectById.get(items[0]!.subjectId)?.shortName ?? 'A class'} on ${date} is unmarked`
          : `${items.length} classes on ${date} are unmarked`,
      body: 'Unresolved classes are excluded from your percentage rather than guessed. Mark them to sharpen your data confidence.',
      date,
      occurrenceIds: items.map((item) => item.id),
      readAt: null,
    });
  }

  /* ---------------------------------------------------------------- *
   * 3. Attendance risk — subjects with no buffer left                *
   * ---------------------------------------------------------------- */
  for (const subject of subjects) {
    if (subject.archived) continue;

    let attended = 0;
    let conducted = 0;
    for (const occurrence of occurrences) {
      if (occurrence.subjectId !== subject.id) continue;
      if (!isCountable(occurrence)) continue;
      const record = attendance.find((item) => item.occurrenceId === occurrence.id);
      if (!record) continue;
      const weight = record.weight || attendanceWeight(subject, occurrence);
      conducted += weight;
      if (record.status === 'present') attended += weight;
    }

    if (conducted === 0) continue;
    const percentage = (attended / conducted) * 100;
    const subjectTarget = subject.targetPercentage ?? target;

    const upcomingWeights = occurrences
      .filter(
        (occurrence) =>
          occurrence.subjectId === subject.id &&
          occurrence.date >= today &&
          isCountable(occurrence),
      )
      .sort((a, b) => a.startDateTime.localeCompare(b.startDateTime))
      .map((occurrence) => attendanceWeight(subject, occurrence));

    const safeMisses = countSafeMisses({ attended, conducted }, upcomingWeights, subjectTarget);
    const alertBand = profile?.safeMarginAlertClasses ?? 3;
    // A buffer warning only means something when classes remain in the semester;
    // otherwise it would fire on every healthy subject during the holidays.
    const bufferLow = upcomingWeights.length > 0 && safeMisses < alertBand;

    if (percentage < subjectTarget || bufferLow) {
      const belowNow = percentage < subjectTarget;
      drafts.push({
        id: `notif:risk:${subject.id}:${weekAnchor(today)}`,
        userId: '',
        kind: 'risk',
        title: belowNow
          ? `${subject.shortName} is below target`
          : `${subject.shortName} has little buffer left`,
        body: belowNow
          ? `${percentage.toFixed(1)}% against a ${subjectTarget}% target — ${Math.max(0, upcomingWeights.length)} upcoming classes remain to recover.`
          : `Only ${safeMisses} safe ${safeMisses === 1 ? 'miss' : 'misses'} left before ${subject.shortName} drops below ${subjectTarget}%.`,
        date: today,
        occurrenceIds: [subject.id],
        readAt: null,
      });
    }
  }

  /* ---------------------------------------------------------------- *
   * 4. Timetable changes — cancellations, replacements, extras       *
   * ---------------------------------------------------------------- */
  const changedByDate = new Map<DateKey, ClassOccurrence[]>();
  for (const occurrence of occurrences) {
    if (occurrence.date < addDaysToKey(today, -7)) continue;
    const isChange =
      occurrence.occurrenceType === 'extra' ||
      occurrence.occurrenceType === 'replacement' ||
      occurrence.scheduleStatus === 'cancelled' ||
      occurrence.scheduleStatus === 'not_conducted' ||
      occurrence.scheduleStatus === 'replaced';
    if (!isChange) continue;
    const bucket = changedByDate.get(occurrence.date) ?? [];
    bucket.push(occurrence);
    changedByDate.set(occurrence.date, bucket);
  }

  for (const [date, items] of [...changedByDate.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, MAX_PER_KIND)) {
    const cancelled = items.filter(
      (item) => item.scheduleStatus === 'cancelled' || item.scheduleStatus === 'not_conducted',
    ).length;
    const extras = items.filter((item) => item.occurrenceType === 'extra').length;
    const replaced = items.filter((item) => item.occurrenceType === 'replacement').length;

    const parts = [
      cancelled > 0 ? `${cancelled} cancelled` : null,
      replaced > 0 ? `${replaced} replaced` : null,
      extras > 0 ? `${extras} extra` : null,
    ].filter((part): part is string => Boolean(part));

    drafts.push({
      id: `notif:change:${date}`,
      userId: '',
      kind: 'timetable_change',
      title: `Timetable changed on ${date}`,
      body: `${parts.join(' · ')}. Open the timetable to see what it means for your day.`,
      date,
      occurrenceIds: items.map((item) => item.id),
      readAt: null,
    });
  }

  /* ---------------------------------------------------------------- *
   * 5. Working Saturday — a short heads-up                           *
   * ---------------------------------------------------------------- */
  for (const override of overrides) {
    if (override.kind !== 'working_saturday') continue;
    const leadDays = daysUntil(today, override.date);
    if (leadDays < 0 || leadDays > 3) continue;

    drafts.push({
      id: `notif:working_saturday:${override.date}`,
      userId: '',
      kind: 'working_saturday',
      title:
        leadDays === 0
          ? 'Working Saturday today'
          : `Working Saturday in ${leadDays} ${leadDays === 1 ? 'day' : 'days'}`,
      body:
        override.followDayOfWeek !== null
          ? `${override.label ?? 'Classes run'} — following the ${DAY_NAMES[override.followDayOfWeek]} timetable.`
          : (override.label ?? 'Classes run on Saturday this week.'),
      date: override.date,
      occurrenceIds: [],
      readAt: null,
    });
  }

  return drafts;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function daysUntil(from: DateKey, to: DateKey): number {
  const start = new Date(`${from}T00:00:00`).getTime();
  const end = new Date(`${to}T00:00:00`).getTime();
  return Math.round((end - start) / 86_400_000);
}

/** Monday-anchored key so a weekly alert fires once per week, not per day. */
function weekAnchor(today: DateKey): DateKey {
  const date = new Date(`${today}T00:00:00`);
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  return todayKey(date);
}

/**
 * Reconcile generated alerts with what is already stored.
 * Returns only genuinely new drafts, so the inbox never repeats itself.
 */
export function newNotificationsOnly(
  drafts: readonly DraftNotification[],
  existing: readonly AppNotification[],
): DraftNotification[] {
  const known = new Set(existing.map((notification) => notification.id));
  return drafts.filter((draft) => !known.has(draft.id));
}
