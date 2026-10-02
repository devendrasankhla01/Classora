/**
 * Storage contract.
 *
 * Everything above this interface (store, hooks, UI) is storage-agnostic: the
 * same application runs against IndexedDB in demo mode and against Supabase in
 * cloud mode. Adding a future platform (Capacitor SQLite, for example) means
 * implementing this interface once.
 */
import type {
  AppNotification,
  AppSettings,
  AttendanceRecord,
  CalendarOverride,
  ClassOccurrence,
  DateKey,
  NotificationPreference,
  OccurrenceAudit,
  Profile,
  RecurringSlot,
  Semester,
  Subject,
  TimetableImport,
  TimetableVersion,
} from '@/types/domain';

export interface BackupBundle {
  schemaVersion: number;
  exportedAt: string;
  profile: Profile | null;
  semesters: Semester[];
  subjects: Subject[];
  versions: TimetableVersion[];
  slots: RecurringSlot[];
  occurrences: ClassOccurrence[];
  attendance: AttendanceRecord[];
  overrides: CalendarOverride[];
  audit: OccurrenceAudit[];
  settings: AppSettings | null;
  preferences: NotificationPreference | null;
}

export interface DataStore {
  readonly mode: 'local' | 'cloud';

  init(): Promise<void>;
  isSeeded(): Promise<boolean>;

  /* Profile & semester -------------------------------------------------- */
  getProfile(): Promise<Profile | null>;
  saveProfile(profile: Profile): Promise<void>;
  listSemesters(): Promise<Semester[]>;
  saveSemester(semester: Semester): Promise<void>;

  /* Subjects ------------------------------------------------------------ */
  listSubjects(semesterId: string): Promise<Subject[]>;
  saveSubject(subject: Subject): Promise<void>;
  saveSubjects(subjects: Subject[]): Promise<void>;

  /* Timetable ----------------------------------------------------------- */
  listVersions(semesterId: string): Promise<TimetableVersion[]>;
  saveVersion(version: TimetableVersion): Promise<void>;
  saveVersions(versions: TimetableVersion[]): Promise<void>;
  listSlots(semesterId: string): Promise<RecurringSlot[]>;
  replaceSlots(semesterId: string, versionId: string, slots: RecurringSlot[]): Promise<void>;
  /** Slots of an arbitrary (historical) version, for preview/restore. */
  listSlotsByVersion(versionId: string): Promise<RecurringSlot[]>;

  /* Occurrences --------------------------------------------------------- */
  listOccurrences(semesterId: string): Promise<ClassOccurrence[]>;
  listOccurrencesBetween(semesterId: string, from: DateKey, to: DateKey): Promise<ClassOccurrence[]>;
  saveOccurrences(occurrences: ClassOccurrence[]): Promise<void>;
  updateOccurrence(id: string, patch: Partial<ClassOccurrence>): Promise<void>;
  deleteOccurrence(id: string): Promise<void>;

  /* Attendance ---------------------------------------------------------- */
  listAttendance(semesterId: string): Promise<AttendanceRecord[]>;
  saveAttendanceRecord(record: AttendanceRecord): Promise<void>;
  deleteAttendanceRecord(occurrenceId: string): Promise<void>;
  deleteAttendanceRecordsForSubject(subjectId: string): Promise<void>;

  /* Calendar overrides --------------------------------------------------- */
  listOverrides(semesterId: string): Promise<CalendarOverride[]>;
  saveOverride(override: CalendarOverride): Promise<void>;
  deleteOverride(id: string): Promise<void>;

  /* Audit ---------------------------------------------------------------- */
  listAudit(semesterId: string): Promise<OccurrenceAudit[]>;
  addAudit(entry: OccurrenceAudit): Promise<void>;

  /* Imports -------------------------------------------------------------- */
  listImports(semesterId: string): Promise<TimetableImport[]>;
  saveImport(record: TimetableImport): Promise<void>;
  deleteImport(id: string): Promise<void>;

  /* Notifications -------------------------------------------------------- */
  listNotifications(userId: string): Promise<AppNotification[]>;
  saveNotification(notification: AppNotification): Promise<void>;
  markNotificationRead(id: string): Promise<void>;
  getPreferences(userId: string): Promise<NotificationPreference | null>;
  savePreferences(preferences: NotificationPreference): Promise<void>;

  /* Settings & maintenance ---------------------------------------------- */
  getSettings(): Promise<AppSettings | null>;
  saveSettings(settings: AppSettings): Promise<void>;
  exportBackup(): Promise<BackupBundle>;
  importBackup(bundle: BackupBundle): Promise<void>;
  clearAll(): Promise<void>;
}
