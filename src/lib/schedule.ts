/**
 * Classora schedule engine.
 *
 * The weekly timetable is only a *template*. This module expands templates into
 * dated `ClassOccurrence` rows, honouring calendar overrides (holidays,
 * no-class days, "follow another day", working Saturdays).
 *
 * Two properties matter most:
 *  1. **Idempotent** — a regular occurrence's id is derived from its source slot
 *     and date, so regenerating a range never duplicates classes and never
 *     clobbers a class the student has already changed.
 *  2. **History-safe** — generation only ever fills in *missing* future
 *     occurrences. Existing rows (and therefore past attendance) are untouched.
 */
import { dateKeyRange, dayOfWeekOf, toInstant, todayKey } from '@/lib/date';
import type {
  CalendarOverride,
  ClassOccurrence,
  DateKey,
  DayOfWeek,
  Instant,
  RecurringSlot,
  Semester,
  TimeKey,
} from '@/types/domain';

/** Deterministic id for a regular occurrence generated from a template slot. */
export function occurrenceIdForSlot(slotId: string, date: DateKey): string {
  return `occ_${slotId}_${date.replace(/-/g, '')}`;
}

export interface GenerationResult {
  /** New occurrences to persist (never includes already-existing ids). */
  occurrences: ClassOccurrence[];
  /** Dates skipped because of holidays / no-class overrides. */
  skippedDates: DateKey[];
}

export interface GenerationInput {
  semester: Pick<Semester, 'id' | 'startDate' | 'endDate'>;
  slots: readonly RecurringSlot[];
  overrides: readonly CalendarOverride[];
  /** Inclusive local-date range to materialise. */
  from: DateKey;
  to: DateKey;
  /** Ids already stored — these are skipped entirely (history preserved). */
  existingIds?: ReadonlySet<string>;
  now?: Instant;
}

function clampToSemester(date: DateKey, semester: GenerationInput['semester']): boolean {
  return date >= semester.startDate && date <= semester.endDate;
}

/** Slots that should run on a given date, after applying overrides. */
export function slotsForDate(
  date: DateKey,
  slots: readonly RecurringSlot[],
  overrides: readonly CalendarOverride[],
): { slots: RecurringSlot[]; status: 'normal' | 'holiday' | 'no_class' } {
  const override = overrides.find((item) => item.date === date);

  if (override) {
    if (override.kind === 'holiday') {
      // The day's classes still exist as records — they are simply marked as a
      // holiday so history and the timetable stay complete, and the attendance
      // engine excludes them.
      const dayOfWeek = dayOfWeekOf(date);
      return { slots: slots.filter((slot) => slot.dayOfWeek === dayOfWeek), status: 'holiday' };
    }
    if (override.kind === 'no_class') {
      return { slots: [], status: 'no_class' };
    }
    if (override.followDayOfWeek !== null && override.followDayOfWeek !== undefined) {
      return {
        slots: slots.filter((slot) => slot.dayOfWeek === override.followDayOfWeek),
        status: 'normal',
      };
    }
    if (override.kind === 'custom_schedule') {
      return { slots: [], status: 'no_class' };
    }
  }

  const dayOfWeek = dayOfWeekOf(date);
  return { slots: slots.filter((slot) => slot.dayOfWeek === dayOfWeek), status: 'normal' };
}

/**
 * Expand templates into occurrences for a date range.
 * Existing ids are skipped, so this is safe to call repeatedly.
 */
export function generateOccurrences(input: GenerationInput): GenerationResult {
  const { semester, slots, overrides, from, to, existingIds = new Set() } = input;
  const now = input.now ?? new Date().toISOString();
  const occurrences: ClassOccurrence[] = [];
  const skippedDates: DateKey[] = [];

  for (const date of dateKeyRange(from, to)) {
    if (!clampToSemester(date, semester)) continue;

    const { slots: daySlots, status } = slotsForDate(date, slots, overrides);
    const isHoliday = status === 'holiday';

    if (daySlots.length === 0) {
      if (status !== 'normal') skippedDates.push(date);
      continue;
    }

    for (const slot of daySlots) {
      const id = occurrenceIdForSlot(slot.id, date);
      if (existingIds.has(id)) continue;

      occurrences.push({
        id,
        semesterId: semester.id,
        subjectId: slot.subjectId,
        date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        startDateTime: toInstant(date, slot.startTime),
        endDateTime: toInstant(date, slot.endTime),
        room: slot.room,
        facultyOverride: slot.facultyOverride,
        classType: slot.classType,
        periodCount: slot.periodCount,
        occurrenceType: 'regular',
        scheduleStatus: isHoliday ? 'holiday' : 'scheduled',
        sourceTimetableSlotId: slot.id,
        replacedOccurrenceId: null,
        notes: slot.kind === 'break' ? (slot.label ?? 'Break') : null,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return { occurrences, skippedDates };
}

/* ------------------------------------------------------------------ *
 * Conflict detection                                                  *
 * ------------------------------------------------------------------ */

export interface ScheduleConflict {
  date: DateKey;
  firstId: string;
  secondId: string;
  startTime: TimeKey;
  endTime: TimeKey;
}

function overlaps(a: ClassOccurrence, b: ClassOccurrence): boolean {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

/** Non-countable classes are excluded — a cancelled class cannot conflict. */
export function detectConflicts(occurrences: readonly ClassOccurrence[]): ScheduleConflict[] {
  const byDate = new Map<DateKey, ClassOccurrence[]>();
  for (const occurrence of occurrences) {
    if (occurrence.scheduleStatus === 'cancelled' || occurrence.scheduleStatus === 'not_conducted') {
      continue;
    }
    const bucket = byDate.get(occurrence.date) ?? [];
    bucket.push(occurrence);
    byDate.set(occurrence.date, bucket);
  }

  const conflicts: ScheduleConflict[] = [];
  for (const [date, bucket] of byDate) {
    const sorted = [...bucket].sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let i = 0; i < sorted.length - 1; i += 1) {
      for (let j = i + 1; j < sorted.length; j += 1) {
        const first = sorted[i]!;
        const second = sorted[j]!;
        if (second.startTime >= first.endTime) break;
        if (overlaps(first, second)) {
          conflicts.push({
            date,
            firstId: first.id,
            secondId: second.id,
            startTime: first.startTime,
            endTime: first.endTime,
          });
        }
      }
    }
  }
  return conflicts;
}

/** True when placing `candidate` on its date collides with a sibling. */
export function findConflictFor(
  candidate: Pick<ClassOccurrence, 'id' | 'date' | 'startTime' | 'endTime'>,
  occurrences: readonly ClassOccurrence[],
): ClassOccurrence | null {
  for (const occurrence of occurrences) {
    if (occurrence.id === candidate.id) continue;
    if (occurrence.date !== candidate.date) continue;
    if (occurrence.scheduleStatus === 'cancelled' || occurrence.scheduleStatus === 'not_conducted') {
      continue;
    }
    if (
      candidate.startTime < occurrence.endTime &&
      occurrence.startTime < candidate.endTime
    ) {
      return occurrence;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Import signatures (duplicate detection)                             *
 * ------------------------------------------------------------------ */

/**
 * Normalised signature of a weekly template. Two uploads of the same timetable
 * produce the same signature even if rows arrive in a different order.
 */
export function normalizeSignature(slots: readonly RecurringSlot[]): string {
  const rows = slots
    .filter((slot) => slot.kind === 'class')
    .map((slot) =>
      [
        slot.dayOfWeek,
        slot.startTime,
        slot.endTime,
        slot.subjectId,
        slot.room ?? '',
        slot.classType,
        slot.periodCount,
      ].join('|'),
    )
    .sort();

  const joined = rows.join(';');
  // Small, stable, non-cryptographic hash (FNV-1a) — enough for equality checks.
  let hash = 0x811c9dc5;
  for (let i = 0; i < joined.length; i += 1) {
    hash ^= joined.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `v1_${rows.length}_${(hash >>> 0).toString(36)}`;
}

/* ------------------------------------------------------------------ *
 * Timetable diffing (AI re-import comparison)                         *
 * ------------------------------------------------------------------ */

export type DiffKind = 'added' | 'removed' | 'time_changed' | 'room_changed';

export interface SlotDiff {
  kind: DiffKind;
  subjectId: string;
  dayOfWeek: DayOfWeek;
  from: Partial<RecurringSlot>;
  to: Partial<RecurringSlot>;
}

/**
 * Compare the current weekly template with a freshly extracted one.
 * Nothing is applied automatically — the user accepts or ignores each change.
 */
export function diffTemplates(
  current: readonly RecurringSlot[],
  incoming: readonly RecurringSlot[],
): SlotDiff[] {
  const diffs: SlotDiff[] = [];
  const currentByKey = new Map<string, RecurringSlot>();
  for (const slot of current) {
    if (slot.kind !== 'class') continue;
    currentByKey.set(`${slot.subjectId}|${slot.dayOfWeek}`, slot);
  }

  const incomingKeys = new Set<string>();
  for (const slot of incoming) {
    if (slot.kind !== 'class') continue;
    const key = `${slot.subjectId}|${slot.dayOfWeek}`;
    incomingKeys.add(key);
    const existing = currentByKey.get(key);

    if (!existing) {
      diffs.push({ kind: 'added', subjectId: slot.subjectId, dayOfWeek: slot.dayOfWeek, from: {}, to: slot });
      continue;
    }
    if (existing.startTime !== slot.startTime || existing.endTime !== slot.endTime) {
      diffs.push({
        kind: 'time_changed',
        subjectId: slot.subjectId,
        dayOfWeek: slot.dayOfWeek,
        from: { startTime: existing.startTime, endTime: existing.endTime },
        to: { startTime: slot.startTime, endTime: slot.endTime },
      });
    }
    if ((existing.room ?? '') !== (slot.room ?? '')) {
      diffs.push({
        kind: 'room_changed',
        subjectId: slot.subjectId,
        dayOfWeek: slot.dayOfWeek,
        from: { room: existing.room },
        to: { room: slot.room },
      });
    }
  }

  for (const [key, slot] of currentByKey) {
    if (!incomingKeys.has(key)) {
      diffs.push({ kind: 'removed', subjectId: slot.subjectId, dayOfWeek: slot.dayOfWeek, from: slot, to: {} });
    }
  }

  return diffs;
}

/* ------------------------------------------------------------------ *
 * Weekly-grid diffing (import review: accept / ignore per change)     *
 * ------------------------------------------------------------------ */

/** A row of the weekly grid, independent of which subject occupies it. */
export interface WeeklyBlock {
  dayOfWeek: DayOfWeek;
  startTime: TimeKey;
  endTime: TimeKey;
  room: string | null;
  label: string;
}

export type WeeklyGridChangeKind = 'added' | 'removed' | 'time_changed' | 'room_changed';

export interface WeeklyGridChange {
  kind: WeeklyGridChangeKind;
  /** Stable identity of the slot: weekday + start time. */
  key: string;
  before: WeeklyBlock | null;
  after: WeeklyBlock | null;
  /** Human-readable summary for the review screen. */
  summary: string;
}

const gridKey = (block: Pick<WeeklyBlock, 'dayOfWeek' | 'startTime'>): string =>
  `${block.dayOfWeek}|${block.startTime}`;

/**
 * Compare the current weekly grid with an incoming import.
 *
 * Only the grid is compared — weekday, time and room — never the subject, since
 * subject identity is resolved during the review step itself. That keeps the
 * diff honest: it describes what the week will look like, not who teaches it.
 */
export function diffWeeklyGrid(
  current: readonly WeeklyBlock[],
  incoming: readonly WeeklyBlock[],
): WeeklyGridChange[] {
  const currentByKey = new Map(current.map((block) => [gridKey(block), block]));
  const incomingByKey = new Map(incoming.map((block) => [gridKey(block), block]));
  const changes: WeeklyGridChange[] = [];

  for (const [key, after] of incomingByKey) {
    const before = currentByKey.get(key);
    if (!before) {
      changes.push({
        kind: 'added',
        key,
        before: null,
        after,
        summary: `${DAY_LABELS[after.dayOfWeek]} ${after.startTime}–${after.endTime}: new slot`,
      });
      continue;
    }
    if (before.endTime !== after.endTime) {
      changes.push({
        kind: 'time_changed',
        key,
        before,
        after,
        summary: `${DAY_LABELS[after.dayOfWeek]} ${after.startTime}: ends ${before.endTime} → ${after.endTime}`,
      });
    }
    if ((before.room ?? '') !== (after.room ?? '')) {
      changes.push({
        kind: 'room_changed',
        key,
        before,
        after,
        summary: `${DAY_LABELS[after.dayOfWeek]} ${after.startTime}: room ${before.room ?? 'TBA'} → ${after.room ?? 'TBA'}`,
      });
    }
  }

  for (const [key, before] of currentByKey) {
    if (incomingByKey.has(key)) continue;
    changes.push({
      kind: 'removed',
      key,
      before,
      after: null,
      summary: `${DAY_LABELS[before.dayOfWeek]} ${before.startTime}–${before.endTime}: no longer in the timetable`,
    });
  }

  return changes.sort((a, b) => a.key.localeCompare(b.key) || a.kind.localeCompare(b.kind));
}

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* ------------------------------------------------------------------ *
 * Occurrence change helpers                                           *
 * ------------------------------------------------------------------ */

export interface OccurrenceChange {
  /** Occurrences to insert. */
  created: ClassOccurrence[];
  /** Ids to update, with the patch to apply. */
  updated: { id: string; patch: Partial<ClassOccurrence> }[];
}

const emptyChange = (): OccurrenceChange => ({ created: [], updated: [] });

/**
 * Build an extra-class occurrence (never touches the recurring template).
 */
export function buildExtraClass(
  input: {
    semesterId: string;
    subjectId: string;
    date: DateKey;
    startTime: TimeKey;
    endTime: TimeKey;
    room: string | null;
    facultyOverride: string | null;
    classType: ClassOccurrence['classType'];
    periodCount: number;
    notes?: string | null;
    id: string;
  },
  now: Instant = new Date().toISOString(),
): ClassOccurrence {
  return {
    id: input.id,
    semesterId: input.semesterId,
    subjectId: input.subjectId,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    startDateTime: toInstant(input.date, input.startTime),
    endDateTime: toInstant(input.date, input.endTime),
    room: input.room,
    facultyOverride: input.facultyOverride,
    classType: input.classType,
    periodCount: input.periodCount,
    occurrenceType: 'extra',
    scheduleStatus: 'scheduled',
    sourceTimetableSlotId: null,
    replacedOccurrenceId: null,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Replace one class with another for a single date.
 * The original becomes `replaced` (it stays in history, uncounted) and a new
 * `replacement` occurrence carries the attendance for the substitute subject.
 */
export function buildReplacement(
  original: ClassOccurrence,
  input: {
    id: string;
    subjectId: string;
    room?: string | null;
    faculty?: string | null;
    classType?: ClassOccurrence['classType'];
    periodCount?: number;
  },
  now: Instant = new Date().toISOString(),
): OccurrenceChange {
  const change = emptyChange();

  change.updated.push({
    id: original.id,
    patch: { scheduleStatus: 'replaced', updatedAt: now },
  });

  change.created.push({
    ...original,
    id: input.id,
    subjectId: input.subjectId,
    room: input.room ?? original.room,
    facultyOverride: input.faculty ?? original.facultyOverride,
    classType: input.classType ?? original.classType,
    periodCount: input.periodCount ?? original.periodCount,
    occurrenceType: 'replacement',
    scheduleStatus: 'scheduled',
    replacedOccurrenceId: original.id,
    notes: `Replaces ${original.subjectId} on ${original.date}`,
    createdAt: now,
    updatedAt: now,
  });

  return change;
}

/** Cancel a class for one date only; history keeps the row. */
export function buildCancellation(
  original: ClassOccurrence,
  reason: string | null,
  now: Instant = new Date().toISOString(),
): OccurrenceChange {
  return {
    created: [],
    updated: [
      {
        id: original.id,
        patch: {
          scheduleStatus: 'cancelled',
          notes: reason ? `Cancelled: ${reason}` : 'Cancelled',
          updatedAt: now,
        },
      },
    ],
  };
}

/** Temporary time and/or room change for a single date. */
export function buildOccurrenceOverride(
  original: ClassOccurrence,
  patch: { startTime?: TimeKey; endTime?: TimeKey; room?: string | null },
  now: Instant = new Date().toISOString(),
): OccurrenceChange {
  const startTime = patch.startTime ?? original.startTime;
  const endTime = patch.endTime ?? original.endTime;
  return {
    created: [],
    updated: [
      {
        id: original.id,
        patch: {
          startTime,
          endTime,
          startDateTime: toInstant(original.date, startTime),
          endDateTime: toInstant(original.date, endTime),
          room: patch.room === undefined ? original.room : patch.room,
          updatedAt: now,
        },
      },
    ],
  };
}

/* ------------------------------------------------------------------ *
 * Re-materialisation boundaries                                       *
 * ------------------------------------------------------------------ */

/**
 * Range in which it is safe to (re)generate occurrences.
 * Never rewrites the past — attendance lives there.
 */
export function futureGenerationRange(
  semester: Pick<Semester, 'startDate' | 'endDate'>,
  now: Date = new Date(),
  horizonDays = 120,
): { from: DateKey; to: DateKey; skippedPast: boolean } {
  const today = todayKey(now);
  const from = today > semester.startDate ? today : semester.startDate;
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + horizonDays);
  const horizonKey = todayKey(horizon);
  const to = horizonKey < semester.endDate ? horizonKey : semester.endDate;
  return { from, to, skippedPast: from !== semester.startDate };
}
