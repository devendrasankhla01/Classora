/**
 * Supabase row mapping.
 *
 * Postgres uses snake_case with foreign keys and a `user_id` on every row for
 * Row Level Security; the app uses camelCase with the dates it actually needs.
 * Mapping lives here so no screen ever sees a column name.
 */
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

export type Row = Record<string, unknown>;

/** Attach the owning user to a row before writing. */
export function withUser<T extends Row>(row: T, userId: string): T & { user_id: string } {
  return { ...row, user_id: userId };
}

/* ------------------------------------------------------------------ *
 * Coders                                                              *
 * ------------------------------------------------------------------ */

export const profileRow = (value: Profile): Row => ({
  id: value.id,
  name: value.name,
  email: value.email,
  avatar_url: value.avatarUrl,
  college: value.college,
  department: value.department,
  department_label: value.departmentLabel,
  semester_label: value.semesterLabel,
  student_id: value.studentId,
  batch_roll: value.batchRoll,
  timezone: value.timezone,
  attendance_target: value.attendanceTarget,
  safe_margin_alert_classes: value.safeMarginAlertClasses,
  default_count_mode: value.defaultCountMode,
  created_at: value.createdAt,
  updated_at: value.updatedAt,
});

export const profileFrom = (row: Row): Profile => ({
  id: String(row.id),
  name: String(row.name ?? 'Student'),
  email: (row.email as string) ?? null,
  avatarUrl: (row.avatar_url as string) ?? null,
  college: (row.college as string) ?? null,
  department: (row.department as string) ?? null,
  departmentLabel: (row.department_label as string) ?? null,
  semesterLabel: (row.semester_label as string) ?? null,
  studentId: (row.student_id as string) ?? null,
  batchRoll: (row.batch_roll as string) ?? null,
  timezone: String(row.timezone ?? 'Asia/Kolkata'),
  attendanceTarget: Number(row.attendance_target ?? 75),
  safeMarginAlertClasses: Number(row.safe_margin_alert_classes ?? 3),
  defaultCountMode: (row.default_count_mode as Profile['defaultCountMode']) ?? 'period',
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

export const semesterRow = (value: Semester): Row => ({
  id: value.id,
  name: value.name,
  start_date: value.startDate,
  end_date: value.endDate,
  is_active: value.isActive,
  archived: value.archived,
  created_at: value.createdAt,
  updated_at: value.updatedAt,
});

export const semesterFrom = (row: Row): Semester => ({
  id: String(row.id),
  userId: String(row.user_id ?? ''),
  name: String(row.name ?? 'Semester'),
  startDate: String(row.start_date),
  endDate: String(row.end_date),
  isActive: Boolean(row.is_active),
  archived: Boolean(row.archived),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

export const subjectRow = (value: Subject): Row => ({
  id: value.id,
  semester_id: value.semesterId,
  name: value.name,
  short_name: value.shortName,
  subject_code: value.subjectCode,
  faculty: value.faculty,
  default_room: value.defaultRoom,
  class_type: value.classType,
  attendance_count_mode: value.attendanceCountMode,
  target_percentage: value.targetPercentage,
  color_key: value.colorKey,
  archived: value.archived,
  created_at: value.createdAt,
  updated_at: value.updatedAt,
});

export const subjectFrom = (row: Row): Subject => ({
  id: String(row.id),
  semesterId: String(row.semester_id),
  name: String(row.name ?? 'Subject'),
  shortName: String(row.short_name ?? ''),
  subjectCode: (row.subject_code as string) ?? null,
  faculty: (row.faculty as string) ?? null,
  defaultRoom: (row.default_room as string) ?? null,
  classType: (row.class_type as Subject['classType']) ?? 'theory',
  attendanceCountMode: (row.attendance_count_mode as Subject['attendanceCountMode']) ?? 'period',
  targetPercentage: row.target_percentage === null || row.target_percentage === undefined
    ? null
    : Number(row.target_percentage),
  colorKey: (row.color_key as Subject['colorKey']) ?? 'indigo',
  archived: Boolean(row.archived),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

export const versionRow = (value: TimetableVersion): Row => ({
  id: value.id,
  semester_id: value.semesterId,
  version_number: value.versionNumber,
  label: value.label,
  notes: value.notes,
  signature: value.signature,
  is_current: value.isCurrent,
  created_by: value.createdBy,
  created_at: value.createdAt,
});

export const versionFrom = (row: Row): TimetableVersion => ({
  id: String(row.id),
  semesterId: String(row.semester_id),
  versionNumber: Number(row.version_number ?? 1),
  label: String(row.label ?? ''),
  notes: (row.notes as string) ?? null,
  signature: String(row.signature ?? ''),
  isCurrent: Boolean(row.is_current),
  createdBy: (row.created_by as TimetableVersion['createdBy']) ?? 'user',
  createdAt: String(row.created_at),
});

export const slotRow = (value: RecurringSlot): Row => ({
  id: value.id,
  timetable_version_id: value.timetableVersionId,
  semester_id: value.semesterId,
  subject_id: value.subjectId,
  day_of_week: value.dayOfWeek,
  start_time: value.startTime,
  end_time: value.endTime,
  room: value.room,
  faculty_override: value.facultyOverride,
  class_type: value.classType,
  period_count: value.periodCount,
  kind: value.kind,
  label: value.label,
  created_at: value.createdAt,
  updated_at: value.updatedAt,
});

export const slotFrom = (row: Row): RecurringSlot => ({
  id: String(row.id),
  timetableVersionId: String(row.timetable_version_id),
  semesterId: String(row.semester_id),
  subjectId: String(row.subject_id),
  dayOfWeek: Number(row.day_of_week ?? 1) as RecurringSlot['dayOfWeek'],
  startTime: String(row.start_time),
  endTime: String(row.end_time),
  room: (row.room as string) ?? null,
  facultyOverride: (row.faculty_override as string) ?? null,
  classType: (row.class_type as RecurringSlot['classType']) ?? 'theory',
  periodCount: Number(row.period_count ?? 1),
  kind: (row.kind as RecurringSlot['kind']) ?? 'class',
  label: (row.label as string) ?? null,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

export const occurrenceRow = (value: ClassOccurrence): Row => ({
  id: value.id,
  semester_id: value.semesterId,
  subject_id: value.subjectId,
  date: value.date,
  start_time: value.startTime,
  end_time: value.endTime,
  start_date_time: value.startDateTime,
  end_date_time: value.endDateTime,
  room: value.room,
  faculty_override: value.facultyOverride,
  class_type: value.classType,
  period_count: value.periodCount,
  occurrence_type: value.occurrenceType,
  schedule_status: value.scheduleStatus,
  source_timetable_slot_id: value.sourceTimetableSlotId,
  replaced_occurrence_id: value.replacedOccurrenceId,
  notes: value.notes,
  created_at: value.createdAt,
  updated_at: value.updatedAt,
});

export const occurrenceFrom = (row: Row): ClassOccurrence => ({
  id: String(row.id),
  semesterId: String(row.semester_id),
  subjectId: String(row.subject_id),
  date: String(row.date),
  startTime: String(row.start_time),
  endTime: String(row.end_time),
  startDateTime: String(row.start_date_time),
  endDateTime: String(row.end_date_time),
  room: (row.room as string) ?? null,
  facultyOverride: (row.faculty_override as string) ?? null,
  classType: (row.class_type as ClassOccurrence['classType']) ?? 'theory',
  periodCount: Number(row.period_count ?? 1),
  occurrenceType: (row.occurrence_type as ClassOccurrence['occurrenceType']) ?? 'regular',
  scheduleStatus: (row.schedule_status as ClassOccurrence['scheduleStatus']) ?? 'scheduled',
  sourceTimetableSlotId: (row.source_timetable_slot_id as string) ?? null,
  replacedOccurrenceId: (row.replaced_occurrence_id as string) ?? null,
  notes: (row.notes as string) ?? null,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

export const attendanceRow = (value: AttendanceRecord): Row => ({
  id: value.id,
  occurrence_id: value.occurrenceId,
  subject_id: value.subjectId,
  semester_id: value.semesterId,
  date: value.date,
  status: value.status,
  weight: value.weight,
  marked_at: value.markedAt,
  source: value.source,
  created_at: value.createdAt,
  updated_at: value.updatedAt,
});

export const attendanceFrom = (row: Row): AttendanceRecord => ({
  id: String(row.id),
  occurrenceId: String(row.occurrence_id),
  subjectId: String(row.subject_id),
  semesterId: String(row.semester_id),
  date: String(row.date),
  status: (row.status as AttendanceRecord['status']) ?? 'present',
  weight: Number(row.weight ?? 1),
  markedAt: (row.marked_at as string) ?? null,
  source: (row.source as AttendanceRecord['source']) ?? 'user',
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

export const overrideRow = (value: CalendarOverride): Row => ({
  id: value.id,
  semester_id: value.semesterId,
  date: value.date,
  kind: value.kind,
  follow_day_of_week: value.followDayOfWeek,
  label: value.label,
  scope: value.scope,
  reason: value.reason,
  created_at: value.createdAt,
  updated_at: value.updatedAt,
});

export const overrideFrom = (row: Row): CalendarOverride => ({
  id: String(row.id),
  semesterId: String(row.semester_id),
  date: String(row.date),
  kind: (row.kind as CalendarOverride['kind']) ?? 'holiday',
  followDayOfWeek:
    row.follow_day_of_week === null || row.follow_day_of_week === undefined
      ? null
      : (Number(row.follow_day_of_week) as CalendarOverride['followDayOfWeek']),
  label: (row.label as string) ?? null,
  scope: (row.scope as CalendarOverride['scope']) ?? 'personal',
  reason: (row.reason as string) ?? null,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

export const auditRow = (value: OccurrenceAudit): Row => ({
  id: value.id,
  occurrence_id: value.occurrenceId,
  semester_id: value.semesterId,
  date: value.date,
  action: value.action,
  summary: value.summary,
  detail: value.detail,
  created_at: value.createdAt,
});

export const auditFrom = (row: Row): OccurrenceAudit => ({
  id: String(row.id),
  occurrenceId: (row.occurrence_id as string) ?? null,
  semesterId: String(row.semester_id),
  date: String(row.date),
  action: (row.action as OccurrenceAudit['action']) ?? 'status_changed',
  summary: String(row.summary ?? ''),
  detail: (row.detail as string) ?? null,
  createdAt: String(row.created_at),
});

export const importRow = (value: TimetableImport): Row => ({
  id: value.id,
  semester_id: value.semesterId,
  file_name: value.fileName,
  mime_type: value.mimeType,
  size_bytes: value.sizeBytes,
  status: value.status,
  provider: value.provider,
  storage_path: value.storagePath,
  extracted: value.extracted,
  warnings: value.warnings,
  error_message: value.errorMessage,
  is_retained: value.isRetained,
  created_at: value.createdAt,
  updated_at: value.updatedAt,
});

export const importFrom = (row: Row): TimetableImport => ({
  id: String(row.id),
  semesterId: String(row.semester_id),
  fileName: String(row.file_name ?? ''),
  storagePath: (row.storage_path as string) ?? null,
  mimeType: String(row.mime_type ?? 'application/octet-stream'),
  sizeBytes: Number(row.size_bytes ?? 0),
  status: (row.status as TimetableImport['status']) ?? 'pending',
  provider: (row.provider as string) ?? null,
  extracted: (row.extracted as TimetableImport['extracted']) ?? null,
  warnings: Array.isArray(row.warnings) ? (row.warnings as string[]) : [],
  errorMessage: (row.error_message as string) ?? null,
  isRetained: Boolean(row.is_retained),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

export const notificationRow = (value: AppNotification): Row => ({
  id: value.id,
  kind: value.kind,
  title: value.title,
  body: value.body,
  date: value.date,
  occurrence_ids: value.occurrenceIds,
  read_at: value.readAt,
  created_at: value.createdAt,
});

export const notificationFrom = (row: Row): AppNotification => ({
  id: String(row.id),
  userId: String(row.user_id ?? ''),
  kind: (row.kind as AppNotification['kind']) ?? 'after_class',
  title: String(row.title ?? ''),
  body: String(row.body ?? ''),
  date: String(row.date),
  occurrenceIds: Array.isArray(row.occurrence_ids) ? (row.occurrence_ids as string[]) : [],
  readAt: (row.read_at as string) ?? null,
  createdAt: String(row.created_at),
});

export const preferenceRow = (value: NotificationPreference): Row => ({
  id: value.id,
  after_class_reminder: value.afterClassReminder,
  reminder_delay_minutes: value.reminderDelayMinutes,
  missing_attendance_reminder: value.missingAttendanceReminder,
  attendance_risk_alert: value.attendanceRiskAlert,
  timetable_change_alert: value.timetableChangeAlert,
  working_saturday_alert: value.workingSaturdayAlert,
  combine_back_to_back: value.combineBackToBack,
  updated_at: value.updatedAt,
});

export const preferenceFrom = (row: Row): NotificationPreference => ({
  id: String(row.id),
  userId: String(row.user_id ?? ''),
  afterClassReminder: Boolean(row.after_class_reminder),
  reminderDelayMinutes: (Number(row.reminder_delay_minutes ?? 10) as NotificationPreference['reminderDelayMinutes']),
  missingAttendanceReminder: Boolean(row.missing_attendance_reminder),
  attendanceRiskAlert: Boolean(row.attendance_risk_alert),
  timetableChangeAlert: Boolean(row.timetable_change_alert),
  workingSaturdayAlert: Boolean(row.working_saturday_alert),
  combineBackToBack: Boolean(row.combine_back_to_back),
  updatedAt: String(row.updated_at),
});

export const settingsRow = (value: AppSettings): Row => ({
  id: value.id,
  theme: value.theme,
  preview_date: value.previewDate,
  onboarded: value.onboarded,
});

export const settingsFrom = (row: Row): AppSettings => ({
  id: String(row.id),
  theme: (row.theme as AppSettings['theme']) ?? 'light',
  previewDate: (row.preview_date as string) ?? null,
  onboarded: Boolean(row.onboarded),
});
