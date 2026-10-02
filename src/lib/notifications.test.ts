/**
 * Notification generator tests.
 *
 * The inbox must be truthful: it fires only when a real situation exists, it is
 * idempotent, and it never invents an alert out of an empty semester.
 */
import { describe, expect, it } from 'vitest';

import { buildNotifications, newNotificationsOnly, type NotificationInput } from './notifications';
import { buildUnits, summarize } from './attendance';
import type {
  AppNotification,
  AttendanceRecord,
  AttendanceStatus,
  CalendarOverride,
  ClassOccurrence,
  DateKey,
  Profile,
  ScheduleStatus,
  Subject,
} from '@/types/domain';

const TODAY: DateKey = '2026-09-10';
const NOW = new Date('2026-09-10T16:00:00');

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
  id: string,
  date: DateKey,
  overrides: Partial<ClassOccurrence> = {},
): ClassOccurrence {
  return {
    id,
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
    sourceTimetableSlotId: 'slot-1',
    replacedOccurrenceId: null,
    notes: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function record(
  occurrenceId: string,
  status: AttendanceStatus,
  date: DateKey = TODAY,
  weight = 1,
): AttendanceRecord {
  return {
    id: `rec-${occurrenceId}`,
    occurrenceId,
    subjectId: 'sub-dsa',
    semesterId: 'sem',
    date,
    status,
    weight,
    markedAt: `${date}T11:00:00.000Z`,
    source: 'seed',
    createdAt: `${date}T11:00:00.000Z`,
    updatedAt: `${date}T11:00:00.000Z`,
  };
}

function baseInput(overrides: Partial<NotificationInput> = {}): NotificationInput {
  return {
    occurrences: [],
    attendance: [],
    subjects: [subject()],
    overrides: [],
    profile: { attendanceTarget: 75, safeMarginAlertClasses: 3 },
    today: TODAY,
    now: NOW,
    ...overrides,
  };
}

/** A subject comfortably above target, with plenty of future classes. */
function healthyHistory() {
  const occurrences: ClassOccurrence[] = [];
  const attendance: AttendanceRecord[] = [];
  for (let index = 0; index < 40; index += 1) {
    const id = `old-${index}`;
    occurrences.push(occurrence(id, '2026-08-01'));
    attendance.push(record(id, index < 38 ? 'present' : 'absent', '2026-08-01'));
  }
  return { occurrences, attendance };
}

describe('buildNotifications', () => {
  it('produces nothing at all from an empty semester', () => {
    expect(buildNotifications(baseInput())).toEqual([]);
  });

  it('asks for a class that finished today and is still unmarked', () => {
    const drafts = buildNotifications(
      baseInput({ occurrences: [occurrence('today-1', TODAY)] }),
    );
    const reminder = drafts.find((draft) => draft.kind === 'after_class');
    expect(reminder).toBeDefined();
    expect(reminder!.title).toContain('DSA');
    expect(reminder!.occurrenceIds).toEqual(['today-1']);
    expect(reminder!.readAt).toBeNull();
  });

  it('does not ask about a class that is still in progress', () => {
    const inProgress = occurrence('now-1', TODAY, {
      startTime: '15:00',
      endTime: '17:00',
      startDateTime: `${TODAY}T15:00:00.000Z`,
      endDateTime: `${TODAY}T17:00:00.000Z`,
      scheduleStatus: 'scheduled',
    });
    const drafts = buildNotifications(baseInput({ occurrences: [inProgress] }));
    expect(drafts.find((draft) => draft.kind === 'after_class')).toBeUndefined();
  });

  it('does not ask about a class that is already marked', () => {
    const todayClass = occurrence('today-1', TODAY);
    const drafts = buildNotifications(
      baseInput({ occurrences: [todayClass], attendance: [record('today-1', 'present')] }),
    );
    expect(drafts.find((draft) => draft.kind === 'after_class')).toBeUndefined();
  });

  it('groups older unmarked days, one alert per date', () => {
    const drafts = buildNotifications(
      baseInput({
        occurrences: [
          occurrence('a', '2026-09-07'),
          occurrence('b', '2026-09-07'),
          occurrence('c', '2026-09-08'),
        ],
      }),
    );
    const missing = drafts.filter((draft) => draft.kind === 'missing_attendance');
    expect(missing).toHaveLength(2);
    expect(missing[0]!.id).toBe('notif:missing:2026-09-07');
    expect(missing[0]!.occurrenceIds).toEqual(['a', 'b']);
    expect(missing[0]!.title).toContain('2 classes');
  });

  it('ignores cancelled and holiday classes when looking for missing marks', () => {
    const statuses: ScheduleStatus[] = ['cancelled', 'not_conducted', 'holiday', 'replaced'];
    const drafts = buildNotifications(
      baseInput({
        occurrences: statuses.map((status, index) =>
          occurrence(`ignored-${index}`, '2026-09-07', { scheduleStatus: status }),
        ),
      }),
    );
    expect(drafts.filter((draft) => draft.kind === 'missing_attendance')).toHaveLength(0);
  });

  it('flags a subject with no safe misses left', () => {
    const occurrences = [occurrence('h1', '2026-08-01'), occurrence('h2', '2026-08-02')];
    const attendance = [record('h1', 'present', '2026-08-01'), record('h2', 'absent', '2026-08-02')];
    const drafts = buildNotifications(
      baseInput({ occurrences, attendance }),
    );
    const risk = drafts.find((draft) => draft.kind === 'risk');
    expect(risk).toBeDefined();
    expect(risk!.title).toContain('DSA');
    expect(risk!.id).toContain('notif:risk:sub-dsa:');
  });

  it('does not flag a subject with a healthy buffer', () => {
    const { occurrences, attendance } = healthyHistory();
    const drafts = buildNotifications(baseInput({ occurrences, attendance }));
    expect(drafts.find((draft) => draft.kind === 'risk')).toBeUndefined();
  });

  it('does not flag a subject that has never been conducted', () => {
    const drafts = buildNotifications(
      baseInput({ occurrences: [occurrence('future', '2026-10-01', { scheduleStatus: 'scheduled' })] }),
    );
    expect(drafts.find((draft) => draft.kind === 'risk')).toBeUndefined();
  });

  it('reports a cancellation as a timetable change', () => {
    const drafts = buildNotifications(
      baseInput({
        occurrences: [occurrence('c1', '2026-09-09', { scheduleStatus: 'cancelled' })],
      }),
    );
    const change = drafts.find((draft) => draft.kind === 'timetable_change');
    expect(change).toBeDefined();
    expect(change!.body).toContain('1 cancelled');
  });

  it('summarises a mixed change in one alert', () => {
    const drafts = buildNotifications(
      baseInput({
        occurrences: [
          occurrence('c1', '2026-09-09', { scheduleStatus: 'cancelled' }),
          occurrence('e1', '2026-09-09', { occurrenceType: 'extra' }),
          occurrence('r1', '2026-09-09', {
            occurrenceType: 'replacement',
            replacedOccurrenceId: 'orig',
          }),
        ],
      }),
    );
    const change = drafts.find((draft) => draft.kind === 'timetable_change');
    expect(change!.body).toContain('1 cancelled');
    expect(change!.body).toContain('1 extra');
    expect(change!.body).toContain('1 replaced');
  });

  it('ignores changes older than a week', () => {
    const drafts = buildNotifications(
      baseInput({
        occurrences: [occurrence('old-change', '2026-08-20', { scheduleStatus: 'cancelled' })],
      }),
    );
    expect(drafts.find((draft) => draft.kind === 'timetable_change')).toBeUndefined();
  });

  it('warns about a working Saturday inside the lead window only', () => {
    const override = (date: DateKey): CalendarOverride => ({
      id: `ovr-${date}`,
      semesterId: 'sem',
      date,
      kind: 'working_saturday',
      followDayOfWeek: 1,
      label: 'Working Saturday',
      scope: 'college',
      reason: null,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    });

    const soon = buildNotifications(baseInput({ overrides: [override('2026-09-12')] }));
    expect(soon.find((draft) => draft.kind === 'working_saturday')).toBeDefined();
    expect(soon.find((draft) => draft.kind === 'working_saturday')!.body).toContain('Monday');

    const far = buildNotifications(baseInput({ overrides: [override('2026-09-19')] }));
    expect(far.find((draft) => draft.kind === 'working_saturday')).toBeUndefined();

    const past = buildNotifications(baseInput({ overrides: [override('2026-09-05')] }));
    expect(past.find((draft) => draft.kind === 'working_saturday')).toBeUndefined();
  });

  it('is deterministic — the same state produces the same ids', () => {
    const input = baseInput({ occurrences: [occurrence('today-1', TODAY)] });
    const first = buildNotifications(input).map((draft) => draft.id);
    const second = buildNotifications(input).map((draft) => draft.id);
    expect(first).toEqual(second);
  });

  it('respects a per-subject target override', () => {
    const strict = subject({ targetPercentage: 95 });
    const occurrences = [occurrence('h1', '2026-08-01'), occurrence('h2', '2026-08-02')];
    const attendance = [record('h1', 'present', '2026-08-01'), record('h2', 'present', '2026-08-02')];
    const drafts = buildNotifications(
      baseInput({ subjects: [strict], occurrences, attendance }),
    );
    // 100% clears even a 95% target, so no alert.
    expect(drafts.find((draft) => draft.kind === 'risk')).toBeUndefined();

    const below = buildNotifications(
      baseInput({
        subjects: [strict],
        occurrences,
        attendance: [record('h1', 'present', '2026-08-01'), record('h2', 'absent', '2026-08-02')],
      }),
    );
    expect(below.find((draft) => draft.kind === 'risk')).toBeDefined();
  });
});

describe('newNotificationsOnly', () => {
  it('filters out alerts that are already in the inbox', () => {
    const drafts = buildNotifications(baseInput({ occurrences: [occurrence('today-1', TODAY)] }));
    const existing: AppNotification[] = [
      { ...drafts[0]!, createdAt: '2026-09-10T16:05:00.000Z' },
    ];
    expect(newNotificationsOnly(drafts, existing)).toEqual([]);
  });

  it('keeps genuinely new alerts', () => {
    const drafts = buildNotifications(
      baseInput({ occurrences: [occurrence('today-1', TODAY), occurrence('old', '2026-09-08')] }),
    );
    const existing: AppNotification[] = [
      { ...drafts[0]!, createdAt: '2026-09-10T16:05:00.000Z' },
    ];
    const fresh = newNotificationsOnly(drafts, existing);
    expect(fresh).toHaveLength(1);
    expect(fresh[0]!.id).not.toBe(existing[0]!.id);
  });
});

describe('engine agreement', () => {
  it('uses the same summary maths as the attendance engine', () => {
    const occurrences = [occurrence('h1', '2026-08-01'), occurrence('h2', '2026-08-02')];
    const attendance = [record('h1', 'present', '2026-08-01'), record('h2', 'absent', '2026-08-02')];
    const summary = summarize(buildUnits(occurrences, attendance), 75, TODAY);
    expect(summary.percentage).toBeCloseTo(50, 1);

    const drafts = buildNotifications(baseInput({ occurrences, attendance } as Partial<NotificationInput>));
    const risk = drafts.find((draft) => draft.kind === 'risk')!;
    expect(risk.body).toContain('50.0%');
  });
});

// Keeps the Profile import meaningful for readers of this test file.
export type { Profile };
