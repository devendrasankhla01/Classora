/**
 * Schedule tests: recurring templates → dated occurrences, and every one-date
 * edit the Modify Day sheet can perform.
 */
import { describe, expect, it } from 'vitest';
import { toInstant } from './date';

import {
  buildCancellation,
  buildExtraClass,
  buildOccurrenceOverride,
  buildReplacement,
  detectConflicts,
  diffWeeklyGrid,
  diffTemplates,
  findConflictFor,
  futureGenerationRange,
  generateOccurrences,
  normalizeSignature,
  slotsForDate,
} from './schedule';
import type { CalendarOverride, ClassOccurrence, RecurringSlot } from '@/types/domain';

/* ------------------------------------------------------------------ *
 * Fixtures                                                            *
 * ------------------------------------------------------------------ */

// September 2026 starts on a Tuesday (1st), so:
//   Mon 7, 14, 21, 28 · Tue 1, 8 · Sat 5, 12
const SEMESTER = { id: 'sem', startDate: '2026-09-01', endDate: '2026-09-30' };

function slot(overrides: Partial<RecurringSlot> = {}): RecurringSlot {
  return {
    id: 'slot-1',
    timetableVersionId: 'ver-1',
    semesterId: 'sem',
    subjectId: 'sub-dsa',
    dayOfWeek: 1, // Monday
    startTime: '09:00',
    endTime: '10:00',
    room: 'C-203',
    facultyOverride: null,
    classType: 'theory',
    periodCount: 1,
    kind: 'class',
    label: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function override(overrides: Partial<CalendarOverride> = {}): CalendarOverride {
  return {
    id: 'ovr-1',
    semesterId: 'sem',
    date: '2026-09-07',
    kind: 'holiday',
    followDayOfWeek: null,
    label: null,
    scope: 'college',
    reason: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function occurrence(overrides: Partial<ClassOccurrence> = {}): ClassOccurrence {
  return {
    id: 'occ-1',
    semesterId: 'sem',
    subjectId: 'sub-dsa',
    date: '2026-09-07',
    startTime: '09:00',
    endTime: '10:00',
    startDateTime: '2026-09-07T09:00:00.000Z',
    endDateTime: '2026-09-07T10:00:00.000Z',
    room: 'C-203',
    facultyOverride: null,
    classType: 'theory',
    periodCount: 1,
    occurrenceType: 'regular',
    scheduleStatus: 'scheduled',
    sourceTimetableSlotId: 'slot-1',
    replacedOccurrenceId: null,
    notes: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

/* ------------------------------------------------------------------ *
 * Generation                                                          *
 * ------------------------------------------------------------------ */

describe('generateOccurrences', () => {
  it('materialises every Monday in the range', () => {
    const result = generateOccurrences({
      semester: SEMESTER,
      slots: [slot()],
      overrides: [],
      from: '2026-09-01',
      to: '2026-09-30',
      existingIds: new Set(),
      now: '2026-09-01T00:00:00.000Z',
    });

    expect(result.occurrences.map((item) => item.date)).toEqual([
      '2026-09-07',
      '2026-09-14',
      '2026-09-21',
      '2026-09-28',
    ]);
    expect(result.occurrences[0]!.startDateTime).toBe(toInstant('2026-09-07', '09:00'));
    expect(result.occurrences[0]!.occurrenceType).toBe('regular');
    expect(result.occurrences[0]!.scheduleStatus).toBe('scheduled');
  });

  it('never generates outside the semester window', () => {
    const result = generateOccurrences({
      semester: SEMESTER,
      slots: [slot()],
      overrides: [],
      from: '2026-08-01',
      to: '2026-10-31',
      existingIds: new Set(),
    });
    expect(result.occurrences.every((item) => item.date >= SEMESTER.startDate));
    expect(result.occurrences.every((item) => item.date <= SEMESTER.endDate));
  });

  it('is idempotent — existing ids are never duplicated', () => {
    const first = generateOccurrences({
      semester: SEMESTER,
      slots: [slot()],
      overrides: [],
      from: '2026-09-01',
      to: '2026-09-30',
      existingIds: new Set(),
    });
    const existing = new Set(first.occurrences.map((item) => item.id));
    const second = generateOccurrences({
      semester: SEMESTER,
      slots: [slot()],
      overrides: [],
      from: '2026-09-01',
      to: '2026-09-30',
      existingIds: existing,
    });
    expect(second.occurrences).toHaveLength(0);
  });

  it('keeps holiday occurrences flagged as holiday rather than deleting them', () => {
    const result = generateOccurrences({
      semester: SEMESTER,
      slots: [slot()],
      overrides: [override({ date: '2026-09-07', kind: 'holiday' })],
      from: '2026-09-01',
      to: '2026-09-30',
      existingIds: new Set(),
    });

    const holiday = result.occurrences.find((item) => item.date === '2026-09-07');
    expect(holiday).toBeDefined();
    expect(holiday!.scheduleStatus).toBe('holiday');

    // Every other Monday remains a normal class.
    const normal = result.occurrences.filter((item) => item.date !== '2026-09-07');
    expect(normal).toHaveLength(3);
    expect(normal.every((item) => item.scheduleStatus === 'scheduled')).toBe(true);
  });

  it('skips a no_class day entirely and reports it', () => {
    const result = generateOccurrences({
      semester: SEMESTER,
      slots: [slot()],
      overrides: [override({ date: '2026-09-14', kind: 'no_class' })],
      from: '2026-09-01',
      to: '2026-09-30',
      existingIds: new Set(),
    });

    expect(result.occurrences.some((item) => item.date === '2026-09-14')).toBe(false);
    expect(result.skippedDates).toContain('2026-09-14');
  });

  it('follows another day — a working Saturday runs the Monday timetable', () => {
    // 2026-09-05 is a Saturday.
    const result = generateOccurrences({
      semester: SEMESTER,
      slots: [slot(), slot({ id: 'slot-2', dayOfWeek: 6, subjectId: 'sub-sports', kind: 'break', label: 'Club hour' })],
      overrides: [
        override({
          date: '2026-09-05',
          kind: 'working_saturday',
          followDayOfWeek: 1,
          label: 'Working Saturday — follows Monday',
        }),
      ],
      from: '2026-09-05',
      to: '2026-09-05',
      existingIds: new Set(),
    });

    expect(result.occurrences).toHaveLength(1);
    expect(result.occurrences[0]!.subjectId).toBe('sub-dsa');
    expect(result.occurrences[0]!.date).toBe('2026-09-05');
  });

  it('ignores break slots when counting', () => {
    const result = generateOccurrences({
      semester: SEMESTER,
      slots: [slot(), slot({ id: 'slot-break', kind: 'break', label: 'Recess', subjectId: 'break' })],
      overrides: [],
      from: '2026-09-07',
      to: '2026-09-07',
      existingIds: new Set(),
    });
    const recess = result.occurrences.find((item) => item.id.includes('slot-break'));
    expect(recess?.notes).toBe('Recess');
  });
});

describe('slotsForDate', () => {
  it('returns the timetable of the weekday by default', () => {
    const { slots, status } = slotsForDate('2026-09-07', [slot()], []);
    expect(slots).toHaveLength(1);
    expect(status).toBe('normal');
  });

  it('returns nothing for a no_class day', () => {
    const { slots, status } = slotsForDate('2026-09-07', [slot()], [override({ kind: 'no_class' })]);
    expect(slots).toHaveLength(0);
    expect(status).toBe('no_class');
  });
});

/* ------------------------------------------------------------------ *
 * One-date edits                                                      *
 * ------------------------------------------------------------------ */

describe('buildExtraClass', () => {
  it('creates an extra occurrence without touching the template', () => {
    const extra = buildExtraClass(
      {
        id: 'occ-extra',
        semesterId: 'sem',
        subjectId: 'sub-os',
        date: '2026-09-08',
        startTime: '14:00',
        endTime: '15:00',
        room: 'C-204',
        facultyOverride: null,
        classType: 'theory',
        periodCount: 1,
        notes: 'Extra class before the mid-sem',
      },
      '2026-09-01T00:00:00.000Z',
    );

    expect(extra.occurrenceType).toBe('extra');
    expect(extra.sourceTimetableSlotId).toBeNull();
    expect(extra.startDateTime).toBe(toInstant('2026-09-08', '14:00'));
  });
});

describe('buildReplacement', () => {
  it('marks the original replaced and links the substitute to it', () => {
    const original = occurrence();
    const change = buildReplacement(
      original,
      { id: 'occ-sub', subjectId: 'sub-os', room: 'C-301' },
      '2026-09-07T00:00:00.000Z',
    );

    const originalPatch = change.updated.find((item) => item.id === original.id);
    expect(originalPatch?.patch.scheduleStatus).toBe('replaced');

    const substitute = change.created[0]!;
    expect(substitute.occurrenceType).toBe('replacement');
    expect(substitute.replacedOccurrenceId).toBe(original.id);
    expect(substitute.subjectId).toBe('sub-os');
    expect(substitute.room).toBe('C-301');
    expect(substitute.date).toBe(original.date);
  });
});

describe('buildCancellation', () => {
  it('cancels a single date and keeps the row', () => {
    const change = buildCancellation(occurrence(), 'Faculty on leave');
    expect(change.created).toHaveLength(0);
    expect(change.updated[0]!.patch.scheduleStatus).toBe('cancelled');
    expect(change.updated[0]!.patch.notes).toContain('Faculty on leave');
  });
});

describe('buildOccurrenceOverride', () => {
  it('recomputes instants when the time changes', () => {
    const change = buildOccurrenceOverride(occurrence(), { startTime: '11:00', endTime: '12:30' });
    const patch = change.updated[0]!.patch;
    expect(patch.startTime).toBe('11:00');
    expect(patch.endTime).toBe('12:30');
    expect(patch.startDateTime).toBe(toInstant('2026-09-07', '11:00'));
    expect(patch.endDateTime).toBe(toInstant('2026-09-07', '12:30'));
  });

  it('changes only the room when asked', () => {
    const change = buildOccurrenceOverride(occurrence(), { room: 'Lab 3' });
    const patch = change.updated[0]!.patch;
    expect(patch.room).toBe('Lab 3');
    expect(patch.startTime).toBe('09:00');
  });
});

/* ------------------------------------------------------------------ *
 * Conflict detection                                                  *
 * ------------------------------------------------------------------ */

describe('detectConflicts', () => {
  it('finds overlapping classes on the same day', () => {
    const a = occurrence({ id: 'a', startTime: '09:00', endTime: '10:00' });
    const b = occurrence({ id: 'b', startTime: '09:30', endTime: '10:30' });
    const conflicts = detectConflicts([a, b]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.firstId).toBe('a');
  });

  it('does not flag back-to-back classes', () => {
    const a = occurrence({ id: 'a', startTime: '09:00', endTime: '10:00' });
    const b = occurrence({ id: 'b', startTime: '10:00', endTime: '11:00' });
    expect(detectConflicts([a, b])).toHaveLength(0);
  });

  it('excludes cancelled classes from conflict results', () => {
    const a = occurrence({ id: 'a', startTime: '09:00', endTime: '10:00' });
    const b = occurrence({ id: 'b', startTime: '09:30', endTime: '10:30', scheduleStatus: 'cancelled' });
    expect(detectConflicts([a, b])).toHaveLength(0);
  });

  it('only compares classes on the same date', () => {
    const a = occurrence({ id: 'a', date: '2026-09-07' });
    const b = occurrence({ id: 'b', date: '2026-09-08' });
    expect(detectConflicts([a, b])).toHaveLength(0);
  });
});

describe('findConflictFor', () => {
  it('returns the colliding occurrence when there is one', () => {
    const existing = occurrence({ id: 'a', startTime: '09:00', endTime: '10:00' });
    const collision = findConflictFor(
      { id: 'candidate', date: '2026-09-07', startTime: '09:30', endTime: '10:15' },
      [existing],
    );
    expect(collision?.id).toBe('a');
  });

  it('returns null for a free slot', () => {
    const existing = occurrence({ id: 'a', startTime: '09:00', endTime: '10:00' });
    expect(
      findConflictFor({ id: 'candidate', date: '2026-09-07', startTime: '10:00', endTime: '11:00' }, [existing]),
    ).toBeNull();
  });
});

/* ------------------------------------------------------------------ *
 * Signatures + diffing                                                *
 * ------------------------------------------------------------------ */

describe('normalizeSignature', () => {
  it('is order-independent', () => {
    const a = slot({ id: 'a', startTime: '09:00', endTime: '10:00' });
    const b = slot({ id: 'b', dayOfWeek: 2, startTime: '11:00', endTime: '12:00' });
    expect(normalizeSignature([a, b])).toBe(normalizeSignature([b, a]));
  });

  it('changes when a time moves', () => {
    const a = slot();
    const moved = slot({ startTime: '10:00', endTime: '11:00' });
    expect(normalizeSignature([a])).not.toBe(normalizeSignature([moved]));
  });

  it('ignores break blocks (they are not part of the class schema)', () => {
    const withBreak = slot({ id: 'break', kind: 'break', label: 'Recess' });
    expect(normalizeSignature([slot()])).toBe(normalizeSignature([slot(), withBreak]));
  });
});

describe('diffTemplates', () => {
  it('detects added, removed, moved and relocated slots', () => {
    const before = [
      slot({ id: 'keep' }),
      slot({ id: 'moved', dayOfWeek: 2, startTime: '11:00', endTime: '12:00' }),
      slot({ id: 'relocated', dayOfWeek: 3, room: 'C-101' }),
      slot({ id: 'removed', dayOfWeek: 4 }),
    ];
    const after = [
      slot({ id: 'keep' }),
      slot({ id: 'moved', dayOfWeek: 2, startTime: '13:00', endTime: '14:00' }),
      slot({ id: 'relocated', dayOfWeek: 3, room: 'C-999' }),
      slot({ id: 'added', dayOfWeek: 5 }),
    ];

    const diff = diffTemplates(before, after);
    const kinds = diff.map((entry) => `${entry.kind}:${entry.dayOfWeek}`).sort();
    expect(kinds).toEqual(['added:5', 'removed:4', 'room_changed:3', 'time_changed:2']);
  });

  it('returns nothing when the schema is unchanged', () => {
    expect(diffTemplates([slot()], [slot()])).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ *
 * Re-materialisation boundaries                                       *
 * ------------------------------------------------------------------ */

describe('futureGenerationRange', () => {
  it('never starts before today', () => {
    const range = futureGenerationRange(SEMESTER, new Date('2026-09-15T10:00:00'), 30);
    expect(range.from).toBe('2026-09-15');
    expect(range.skippedPast).toBe(true);
  });

  it('starts at the semester start when the semester has not begun', () => {
    const range = futureGenerationRange(SEMESTER, new Date('2026-08-20T10:00:00'), 30);
    expect(range.from).toBe('2026-09-01');
    expect(range.skippedPast).toBe(false);
  });

  it('clamps to the semester end', () => {
    const range = futureGenerationRange(SEMESTER, new Date('2026-09-15T10:00:00'), 365);
    expect(range.to).toBe('2026-09-30');
  });
});

/* ------------------------------------------------------------------ *
 * Weekly-grid diff (import review)                                    *
 * ------------------------------------------------------------------ */

describe('diffWeeklyGrid', () => {
  const block = (over: Partial<Parameters<typeof diffWeeklyGrid>[0][number]> = {}) => ({
    dayOfWeek: 1 as const,
    startTime: '09:00',
    endTime: '10:00',
    room: 'C-203',
    label: 'DSA',
    ...over,
  });

  it('reports a brand-new slot', () => {
    const changes = diffWeeklyGrid([], [block()]);
    expect(changes).toHaveLength(1);
    expect(changes[0]!.kind).toBe('added');
    expect(changes[0]!.summary).toContain('new slot');
  });

  it('reports a slot that disappeared', () => {
    const changes = diffWeeklyGrid([block({ dayOfWeek: 4 })], []);
    expect(changes).toHaveLength(1);
    expect(changes[0]!.kind).toBe('removed');
    expect(changes[0]!.summary).toContain('Thursday');
  });

  it('keeps the same weekday and start time as the identity', () => {
    const changes = diffWeeklyGrid([block()], [block()]);
    expect(changes).toHaveLength(0);
  });

  it('detects a changed end time', () => {
    const changes = diffWeeklyGrid([block()], [block({ endTime: '11:00' })]);
    expect(changes.map((change) => change.kind)).toEqual(['time_changed']);
    expect(changes[0]!.summary).toContain('10:00 → 11:00');
  });

  it('detects a changed room', () => {
    const changes = diffWeeklyGrid([block()], [block({ room: 'Lab 3' })]);
    expect(changes.map((change) => change.kind)).toEqual(['room_changed']);
    expect(changes[0]!.summary).toContain('Lab 3');
  });

  it('treats a moved slot as a removal plus an addition', () => {
    const changes = diffWeeklyGrid([block()], [block({ startTime: '11:00', endTime: '12:00' })]);
    expect(changes.map((change) => change.kind).sort()).toEqual(['added', 'removed']);
  });

  it('handles a whole-week swap in one pass', () => {
    const current = [block(), block({ dayOfWeek: 2, startTime: '11:00', endTime: '12:00' })];
    const incoming = [
      block({ room: 'C-999' }),
      block({ dayOfWeek: 3, startTime: '14:00', endTime: '15:00' }),
    ];
    const kinds = diffWeeklyGrid(current, incoming).map((change) => change.kind).sort();
    expect(kinds).toEqual(['added', 'removed', 'room_changed']);
  });
});
