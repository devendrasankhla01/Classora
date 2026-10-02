import { describe, expect, it } from 'vitest';

import {
  aggregate,
  attendanceWeight,
  buildUnits,
  classifyAttendance,
  countSafeMisses,
  dataConfidence,
  percentageOf,
  projectWithNextClass,
  recoveryForecast,
  recoveryPlan,
  safeMisses,
  simulateLeave,
  summarize,
  type SimulationContext,
} from './attendance';
import type {
  AttendanceRecord,
  AttendanceStatus,
  ClassOccurrence,
  DateKey,
  ScheduleStatus,
  Subject,
} from '@/types/domain';

/* ------------------------------------------------------------------ *
 * Fixtures                                                            *
 * ------------------------------------------------------------------ */

const TODAY: DateKey = '2026-10-02';

function makeSubject(overrides: Partial<Subject> = {}): Subject {
  return {
    id: 'sub_1',
    semesterId: 'sem_1',
    name: 'Operating Systems',
    shortName: 'OS',
    subjectCode: 'CS-204',
    faculty: 'Dr. R. Kulkarni',
    defaultRoom: 'C-204',
    classType: 'theory',
    attendanceCountMode: 'period',
    targetPercentage: null,
    colorKey: 'indigo',
    archived: false,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

let occurrenceCounter = 0;
function makeOccurrence(overrides: Partial<ClassOccurrence> = {}): ClassOccurrence {
  occurrenceCounter += 1;
  const date = overrides.date ?? TODAY;
  const startTime = overrides.startTime ?? '10:00';
  const endTime = overrides.endTime ?? '11:00';
  return {
    id: `occ_${occurrenceCounter}`,
    semesterId: 'sem_1',
    subjectId: 'sub_1',
    date,
    startTime,
    endTime,
    startDateTime: `${date}T${startTime}:00.000Z`,
    endDateTime: `${date}T${endTime}:00.000Z`,
    room: 'C-204',
    facultyOverride: null,
    classType: 'theory',
    periodCount: 1,
    occurrenceType: 'regular',
    scheduleStatus: 'scheduled',
    sourceTimetableSlotId: 'slot_1',
    replacedOccurrenceId: null,
    notes: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeRecord(
  occurrenceId: string,
  status: AttendanceStatus,
  weight = 1,
  date: DateKey = TODAY,
): AttendanceRecord {
  return {
    id: `rec_${occurrenceId}_${status}`,
    occurrenceId,
    subjectId: 'sub_1',
    semesterId: 'sem_1',
    date,
    status,
    weight,
    markedAt: `${date}T12:00:00.000Z`,
    source: 'user',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };
}

/** Build `count` occurrences with the given statuses, in order. */
function scenario(
  entries: { status: AttendanceStatus; weight?: number; scheduleStatus?: ScheduleStatus }[],
  weightOf?: (occurrence: ClassOccurrence) => number,
): { occurrences: ClassOccurrence[]; records: AttendanceRecord[] } {
  const occurrences: ClassOccurrence[] = [];
  const records: AttendanceRecord[] = [];

  entries.forEach((entry, index) => {
    const occurrence = makeOccurrence({
      date: `2026-09-${String(index + 1).padStart(2, '0')}`,
      periodCount: entry.weight ?? 1,
      scheduleStatus: entry.scheduleStatus ?? 'scheduled',
    });
    occurrences.push(occurrence);
    if (entry.status !== 'unmarked') {
      records.push(makeRecord(occurrence.id, entry.status, entry.weight ?? 1, occurrence.date));
    }
  });

  void weightOf;
  return { occurrences, records };
}

function contextFrom(
  entries: { status: AttendanceStatus; weight?: number; scheduleStatus?: ScheduleStatus }[],
  upcomingWeights: number[],
  target = 75,
): SimulationContext {
  const { occurrences, records } = scenario(entries);
  const summary = summarize(buildUnits(occurrences, records), target, TODAY);
  return { summary, target, upcomingWeights };
}

/* ------------------------------------------------------------------ *
 * Core percentage maths                                              *
 * ------------------------------------------------------------------ */

describe('attendance percentage', () => {
  it('computes attended / conducted * 100 from raw units', () => {
    expect(percentageOf(83, 98)).toBeCloseTo(84.6938, 3);
  });

  it('returns null (never NaN/Infinity) when nothing was conducted', () => {
    expect(percentageOf(0, 0)).toBeNull();
    expect(percentageOf(5, 0)).toBeNull();
    expect(percentageOf(0, -3)).toBeNull();
  });

  it('counts present in both numerator and denominator, absent only in denominator', () => {
    const { occurrences, records } = scenario([
      { status: 'present' },
      { status: 'absent' },
      { status: 'present' },
      { status: 'present' },
    ]);
    const summary = summarize(buildUnits(occurrences, records), 75, TODAY);
    expect(summary.attended).toBe(3);
    expect(summary.conducted).toBe(4);
    expect(summary.missed).toBe(1);
    expect(summary.percentage).toBeCloseTo(75, 5);
  });
});

/* ------------------------------------------------------------------ *
 * Weighted labs                                                       *
 * ------------------------------------------------------------------ */

describe('weighted lab periods', () => {
  const lab = makeSubject({ attendanceCountMode: 'period', classType: 'lab' });
  const labSession = makeSubject({ attendanceCountMode: 'session', classType: 'lab' });

  it('counts period-based labs by their period count', () => {
    const occurrence = makeOccurrence({ periodCount: 2 });
    expect(attendanceWeight(lab, occurrence)).toBe(2);
  });

  it('counts session-based labs as a single unit however long they run', () => {
    const occurrence = makeOccurrence({ periodCount: 2 });
    expect(attendanceWeight(labSession, occurrence)).toBe(1);
  });

  it('respects weight when summarising a 2-period lab', () => {
    const subject = makeSubject({ attendanceCountMode: 'period' });
    const occurrence = makeOccurrence({ periodCount: 2, id: 'lab_occ', date: '2026-09-01' });
    const record = makeRecord('lab_occ', 'absent', attendanceWeight(subject, occurrence), '2026-09-01');

    const summary = summarize(
      buildUnits([occurrence], [record], (o) => attendanceWeight(subject, o)),
      75,
      TODAY,
    );

    expect(summary.conducted).toBe(2);
    expect(summary.attended).toBe(0);
    expect(summary.percentage).toBe(0);
  });

  it('lets a heavier lab satisfy the recovery requirement in fewer classes', () => {
    // 74/100 = 74%; (74+k)/(100+k) >= 0.75 needs 4 units of recovery.
    const base = { ...summarize(buildUnits([], []), 75, TODAY), attended: 74, conducted: 100, percentage: 74 };

    const withLabs = recoveryPlan({
      summary: base,
      target: 75,
      upcomingWeights: [2, 2, 1, 1],
    });
    const withLectures = recoveryPlan({
      summary: base,
      target: 75,
      upcomingWeights: [1, 1, 1, 1],
    });

    // Same 4 units required, but two 2-period labs get there in 2 classes.
    expect(withLabs.units).toBe(4);
    expect(withLabs.classes).toBe(2);
    expect(withLabs.projected).toBeCloseTo(75, 5);

    expect(withLectures.units).toBe(4);
    expect(withLectures.classes).toBe(4);
    expect(withLectures.projected).toBeCloseTo(75, 5);
  });
});

/* ------------------------------------------------------------------ *
 * Excluded states                                                     *
 * ------------------------------------------------------------------ */

describe('excluded class states', () => {
  it('excludes cancelled classes from the denominator', () => {
    const { occurrences, records } = scenario([
      { status: 'present' },
      { status: 'unmarked', scheduleStatus: 'cancelled' },
      { status: 'unmarked', scheduleStatus: 'cancelled' },
    ]);
    const summary = summarize(buildUnits(occurrences, records), 75, TODAY);
    expect(summary.conducted).toBe(1);
    expect(summary.percentage).toBe(100);
    expect(summary.cancelledClasses).toBe(2);
  });

  it('excludes not-conducted classes', () => {
    const { occurrences, records } = scenario([
      { status: 'present' },
      { status: 'unmarked', scheduleStatus: 'not_conducted' },
    ]);
    const summary = summarize(buildUnits(occurrences, records), 75, TODAY);
    expect(summary.conducted).toBe(1);
    expect(summary.percentage).toBe(100);
  });

  it('excludes holidays', () => {
    const { occurrences, records } = scenario([{ status: 'unmarked', scheduleStatus: 'holiday' }]);
    const summary = summarize(buildUnits(occurrences, records), 75, TODAY);
    expect(summary.conducted).toBe(0);
    expect(summary.percentage).toBeNull();
  });

  it('never counts a replaced original class', () => {
    const original = makeOccurrence({ id: 'orig', date: '2026-09-01', scheduleStatus: 'replaced' });
    const replacement = makeOccurrence({
      id: 'repl',
      date: '2026-09-01',
      occurrenceType: 'replacement',
      scheduleStatus: 'completed',
      replacedOccurrenceId: 'orig',
      subjectId: 'sub_os',
    });
    const records = [
      makeRecord('orig', 'absent', 1, '2026-09-01'),
      makeRecord('repl', 'present', 1, '2026-09-01'),
    ];

    const summary = summarize(buildUnits([original, replacement], records), 75, TODAY);
    expect(summary.conducted).toBe(1);
    expect(summary.attended).toBe(1);
    expect(summary.percentage).toBe(100);
  });

  it('counts an extra class like any other conducted class', () => {
    const extra = makeOccurrence({ id: 'extra', occurrenceType: 'extra', date: '2026-09-01' });
    const summary = summarize(buildUnits([extra], [makeRecord('extra', 'present', 1, '2026-09-01')]), 75, TODAY);
    expect(summary.conducted).toBe(1);
    expect(summary.percentage).toBe(100);
  });
});

/* ------------------------------------------------------------------ *
 * Unmarked & confidence                                               *
 * ------------------------------------------------------------------ */

describe('unmarked attendance', () => {
  it('does not treat an unmarked past class as absent', () => {
    const { occurrences, records } = scenario([
      { status: 'present' },
      { status: 'present' },
      { status: 'unmarked' },
    ]);
    const summary = summarize(buildUnits(occurrences, records), 75, TODAY);
    expect(summary.conducted).toBe(2);
    expect(summary.percentage).toBe(100);
    expect(summary.unresolvedClasses).toBe(1);
  });

  it('reduces data confidence when past classes are unresolved', () => {
    const { occurrences, records } = scenario([
      { status: 'present' },
      { status: 'present' },
      { status: 'present' },
      { status: 'unmarked' },
    ]);
    expect(dataConfidence(occurrences, records, TODAY).percent).toBe(75);
    expect(dataConfidence(occurrences, records, TODAY).missingClasses).toBe(1);
  });

  it('reports full confidence when every past decision is made', () => {
    const { occurrences, records } = scenario([
      { status: 'present' },
      { status: 'absent' },
      { status: 'unmarked', scheduleStatus: 'cancelled' },
    ]);
    expect(dataConfidence(occurrences, records, TODAY).percent).toBe(100);
    expect(dataConfidence(occurrences, records, TODAY).missingClasses).toBe(0);
  });
});

/* ------------------------------------------------------------------ *
 * Projections                                                         *
 * ------------------------------------------------------------------ */

describe('present / absent projection', () => {
  const context = contextFrom(
    [
      { status: 'absent' },
      { status: 'absent' },
      { status: 'absent' },
      { status: 'absent' },
      { status: 'present' },
      { status: 'present' },
      { status: 'present' },
      { status: 'present' },
    ],
    [1, 1, 1, 1, 2],
    // 4 present / 8 conducted = 50%
  );

  it('projects an improved score when the next class is attended', () => {
    const projection = projectWithNextClass(context, 'present');
    expect(projection.conducted).toBe(9);
    expect(projection.percentage).toBeCloseTo(55.555, 2);
    expect(projection.delta).toBeGreaterThan(0);
  });

  it('projects a reduced score when the next class is missed', () => {
    const projection = projectWithNextClass(context, 'absent');
    expect(projection.conducted).toBe(9);
    expect(projection.percentage).toBeCloseTo(44.444, 2);
    expect(projection.delta).toBeLessThan(0);
  });
});

/* ------------------------------------------------------------------ *
 * Safe misses & recovery                                              *
 * ------------------------------------------------------------------ */

describe('safe misses', () => {
  it('counts how many upcoming classes can be missed while staying at target', () => {
    // 84/100 = 84%, target 75 → 12 more units of absence are absorbable.
    expect(countSafeMisses({ attended: 84, conducted: 100 }, new Array(20).fill(1), 75)).toBe(12);
  });

  it('accounts for heavier units (a 2-period lab consumes two units of buffer)', () => {
    // 84/100 = 84% is comfortably above 75%, so two labs plus a lecture fit.
    expect(countSafeMisses({ attended: 84, conducted: 100 }, [2, 2, 1], 75)).toBe(3);

    // 76/100 = 76% leaves only a single unit of buffer, so a 2-period lab
    // cannot be missed where a 1-period lecture still could.
    expect(countSafeMisses({ attended: 76, conducted: 100 }, [1, 1, 1], 75)).toBe(1);
    expect(countSafeMisses({ attended: 76, conducted: 100 }, [2, 2, 1], 75)).toBe(0);
  });

  it('never returns a negative number when already below target', () => {
    expect(countSafeMisses({ attended: 60, conducted: 100 }, [1, 1, 1], 75)).toBe(0);
    expect(safeMisses(contextFrom([{ status: 'absent' }], [1, 1]))).toBe(0);
  });

  it('is zero when there is no upcoming schedule to absorb misses', () => {
    expect(countSafeMisses({ attended: 84, conducted: 100 }, [], 75)).toBe(0);
  });
});

describe('recovery plan', () => {
  it('reports zero when already at or above target', () => {
    const plan = recoveryPlan(contextFrom([{ status: 'present' }, { status: 'present' }], [1, 1]));
    expect(plan.classes).toBe(0);
    expect(plan.units).toBe(0);
    expect(plan.unreachable).toBe(false);
  });

  it('computes the minimum consecutive classes to reach target', () => {
    // 75/100 = 75% exactly → nothing needed at target 75.
    expect(recoveryPlan(contextFrom([{ status: 'present' }], [1])).classes).toBe(0);

    // 72/100 = 72%, target 75 → (72+k)/(100+k) >= 0.75 needs k >= 12.
    const below = recoveryPlan({
      summary: { ...summarize(buildUnits([], []), 75, TODAY), attended: 72, conducted: 100, percentage: 72 },
      target: 75,
      upcomingWeights: new Array(20).fill(1),
    });
    expect(below.units).toBe(12);
    expect(below.classes).toBe(12);
    expect(below.projected).toBeCloseTo(75, 5);
  });

  it('flags an unreachable recovery when the remaining schedule is too short', () => {
    const plan = recoveryPlan({
      summary: { ...summarize(buildUnits([], []), 75, TODAY), attended: 10, conducted: 100, percentage: 10 },
      target: 75,
      upcomingWeights: [1, 1],
    });
    expect(plan.unreachable).toBe(true);
  });

  it('forecasts the calendar date the target is regained', () => {
    const forecast = recoveryForecast(
      {
        summary: { ...summarize(buildUnits([], []), 75, TODAY), attended: 70, conducted: 100, percentage: 70 },
        target: 75,
        upcomingWeights: new Array(20).fill(1),
      },
      Array.from({ length: 8 }, (_, index) => ({
        date: `2026-10-${String(index + 5).padStart(2, '0')}`,
        weight: 1,
      })),
    );
    // (70+k)/(100+k) >= 0.75 → k >= 20. Only 8 classes available → unreachable.
    expect(forecast.unreachable).toBe(true);

    const reachable = recoveryForecast(
      {
        summary: { ...summarize(buildUnits([], []), 75, TODAY), attended: 74, conducted: 100, percentage: 74 },
        target: 75,
        upcomingWeights: new Array(20).fill(1),
      },
      Array.from({ length: 8 }, (_, index) => ({
        date: `2026-10-${String(index + 5).padStart(2, '0')}`,
        weight: 1,
      })),
    );
    // (74+k)/(100+k) >= 0.75 → k >= 4 → the 4th upcoming class, 8 October.
    expect(reachable.classesNeeded).toBe(4);
    expect(reachable.date).toBe('2026-10-08');
  });
});

/* ------------------------------------------------------------------ *
 * Status bands & target changes                                       *
 * ------------------------------------------------------------------ */

describe('status classification', () => {
  it('marks below-target as critical', () => {
    expect(classifyAttendance(68.4, 75).health).toBe('critical');
  });

  it('marks a thin margin above target as warning', () => {
    expect(classifyAttendance(76.2, 75).health).toBe('warning');
    expect(classifyAttendance(78.5, 75).health).toBe('warning');
  });

  it('marks a comfortable margin as safe', () => {
    expect(classifyAttendance(88.5, 75).health).toBe('safe');
  });

  it('warns when no safe miss remains even above target', () => {
    expect(classifyAttendance(80, 75, 0).health).toBe('warning');
  });

  it('reports no_data instead of guessing when nothing was conducted', () => {
    const result = classifyAttendance(null, 75);
    expect(result.health).toBe('no_data');
    expect(result.margin).toBe(0);
  });

  it('reclassifies everything when the target changes', () => {
    // Same 80% is safe at a 70% target, a thin margin at 78%, and failing at 85%.
    expect(classifyAttendance(80, 70).health).toBe('safe');
    expect(classifyAttendance(80, 78).health).toBe('warning');
    expect(classifyAttendance(80, 85).health).toBe('critical');
  });
});

/* ------------------------------------------------------------------ *
 * Leave simulation                                                    *
 * ------------------------------------------------------------------ */

describe('leave simulation', () => {
  it('simulates a full day of absences without saving anything', () => {
    const result = simulateLeave('2026-10-09', [
      {
        subject: makeSubject({ id: 'dsa', name: 'Data Structures & Algorithms', shortName: 'DSA' }),
        summary: {
          ...summarize(buildUnits([], []), 75, TODAY),
          attended: 44,
          conducted: 50,
          percentage: 88,
        },
        affectedUnits: 1,
        globalTarget: 75,
      },
      {
        subject: makeSubject({ id: 'dm', name: 'Discrete Mathematics', shortName: 'DM' }),
        summary: {
          ...summarize(buildUnits([], []), 75, TODAY),
          attended: 13,
          conducted: 19,
          percentage: 68.42,
        },
        affectedUnits: 2,
        globalTarget: 75,
      },
    ]);

    expect(result.totalClasses).toBe(3);
    expect(result.lines).toHaveLength(2);
    const discrete = result.lines.find((line) => line.subjectId === 'dm');
    expect(discrete?.after).toBeCloseTo(61.9, 1);
    expect(discrete?.healthAfter).toBe('critical');
    expect(result.belowTargetAfter).toContain('Discrete Mathematics');
    // Already critical beforehand, so the leave does not *newly* break it.
    expect(result.newlyBreaking).not.toContain('Discrete Mathematics');
  });

  it('ignores classes outside the leave window (partial-day leave)', () => {
    const result = simulateLeave('2026-10-09', [
      {
        subject: makeSubject({ id: 'os' }),
        summary: { ...summarize(buildUnits([], []), 75, TODAY), attended: 32, conducted: 42, percentage: 76.19 },
        affectedUnits: 0, // trimmed out by the leave window
        globalTarget: 75,
      },
    ]);
    expect(result.lines).toHaveLength(0);
    expect(result.totalClasses).toBe(0);
  });
});

/* ------------------------------------------------------------------ *
 * Aggregates                                                          *
 * ------------------------------------------------------------------ */

describe('semester aggregate', () => {
  it('sums raw units across subjects before computing a percentage', () => {
    const a = scenario([
      { status: 'present', weight: 2 },
      { status: 'absent', weight: 2 },
    ]);
    const b = scenario([
      { status: 'present' },
      { status: 'present' },
    ]);

    const stats = aggregate(
      [
        summarize(buildUnits(a.occurrences, a.records), 75, TODAY),
        summarize(buildUnits(b.occurrences, b.records), 75, TODAY),
      ],
      75,
    );

    expect(stats.attended).toBe(4);
    expect(stats.conducted).toBe(6);
    expect(stats.percentage).toBeCloseTo(66.666, 2);
    expect(stats.missed).toBe(2);
  });

  it('is safe with no subjects at all', () => {
    const stats = aggregate([], 75);
    expect(stats.percentage).toBeNull();
    expect(stats.health).toBe('no_data');
    expect(stats.confidence).toBe(100);
  });
});
