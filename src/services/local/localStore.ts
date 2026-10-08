/**
 * IndexedDB implementation of the Classora storage contract.
 *
 * Used as the primary store in demo/local mode, and as the offline cache when
 * cloud mode is configured.
 */
import { getDatabase } from '@/db/database';
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
import type { BackupBundle, DataStore } from '@/services/types';

export class LocalStore implements DataStore {
  readonly mode = 'local' as const;

  private get db() {
    return getDatabase();
  }

  async init(): Promise<void> {
    await this.db.open();
  }

  async isSeeded(): Promise<boolean> {
    const profile = await this.db.profile.toCollection().first();
    return Boolean(profile);
  }

  /* Profile & semester -------------------------------------------------- */

  async getProfile(): Promise<Profile | null> {
    const list = await this.db.profile.toArray();
    if (list.length === 0) return null;
    list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    return list[0] ?? null;
  }

  async saveProfile(profile: Profile): Promise<void> {
    await this.db.profile.clear();
    await this.db.profile.put(profile);
  }

  async listSemesters(): Promise<Semester[]> {
    const semesters = await this.db.semesters.toArray();
    return semesters.sort((a, b) => b.startDate.localeCompare(a.startDate));
  }

  async saveSemester(semester: Semester): Promise<void> {
    await this.db.semesters.put(semester);
  }

  /* Subjects ------------------------------------------------------------ */

  async listSubjects(semesterId: string): Promise<Subject[]> {
    const subjects = await this.db.subjects.where('semesterId').equals(semesterId).toArray();
    return subjects.sort((a, b) => a.name.localeCompare(b.name));
  }

  async saveSubject(subject: Subject): Promise<void> {
    await this.db.subjects.put(subject);
  }

  async saveSubjects(subjects: Subject[]): Promise<void> {
    await this.db.subjects.bulkPut(subjects);
  }

  /* Timetable ----------------------------------------------------------- */

  async listVersions(semesterId: string): Promise<TimetableVersion[]> {
    const versions = await this.db.versions.where('semesterId').equals(semesterId).toArray();
    return versions.sort((a, b) => b.versionNumber - a.versionNumber);
  }

  async saveVersion(version: TimetableVersion): Promise<void> {
    await this.db.versions.put(version);
  }

  async saveVersions(versions: TimetableVersion[]): Promise<void> {
    await this.db.versions.bulkPut(versions);
  }

  async listSlots(semesterId: string): Promise<RecurringSlot[]> {
    return this.db.slots.where('semesterId').equals(semesterId).toArray();
  }

  async listSlotsByVersion(versionId: string): Promise<RecurringSlot[]> {
    return this.db.slots.where('timetableVersionId').equals(versionId).toArray();
  }

  async replaceSlots(semesterId: string, versionId: string, slots: RecurringSlot[]): Promise<void> {
    await this.db.transaction('rw', this.db.slots, async () => {
      const existing = await this.db.slots.where('semesterId').equals(semesterId).toArray();
      if (existing.length > 0) {
        await this.db.slots.bulkDelete(existing.map((slot) => slot.id));
      }
      const tagged = slots.map((s) => ({ ...s, semesterId, timetableVersionId: versionId }));
      if (tagged.length > 0) await this.db.slots.bulkPut(tagged);
    });
  }

  /* Occurrences --------------------------------------------------------- */

  async listOccurrences(semesterId: string): Promise<ClassOccurrence[]> {
    const occurrences = await this.db.occurrences.where('semesterId').equals(semesterId).toArray();
    return occurrences.sort(
      (a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
    );
  }

  async listOccurrencesBetween(semesterId: string, from: DateKey, to: DateKey): Promise<ClassOccurrence[]> {
    const occurrences = await this.db.occurrences
      .where('semesterId')
      .equals(semesterId)
      .and((occurrence) => occurrence.date >= from && occurrence.date <= to)
      .toArray();
    return occurrences.sort(
      (a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
    );
  }

  async saveOccurrences(occurrences: ClassOccurrence[]): Promise<void> {
    if (occurrences.length === 0) return;
    await this.db.occurrences.bulkPut(occurrences);
  }

  async updateOccurrence(id: string, patch: Partial<ClassOccurrence>): Promise<void> {
    await this.db.occurrences.update(id, patch);
  }

  async deleteOccurrence(id: string): Promise<void> {
    await this.db.occurrences.delete(id);
  }

  /* Attendance ---------------------------------------------------------- */

  async listAttendance(semesterId: string): Promise<AttendanceRecord[]> {
    return this.db.attendance.where('semesterId').equals(semesterId).toArray();
  }

  async saveAttendanceRecord(record: AttendanceRecord): Promise<void> {
    await this.db.attendance.put(record);
  }

  async deleteAttendanceRecord(occurrenceId: string): Promise<void> {
    const records = await this.db.attendance.where('occurrenceId').equals(occurrenceId).toArray();
    await this.db.attendance.bulkDelete(records.map((record) => record.id));
  }

  async deleteAttendanceRecordsForSubject(subjectId: string): Promise<void> {
    const records = await this.db.attendance.where('subjectId').equals(subjectId).toArray();
    await this.db.attendance.bulkDelete(records.map((record) => record.id));
  }

  /* Overrides ------------------------------------------------------------ */

  async listOverrides(semesterId: string): Promise<CalendarOverride[]> {
    return this.db.overrides.where('semesterId').equals(semesterId).toArray();
  }

  async saveOverride(override: CalendarOverride): Promise<void> {
    await this.db.overrides.put(override);
  }

  async deleteOverride(id: string): Promise<void> {
    await this.db.overrides.delete(id);
  }

  /* Audit ---------------------------------------------------------------- */

  async listAudit(semesterId: string): Promise<OccurrenceAudit[]> {
    const entries = await this.db.audit.where('semesterId').equals(semesterId).toArray();
    return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async addAudit(entry: OccurrenceAudit): Promise<void> {
    await this.db.audit.put(entry);
  }

  /* Imports -------------------------------------------------------------- */

  async listImports(semesterId: string): Promise<TimetableImport[]> {
    const imports = await this.db.imports.where('semesterId').equals(semesterId).toArray();
    return imports.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async saveImport(record: TimetableImport): Promise<void> {
    await this.db.imports.put(record);
  }

  async deleteImport(id: string): Promise<void> {
    await this.db.imports.delete(id);
  }

  /* Notifications -------------------------------------------------------- */

  async listNotifications(userId: string): Promise<AppNotification[]> {
    const notifications = await this.db.notifications.where('userId').equals(userId).toArray();
    return notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async saveNotification(notification: AppNotification): Promise<void> {
    await this.db.notifications.put(notification);
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.db.notifications.update(id, { readAt: new Date().toISOString() });
  }

  async getPreferences(userId: string): Promise<NotificationPreference | null> {
    return (await this.db.preferences.where('userId').equals(userId).first()) ?? null;
  }

  async savePreferences(preferences: NotificationPreference): Promise<void> {
    await this.db.preferences.put(preferences);
  }

  /* Settings -------------------------------------------------------------- */

  async getSettings(): Promise<AppSettings | null> {
    return (await this.db.settings.toCollection().first()) ?? null;
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await this.db.settings.put(settings);
  }

  /* Backup ---------------------------------------------------------------- */

  async exportBackup(): Promise<BackupBundle> {
    const [
      profile,
      semesters,
      subjects,
      versions,
      slots,
      occurrences,
      attendance,
      overrides,
      audit,
      settings,
      preferences,
    ] = await Promise.all([
      this.getProfile(),
      this.db.semesters.toArray(),
      this.db.subjects.toArray(),
      this.db.versions.toArray(),
      this.db.slots.toArray(),
      this.db.occurrences.toArray(),
      this.db.attendance.toArray(),
      this.db.overrides.toArray(),
      this.db.audit.toArray(),
      this.getSettings(),
      this.db.preferences.toCollection().first(),
    ]);

    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      profile,
      semesters,
      subjects,
      versions,
      slots,
      occurrences,
      attendance,
      overrides,
      audit,
      settings,
      preferences: preferences ?? null,
    };
  }

  async importBackup(bundle: BackupBundle): Promise<void> {
    // An explicit table list (Dexie's array overload) keeps the whole import
    // atomic — a partial restore would be worse than none.
    await this.db.transaction(
      'rw',
      [
        this.db.profile,
        this.db.semesters,
        this.db.subjects,
        this.db.versions,
        this.db.slots,
        this.db.occurrences,
        this.db.attendance,
        this.db.overrides,
        this.db.audit,
        this.db.settings,
        this.db.preferences,
      ],
      async () => {
        if (bundle.profile) await this.db.profile.put(bundle.profile);
        await this.db.semesters.bulkPut(bundle.semesters);
        await this.db.subjects.bulkPut(bundle.subjects);
        await this.db.versions.bulkPut(bundle.versions);
        await this.db.slots.bulkPut(bundle.slots);
        await this.db.occurrences.bulkPut(bundle.occurrences);
        await this.db.attendance.bulkPut(bundle.attendance);
        await this.db.overrides.bulkPut(bundle.overrides);
        await this.db.audit.bulkPut(bundle.audit);
        if (bundle.settings) await this.db.settings.put(bundle.settings);
        if (bundle.preferences) await this.db.preferences.put(bundle.preferences);
      },
    );
  }

  async clearAll(): Promise<void> {
    await this.db.transaction(
      'rw',
      [
        this.db.profile,
        this.db.semesters,
        this.db.subjects,
        this.db.versions,
        this.db.slots,
        this.db.occurrences,
        this.db.attendance,
        this.db.overrides,
        this.db.audit,
        this.db.imports,
        this.db.notifications,
        this.db.preferences,
        this.db.settings,
        this.db.outbox,
      ],
      async () => {
        await Promise.all([
          this.db.profile.clear(),
          this.db.semesters.clear(),
          this.db.subjects.clear(),
          this.db.versions.clear(),
          this.db.slots.clear(),
          this.db.occurrences.clear(),
          this.db.attendance.clear(),
          this.db.overrides.clear(),
          this.db.audit.clear(),
          this.db.imports.clear(),
          this.db.notifications.clear(),
          this.db.preferences.clear(),
          this.db.settings.clear(),
          this.db.outbox.clear(),
        ]);
      },
    );
  }
}
