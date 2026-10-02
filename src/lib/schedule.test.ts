import { describe, expect, it } from 'vitest';

import {
  buildCancellation,
  buildExtraClass,
  buildOccurrenceOverride,
  buildReplacement,
  detectConflicts,
  diffTemplates,
  findConflictFor,
  futureGenerationRange,
  generateOccurrences,
  normalizeSignature,
  occurrenceIdForSlot,
  slotsForDate,
} from './schedule';
import type { CalendarOverride, ClassOccurrence, DateKey, RecurringSlot } from '@/types/domain';

const SEMESTER = { id: 'sem_1', startDate: '2026-09-01', endDate: '2026-12-20' };

let slotCounter = 0;
function makeSlot(overrides: Partial<RecurringSlot> = {}): RecurringSlot {
  slotCounter += 1;
  return {
    id: `slot_${slotCounter}`,
    timetableVersionId: 'ver_1',
    semesterId: 'sem_1',
    subjectId: 'sub_os',
    dayOfWeek: 1, // Monday
    startTime: '10:00',
    endTime: '11:00',
    room: 'C-204',
    facultyOverride: null,
    classType: 'theory',
    periodCount: 1,
    kind: 'class',
    label: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

let overrideCounter = 0;
function makeOverride(overrides: Partial<CalendarOverride> = {}): CalendarOverride {
  overrideCounter += 1;
  return {
    id: `ovr_${overrideCounter}`,
    semesterId: 'sem_1',
    date: '2026-09-07',
    kind: 'holiday',
    followDayOfWeek: null,
    label: null,
    scope: 'college',
    reason: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

function generate(overrides: Partial<Parameters<typeof generateOccurrences>[0]> = {}) {
  return generateOccurrences({
    semester: SEMESTER,
    slots: [makeSlot()],
    overrides: [],
    from: '2026-09-01',
    to: '2026-09-30',
    existingIds: new Set<string>(),
    now: '2026-09-01T00:00:00.000Z',
    ...overrides,
  });
}

/* ------------------------------------------------------------------ *
 * Template expansion                                                  *
 * ------------------------------------------------------------------ */

describe('recurring slot generation', () => {
  it('creates one occurrence per matching weekday inside the range', () => {
    const { occurrences } = generate();
    // Mondays in September 2026: 7, 14, 21, 28.
    expect(occurrences.map((o) => o.date)).toEqual(['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28']);
  });

  it('uses deterministic ids so regeneration is idempotent', () => {
    const slot = makeSlot();
    const first = generate({ slots: [slot] });
    const existing = new Set(first.occurrences.map((o) => o.id));

    // Same template, second pass — nothing is duplicated or rewritten.
    const second = generate({ slots: [slot], existingIds: existing });
    expect(second.occurrences).toHaveLength(0);
    expect(first.occurrences).toHaveLength(4);
    expect(occurrenceIdForSlot('slot_x', '2026-09-07')).toBe('occ_slot_x_20260907');
  });

  it('never generates outside the semester boundaries', () => {
    const { occurrences } = generate({ from: '2026-08-01', to: '2027-01-31' });
    expect(occurrences.every((o) => o.date >= SEMESTER.startDate && o.date <= SEMESTER.endDate)).toBe(true);
    expect(occurrences.some((o) => o.date === '2026-08-31')).toBe(false);
  });

  it('copies slot details onto the occurrence and links back to the template', () => {
    const slot = makeSlot({ room: 'Lab 3', periodCount: 2, classType: 'lab' });
    const { occurrences } = generate({ slots: [slot] });
    const [occurrence] = occurrences;
    expect(occurrence?.room).toBe('Lab 3');
    expect(occurrence?.periodCount).toBe(2);
    expect(occurrence?.classType).toBe('lab');
    expect(occurrence?.sourceTimetableSlotId).toBe(slot.id);
    expect(occurrence?.occurrenceType).toBe('regular');
  });

  it('spans a multi-day range for every configured day of week', () => {
    const { occurrences } = generate({
      slots: [makeSlot({ dayOfWeek: 1 }), makeSlot({ dayOfWeek: 3 })],
      from: '2026-09-07',
      to: '2026-09-13',
    });
    expect(occurrences).toHaveLength(2);
    expect(occurrences.map((o) => o.date).sort()).toEqual(['2026-09-07', '2026-09-09']);
  });
});

/* ------------------------------------------------------------------ *
 * Overrides                                                           *
 * ------------------------------------------------------------------ */

describe('calendar overrides', () => {
  it('keeps the day visible but marks classes as holiday so they never count', () => {
    const holiday = makeOverride({ date: '2026-09-14', kind: 'holiday', label: 'Founder’s Day' });
    const { occurrences } = generate({ overrides: [holiday] });

    const holidayClasses = occurrences.filter((o) => o.date === '2026-09-14');
    expect(holidayClasses).toHaveLength(1);
    expect(holidayClasses[0]?.scheduleStatus).toBe('holiday');
  });

  it('skips a no-class day entirely', () => {
    const noClass = makeOverride({ date: '2026-09-21', kind: 'no_class' });
    const { occurrences, skippedDates } = generate({ overrides: [noClass] });
    expect(occurrences.some((o) => o.date === '2026-09-21')).toBe(false);
    expect(skippedDates).toContain('2026-09-21');
  });

  it('follows another day for a single date without changing the template', () => {
    const thursday = makeSlot({ dayOfWeek: 4, startTime: '09:00', endTime: '10:00' });
    const follow = makeOverride({ date: '2026-09-12', kind: 'follow_day', followDayOfWeek: 4 });

    const result = slotsForDate('2026-09-12', [makeSlot(), thursday], [follow]);
    expect(result.slots.map((slot) => slot.id)).toEqual([thursday.id]);

    // The following Saturday has no override, so it remains a free day.
    const plain = slotsForDate('2026-09-19', [makeSlot(), thursday], [follow]);
    expect(plain.slots).toHaveLength(0);
  });

  it('treats a working Saturday as "follow Monday"', () => {
    const monday = makeSlot({ dayOfWeek: 1 });
    const workingSaturday = makeOverride({
      date: '2026-09-12',
      kind: 'working_saturday',
      followDayOfWeek: 1,
    });

    expect(slotsForDate('2026-09-12', [monday], [workingSaturday]).slots).toHaveLength(1);

    const { occurrences } = generate({ overrides: [workingSaturday], slots: [monday] });
    expect(occurrences.some((o) => o.date === '2026-09-12')).toBe(true);
    // The regular Mondays are untouched.
    expect(occurrences.filter((o) => o.date === '2026-09-07')).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ *
 * Occurrence changes                                                  *
 * ------------------------------------------------------------------ */

function makeOccurrence(overrides: Partial<ClassOccurrence> = {}): ClassOccurrence {
  return {
    id: 'occ_1',
    semesterId: 'sem_1',
    subjectId: 'sub_maths',
    date: '2026-10-02',
    startTime: '11:00',
    endTime: '12:00',
    startDateTime: '2026-10-02T11:00:00.000Z',
    endDateTime: '2026-10-02T12:00:00.000Z',
    room: 'C-201',
    facultyOverride: null,
    classType: 'theory',
    periodCount: 1,
    occurrenceType: 'regular',
    scheduleStatus: 'scheduled',
    sourceTimetableSlotId: 'slot_maths',
    replacedOccurrenceId: null,
    notes: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('one-date occurrence changes', () => {
  it('replaces a class without deleting the original from history', () => {
    const original = makeOccurrence();
    const change = buildReplacement(original, { id: 'occ_repl', subjectId: 'sub_os' }, '2026-10-01T00:00:00.000Z');

    expect(change.updated).toEqual([
      { id: 'occ_1', patch: { scheduleStatus: 'replaced', updatedAt: '2026-10-01T00:00:00.000Z' } },
    ]);

    const replacement = change.created[0]!;
    expect(replacement.id).toBe('occ_repl');
    expect(replacement.subjectId).toBe('sub_os');
    expect(replacement.occurrenceType).toBe('replacement');
    expect(replacement.replacedOccurrenceId).toBe('occ_1');
    expect(replacement.date).toBe(original.date);
    expect(replacement.startTime).toBe(original.startTime);
  });

  it('cancels a class for a single date and keeps the row', () => {
    const change = buildCancellation(makeOccurrence(), 'Faculty unavailable');
    expect(change.created).toHaveLength(0);
    expect(change.updated[0]?.patch.scheduleStatus).toBe('cancelled');
    expect(change.updated[0]?.patch.notes).toContain('Faculty unavailable');
  });

  it('moves a class time for one date and recomputes its instants', () => {
    const change = buildOccurrenceOverride(
      makeOccurrence(),
      { startTime: '12:00', endTime: '13:00' },
      '2026-10-01T00:00:00.000Z',
    );
    const patch = change.updated[0]!.patch;
    expect(patch.startTime).toBe('12:00');
    expect(patch.endTime).toBe('13:00');
    expect(patch.startDateTime).toBe('2026-10-02T12:00:00.000Z');
    expect(patch.endDateTime).toBe('2026-10-02T13:00:00.000Z');
  });

  it('changes the room for one date only', () => {
    const change = buildOccurrenceOverride(makeOccurrence(), { room: 'C-108' });
    expect(change.updated[0]?.patch.room).toBe('C-108');
    expect(change.updated[0]?.patch.startTime).toBe('11:00');
  });

  it('creates an extra class without a template link', () => {
    const extra = buildExtraClass({
      id: 'occ_extra',
      semesterId: 'sem_1',
      subjectId: 'sub_dsa',
      date: '2026-10-03',
      startTime: '16:00',
      endTime: '17:00',
      room: 'C-203',
      facultyOverride: null,
      classType: 'theory',
      periodCount: 1,
    });
    expect(extra.occurrenceType).toBe('extra');
    expect(extra.sourceTimetableSlotId).toBeNull();
    expect(extra.startDateTime).toBe('2026-10-03T16:00:00.000Z');
  });
});

/* ------------------------------------------------------------------ *
 * Conflicts                                                           *
 * ------------------------------------------------------------------ */

describe('conflict detection', () => {
  it('detects overlapping classes on the same date', () => {
    const a = makeOccurrence({ id: 'a', startTime: '14:00', endTime: '15:00' });
    const b = makeOccurrence({ id: 'b', startTime: '14:30', endTime: '15:30' });
    const conflicts = detectConflicts([a, b]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.date).toBe('2026-10-02');
  });

  it('treats back-to-back classes as conflict-free', () => {
    const a = makeOccurrence({ id: 'a', startTime: '14:00', endTime: '15:00' });
    const b = makeOccurrence({ id: 'b', startTime: '15:00', endTime: '16:00' });
    expect(detectConflicts([a, b])).toHaveLength(0);
  });

  it('ignores cancelled classes', () => {
    const a = makeOccurrence({ id: 'a', startTime: '14:00', endTime: '15:00' });
    const b = makeOccurrence({ id: 'b', startTime: '14:30', endTime: '15:30', scheduleStatus: 'cancelled' });
    expect(detectConflicts([a, b])).toHaveLength(0);
  });

  it('reports which class a new extra class collides with', () => {
    const existing = makeOccurrence({ id: 'existing', startTime: '14:00', endTime: '15:00' });
    const clash = findConflictFor(
      { id: 'new', date: '2026-10-02', startTime: '14:30', endTime: '15:30' },
      [existing],
    );
    expect(clash?.id).toBe('existing');

    const clear = findConflictFor(
      { id: 'new', date: '2026-10-02', startTime: '16:00', endTime: '17:00' },
      [existing],
    );
    expect(clear).toBeNull();
  });
});

/* ------------------------------------------------------------------ *
 * Signatures & diffs                                                  *
 * ------------------------------------------------------------------ */

describe('import signatures', () => {
  it('is order-independent for the same template', () => {
    const a = [makeSlot({ id: 'a' }), makeSlot({ id: 'b', dayOfWeek: 2 })];
    const b = [makeSlot({ id: 'b2', dayOfWeek: 2 }), makeSlot({ id: 'a2' })];
    expect(normalizeSignature(a)).toBe(normalizeSignature(b));
  });

  it('changes when a class time changes', () => {
    const before = [makeSlot({ startTime: '10:00' })];
    const after = [makeSlot({ startTime: '11:00' })];
    expect(normalizeSignature(before)).not.toBe(normalizeSignature(after));
  });

  it('ignores break blocks', () => {
    const withoutBreak = [makeSlot({ id: 'a' })];
    const withBreak = [makeSlot({ id: 'a' }), makeSlot({ id: 'recess', kind: 'break', label: 'Recess' })];
    expect(normalizeSignature(withoutBreak)).toBe(normalizeSignature(withBreak));
  });
});

describe('timetable comparison', () => {
  it('reports added, removed, time and room changes', () => {
    const current = [
      makeSlot({ id: 'os', subjectId: 'sub_os', dayOfWeek: 1, startTime: '10:00', endTime: '11:00', room: 'C-204' }),
      makeSlot({ id: 'maths', subjectId: 'sub_maths', dayOfWeek: 2, startTime: '11:00', endTime: '12:00' }),
      makeSlot({ id: 'lab', subjectId: 'sub_lab', dayOfWeek: 5, startTime: '14:00', endTime: '16:00' }),
    ];

    const incoming = [
      makeSlot({ id: 'os2', subjectId: 'sub_os', dayOfWeek: 1, startTime: '11:00', endTime: '12:00', room: 'C-108' }),
      makeSlot({ id: 'db', subjectId: 'sub_db', dayOfWeek: 5, startTime: '14:00', endTime: '15:00' }),
    ];

    const diffs = diffTemplates(current, incoming);
    const kinds = diffs.map((diff) => `${diff.kind}:${diff.subjectId}`);

    expect(kinds).toContain('time_changed:sub_os');
    expect(kinds).toContain('room_changed:sub_os');
    expect(kinds).toContain('added:sub_db');
    expect(kinds).toContain('removed:sub_maths');
    expect(kinds).toContain('removed:sub_lab');
  });
});

/* ------------------------------------------------------------------ *
 * Regeneration boundary                                               *
 * ------------------------------------------------------------------ */

describe('future generation range', () => {
  it('never regenerates the past when materialising a restored version', () => {
    const range = futureGenerationRange(SEMESTER, new Date('2026-10-02T09:00:00'), 30);
    expect(range.from).toBe('2026-10-02');
    expect(range.skippedPast).toBe(true);
    expect(range.to).toBe('2026-11-01');
  });

  it('starts at the semester start for a brand-new semester', () => {
    const range = futureGenerationRange(SEMESTER, new Date('2026-08-15T09:00:00'), 30);
    expect(range.from).toBe('2026-09-01');
  });

  it('clamps the horizon to the semester end date', () => {
    const range = futureGenerationRange(SEMESTER, new Date('2026-12-01T09:00:00'), 90);
    expect(range.to).toBe('2026-12-20');
  });
});

/* ------------------------------------------------------------------ *
 * Homework-style checks on generated data structures                  *
 * ------------------------------------------------------------------ */

describe('generated occurrences feed the attendance engine cleanly', () => {
  it('gives each generated class a positive weight', () => {
    const { occurrences } = generate({ slots: [makeSlot({ periodCount: 2, classType: 'lab' })] });
    expect(occurrences.every((o: ClassOccurrence) => o.periodCount >= 1)).toBe(true);
  });

  it('produces a stable ordering key per date', () => {
    const { occurrences } = generate({
      slots: [makeSlot({ dayOfWeek: 1, startTime: '08:00' }), makeSlot({ dayOfWeek: 1, startTime: '10:00' })],
      from: '2026-09-07',
      to: '2026-09-07',
    });
    const times: DateKey[] = occurrences.map((o) => o.startTime as DateKey);
    expect([...times].sort()).toEqual(['08:00', '10:00']);
  });
});
