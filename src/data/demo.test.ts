import { describe, expect, it } from 'vitest';

import { buildDemoDataset } from './demo';
import { aggregate, attendanceWeight, buildUnits, dataConfidence, summarize } from '@/lib/attendance';
import { todayKey } from '@/lib/date';
import type { ClassOccurrence, Subject } from '@/types/domain';

const NOW = new Date(2026, 9, 2, 12, 0, 0); // 2 October 2026, 12:00 local
const TODAY = todayKey(NOW);

function summarizeSubject(subject: Subject, occurrences: ClassOccurrence[], dataset: ReturnType<typeof buildDemoDataset>) {
  const subjectOccurrences = occurrences.filter((occurrence) => occurrence.subjectId === subject.id);
  const ids = new Set(subjectOccurrences.map((occurrence) => occurrence.id));
  const records = dataset.attendance.filter((record) => ids.has(record.occurrenceId));
  const units = buildUnits(subjectOccurrences, records, (occurrence) => attendanceWeight(subject, occurrence));
  return summarize(units, subject.targetPercentage ?? dataset.profile.attendanceTarget, TODAY);
}

describe('demo dataset', () => {
  const dataset = buildDemoDataset(NOW);

  it('seeds the semester, profile and five subjects', () => {
    expect(dataset.semester.name).toBe('Semester 5');
    expect(dataset.semester.isActive).toBe(true);
    expect(dataset.profile.name).toBe('Devendra');
    expect(dataset.profile.attendanceTarget).toBe(75);
    expect(dataset.subjects).toHaveLength(5);
    expect(dataset.versions.filter((version) => version.isCurrent)).toHaveLength(1);
  });

  it('produces the headline aggregate exactly: 83 attended / 15 missed / 98 conducted', () => {
    const summaries = dataset.subjects.map((subject) =>
      summarizeSubject(subject, dataset.occurrences, dataset),
    );
    const stats = aggregate(summaries, dataset.profile.attendanceTarget);

    expect(stats.attended).toBe(83);
    expect(stats.missed).toBe(15);
    expect(stats.conducted).toBe(98);
    expect(stats.percentage).toBeCloseTo(84.69, 1);
  });

  it('keeps every subject close to the design reference', () => {
    const expected: Record<string, number> = {
      'sub_demo_dsa': 88.5,
      'sub_demo_os': 76.9,
      'sub_demo_dm': 68.8,
      'sub_demo_cn': 85.7,
      'sub_demo_python': 93.1,
    };

    for (const subject of dataset.subjects) {
      const summary = summarizeSubject(subject, dataset.occurrences, dataset);
      const target = expected[subject.id]!;
      expect(summary.percentage, subject.shortName).not.toBeNull();
      expect(Math.abs((summary.percentage ?? 0) - target), subject.shortName).toBeLessThan(0.35);
    }
  });

  it('counts the 2-period lab as one session because the subject says so', () => {
    const python = dataset.subjects.find((subject) => subject.id === 'sub_demo_python')!;
    expect(python.attendanceCountMode).toBe('session');

    const summary = summarizeSubject(python, dataset.occurrences, dataset);
    // 29 sessions: 27 attended, 2 missed.
    expect(summary.conducted).toBe(29);
    expect(summary.attended).toBe(27);
  });

  it('leaves a few recent classes unmarked for the review workflow', () => {
    const summaries = dataset.subjects.map((subject) =>
      summarizeSubject(subject, dataset.occurrences, dataset),
    );
    const unresolved = summaries.reduce((sum, summary) => sum + summary.unresolvedClasses, 0);

    expect(unresolved).toBeGreaterThanOrEqual(3);
    expect(unresolved).toBeLessThanOrEqual(6);

    const confidence = dataConfidence(dataset.occurrences, dataset.attendance, TODAY);
    // Mostly complete history, but not perfect — as the design implies.
    expect(confidence.percent).toBeGreaterThan(85);
    expect(confidence.percent).toBeLessThan(100);
    expect(confidence.missingClasses).toBe(unresolved);
  });

  it('never counts the replaced Discrete Mathematics class again', () => {
    const replaced = dataset.occurrences.find(
      (occurrence) =>
        occurrence.date === dataset.anchors.replacementDate &&
        occurrence.subjectId === 'sub_demo_dm',
    );
    expect(replaced?.scheduleStatus).toBe('replaced');
    expect(dataset.attendance.some((record) => record.occurrenceId === replaced?.id)).toBe(false);
  });

  it('credits the replacement class to the subject that actually ran', () => {
    const replacement = dataset.occurrences.find(
      (occurrence) => occurrence.occurrenceType === 'replacement',
    );
    expect(replacement?.subjectId).toBe('sub_demo_os');
    expect(replacement?.replacedOccurrenceId).toBeTruthy();
    expect(dataset.attendance.some((record) => record.occurrenceId === replacement?.id)).toBe(true);
  });

  it('excludes the college holiday from every attendance tally', () => {
    const holidayOccurrences = dataset.occurrences.filter(
      (occurrence) => occurrence.date === dataset.anchors.holidayDate,
    );
    expect(holidayOccurrences.every((occurrence) => occurrence.scheduleStatus === 'holiday')).toBe(true);
    expect(
      dataset.attendance.some((record) => record.date === dataset.anchors.holidayDate),
    ).toBe(false);
  });

  it('includes extra classes, cancellations and a holiday for the history views', () => {
    const extras = dataset.occurrences.filter((occurrence) => occurrence.occurrenceType === 'extra');
    const cancellations = dataset.occurrences.filter(
      (occurrence) => occurrence.scheduleStatus === 'cancelled',
    );

    expect(extras.length).toBeGreaterThanOrEqual(3);
    expect(cancellations.length).toBeGreaterThanOrEqual(3);
    expect(dataset.overrides.some((override) => override.kind === 'holiday')).toBe(true);
  });

  it('generates future classes beyond today for the simulator', () => {
    const upcoming = dataset.occurrences.filter(
      (occurrence) => occurrence.date > TODAY && occurrence.scheduleStatus === 'scheduled',
    );
    expect(upcoming.length).toBeGreaterThan(20);
  });

  it('never schedules a class outside the semester boundaries', () => {
    expect(
      dataset.occurrences.every(
        (occurrence) =>
          occurrence.date >= dataset.semester.startDate && occurrence.date <= dataset.semester.endDate,
      ),
    ).toBe(true);
  });
});
