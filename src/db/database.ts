/**
 * Local-first persistence (Dexie / IndexedDB).
 *
 * This is the default store in demo/local mode and the offline cache in cloud
 * mode. It is intentionally dumb: repositories own the logic, this file only
 * describes tables and indexes.
 */
import Dexie, { type Table } from 'dexie';

import type {
  AppNotification,
  AppSettings,
  AttendanceRecord,
  CalendarOverride,
  ClassOccurrence,
  NotificationPreference,
  OccurrenceAudit,
  OutboxEntry,
  Profile,
  RecurringSlot,
  Semester,
  Subject,
  TimetableImport,
  TimetableVersion,
} from '@/types/domain';

export class ClassoraDatabase extends Dexie {
  profile!: Table<Profile, string>;
  semesters!: Table<Semester, string>;
  subjects!: Table<Subject, string>;
  versions!: Table<TimetableVersion, string>;
  slots!: Table<RecurringSlot, string>;
  occurrences!: Table<ClassOccurrence, string>;
  attendance!: Table<AttendanceRecord, string>;
  overrides!: Table<CalendarOverride, string>;
  imports!: Table<TimetableImport, string>;
  notifications!: Table<AppNotification, string>;
  preferences!: Table<NotificationPreference, string>;
  audit!: Table<OccurrenceAudit, string>;
  settings!: Table<AppSettings, string>;
  outbox!: Table<OutboxEntry, string>;

  constructor(name = 'classora') {
    super(name);
    // Only non-boolean, queryable fields are indexed; flags are filtered in
    // memory because IndexedDB cannot index booleans.
    this.version(1).stores({
      profile: 'id',
      semesters: 'id, startDate, endDate',
      subjects: 'id, semesterId, subjectCode',
      versions: 'id, semesterId, versionNumber',
      slots: 'id, semesterId, timetableVersionId, subjectId, dayOfWeek',
      occurrences: 'id, semesterId, date, subjectId, scheduleStatus, occurrenceType',
      attendance: 'id, occurrenceId, subjectId, semesterId, date, status',
      imports: 'id, semesterId, status',
      notifications: 'id, userId, date',
      preferences: 'id, userId',
      audit: 'id, semesterId, date',
      settings: 'id',
      outbox: 'id, entity, entityId',
    });
  }
}

let instance: ClassoraDatabase | null = null;

/** Shared database handle (safe to call repeatedly). */
export function getDatabase(): ClassoraDatabase {
  if (!instance) instance = new ClassoraDatabase();
  return instance;
}

/** Test helper — drops the cached handle so a fresh DB can be created. */
export function resetDatabaseHandle(): void {
  instance = null;
}
