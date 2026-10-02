/**
 * Engine tests. These pin the attendance rules the whole app depends on, so a
 * refactor that quietly changes the maths fails here first.
 */
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
  simulateLeave,
  summarize,
  type AttendanceSummary,
  type SimulationContext,
} from './attendance';
import type {
  AttendanceRecord,
  AttendanceStatus,
  ClassOccurrence,
  ScheduleStatus,
  Subject,
} from '@/types/domain';

/* ------------------------------------------------------------------ *
 * Fixtures                                                            *
 * ------------------------------------------------------------------ */

function subject(overrides: Partial<Subject> = {}): Subject {
  return {
    id: 'sub-dsa',
    semesterId: 'sem',
    name: 'Data Structures & Algorithms',
    shortName: 'DSA',
    subjectCode: 'CS-201',
    faculty: 'Prof. A. Mehta',
    defaultRoom: 'C-203',
    classType: 'theory',
    attendanceCountMode: 'period',
    targetPercentage: null,
    colorKey: 'indigo',
    archived: false,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function occurrence(
  index: number,
  overrides: Partial<ClassOccurrence> = {},
): ClassOccurrence {
  const day = String((index % 27) + 1).padStart(2, '0');
  const date = `2026-08-${day}`;
  return {
    id: `occ-${index}`,
    semesterId: 'sem',
    subjectId: 'sub-dsa',
    date,
    startTime: '09:00',
    endTime: '10:00',
    startDateTime: `${date}T09:00:00.000Z`,
    endDateTime: `${date}T10:00:00.000Z`,
    room: 'C-203',
    facultyOverride: null,
    classType: 'theory',
    periodCount: 1,
    occurrenceType: 'regular',
    scheduleStatus: 'completed',
    sourceTimetableSlotId: null,
    replacedOccurrenceId: null,
    notes: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function record(
  target: ClassOccurrence,
  status: AttendanceStatus,
  weight = 1,
): AttendanceRecord {
  return {
    id: `rec-${target.id}`,
    occurrenceId: target.id,
    subjectId: target.subjectId,
    semesterId: target.semesterId,
    date: target.date,
    status,
    weight,
    markedAt: '2026-08-01T00:00:00.000Z',
    source: 'seed',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };
}

const weightOf = (s: Subject) => (o: ClassOccurrence) => attendanceWeight(s, o);

/** Build `present`/`absent` history directly through real units. */
function base(
  counted: { present: number; absent: number },
  target = 75,
): { summary: AttendanceSummary; context: SimulationContext } {
  const occurrences: ClassOccurrence[] = [];
  const records: AttendanceRecord[] = [];
  let index = 0;
  for (let i = 0; i < counted.present; i += 1) {
    const occ = occurrence(index++);
    occurrences.push(occ);
    records.push(record(occ, 'present'));
  }
  for (let i = 0; i < counted.absent; i += 1) {
    const occ = occurrence(index++);
    occurrences.push(occ);
    records.push(record(occ, 'absent'));
  }
  const summary = summarize(buildUnits(occurrences, records), target, '2026-09-01');
  return { summary, context: { summary, target, upcomingWeights: [] } };
}

const TODAY = '2026-09-01';

/* ------------------------------------------------------------------ *
 * Percentage + summarising                                            *
 * ------------------------------------------------------------------ */

describe('percentageOf', () => {
  it('never returns NaN or Infinity', () => {
    expect(percentageOf(0, 0)).toBeNull();
    expect(percentageOf(5, 0)).toBeNull();
    expect(percentageOf(-1, 0)).toBeNull();
  });

  it('computes P / C × 100', () => {
    expect(percentageOf(3, 4)).toBe(75);
    expect(percentageOf(83, 98)).toBeCloseTo(84.6938, 3);
  });
});

describe('summarize', () => {
  it('counts present as P and C, absent as C only', () => {
    const summary = summarize(
      buildUnits(
        [occurrence(1), occurrence(2), occurrence(3)],
        [record(occurrence(1), 'present'), record(occurrence(2), 'present'), record(occurrence(3), 'absent')],
      ),
      75,
      TODAY,
    );
    expect(summary.attended).toBe(2);
    expect(summary.conducted).toBe(3);
    expect(summary.missed).toBe(1);
    expect(summary.percentage).toBeCloseTo(66.666, 2);
  });

  it('excludes cancelled, not conducted and holiday classes entirely', () => {
    const statuses: ScheduleStatus[] = ['cancelled', 'not_conducted', 'holiday'];
    const cancelled = statuses.map((status, i) => occurrence(10 + i, { scheduleStatus: status }));

    const summary = summarize(
      buildUnits([...cancelled, occurrence(20)], [record(occurrence(20), 'present')]),
      75,
      TODAY,
    );

    expect(summary.attended).toBe(1);
    expect(summary.conducted).toBe(1);
    expect(summary.cancelledClasses).toBe(3); // counted, but never weighted
    expect(summary.missed).toBe(0);
    expect(summary.percentage).toBe(100);
  });

  it('leaves unmarked classes unresolved (they lower confidence, not percentage)', () => {
    const marked = occurrence(30);
    const unmarked = occurrence(31);
    const summary = summarize(
      buildUnits([marked, unmarked], [record(marked, 'present')]),
      75,
      TODAY,
    );
    expect(summary.attended).toBe(1);
    expect(summary.conducted).toBe(1);
    expect(summary.percentage).toBe(100);
    expect(summary.unresolvedClasses).toBe(1);
    expect(summary.confidence).toBe(50);
  });

  it('ignores a replaced original — the replacement carries the weight', () => {
    // A replaced original never receives an attendance record.
    const replaced = occurrence(40, { scheduleStatus: 'replaced' });
    const summary = summarize(buildUnits([replaced], []), 75, TODAY);
    expect(summary.conducted).toBe(0);
    expect(summary.percentage).toBeNull();
    expect(summary.health).toBe('no_data');
  });

  it('weights a two-period lab by two units, and weighs a session by one', () => {
    const lab = occurrence(50, { periodCount: 2, classType: 'lab' });
    const periodSubject = subject({ classType: 'lab', attendanceCountMode: 'period' });
    const sessionSubject = subject({ classType: 'lab', attendanceCountMode: 'session' });

    expect(attendanceWeight(periodSubject, lab)).toBe(2);
    expect(attendanceWeight(sessionSubject, lab)).toBe(1);

    const perPeriod = summarize(
      buildUnits([lab], [record(lab, 'present', 2)], weightOf(periodSubject)),
      75,
      TODAY,
    );
    const perSession = summarize(
      buildUnits([lab], [record(lab, 'present', 1)], weightOf(sessionSubject)),
      75,
      TODAY,
    );

    expect(perPeriod.conducted).toBe(2);
    expect(perPeriod.attended).toBe(2);
    expect(perSession.conducted).toBe(1);
    expect(perSession.attended).toBe(1);
  });
});

/* ------------------------------------------------------------------ *
 * Status classification                                               *
 * ------------------------------------------------------------------ */

describe('classifyAttendance', () => {
  it('is critical below target', () => {
    expect(classifyAttendance(68.4, 75).health).toBe('critical');
  });

  it('is warning inside the margin band, or when no safe miss remains', () => {
    expect(classifyAttendance(76.2, 75).health).toBe('warning');
    expect(classifyAttendance(80, 75).health).toBe('warning'); // exactly 5 points
    expect(classifyAttendance(85, 75).health).toBe('safe');
    expect(classifyAttendance(95, 75, 0).health).toBe('warning'); // no buffer left
    expect(classifyAttendance(95, 75, 4).health).toBe('safe');
  });

  it('reports no data instead of dividing by zero', () => {
    expect(classifyAttendance(null, 75).health).toBe('no_data');
  });
});

/* ------------------------------------------------------------------ *
 * Simulators                                                          *
 * ------------------------------------------------------------------ */

describe('projectWithNextClass', () => {
  it('adds a present class to both P and C', () => {
    const { context } = base({ present: 41, absent: 9 });
    const projected = projectWithNextClass({ ...context, upcomingWeights: [1] }, 'present');
    expect(projected.attended).toBe(42);
    expect(projected.conducted).toBe(51);
    expect(projected.percentage).toBeCloseTo(82.35, 2);
    expect(projected.delta).toBeGreaterThan(0);
  });

  it('adds an absent class to C only', () => {
    const { context } = base({ present: 41, absent: 9 });
    const projected = projectWithNextClass({ ...context, upcomingWeights: [1] }, 'absent');
    expect(projected.attended).toBe(41);
    expect(projected.conducted).toBe(51);
    expect(projected.percentage).toBeCloseTo(80.39, 2);
    expect(projected.delta).toBeLessThan(0);
  });

  it('consumes two units of buffer for a two-period lab', () => {
    const { context } = base({ present: 41, absent: 9 }); // 82%
    const lab = projectWithNextClass({ ...context, upcomingWeights: [2] }, 'absent');
    expect(lab.conducted).toBe(52);
    expect(lab.attended).toBe(41);
    expect(lab.percentage).toBeCloseTo(78.85, 2);
  });
});

describe('countSafeMisses', () => {
  it('counts how many future absences stay above target', () => {
    // 80 / 100 = 80%: each miss keeps the student above 75% until the sixth
    // (80/106 = 75.5% still safe, and the list runs out after six).
    expect(countSafeMisses({ attended: 80, conducted: 100 }, [1, 1, 1, 1, 1, 1], 75)).toBe(6);
    expect(countSafeMisses({ attended: 80, conducted: 100 }, [1, 1, 1, 1, 1, 1, 1], 75)).toBe(6);
  });

  it('is zero once a single absence would break the target', () => {
    expect(countSafeMisses({ attended: 75, conducted: 100 }, [1, 1, 1], 75)).toBe(0);
  });

  it('stops early when a heavy lab would break the target', () => {
    // 76 / 100 = 76%: a 2-unit lab takes it to 74.5% → no safe miss left.
    expect(countSafeMisses({ attended: 76, conducted: 100 }, [2, 1, 1], 75)).toBe(0);
    // Three classes: the 2-unit lab then two singles — 80/104 = 76.9% is safe.
    expect(countSafeMisses({ attended: 80, conducted: 100 }, [2, 1, 1], 75)).toBe(3);
  });

  it('is zero when the student is already below target', () => {
    expect(countSafeMisses({ attended: 70, conducted: 100 }, [1, 1], 75)).toBe(0);
  });
});

describe('recoveryPlan', () => {
  it('returns no work when already at target', () => {
    const { context } = base({ present: 8, absent: 2 });
    const plan = recoveryPlan(context);
    expect(plan.classes).toBe(0);
    expect(plan.units).toBe(0);
    expect(plan.unreachable).toBe(false);
  });

  it('simulates consecutive attendance over real future weights', () => {
    // 74 / 100 = 74% → needs 4 units to reach 75%.
    const occurrences: ClassOccurrence[] = [];
    const records: AttendanceRecord[] = [];
    for (let i = 0; i < 74; i += 1) {
      const occ = occurrence(i);
      occurrences.push(occ);
      records.push(record(occ, 'present'));
    }
    for (let i = 0; i < 26; i += 1) {
      const occ = occurrence(100 + i);
      occurrences.push(occ);
      records.push(record(occ, 'absent'));
    }
    const summary = summarize(buildUnits(occurrences, records), 75, TODAY);
    expect(summary.percentage).toBe(74);

    const withTwoLabs = recoveryPlan({ summary, target: 75, upcomingWeights: [2, 2, 1, 1] });
    expect(withTwoLabs.units).toBe(4);
    expect(withTwoLabs.classes).toBe(2); // two 2-period labs
    expect(withTwoLabs.projected).toBeCloseTo(75, 2);
    expect(withTwoLabs.unreachable).toBe(false);

    const withSingles = recoveryPlan({ summary, target: 75, upcomingWeights: [1, 1, 1, 1, 1, 1] });
    expect(withSingles.units).toBe(4);
    expect(withSingles.classes).toBe(4); // same units, but four classes
  });

  it('reports unreachable when the remaining timetable cannot close the gap', () => {
    const { summary } = base({ present: 25, absent: 75 }); // 25%
    const plan = recoveryPlan({ summary, target: 75, upcomingWeights: [1, 1] });
    expect(plan.unreachable).toBe(true);
    expect(plan.projected).toBeLessThan(75);
  });
});

describe('recoveryForecast', () => {
  it('returns the date of the class that restores the target', () => {
    const { summary } = base({ present: 74, absent: 26 }); // 74%
    const forecast = recoveryForecast(
      { summary, target: 75, upcomingWeights: [] },
      [
        { date: '2026-09-02', weight: 2 },
        { date: '2026-09-04', weight: 2 },
        { date: '2026-09-08', weight: 1 },
      ],
    );
    // The first 2-unit lab only lifts 74% to 74.5%; the second one reaches 75%.
    expect(forecast.date).toBe('2026-09-04');
    expect(forecast.classesNeeded).toBe(2);
    expect(forecast.projected).toBeGreaterThanOrEqual(75);
    expect(forecast.unreachable).toBe(false);
  });

  it('marks the forecast unreachable when the schedule is too short', () => {
    const { summary } = base({ present: 40, absent: 60 }); // 40%
    const forecast = recoveryForecast({ summary, target: 75, upcomingWeights: [] }, [
      { date: '2026-09-02', weight: 1 },
    ]);
    expect(forecast.unreachable).toBe(true);
    expect(forecast.date).toBeNull();
  });
});

describe('simulateLeave', () => {
  const healthy = base({ present: 90, absent: 10 }); // 90%
  const fragile = base({ present: 77, absent: 23 }); // 77%

  it('previews a full day off without persisting anything', () => {
    const result = simulateLeave('2026-09-10', [
      {
        subject: subject({ id: 'a', name: 'Data Structures' }),
        summary: healthy.summary,
        affectedUnits: 1,
        globalTarget: 75,
      },
      {
        subject: subject({ id: 'b', name: 'Operating Systems' }),
        summary: fragile.summary,
        affectedUnits: 1,
        globalTarget: 75,
      },
    ]);

    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]!.after).toBeLessThan(result.lines[0]!.before!);
    expect(result.belowTargetAfter).toEqual([]);
    expect(result.newlyBreaking).toEqual([]);
  });

  it('flags subjects the leave would push below target', () => {
    const result = simulateLeave('2026-09-10', [
      {
        subject: subject({ id: 'b', name: 'Operating Systems' }),
        summary: fragile.summary,
        affectedUnits: 3,
        globalTarget: 75,
      },
    ]);
    expect(result.lines[0]!.after).toBeCloseTo((77 / 103) * 100, 2);
    expect(result.newlyBreaking).toEqual(['Operating Systems']);
  });

  it('ignores subjects with no affected classes', () => {
    const result = simulateLeave('2026-09-10', [
      { subject: subject(), summary: healthy.summary, affectedUnits: 0, globalTarget: 75 },
    ]);
    expect(result.lines).toHaveLength(0);
    expect(result.totalClasses).toBe(0);
  });
});

/* ------------------------------------------------------------------ *
 * Aggregates + confidence                                             *
 * ------------------------------------------------------------------ */

describe('aggregate', () => {
  it('sums every subject into one overall figure', () => {
    const a = base({ present: 23, absent: 3 }).summary; // DSA 26
    const b = base({ present: 10, absent: 3 }).summary; // OS 13
    const stats = aggregate([a, b], 75);
    expect(stats.attended).toBe(33);
    expect(stats.conducted).toBe(39);
    expect(stats.percentage).toBeCloseTo((33 / 39) * 100, 2);
  });

  it('reports no data rather than NaN for an empty semester', () => {
    const stats = aggregate([], 75);
    expect(stats.percentage).toBeNull();
    expect(stats.health).toBe('no_data');
  });
});

describe('dataConfidence', () => {
  it('is 100% when every past class is resolved', () => {
    const past = [occurrence(1), occurrence(2)];
    const confidence = dataConfidence(
      past,
      [record(past[0]!, 'present'), record(past[1]!, 'absent')],
      TODAY,
    );
    expect(confidence.percent).toBe(100);
    expect(confidence.missingClasses).toBe(0);
  });

  it('counts unmarked past classes as missing', () => {
    const past = [occurrence(1), occurrence(2), occurrence(3), occurrence(4)];
    const confidence = dataConfidence(past, [record(past[0]!, 'present'), record(past[1]!, 'present')], TODAY);
    expect(confidence.percent).toBe(50);
    expect(confidence.missingClasses).toBe(2);
  });

  it('treats an explicit cancellation as resolved, not missing', () => {
    const past = [occurrence(1), occurrence(2, { scheduleStatus: 'cancelled' })];
    const confidence = dataConfidence(past, [record(past[0]!, 'present')], TODAY);
    expect(confidence.percent).toBe(100);
    expect(confidence.missingClasses).toBe(0);
  });

  it('ignores future classes and replaced originals', () => {
    const future = occurrence(5, { date: '2026-12-01' });
    const replaced = occurrence(6, { scheduleStatus: 'replaced' });
    const past = occurrence(7);
    const confidence = dataConfidence(
      [future, replaced, past],
      [record(past, 'present')],
      TODAY,
    );
    expect(confidence.percent).toBe(100);
  });

  it('is 100% before the semester has any history', () => {
    expect(dataConfidence([], [], TODAY).percent).toBe(100);
  });
});
