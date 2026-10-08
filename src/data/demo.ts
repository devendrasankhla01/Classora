/**
 * Classora demo dataset.
 *
 * Deterministic, fully self-consistent seed data used in local/demo mode.
 * Nothing here is hardcoded into UI components — components always read through
 * the repository layer, so cloud mode behaves identically with real user data.
 *
 * The dataset is tuned so the dashboard headline metrics match the approved
 * design reference exactly:
 *   Attended 83 · Missed 15 · Conducted 98  →  84.7%
 * Subject cards stay within ~1.5 points of the reference, and every number is
 * derived from real attendance records rather than being written into the UI.
 */
import { toInstant, todayKey } from '@/lib/date';
import { generateOccurrences } from '@/lib/schedule';
import type {
  AppNotification,
  AttendanceRecord,
  AttendanceStatus,
  CalendarOverride,
  ClassOccurrence,
  DateKey,
  DayOfWeek,
  NotificationPreference,
  OccurrenceAudit,
  Profile,
  RecurringSlot,
  Semester,
  Subject,
  TimetableVersion,
} from '@/types/domain';

const DEMO_USER_ID = 'user_demo';
const DEMO_SEMESTER_ID = 'sem_demo_s5';
const DEMO_VERSION_ID = 'ver_demo_4';
/**
 * The demo term is anchored to the real "today" so the data always looks
 * current: nine weeks of history behind the student, twelve weeks ahead.
 */
const HISTORY_WEEKS = 9;
const WEEKS_AHEAD = 12;

/** Fixed seed → the demo data is identical on every install. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SubjectSeed {
  key: string;
  name: string;
  shortName: string;
  code: string;
  faculty: string;
  room: string;
  classType: Subject['classType'];
  countMode: Subject['attendanceCountMode'];
  colorKey: Subject['colorKey'];
  /**
   * Explicit attendance script. `cancelled` is derived as "whatever remains",
   * and resolved occurrences that are still missing a status become unmarked.
   */
  script: { present: number; absent: number; unmarked: number };
  sessions: { dayOfWeek: DayOfWeek; start: string; end: string; periodCount: number }[];
  /** Extra, one-off sessions added outside the weekly template (days ago). */
  extras?: { daysAgo: number; start: string; end: string; periodCount: number }[];
}

const SUBJECT_SEEDS: SubjectSeed[] = [
  {
    key: 'dsa',
    name: 'Data Structures & Algorithms',
    shortName: 'DSA',
    code: 'CS-201',
    faculty: 'Prof. A. Mehta',
    room: 'C-203',
    classType: 'theory',
    countMode: 'period',
    colorKey: 'indigo',
    script: { present: 23, absent: 3, unmarked: 1 },
    sessions: [
      { dayOfWeek: 1, start: '08:00', end: '09:00', periodCount: 1 },
      { dayOfWeek: 4, start: '08:00', end: '09:00', periodCount: 1 },
      { dayOfWeek: 5, start: '08:00', end: '09:00', periodCount: 1 },
    ],
  },
  {
    key: 'os',
    name: 'Operating Systems',
    shortName: 'OS',
    code: 'CS-204',
    faculty: 'Dr. R. Kulkarni',
    room: 'C-204',
    classType: 'theory',
    countMode: 'period',
    colorKey: 'amber',
    // One fewer present here because the replacement class below also counts.
    script: { present: 9, absent: 3, unmarked: 1 },
    sessions: [
      { dayOfWeek: 1, start: '09:00', end: '10:00', periodCount: 1 },
      { dayOfWeek: 5, start: '09:00', end: '10:00', periodCount: 1 },
    ],
    extras: [{ daysAgo: 2, start: '16:00', end: '17:00', periodCount: 1 }],
  },
  {
    key: 'dm',
    name: 'Discrete Mathematics',
    shortName: 'DM',
    code: 'MA-210',
    faculty: 'Prof. K. Verma',
    room: 'C-201',
    classType: 'theory',
    countMode: 'period',
    colorKey: 'rose',
    script: { present: 11, absent: 5, unmarked: 1 },
    sessions: [
      { dayOfWeek: 3, start: '09:00', end: '10:00', periodCount: 1 },
      { dayOfWeek: 5, start: '11:00', end: '12:00', periodCount: 1 },
    ],
  },
  {
    key: 'cn',
    name: 'Computer Networks',
    shortName: 'CN',
    code: 'CS-206',
    faculty: 'Prof. D. George',
    room: 'C-206',
    classType: 'theory',
    countMode: 'period',
    colorKey: 'sky',
    script: { present: 12, absent: 2, unmarked: 1 },
    sessions: [
      { dayOfWeek: 2, start: '08:00', end: '09:00', periodCount: 1 },
      { dayOfWeek: 4, start: '09:00', end: '10:00', periodCount: 1 },
    ],
  },
  {
    key: 'python',
    name: 'Python Programming Lab',
    shortName: 'Python Lab',
    code: 'CS-208L',
    faculty: 'Eng. T. Vance',
    room: 'Lab 3 (Tower B)',
    classType: 'lab',
    // A double block counted as ONE session — the demo that "one session vs
    // individual periods" really changes the maths.
    countMode: 'session',
    colorKey: 'emerald',
    script: { present: 27, absent: 2, unmarked: 0 },
    sessions: [
      { dayOfWeek: 1, start: '14:00', end: '16:00', periodCount: 2 },
      { dayOfWeek: 3, start: '14:00', end: '16:00', periodCount: 2 },
      { dayOfWeek: 5, start: '14:00', end: '16:00', periodCount: 2 },
    ],
    extras: [
      { daysAgo: 36, start: '16:00', end: '18:00', periodCount: 2 },
      { daysAgo: 17, start: '16:00', end: '18:00', periodCount: 2 },
    ],
  },
];

const BREAKS: { dayOfWeek: DayOfWeek; start: string; end: string; label: string }[] = [
  { dayOfWeek: 1, start: '10:00', end: '11:00', label: 'Recess • 60 mins campus break' },
  { dayOfWeek: 5, start: '10:00', end: '11:00', label: 'Recess • 60 mins campus break' },
];

export interface DemoAnchors {
  semesterStart: DateKey;
  semesterEnd: DateKey;
  replacementDate: DateKey;
  holidayDate: DateKey;
  workingSaturday: DateKey;
  noClassDay: DateKey;
}

export interface DemoDataset {
  anchors: DemoAnchors;
  profile: Profile;
  semester: Semester;
  subjects: Subject[];
  versions: TimetableVersion[];
  slots: RecurringSlot[];
  occurrences: ClassOccurrence[];
  attendance: AttendanceRecord[];
  overrides: CalendarOverride[];
  audit: OccurrenceAudit[];
  notificationPreferences: NotificationPreference;
  notifications: AppNotification[];
}

/**
 * Deterministic status plan for a subject.
 *
 * - exact `present` / `absent` counts, spread naturally via a fixed-seed
 *   shuffle so absences never cluster;
 * - `unmarked` is always placed on the most recent classes *before today*, so
 *   the missing-attendance review always has realistic work waiting;
 * - the remainder becomes cancellations.
 */
function buildStatusPlan(
  occurrences: readonly ClassOccurrence[],
  script: SubjectSeed['script'],
  today: DateKey,
  rng: () => number,
): (AttendanceStatus | 'cancelled')[] {
  const total = occurrences.length;
  const plan: (AttendanceStatus | 'cancelled')[] = Array.from({ length: total }, () => 'cancelled');
  if (total === 0) return plan;

  // Replaceable positions: everything except the reserved unmarked ones.
  const pastIndexes = occurrences
    .map((occurrence, index) => ({ occurrence, index }))
    .filter(({ occurrence }) => occurrence.date < today)
    .map(({ index }) => index);

  const unmarkedCount = Math.min(Math.max(0, script.unmarked), pastIndexes.length);
  const unmarkedIndexes = new Set(unmarkedCount > 0 ? pastIndexes.slice(-unmarkedCount) : []);
  const fillableIndexes = occurrences
    .map((_, index) => index)
    .filter((index) => !unmarkedIndexes.has(index));

  const presentCount = Math.min(script.present, fillableIndexes.length);
  const absentCount = Math.min(script.absent, fillableIndexes.length - presentCount);
  const cancelledCount = Math.max(0, fillableIndexes.length - presentCount - absentCount);

  const statuses: (AttendanceStatus | 'cancelled')[] = [
    ...Array<AttendanceStatus>(presentCount).fill('present'),
    ...Array<AttendanceStatus>(absentCount).fill('absent'),
    ...Array<'cancelled'>(cancelledCount).fill('cancelled'),
  ];

  for (let i = statuses.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const value = statuses[i]!;
    statuses[i] = statuses[j]!;
    statuses[j] = value;
  }

  fillableIndexes.forEach((index, position) => {
    plan[index] = statuses[position] ?? 'cancelled';
  });
  for (const index of unmarkedIndexes) plan[index] = 'unmarked';

  return plan;
}

export function buildDemoDataset(now: Date = new Date()): DemoDataset {
  const today = todayKey(now);

  // Anchor the term to the Monday that starts the history window.
  const semesterStartDate = new Date(now);
  semesterStartDate.setDate(semesterStartDate.getDate() - HISTORY_WEEKS * 7);
  semesterStartDate.setDate(semesterStartDate.getDate() - ((semesterStartDate.getDay() + 6) % 7));
  const semesterEndDate = new Date(now);
  semesterEndDate.setDate(semesterEndDate.getDate() + WEEKS_AHEAD * 7);

  const SEMESTER_START: DateKey = todayKey(semesterStartDate);
  const SEMESTER_END: DateKey = todayKey(semesterEndDate);
  const CREATED_AT = `${SEMESTER_START}T00:00:00.000Z`;

  const daysAgo = (amount: number): DateKey => {
    const date = new Date(now);
    date.setDate(date.getDate() - amount);
    return todayKey(date);
  };

  const profile: Profile = {
    id: DEMO_USER_ID,
    name: 'Devendra',
    email: 'devendra@example.edu',
    avatarUrl: null,
    college: 'Vishwakarma Institute of Technology',
    department: 'Computer Science & Engineering',
    departmentLabel: 'Computer Science & Eng.',
    semesterLabel: 'Semester 5',
    studentId: 'CS-2024-089',
    batchRoll: '2022-CS-041',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
    attendanceTarget: 85,
    safeMarginAlertClasses: 3,
    defaultCountMode: 'period',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };

  const semester: Semester = {
    id: DEMO_SEMESTER_ID,
    userId: DEMO_USER_ID,
    name: 'Semester 5',
    startDate: SEMESTER_START,
    endDate: SEMESTER_END,
    isActive: true,
    archived: false,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };

  const subjects: Subject[] = SUBJECT_SEEDS.map((seed) => ({
    id: `sub_demo_${seed.key}`,
    semesterId: DEMO_SEMESTER_ID,
    name: seed.name,
    shortName: seed.shortName,
    subjectCode: seed.code,
    faculty: seed.faculty,
    defaultRoom: seed.room,
    classType: seed.classType,
    attendanceCountMode: seed.countMode,
    targetPercentage: null,
    colorKey: seed.colorKey,
    archived: false,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  }));

  const versions: TimetableVersion[] = [
    {
      id: 'ver_demo_1',
      semesterId: DEMO_SEMESTER_ID,
      versionNumber: 1,
      label: 'Original',
      notes: 'Imported from the department timetable PDF.',
      signature: 'v1_14_original',
      isCurrent: false,
      createdBy: 'import',
      createdAt: `${SEMESTER_START}T06:30:00.000Z`,
    },
    {
      id: 'ver_demo_2',
      semesterId: DEMO_SEMESTER_ID,
      versionNumber: 2,
      label: 'Version 2',
      notes: 'Operating Systems moved to C-204.',
      signature: 'v1_14_osroom',
      isCurrent: false,
      createdBy: 'user',
      createdAt: `${daysAgo(42)}T06:30:00.000Z`,
    },
    {
      id: 'ver_demo_3',
      semesterId: DEMO_SEMESTER_ID,
      versionNumber: 3,
      label: 'Version 3',
      notes: 'Python Lab moved from Lab 2 to Lab 3.',
      signature: 'v1_14_lab3',
      isCurrent: false,
      createdBy: 'user',
      createdAt: `${daysAgo(24)}T06:30:00.000Z`,
    },
    {
      id: DEMO_VERSION_ID,
      semesterId: DEMO_SEMESTER_ID,
      versionNumber: 4,
      label: 'Version 4',
      notes: 'Discrete Mathematics moved to 11:00.',
      signature: 'v1_14_current',
      isCurrent: true,
      createdBy: 'user',
      createdAt: `${daysAgo(11)}T06:30:00.000Z`,
    },
  ];

  const slots: RecurringSlot[] = [];
  for (const seed of SUBJECT_SEEDS) {
    for (const session of seed.sessions) {
      slots.push({
        id: `slot_${seed.key}_${session.dayOfWeek}_${session.start.replace(':', '')}`,
        timetableVersionId: DEMO_VERSION_ID,
        semesterId: DEMO_SEMESTER_ID,
        subjectId: `sub_demo_${seed.key}`,
        dayOfWeek: session.dayOfWeek,
        startTime: session.start,
        endTime: session.end,
        room: seed.room,
        facultyOverride: null,
        classType: seed.classType,
        periodCount: session.periodCount,
        kind: 'class',
        label: null,
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
      });
    }
  }
  for (const recess of BREAKS) {
    slots.push({
      id: `slot_break_${recess.dayOfWeek}`,
      timetableVersionId: DEMO_VERSION_ID,
      semesterId: DEMO_SEMESTER_ID,
      subjectId: 'sub_demo_none',
      dayOfWeek: recess.dayOfWeek,
      startTime: recess.start,
      endTime: recess.end,
      room: null,
      facultyOverride: null,
      classType: 'other',
      periodCount: 0,
      kind: 'break',
      label: recess.label,
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    });
  }

  /* Calendar overrides: a past holiday (on a free day, so it only decorates the
   * calendar), a working Saturday next week and a no-class day the week after. */
  const mostRecentSaturday = (weeksBack: number): DateKey => {
    const date = new Date(now);
    const offset = (date.getDay() + 1) % 7; // days since Saturday
    date.setDate(date.getDate() - offset - weeksBack * 7);
    return todayKey(date);
  };
  const comingSaturday = (weeksAhead: number): DateKey => {
    const date = new Date(now);
    const offset = (6 - date.getDay() + 7) % 7;
    date.setDate(date.getDate() + offset + weeksAhead * 7);
    return todayKey(date);
  };

  const overrides: CalendarOverride[] = [
    {
      id: 'ovr_demo_holiday',
      semesterId: DEMO_SEMESTER_ID,
      date: mostRecentSaturday(3),
      kind: 'holiday',
      followDayOfWeek: null,
      label: 'College Holiday',
      scope: 'college',
      reason: 'Institute foundation day',
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    },
    {
      id: 'ovr_demo_working_saturday',
      semesterId: DEMO_SEMESTER_ID,
      date: comingSaturday(1),
      kind: 'working_saturday',
      followDayOfWeek: 1,
      label: 'Working Saturday — Monday timetable',
      scope: 'college',
      reason: 'Contact classes',
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    },
    {
      id: 'ovr_demo_no_class',
      semesterId: DEMO_SEMESTER_ID,
      date: comingSaturday(2),
      kind: 'no_class',
      followDayOfWeek: null,
      label: 'No classes',
      scope: 'college',
      reason: 'Mid-semester break',
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    },
  ];

  /* ---------------------------------------------------------------- *
   * Occurrences: template expansion + story-specific extras.           *
   * ---------------------------------------------------------------- */
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 45);
  const horizonKey = todayKey(horizon);
  const to = horizonKey < SEMESTER_END ? horizonKey : SEMESTER_END;

  const generated = generateOccurrences({
    semester,
    slots: slots.filter((slot) => slot.kind === 'class'),
    overrides,
    from: SEMESTER_START,
    to,
    existingIds: new Set<string>(),
    now: CREATED_AT,
  });

  const occurrences: ClassOccurrence[] = [...generated.occurrences];

  for (const seed of SUBJECT_SEEDS) {
    for (const extra of seed.extras ?? []) {
      const date = daysAgo(extra.daysAgo);
      occurrences.push({
        id: `${seed.key}_extra_${extra.daysAgo}`,
        semesterId: DEMO_SEMESTER_ID,
        subjectId: `sub_demo_${seed.key}`,
        date,
        startTime: extra.start,
        endTime: extra.end,
        startDateTime: toInstant(date, extra.start),
        endDateTime: toInstant(date, extra.end),
        room: seed.room,
        facultyOverride: null,
        classType: seed.classType,
        periodCount: extra.periodCount,
        occurrenceType: 'extra',
        scheduleStatus: 'scheduled',
        sourceTimetableSlotId: null,
        replacedOccurrenceId: null,
        notes: 'Added session',
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
      });
    }
  }

  /* ---------------------------------------------------------------- *
   * Replacement: the most recent Friday Discrete Mathematics slot      *
   * (two weeks ago) was taken by Operating Systems.                    *
   * ---------------------------------------------------------------- */
  const replacementDate = daysAgo(14);
  const replacedOriginal = occurrences.find(
    (occurrence) =>
      occurrence.subjectId === 'sub_demo_dm' &&
      occurrence.date === replacementDate &&
      occurrence.occurrenceType === 'regular',
  );

  let replacementOccurrence: ClassOccurrence | null = null;
  if (replacedOriginal) {
    replacedOriginal.scheduleStatus = 'replaced';
    replacedOriginal.notes = 'Replaced by Operating Systems';
    replacementOccurrence = {
      ...replacedOriginal,
      id: 'occ_demo_replacement',
      subjectId: 'sub_demo_os',
      room: 'C-204',
      classType: 'theory',
      periodCount: 1,
      occurrenceType: 'replacement',
      scheduleStatus: 'scheduled',
      replacedOccurrenceId: replacedOriginal.id,
      notes: 'Replacement for Discrete Mathematics',
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    };
    occurrences.push(replacementOccurrence);
  }

  /* ---------------------------------------------------------------- *
   * Attendance records.                                                *
   * ---------------------------------------------------------------- */
  const attendance: AttendanceRecord[] = [];

  SUBJECT_SEEDS.forEach((seed, seedIndex) => {
    const rng = mulberry32(1337 + seedIndex * 97);

    // The replacement class is handled separately so the tallies stay exact.
    const subjectOccurrences = occurrences
      .filter(
        (occurrence) =>
          occurrence.subjectId === `sub_demo_${seed.key}` &&
          // Everything that has already finished — including earlier today,
          // so the demo looks alive whatever time it is first opened.
          new Date(occurrence.endDateTime).getTime() <= now.getTime() &&
          occurrence.occurrenceType !== 'replacement' &&
          occurrence.scheduleStatus !== 'replaced' &&
          occurrence.scheduleStatus !== 'holiday',
      )
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

    const plan = buildStatusPlan(subjectOccurrences, seed.script, today, rng);

    subjectOccurrences.forEach((occurrence, index) => {
      const status = plan[index] ?? 'present';

      if (status === 'cancelled') {
        occurrence.scheduleStatus = 'cancelled';
        occurrence.notes = 'Faculty unavailable';
        return;
      }

      if (status === 'unmarked') {
        occurrence.scheduleStatus = 'scheduled';
        return;
      }

      attendance.push({
        id: `att_${occurrence.id}`,
        occurrenceId: occurrence.id,
        subjectId: occurrence.subjectId,
        semesterId: DEMO_SEMESTER_ID,
        date: occurrence.date,
        status,
        weight: seed.countMode === 'session' ? 1 : Math.max(1, occurrence.periodCount),
        markedAt: toInstant(occurrence.date, occurrence.endTime),
        source: 'seed',
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
      });
      occurrence.scheduleStatus = 'completed';
    });
  });

  // Today's later classes are deliberately left unmarked: they drive the
  // in-app "mark attendance" quick actions on the Home screen.

  // The replacement class was attended.
  if (replacementOccurrence) {
    attendance.push({
      id: `att_${replacementOccurrence.id}`,
      occurrenceId: replacementOccurrence.id,
      subjectId: replacementOccurrence.subjectId,
      semesterId: DEMO_SEMESTER_ID,
      date: replacementOccurrence.date,
      status: 'present',
      weight: 1,
      markedAt: toInstant(replacementOccurrence.date, replacementOccurrence.endTime),
      source: 'seed',
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    });
    replacementOccurrence.scheduleStatus = 'completed';
  }

  const audit: OccurrenceAudit[] = [
    {
      id: 'audit_demo_1',
      occurrenceId: replacedOriginal?.id ?? null,
      semesterId: DEMO_SEMESTER_ID,
      date: '2026-09-25',
      action: 'replaced',
      summary: 'Discrete Mathematics replaced with Operating Systems',
      detail: 'Replacement lecture conducted by Dr. R. Kulkarni in C-204.',
      createdAt: '2026-09-24T10:00:00.000Z',
    },
    {
      id: 'audit_demo_2',
      occurrenceId: null,
      semesterId: DEMO_SEMESTER_ID,
      date: '2026-09-30',
      action: 'extra_added',
      summary: 'Extra Operating Systems class added at 4:00 PM',
      detail: 'Buffer lecture before the mid-semester review.',
      createdAt: '2026-09-29T09:15:00.000Z',
    },
  ];

  const notificationPreferences: NotificationPreference = {
    id: 'notifpref_demo',
    userId: DEMO_USER_ID,
    afterClassReminder: true,
    reminderDelayMinutes: 10,
    missingAttendanceReminder: true,
    attendanceRiskAlert: true,
    timetableChangeAlert: true,
    workingSaturdayAlert: true,
    combineBackToBack: true,
    updatedAt: CREATED_AT,
  };

  const notifications: AppNotification[] = [
    {
      id: 'notif_demo_1',
      userId: DEMO_USER_ID,
      kind: 'missing_attendance',
      title: 'Classes from yesterday are still unmarked',
      body: 'Update them to keep your attendance insights accurate.',
      date: today,
      occurrenceIds: [],
      readAt: null,
      createdAt: `${today}T09:00:00.000Z`,
    },
    {
      id: 'notif_demo_2',
      userId: DEMO_USER_ID,
      kind: 'risk',
      title: 'Discrete Mathematics is below your 85% target',
      body: 'Attend the next few lectures to climb back above the threshold.',
      date: today,
      occurrenceIds: [],
      readAt: null,
      createdAt: `${today}T08:30:00.000Z`,
    },
  ];

  return {
    anchors: {
      semesterStart: SEMESTER_START,
      semesterEnd: SEMESTER_END,
      replacementDate,
      holidayDate: overrides[0]!.date,
      workingSaturday: overrides[1]!.date,
      noClassDay: overrides[2]!.date,
    },
    profile,
    semester,
    subjects,
    versions,
    slots,
    occurrences,
    attendance,
    overrides,
    audit,
    notificationPreferences,
    notifications,
  };
}
