/**
 * Row-mapping tests.
 *
 * The cloud layer is the one place where a silent typo turns into lost
 * attendance, so every mapper is round-tripped: domain object → row → domain
 * object must return exactly what went in.
 */
import { describe, expect, it } from 'vitest';

import {
  attendanceFrom,
  attendanceRow,
  auditFrom,
  auditRow,
  importFrom,
  importRow,
  notificationFrom,
  notificationRow,
  occurrenceFrom,
  occurrenceRow,
  overrideFrom,
  overrideRow,
  preferenceFrom,
  preferenceRow,
  profileFrom,
  profileRow,
  semesterFrom,
  semesterRow,
  settingsFrom,
  settingsRow,
  slotFrom,
  slotRow,
  subjectFrom,
  subjectRow,
  versionFrom,
  versionRow,
  withUser,
} from './mapping';
import type {
  AppNotification,
  AppSettings,
  AttendanceRecord,
  CalendarOverride,
  ClassOccurrence,
  NotificationPreference,
  OccurrenceAudit,
  Profile,
  RecurringSlot,
  Semester,
  Subject,
  TimetableImport,
  TimetableVersion,
} from '@/types/domain';

const PROFILE: Profile = {
  id: 'user-1',
  name: 'Devendra Sankhla',
  email: 'student@college.edu',
  avatarUrl: 'https://example.com/a.png',
  college: 'IIT Bengaluru',
  department: 'CSE',
  departmentLabel: 'Computer Science & Eng.',
  semesterLabel: 'Semester 5',
  studentId: '1BM22CS045',
  batchRoll: '22CS-045',
  timezone: 'Asia/Kolkata',
  attendanceTarget: 80,
  safeMarginAlertClasses: 3,
  defaultCountMode: 'period',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

const SEMESTER: Semester = {
  id: 'sem-1',
  userId: 'user-1',
  name: 'Semester 5',
  startDate: '2026-07-01',
  endDate: '2026-11-30',
  isActive: true,
  archived: false,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

const SUBJECT: Subject = {
  id: 'sub-dsa',
  semesterId: 'sem-1',
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
};

const VERSION: TimetableVersion = {
  id: 'ver-1',
  semesterId: 'sem-1',
  versionNumber: 2,
  label: 'Mid-semester revision',
  notes: 'Swapped Thursday lab',
  signature: 'v1_12_abc',
  isCurrent: true,
  createdBy: 'user',
  createdAt: '2026-08-20T00:00:00.000Z',
};

const SLOT: RecurringSlot = {
  id: 'slot-1',
  timetableVersionId: 'ver-1',
  semesterId: 'sem-1',
  subjectId: 'sub-dsa',
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '10:00',
  room: 'C-203',
  facultyOverride: null,
  classType: 'theory',
  periodCount: 1,
  kind: 'class',
  label: null,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

const OCCURRENCE: ClassOccurrence = {
  id: 'occ-1',
  semesterId: 'sem-1',
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
  scheduleStatus: 'completed',
  sourceTimetableSlotId: 'slot-1',
  replacedOccurrenceId: null,
  notes: null,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-09-07T10:00:00.000Z',
};

const ATTENDANCE: AttendanceRecord = {
  id: 'rec-1',
  occurrenceId: 'occ-1',
  subjectId: 'sub-dsa',
  semesterId: 'sem-1',
  date: '2026-09-07',
  status: 'present',
  weight: 2,
  markedAt: '2026-09-07T10:05:00.000Z',
  source: 'user',
  createdAt: '2026-09-07T10:05:00.000Z',
  updatedAt: '2026-09-07T10:05:00.000Z',
};

const OVERRIDE: CalendarOverride = {
  id: 'ovr-1',
  semesterId: 'sem-1',
  date: '2026-09-05',
  kind: 'working_saturday',
  followDayOfWeek: 1,
  label: 'Mid-semester working Saturday',
  scope: 'personal',
  reason: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

const AUDIT: OccurrenceAudit = {
  id: 'audit-1',
  occurrenceId: 'occ-1',
  semesterId: 'sem-1',
  date: '2026-09-07',
  action: 'cancelled',
  summary: 'Cancelled',
  detail: 'Faculty on leave',
  createdAt: '2026-09-07T08:00:00.000Z',
};

const IMPORT: TimetableImport = {
  id: 'imp-1',
  semesterId: 'sem-1',
  fileName: 'timetable.png',
  storagePath: 'user-1/abc123.png',
  mimeType: 'image/png',
  sizeBytes: 204800,
  status: 'saved',
  provider: 'demo-fixture',
  extracted: null,
  warnings: ['Demo extraction'],
  errorMessage: null,
  isRetained: false,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const NOTIFICATION: AppNotification = {
  id: 'notif-1',
  userId: 'user-1',
  kind: 'missing_attendance',
  title: '2 classes need marking',
  body: 'Mark DSA and OS to keep your insights accurate.',
  date: '2026-09-08',
  occurrenceIds: ['occ-1', 'occ-2'],
  readAt: null,
  createdAt: '2026-09-08T18:00:00.000Z',
};

const PREFERENCES: NotificationPreference = {
  id: 'notifpref',
  userId: 'user-1',
  afterClassReminder: true,
  reminderDelayMinutes: 10,
  missingAttendanceReminder: true,
  attendanceRiskAlert: true,
  timetableChangeAlert: false,
  workingSaturdayAlert: true,
  combineBackToBack: true,
  updatedAt: '2026-09-01T00:00:00.000Z',
};

const SETTINGS: AppSettings = {
  id: 'settings',
  theme: 'system',
  previewDate: '2026-09-10',
  onboarded: true,
};

describe('cloud row mapping', () => {
  it('round-trips a profile', () => {
    expect(profileFrom(profileRow(PROFILE))).toEqual(PROFILE);
  });

  it('round-trips a semester', () => {
    // Rows always carry user_id in Postgres (stamped on write by RLS ownership).
    expect(semesterFrom(withUser(semesterRow(SEMESTER), SEMESTER.userId))).toEqual(SEMESTER);
  });

  it('round-trips a subject, including a null target override', () => {
    expect(subjectFrom(subjectRow(SUBJECT))).toEqual(SUBJECT);
    const override = { ...SUBJECT, targetPercentage: 85, attendanceCountMode: 'session' as const };
    expect(subjectFrom(subjectRow(override))).toEqual(override);
  });

  it('round-trips a timetable version', () => {
    expect(versionFrom(versionRow(VERSION))).toEqual(VERSION);
  });

  it('round-trips a recurring slot', () => {
    expect(slotFrom(slotRow(SLOT))).toEqual(SLOT);
    const breakSlot = { ...SLOT, kind: 'break' as const, label: 'Recess', periodCount: 2 };
    expect(slotFrom(slotRow(breakSlot))).toEqual(breakSlot);
  });

  it('round-trips a class occurrence', () => {
    expect(occurrenceFrom(occurrenceRow(OCCURRENCE))).toEqual(OCCURRENCE);
  });

  it('round-trips an attendance record with a frozen lab weight', () => {
    expect(attendanceFrom(attendanceRow(ATTENDANCE))).toEqual(ATTENDANCE);
  });

  it('round-trips a working-Saturday override', () => {
    expect(overrideFrom(overrideRow(OVERRIDE))).toEqual(OVERRIDE);
  });

  it('round-trips an audit entry', () => {
    expect(auditFrom(auditRow(AUDIT))).toEqual(AUDIT);
  });

  it('round-trips an import, including its storage key', () => {
    expect(importFrom(importRow(IMPORT))).toEqual(IMPORT);
  });

  it('round-trips a notification with its occurrence ids', () => {
    expect(notificationFrom(withUser(notificationRow(NOTIFICATION), NOTIFICATION.userId))).toEqual(NOTIFICATION);
  });

  it('round-trips notification preferences', () => {
    expect(preferenceFrom(withUser(preferenceRow(PREFERENCES), PREFERENCES.userId))).toEqual(PREFERENCES);
  });

  it('round-trips settings with a demo preview date', () => {
    expect(settingsFrom(settingsRow(SETTINGS))).toEqual(SETTINGS);
  });

  it('never writes a camelCase column to Postgres', () => {
    const rows = [
      profileRow(PROFILE),
      semesterRow(SEMESTER),
      subjectRow(SUBJECT),
      versionRow(VERSION),
      slotRow(SLOT),
      occurrenceRow(OCCURRENCE),
      attendanceRow(ATTENDANCE),
      overrideRow(OVERRIDE),
      auditRow(AUDIT),
      importRow(IMPORT),
      notificationRow(NOTIFICATION),
      preferenceRow(PREFERENCES),
      settingsRow(SETTINGS),
    ];

    for (const row of rows) {
      for (const key of Object.keys(row)) {
        expect(key).toMatch(/^[a-z][a-z0-9_]*$/);
      }
    }
  });

  it('stamps the owning user on write', () => {
    const row = withUser(subjectRow(SUBJECT), 'user-1');
    expect(row.user_id).toBe('user-1');
    // The domain id must survive stamping untouched.
    expect(row.id).toBe(SUBJECT.id);
  });

  it('tolerates rows written by an older schema version', () => {
    const sparse = { id: 'sem-x', name: 'Semester 4', start_date: '2026-01-01', end_date: '2026-05-30' };
    const semester = semesterFrom(sparse);
    expect(semester.isActive).toBe(false);
    expect(semester.archived).toBe(false);
    expect(semester.userId).toBe('');
  });
});
