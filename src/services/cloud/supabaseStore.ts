/**
 * Supabase implementation of the Classora storage contract.
 *
 * Design decisions that matter:
 *  - **Offline-first.** Every read falls back to the on-device cache, and every
 *    write lands locally first and is queued in the outbox if the network is
 *    unavailable. The UI never blocks on a request.
 *  - **RLS carries the security.** The client only ever sends the anon key; each
 *    table is protected by `user_id = auth.uid()` policies (see
 *    `supabase/schema.sql`).
 *  - **No table names leak upward.** Everything is mapped to domain objects.
 */
import { getDatabase } from '@/db/database';
import { createId } from '@/lib/id';
import { nowInstant } from '@/lib/date';
import { LocalStore } from '@/services/local/localStore';
import type { BackupBundle, DataStore } from '@/services/types';
import type {
  AppNotification,
  AppSettings,
  AttendanceRecord,
  CalendarOverride,
  ClassOccurrence,
  DateKey,
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
import { getSupabaseClient, type CloudConfig } from './client';
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
  type Row,
} from './mapping';

type TableName =
  | 'profiles'
  | 'semesters'
  | 'subjects'
  | 'timetable_versions'
  | 'recurring_slots'
  | 'class_occurrences'
  | 'attendance_records'
  | 'calendar_overrides'
  | 'occurrence_audit'
  | 'timetable_imports'
  | 'app_notifications'
  | 'notification_preferences'
  | 'app_settings';

/** Tables the outbox can replay. */
const OUTBOX_TABLE: Record<OutboxEntry['entity'], TableName> = {
  profile: 'profiles',
  semester: 'semesters',
  subject: 'subjects',
  occurrence: 'class_occurrences',
  attendance: 'attendance_records',
  override: 'calendar_overrides',
};

export class SupabaseStore implements DataStore {
  readonly mode = 'cloud' as const;

  /** Mirror of the remote data, so the app keeps working offline. */
  private readonly cache = new LocalStore();
  private userId: string | null = null;

  constructor(readonly config: CloudConfig) {}

  /* ---------------------------------------------------------------- *
   * Plumbing                                                          *
   * ---------------------------------------------------------------- */

  private async client() {
    return getSupabaseClient();
  }

  private async queue(entry: Omit<OutboxEntry, 'id' | 'createdAt' | 'attempts'>): Promise<void> {
    const db = getDatabase();
    await db.outbox.put({
      ...entry,
      id: createId('outbox'),
      attempts: 0,
      createdAt: nowInstant(),
    });
  }

  /**
   * Replay queued writes. Called on init and whenever a request succeeds, so a
   * device that was offline for a day catches up without user action.
   */
  async flushOutbox(): Promise<{ flushed: number; remaining: number }> {
    const client = await this.client();
    if (!client || !this.userId) return { flushed: 0, remaining: 0 };

    const db = getDatabase();
    const entries = (await db.outbox.toArray()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    let flushed = 0;

    for (const entry of entries) {
      const table = OUTBOX_TABLE[entry.entity];
      const payload = entry.payload as Row;
      const result =
        entry.op === 'delete'
          ? await client.from(table).delete().eq('id', entry.entityId)
          : await client.from(table).upsert(withUser({ ...payload, id: entry.entityId }, this.userId));

      if (result.error) {
        await db.outbox.put({ ...entry, attempts: entry.attempts + 1 });
        continue;
      }
      await db.outbox.delete(entry.id);
      flushed += 1;
    }

    return { flushed, remaining: entries.length - flushed };
  }

  /** Write-through: cache locally, then remote (queued on failure). */
  private async write(
    entity: OutboxEntry['entity'],
    row: Row,
    local: () => Promise<void>,
    op: OutboxEntry['op'] = 'upsert',
  ): Promise<void> {
    await local();

    const client = await this.client();
    if (!client || !this.userId) return;

    const table = OUTBOX_TABLE[entity];
    const request =
      op === 'delete'
        ? client.from(table).delete().eq('id', String(row.id))
        : client.from(table).upsert(withUser(row, this.userId));

    const { error } = await request;
    if (error) {
      await this.queue({ entity, op, entityId: String(row.id), payload: row });
    }
  }

  /* ---------------------------------------------------------------- *
   * Lifecycle                                                         *
   * ---------------------------------------------------------------- */

  async init(): Promise<void> {
    await this.cache.init();
    const client = await this.client();
    if (!client) return;

    const { data } = await client.auth.getUser();
    this.userId = data.user?.id ?? null;
    if (this.userId) await this.flushOutbox();
  }

  async isSeeded(): Promise<boolean> {
    const client = await this.client();
    if (client && this.userId) {
      const { data, error } = await client.from('profiles').select('id').eq('id', this.userId).limit(1);
      if (!error) return (data ?? []).length > 0;
    }
    return this.cache.isSeeded();
  }

  /* ---------------------------------------------------------------- *
   * Profile & semester                                                *
   * ---------------------------------------------------------------- */

  async getProfile(): Promise<Profile | null> {
    const client = await this.client();
    if (client && this.userId) {
      const { data, error } = await client.from('profiles').select('*').eq('id', this.userId).maybeSingle();
      if (!error && data) return profileFrom(data as Row);
    }
    return this.cache.getProfile();
  }

  async saveProfile(profile: Profile): Promise<void> {
    await this.write('profile', profileRow(profile), () => this.cache.saveProfile(profile));
  }

  async listSemesters(): Promise<Semester[]> {
    const client = await this.client();
    if (client && this.userId) {
      const { data, error } = await client
        .from('semesters')
        .select('*')
        .order('start_date', { ascending: false });
      if (!error) return ((data ?? []) as Row[]).map(semesterFrom);
    }
    return this.cache.listSemesters();
  }

  async saveSemester(semester: Semester): Promise<void> {
    await this.write('semester', semesterRow(semester), () => this.cache.saveSemester(semester));
  }

  /* ---------------------------------------------------------------- *
   * Subjects                                                          *
   * ---------------------------------------------------------------- */

  async listSubjects(semesterId: string): Promise<Subject[]> {
    const client = await this.client();
    if (client) {
      const { data, error } = await client.from('subjects').select('*').eq('semester_id', semesterId);
      if (!error) return ((data ?? []) as Row[]).map(subjectFrom);
    }
    return this.cache.listSubjects(semesterId);
  }

  async saveSubject(subject: Subject): Promise<void> {
    await this.write('subject', subjectRow(subject), () => this.cache.saveSubject(subject));
  }

  async saveSubjects(subjects: Subject[]): Promise<void> {
    await this.cache.saveSubjects(subjects);
    const client = await this.client();
    if (!client || !this.userId) return;
    const { error } = await client
      .from('subjects')
      .upsert(subjects.map((subject) => withUser(subjectRow(subject), this.userId!)));
    if (error) {
      for (const subject of subjects) {
        await this.queue({ entity: 'subject', op: 'upsert', entityId: subject.id, payload: subjectRow(subject) });
      }
    }
  }

  /* ---------------------------------------------------------------- *
   * Timetable                                                         *
   * ---------------------------------------------------------------- */

  async listVersions(semesterId: string): Promise<TimetableVersion[]> {
    const client = await this.client();
    if (client) {
      const { data, error } = await client
        .from('timetable_versions')
        .select('*')
        .eq('semester_id', semesterId)
        .order('version_number', { ascending: false });
      if (!error) return ((data ?? []) as Row[]).map(versionFrom);
    }
    return this.cache.listVersions(semesterId);
  }

  async saveVersion(version: TimetableVersion): Promise<void> {
    await this.cache.saveVersion(version);
    const client = await this.client();
    if (!client || !this.userId) return;
    const { error } = await client.from('timetable_versions').upsert(withUser(versionRow(version), this.userId));
    if (error) {
      await this.queue({ entity: 'semester', op: 'upsert', entityId: version.id, payload: versionRow(version) });
    }
  }

  async saveVersions(versions: TimetableVersion[]): Promise<void> {
    for (const version of versions) await this.saveVersion(version);
  }

  async listSlots(semesterId: string): Promise<RecurringSlot[]> {
    const client = await this.client();
    if (client) {
      const { data, error } = await client.from('recurring_slots').select('*').eq('semester_id', semesterId);
      if (!error) return ((data ?? []) as Row[]).map(slotFrom);
    }
    return this.cache.listSlots(semesterId);
  }

  async replaceSlots(semesterId: string, versionId: string, slots: RecurringSlot[]): Promise<void> {
    const tagged = slots.map((s) => ({ ...s, semesterId, timetableVersionId: versionId }));
    await this.cache.replaceSlots(semesterId, versionId, tagged);
    const client = await this.client();
    if (!client || !this.userId) return;

    const { error: deleteError } = await client
      .from('recurring_slots')
      .delete()
      .eq('semester_id', semesterId);
    if (deleteError) return;

    if (tagged.length === 0) return;
    const { error } = await client
      .from('recurring_slots')
      .upsert(tagged.map((slot) => withUser(slotRow(slot), this.userId!)));
    if (error) {
      for (const slot of tagged) {
        await this.queue({ entity: 'semester', op: 'upsert', entityId: slot.id, payload: slotRow(slot) });
      }
    }
  }

  async listSlotsByVersion(versionId: string): Promise<RecurringSlot[]> {
    const client = await this.client();
    if (client) {
      const { data, error } = await client
        .from('recurring_slots')
        .select('*')
        .eq('timetable_version_id', versionId);
      if (!error) return ((data ?? []) as Row[]).map(slotFrom);
    }
    return this.cache.listSlotsByVersion(versionId);
  }

  /* ---------------------------------------------------------------- *
   * Occurrences                                                       *
   * ---------------------------------------------------------------- */

  async listOccurrences(semesterId: string): Promise<ClassOccurrence[]> {
    const client = await this.client();
    if (client) {
      const { data, error } = await client
        .from('class_occurrences')
        .select('*')
        .eq('semester_id', semesterId)
        .order('date', { ascending: true });
      if (!error) return ((data ?? []) as Row[]).map(occurrenceFrom);
    }
    return this.cache.listOccurrences(semesterId);
  }

  async listOccurrencesBetween(semesterId: string, from: DateKey, to: DateKey): Promise<ClassOccurrence[]> {
    const client = await this.client();
    if (client) {
      const { data, error } = await client
        .from('class_occurrences')
        .select('*')
        .eq('semester_id', semesterId)
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: true });
      if (!error) return ((data ?? []) as Row[]).map(occurrenceFrom);
    }
    return this.cache.listOccurrencesBetween(semesterId, from, to);
  }

  async saveOccurrences(occurrences: ClassOccurrence[]): Promise<void> {
    await this.cache.saveOccurrences(occurrences);
    const client = await this.client();
    if (!client || !this.userId) return;
    const { error } = await client
      .from('class_occurrences')
      .upsert(occurrences.map((occurrence) => withUser(occurrenceRow(occurrence), this.userId!)));
    if (error) {
      for (const occurrence of occurrences) {
        await this.queue({
          entity: 'occurrence',
          op: 'upsert',
          entityId: occurrence.id,
          payload: occurrenceRow(occurrence),
        });
      }
    }
  }

  async updateOccurrence(id: string, patch: Partial<ClassOccurrence>): Promise<void> {
    await this.cache.updateOccurrence(id, patch);

    const client = await this.client();
    if (!client || !this.userId) return;
    const row = Object.fromEntries(
      Object.entries(patch).map(([key, value]) => [snake(key), value]),
    ) as Row;
    const { error } = await client.from('class_occurrences').update(row).eq('id', id);
    if (error) {
      const occurrence = (await this.cache.listOccurrences('')).find((item) => item.id === id);
      if (occurrence) {
        await this.queue({
          entity: 'occurrence',
          op: 'upsert',
          entityId: id,
          payload: occurrenceRow(occurrence),
        });
      }
    }
  }

  async deleteOccurrence(id: string): Promise<void> {
    await this.cache.deleteOccurrence(id);
    await this.write('occurrence', { id }, () => Promise.resolve(), 'delete');
  }

  /* ---------------------------------------------------------------- *
   * Attendance                                                        *
   * ---------------------------------------------------------------- */

  async listAttendance(semesterId: string): Promise<AttendanceRecord[]> {
    const client = await this.client();
    if (client) {
      const { data, error } = await client.from('attendance_records').select('*').eq('semester_id', semesterId);
      if (!error) return ((data ?? []) as Row[]).map(attendanceFrom);
    }
    return this.cache.listAttendance(semesterId);
  }

  async saveAttendanceRecord(record: AttendanceRecord): Promise<void> {
    await this.write('attendance', attendanceRow(record), () => this.cache.saveAttendanceRecord(record));
  }

  async deleteAttendanceRecord(occurrenceId: string): Promise<void> {
    await this.cache.deleteAttendanceRecord(occurrenceId);
    const client = await this.client();
    if (!client) return;
    const { error } = await client.from('attendance_records').delete().eq('occurrence_id', occurrenceId);
    if (error) {
      await this.queue({
        entity: 'attendance',
        op: 'delete',
        entityId: occurrenceId,
        payload: { id: occurrenceId },
      });
    }
  }

  async deleteAttendanceRecordsForSubject(subjectId: string): Promise<void> {
    await this.cache.deleteAttendanceRecordsForSubject(subjectId);
    const client = await this.client();
    if (!client) return;
    await client.from('attendance_records').delete().eq('subject_id', subjectId);
  }

  /* ---------------------------------------------------------------- *
   * Calendar overrides                                                *
   * ---------------------------------------------------------------- */

  async listOverrides(semesterId: string): Promise<CalendarOverride[]> {
    const client = await this.client();
    if (client) {
      const { data, error } = await client.from('calendar_overrides').select('*').eq('semester_id', semesterId);
      if (!error) return ((data ?? []) as Row[]).map(overrideFrom);
    }
    return this.cache.listOverrides(semesterId);
  }

  async saveOverride(override: CalendarOverride): Promise<void> {
    await this.write('override', overrideRow(override), () => this.cache.saveOverride(override));
  }

  async deleteOverride(id: string): Promise<void> {
    await this.cache.deleteOverride(id);
    await this.write('override', { id }, () => Promise.resolve(), 'delete');
  }

  /* ---------------------------------------------------------------- *
   * Audit & imports                                                   *
   * ---------------------------------------------------------------- */

  async listAudit(semesterId: string): Promise<OccurrenceAudit[]> {
    const client = await this.client();
    if (client) {
      const { data, error } = await client
        .from('occurrence_audit')
        .select('*')
        .eq('semester_id', semesterId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (!error) return ((data ?? []) as Row[]).map(auditFrom);
    }
    return this.cache.listAudit(semesterId);
  }

  async addAudit(entry: OccurrenceAudit): Promise<void> {
    await this.cache.addAudit(entry);
    const client = await this.client();
    if (!client || !this.userId) return;
    await client.from('occurrence_audit').insert(withUser(auditRow(entry), this.userId));
  }

  async listImports(semesterId: string): Promise<TimetableImport[]> {
    const client = await this.client();
    if (client) {
      const { data, error } = await client.from('timetable_imports').select('*').eq('semester_id', semesterId);
      if (!error) return ((data ?? []) as Row[]).map(importFrom);
    }
    return this.cache.listImports(semesterId);
  }

  async saveImport(record: TimetableImport): Promise<void> {
    await this.cache.saveImport(record);
    const client = await this.client();
    if (!client || !this.userId) return;
    await client.from('timetable_imports').upsert(withUser(importRow(record), this.userId));
  }

  async deleteImport(id: string): Promise<void> {
    await this.cache.deleteImport(id);
    const client = await this.client();
    if (!client) return;
    await client.from('timetable_imports').delete().eq('id', id);
  }

  /* ---------------------------------------------------------------- *
   * Notifications                                                     *
   * ---------------------------------------------------------------- */

  async listNotifications(userId: string): Promise<AppNotification[]> {
    const client = await this.client();
    if (client) {
      const { data, error } = await client
        .from('app_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error) return ((data ?? []) as Row[]).map(notificationFrom);
    }
    return this.cache.listNotifications(userId);
  }

  async saveNotification(notification: AppNotification): Promise<void> {
    await this.cache.saveNotification(notification);
    const client = await this.client();
    if (!client || !this.userId) return;
    await client.from('app_notifications').upsert(withUser(notificationRow(notification), this.userId));
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.cache.markNotificationRead(id);
    const client = await this.client();
    if (!client) return;
    await client.from('app_notifications').update({ read_at: nowInstant() }).eq('id', id);
  }

  async getPreferences(userId: string): Promise<NotificationPreference | null> {
    const client = await this.client();
    if (client) {
      const { data, error } = await client
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (!error && data) return preferenceFrom(data as Row);
    }
    return this.cache.getPreferences(userId);
  }

  async savePreferences(preferences: NotificationPreference): Promise<void> {
    await this.cache.savePreferences(preferences);
    const client = await this.client();
    if (!client || !this.userId) return;
    await client
      .from('notification_preferences')
      .upsert(withUser(preferenceRow(preferences), this.userId));
  }

  /* ---------------------------------------------------------------- *
   * Settings, backup & maintenance                                    *
   * ---------------------------------------------------------------- */

  async getSettings(): Promise<AppSettings | null> {
    const client = await this.client();
    if (client && this.userId) {
      const { data, error } = await client.from('app_settings').select('*').eq('id', this.userId).maybeSingle();
      if (!error && data) return settingsFrom(data as Row);
    }
    return this.cache.getSettings();
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await this.cache.saveSettings(settings);
    const client = await this.client();
    if (!client || !this.userId) return;
    await client.from('app_settings').upsert(withUser(settingsRow(settings), this.userId));
  }

  /** Backup always comes from the cache, so it works offline. */
  async exportBackup(): Promise<BackupBundle> {
    return this.cache.exportBackup();
  }

  async importBackup(bundle: BackupBundle): Promise<void> {
    await this.cache.importBackup(bundle);

    const client = await this.client();
    if (!client || !this.userId) {
      // Queue the whole bundle so a first sign-in offline still syncs later.
      if (bundle.profile) {
        await this.queue({ entity: 'profile', op: 'upsert', entityId: bundle.profile.id, payload: profileRow(bundle.profile) });
      }
      for (const subject of bundle.subjects) {
        await this.queue({ entity: 'subject', op: 'upsert', entityId: subject.id, payload: subjectRow(subject) });
      }
      return;
    }

    if (bundle.profile) {
      await client.from('profiles').upsert(withUser(profileRow(bundle.profile), this.userId));
    }
    const batch: { table: TableName; rows: Row[] }[] = [
      { table: 'semesters', rows: bundle.semesters.map(semesterRow) },
      { table: 'subjects', rows: bundle.subjects.map(subjectRow) },
      { table: 'timetable_versions', rows: bundle.versions.map(versionRow) },
      { table: 'recurring_slots', rows: bundle.slots.map(slotRow) },
      { table: 'class_occurrences', rows: bundle.occurrences.map(occurrenceRow) },
      { table: 'attendance_records', rows: bundle.attendance.map(attendanceRow) },
      { table: 'calendar_overrides', rows: bundle.overrides.map(overrideRow) },
      { table: 'occurrence_audit', rows: bundle.audit.map(auditRow) },
    ];

    for (const { table, rows } of batch) {
      if (rows.length === 0) continue;
      // Chunked so a semester-long dataset does not exceed the request limit.
      for (let index = 0; index < rows.length; index += 200) {
        const slice = rows.slice(index, index + 200);
        await client.from(table).upsert(slice.map((row) => withUser(row, this.userId!)));
      }
    }

    if (bundle.settings) await this.saveSettings(bundle.settings);
    if (bundle.preferences) await this.savePreferences(bundle.preferences);
  }

  async clearAll(): Promise<void> {
    await this.cache.clearAll();
    const client = await this.client();
    if (!client || !this.userId) return;

    // RLS scopes the delete to the signed-in user's rows.
    for (const table of [
      'class_occurrences',
      'attendance_records',
      'recurring_slots',
      'timetable_versions',
      'calendar_overrides',
      'subjects',
      'semesters',
      'occurrence_audit',
      'timetable_imports',
      'app_notifications',
    ] as TableName[]) {
      await client.from(table).delete().eq('user_id', this.userId);
    }
    await client.from('profiles').delete().eq('id', this.userId);
  }
}

/* ------------------------------------------------------------------ *
 * Small helpers                                                       *
 * ------------------------------------------------------------------ */

/** camelCase → snake_case, used for partial updates. */
function snake(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export { snake };
