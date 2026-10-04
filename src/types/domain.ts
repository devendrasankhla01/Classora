/**
 * Classora — core domain model.
 *
 * Design rules encoded here:
 *  - The weekly timetable is a TEMPLATE (`RecurringSlot`) and attendance is
 *    NEVER attached to it. Attendance attaches to dated `ClassOccurrence`s.
 *  - Changing a timetable therefore can never rewrite past attendance.
 *  - Everything is scoped to a `Semester`, so historical semesters stay intact.
 */

export type Id = string;

/** Local calendar date identity, `yyyy-MM-dd`. Never a UTC instant. */
export type DateKey = string;
/** Local wall-clock time, `HH:mm`. */
export type TimeKey = string;
/** Full ISO-8601 instant used only for audit/sync metadata. */
export type Instant = string;

/** 0 = Sunday … 6 = Saturday (matches `date-fns` `getDay`). */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type ClassType = 'theory' | 'lab' | 'other';

/**
 * How a subject's attendance is counted.
 *  - `period`  → a 2-hour lab block counts as 2 attendance units.
 *  - `session` → a 2-hour lab block counts as 1 attendance unit.
 */
export type AttendanceCountMode = 'period' | 'session';

export type AttendanceStatus = 'present' | 'absent' | 'unmarked';

export type OccurrenceType = 'regular' | 'extra' | 'replacement';

export type ScheduleStatus =
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'not_conducted'
  | 'replaced'
  | 'holiday';

export type OverrideKind =
  | 'holiday'
  | 'no_class'
  | 'follow_day'
  | 'working_saturday'
  | 'custom_schedule';

export interface Profile {
  id: Id;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  college: string | null;
  department: string | null;
  /** Human label, e.g. "Computer Science & Eng." */
  departmentLabel: string | null;
  semesterLabel: string | null;
  studentId: string | null;
  batchRoll: string | null;
  /** IANA timezone, e.g. "Asia/Kolkata". */
  timezone: string;
  /** Attendance target percentage (0–100). Default 75. */
  attendanceTarget: number;
  /** Warn this many classes before the target is at risk. */
  safeMarginAlertClasses: number;
  defaultCountMode: AttendanceCountMode;
  createdAt: Instant;
  updatedAt: Instant;
}

export interface Semester {
  id: Id;
  userId: Id;
  name: string;
  startDate: DateKey;
  endDate: DateKey;
  isActive: boolean;
  /** Archived semesters keep all history readable but leave analytics. */
  archived: boolean;
  createdAt: Instant;
  updatedAt: Instant;
}

export interface Subject {
  id: Id;
  semesterId: Id;
  name: string;
  shortName: string;
  subjectCode: string | null;
  faculty: string | null;
  defaultRoom: string | null;
  classType: ClassType;
  attendanceCountMode: AttendanceCountMode;
  /** Per-subject override of the global target; null → inherit profile target. */
  targetPercentage: number | null;
  /** Tint key used by the UI for the subject's icon tile. */
  colorKey: SubjectColorKey;
  archived: boolean;
  createdAt: Instant;
  updatedAt: Instant;
}

export type SubjectColorKey = 'indigo' | 'amber' | 'emerald' | 'rose' | 'sky' | 'violet';

export interface TimetableVersion {
  id: Id;
  semesterId: Id;
  /** 1-based, monotonically increasing per semester. */
  versionNumber: number;
  label: string;
  notes: string | null;
  /** Normalised signature used for duplicate-import detection. */
  signature: string;
  isCurrent: boolean;
  createdBy: 'seed' | 'user' | 'import' | 'restore';
  createdAt: Instant;
}

export interface RecurringSlot {
  id: Id;
  timetableVersionId: Id;
  semesterId: Id;
  subjectId: Id;
  dayOfWeek: DayOfWeek;
  startTime: TimeKey;
  endTime: TimeKey;
  room: string | null;
  facultyOverride: string | null;
  classType: ClassType;
  periodCount: number;
  /** Non-subject blocks (recess/lunch) are stored but never counted. */
  kind: 'class' | 'break';
  label: string | null;
  createdAt: Instant;
  updatedAt: Instant;
}

export interface ClassOccurrence {
  id: Id;
  semesterId: Id;
  subjectId: Id;
  /** Local date identity of the class. */
  date: DateKey;
  startTime: TimeKey;
  endTime: TimeKey;
  startDateTime: Instant;
  endDateTime: Instant;
  room: string | null;
  facultyOverride: string | null;
  classType: ClassType;
  periodCount: number;
  occurrenceType: OccurrenceType;
  scheduleStatus: ScheduleStatus;
  sourceTimetableSlotId: Id | null;
  /** Set on a replacement occurrence → points at the occurrence it replaces. */
  replacedOccurrenceId: Id | null;
  /** Audit trail entries for human-readable history. */
  notes: string | null;
  createdAt: Instant;
  updatedAt: Instant;
}

export interface AttendanceRecord {
  id: Id;
  occurrenceId: Id;
  subjectId: Id;
  semesterId: Id;
  date: DateKey;
  status: AttendanceStatus;
  /**
   * Snapshot of the attendance weight at marking time. Frozen so that later
   * edits to a subject's counting rule cannot silently rewrite history.
   */
  weight: number;
  markedAt: Instant | null;
  source: 'user' | 'seed' | 'sync';
  createdAt: Instant;
  updatedAt: Instant;
}

export interface CalendarOverride {
  id: Id;
  semesterId: Id;
  date: DateKey;
  kind: OverrideKind;
  /** For `follow_day` / `working_saturday`: whose timetable to follow. */
  followDayOfWeek: DayOfWeek | null;
  label: string | null;
  scope: 'college' | 'department' | 'personal';
  reason: string | null;
  createdAt: Instant;
  updatedAt: Instant;
}

/** Audit record for any change made to a class occurrence. */
export interface OccurrenceAudit {
  id: Id;
  occurrenceId: Id | null;
  semesterId: Id;
  date: DateKey;
  action:
    | 'extra_added'
    | 'replaced'
    | 'cancelled'
    | 'time_changed'
    | 'room_changed'
    | 'restored'
    | 'status_changed'
    | 'follow_day_applied'
    | 'holiday_marked';
  summary: string;
  detail: string | null;
  createdAt: Instant;
}

export interface TimetableImport {
  id: Id;
  semesterId: Id;
  fileName: string;
  /** Randomised storage key — never the user's original path. */
  storagePath: string | null;
  mimeType: string;
  sizeBytes: number;
  status: 'pending' | 'extracting' | 'review' | 'saved' | 'failed' | 'discarded';
  provider: string | null;
  extracted: ExtractedTimetable | null;
  warnings: string[];
  errorMessage: string | null;
  isRetained: boolean;
  createdAt: Instant;
  updatedAt: Instant;
}

export interface NotificationPreference {
  id: Id;
  userId: Id;
  afterClassReminder: boolean;
  reminderDelayMinutes: 0 | 10 | 30;
  missingAttendanceReminder: boolean;
  attendanceRiskAlert: boolean;
  timetableChangeAlert: boolean;
  workingSaturdayAlert: boolean;
  combineBackToBack: boolean;
  updatedAt: Instant;
}

export interface AppNotification {
  id: Id;
  userId: Id;
  kind:
    | 'after_class'
    | 'missing_attendance'
    | 'risk'
    | 'timetable_change'
    | 'working_saturday'
    | 'extra_class';
  title: string;
  body: string;
  date: DateKey;
  occurrenceIds: Id[];
  readAt: Instant | null;
  createdAt: Instant;
}

/* ------------------------------------------------------------------ *
 * AI extraction contracts (structured output from the server provider) *
 * ------------------------------------------------------------------ */

export interface ExtractedSubject {
  name: string;
  shortName: string | null;
  subjectCode: string | null;
  faculty: string | null;
  room: string | null;
  classType: ClassType;
  attendanceCountMode: AttendanceCountMode | null;
  confidence: number;
}

export interface ExtractedSlot {
  dayOfWeek: DayOfWeek | null;
  date: DateKey | null;
  startTime: TimeKey;
  endTime: TimeKey;
  subjectName: string;
  subjectCode: string | null;
  faculty: string | null;
  room: string | null;
  classType: ClassType;
  periodCount: number;
  isBreak: boolean;
  breakLabel: string | null;
  confidence: number;
}

export interface ExtractedTimetable {
  semester: { name: string | null; startDate: DateKey | null; endDate: DateKey | null };
  subjects: ExtractedSubject[];
  schedule: ExtractedSlot[];
  warnings: string[];
}

/* ------------------------------------------------------------------ *
 * Local-first infrastructure                                            *
 * ------------------------------------------------------------------ */

export type SyncState = 'synced' | 'syncing' | 'offline' | 'pending';

export interface OutboxEntry {
  id: Id;
  entity:
    | 'profile'
    | 'semester'
    | 'subject'
    | 'version'
    | 'slot'
    | 'occurrence'
    | 'attendance'
    | 'override'
    | 'preference'
    | 'notification'
    | 'import'
    | 'audit';
  op: 'upsert' | 'delete';
  entityId: Id;
  payload: unknown;
  attempts: number;
  createdAt: Instant;
}

export interface AppSettings {
  id: Id;
  theme: 'light' | 'system';
  /** Demo-mode preview date override; `null` in normal operation. */
  previewDate: DateKey | null;
  onboarded: boolean;
}
