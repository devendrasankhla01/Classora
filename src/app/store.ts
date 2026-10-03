/**
 * Classora application store.
 *
 * Holds the working set for the active semester and exposes every domain
 * action the UI needs. All writes go through the storage contract, so the same
 * code path serves IndexedDB (demo/offline) and Supabase (cloud) — and every
 * mutation is applied optimistically so the UI never waits on the network.
 */
import { create } from 'zustand';
import { LocalStore } from '@/services/local/localStore';
import { createCloudStoreIfConfigured } from '@/services/cloud/createCloudStore';
import type { DataStore } from '@/services/types';
import {
  attendanceWeight,
  buildUnits,
  dataConfidence,
  summarize,
  type AttendanceSummary,
} from '@/lib/attendance';
import { addDaysToKey, nowInstant, toInstant, todayKey } from '@/lib/date';
import { buildNotifications, newNotificationsOnly } from '@/lib/notifications';
import { createId } from '@/lib/id';
import {
  buildCancellation,
  buildExtraClass,
  buildOccurrenceOverride,
  buildReplacement,
  futureGenerationRange,
  generateOccurrences,
  normalizeSignature,
  slotsForDate,
} from '@/lib/schedule';
import type {
  AppNotification,
  AppSettings,
  AttendanceRecord,
  AttendanceStatus,
  CalendarOverride,
  ClassOccurrence,
  DateKey,
  NotificationPreference,
  OccurrenceAudit,
  Profile,
  RecurringSlot,
  Semester,
  Subject,
  SyncState,
  TimetableVersion,
} from '@/types/domain';

export type AttendanceAction = Extract<AttendanceStatus, 'present' | 'absent'>;

export interface Announcement {
  id: string;
  tone: 'success' | 'info' | 'warning' | 'error';
  message: string;
  action?: { label: string; run: () => void };
}

export interface CancelClassInput {
  occurrenceId: string;
  reason: string | null;
  /** Whether the college did not hold the class at all. */
  notConducted?: boolean;
}

export interface ExtraClassInput {
  subjectId: string;
  date: DateKey;
  startTime: string;
  endTime: string;
  room: string | null;
  classType: ClassOccurrence['classType'];
  periodCount: number;
  notes?: string | null;
}

export interface ReplaceClassInput {
  occurrenceId: string;
  subjectId: string;
  room?: string | null;
}

interface ClassoraState {
  ready: boolean;
  mode: DataStore['mode'];
  syncState: SyncState;

  settings: AppSettings | null;
  profile: Profile | null;
  semester: Semester | null;
  subjects: Subject[];
  versions: TimetableVersion[];
  slots: RecurringSlot[];
  occurrences: ClassOccurrence[];
  attendance: AttendanceRecord[];
  overrides: CalendarOverride[];
  audit: OccurrenceAudit[];
  notifications: AppNotification[];
  preferences: NotificationPreference | null;

  toast: Announcement | null;

  /* lifecycle */
  initialize: () => Promise<void>;
  resetDemoData: () => Promise<void>;
  setSyncState: (state: SyncState) => void;

  /* derived */
  activeSubjects: () => Subject[];
  subjectById: (id: string) => Subject | undefined;
  occurrencesForDate: (date: DateKey) => ClassOccurrence[];
  subjectSummary: (subjectId: string) => AttendanceSummary | null;
  summaries: () => { subject: Subject; summary: AttendanceSummary }[];
  confidence: () => number;

  /* attendance */
  markAttendance: (occurrenceId: string, action: AttendanceAction) => Promise<void>;
  cancelClass: (input: CancelClassInput) => Promise<void>;
  clearAttendance: (occurrenceId: string) => Promise<void>;
  reviewMissing: (occurrenceIds: string[], action: AttendanceAction) => Promise<void>;

  /* timetable changes */
  addExtraClass: (input: ExtraClassInput) => Promise<ClassOccurrence>;
  replaceClass: (input: ReplaceClassInput) => Promise<void>;
  changeOccurrenceTime: (occurrenceId: string, startTime: string, endTime: string) => Promise<void>;
  changeOccurrenceRoom: (occurrenceId: string, room: string) => Promise<void>;
  markDayOverride: (input: {
    date: DateKey;
    kind: CalendarOverride['kind'];
    followDayOfWeek?: CalendarOverride['followDayOfWeek'];
    label?: string | null;
  }) => Promise<void>;
  clearDayOverride: (date: DateKey) => Promise<void>;

  /* subjects & policy */
  upsertSubject: (subject: Subject) => Promise<void>;
  archiveSubject: (subjectId: string) => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  setAttendanceTarget: (target: number) => Promise<void>;
  setCountMode: (mode: Subject['attendanceCountMode'], subjectId?: string) => Promise<void>;

  /* timetable versions */
  createVersion: (label: string, notes: string | null, createdBy: TimetableVersion['createdBy']) => Promise<void>;
  restoreVersion: (versionId: string) => Promise<void>;
  applyImportedTimetable: (input: { subjects: Subject[]; slots: RecurringSlot[]; notes: string }) => Promise<void>;

  /* notifications */
  /** Derive alerts from real state and persist anything new. */
  syncNotifications: () => Promise<number>;
  savePreferences: (patch: Partial<NotificationPreference>) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;

  /* misc */
  saveSettings: (patch: Partial<AppSettings>) => Promise<void>;
  announce: (announcement: Omit<Announcement, 'id'> | null) => void;
}

function toast(message: string, tone: Announcement['tone'] = 'success'): Announcement {
  return { id: createId('toast'), message, tone };
}

function resolveStore(): DataStore {
  return createCloudStoreIfConfigured() ?? new LocalStore();
}

export const useClassora = create<ClassoraState>((set, get) => {
  const store = resolveStore();

  /** Persist a lightweight audit entry (never blocks the UI). */
  const audit = async (entry: Omit<OccurrenceAudit, 'id' | 'createdAt'>) => {
    const record: OccurrenceAudit = { ...entry, id: createId('audit'), createdAt: nowInstant() };
    set((state) => ({ audit: [record, ...state.audit] }));
    await store.addAudit(record);
  };

  const patchOccurrences = (patches: { id: string; patch: Partial<ClassOccurrence> }[]) => {
    set((state) => ({
      occurrences: state.occurrences.map((occurrence) => {
        const match = patches.find((item) => item.id === occurrence.id);
        return match ? { ...occurrence, ...match.patch } : occurrence;
      }),
    }));
  };

  const currentSemesterId = () => {
    const semester = get().semester;
    if (!semester) throw new Error('Classora: no active semester');
    return semester.id;
  };

  return {
    ready: false,
    mode: store.mode,
    syncState: 'synced',
    settings: null,
    profile: null,
    semester: null,
    subjects: [],
    versions: [],
    slots: [],
    occurrences: [],
    attendance: [],
    overrides: [],
    audit: [],
    notifications: [],
    preferences: null,
    toast: null,

    /* ---------------------------------------------------------------- *
     * Lifecycle                                                         *
     * ---------------------------------------------------------------- */
    initialize: async () => {
      await store.init();
      const seeded = await store.isSeeded();

      if (!seeded) {
        const now = nowInstant();
        const cleanProfile: Profile = {
          id: createId('prof'),
          name: 'Student',
          email: null,
          studentId: null,
          avatarUrl: null,
          college: null,
          department: null,
          departmentLabel: null,
          semesterLabel: null,
          batchRoll: null,
          timezone: 'Asia/Kolkata',
          attendanceTarget: 75,
          safeMarginAlertClasses: 3,
          defaultCountMode: 'period',
          createdAt: now,
          updatedAt: now,
        };
        const cleanPreferences: NotificationPreference = {
          id: createId('pref'),
          userId: cleanProfile.id,
          afterClassReminder: true,
          reminderDelayMinutes: 10,
          missingAttendanceReminder: true,
          attendanceRiskAlert: true,
          timetableChangeAlert: true,
          workingSaturdayAlert: true,
          combineBackToBack: true,
          updatedAt: now,
        };
        const cleanSettings: AppSettings = {
          id: 'settings',
          theme: 'light',
          previewDate: null,
          onboarded: true,
        };
        await store.saveProfile(cleanProfile);
        await store.savePreferences(cleanPreferences);
        await store.saveSettings(cleanSettings);
      }

      const [profile, semesters, settings] = await Promise.all([
        store.getProfile(),
        store.listSemesters(),
        store.getSettings(),
      ]);
      const notifications = profile ? await store.listNotifications(profile.id) : [];

      if (!profile) {
        set({ ready: true, mode: store.mode });
        return;
      }

      const semester = semesters.find((item) => item.isActive && !item.archived) ?? semesters[0] ?? null;
      if (!semester) {
        const preferences = await store.getPreferences(profile.id);
        set({
          ready: true,
          mode: store.mode,
          profile,
          semester: null,
          subjects: [],
          versions: [],
          slots: [],
          occurrences: [],
          attendance: [],
          overrides: [],
          audit: [],
          notifications,
          preferences,
          settings,
        });
        return;
      }

      const [subjects, versions, slots, occurrences, attendance, overrides, audit, preferences] =
        await Promise.all([
          store.listSubjects(semester.id),
          store.listVersions(semester.id),
          store.listSlots(semester.id),
          store.listOccurrences(semester.id),
          store.listAttendance(semester.id),
          store.listOverrides(semester.id),
          store.listAudit(semester.id),
          store.getPreferences(profile.id),
        ]);

      set({
        ready: true,
        mode: store.mode,
        profile,
        semester,
        subjects,
        versions,
        slots: slots.filter(
          (slot) =>
            slot.timetableVersionId === (versions.find((version) => version.isCurrent)?.id ?? ''),
        ),
        occurrences,
        attendance,
        overrides,
        audit,
        notifications,
        preferences,
        settings,
      });

      // Materialise any missing future occurrences (idempotent).
      await materializeFuture();
      // Then derive today's alerts from the state we just loaded.
      await get().syncNotifications();
    },

    resetDemoData: async () => {
      await store.clearAll();
      set({
        ready: false,
        profile: null,
        semester: null,
        subjects: [],
        versions: [],
        slots: [],
        occurrences: [],
        attendance: [],
        overrides: [],
        audit: [],
        notifications: [],
        preferences: null,
      });
      await get().initialize();
      set({ toast: toast('All data cleared', 'info') });
    },

    setSyncState: (syncState) => set({ syncState }),

    /* ---------------------------------------------------------------- *
     * Derived data                                                      *
     * ---------------------------------------------------------------- */
    activeSubjects: () => get().subjects.filter((subject) => !subject.archived),

    subjectById: (id) => get().subjects.find((subject) => subject.id === id),

    occurrencesForDate: (date) =>
      get()
        .occurrences.filter((occurrence) => occurrence.date === date)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),

    summaries: () => {
      const { subjects, occurrences, attendance, profile } = get();
      const target = profile?.attendanceTarget ?? 75;
      const today = todayKey();

      return subjects
        .filter((subject) => !subject.archived)
        .map((subject) => {
          const subjectOccurrences = occurrences.filter((o) => o.subjectId === subject.id);
          const ids = new Set(subjectOccurrences.map((o) => o.id));
          const records = attendance.filter((record) => ids.has(record.occurrenceId));
          const units = buildUnits(subjectOccurrences, records, (occurrence) =>
            attendanceWeight(subject, occurrence),
          );
          return {
            subject,
            summary: summarize(units, subject.targetPercentage ?? target, today),
          };
        });
    },

    subjectSummary: (subjectId) => {
      const entry = get().summaries().find((item) => item.subject.id === subjectId);
      return entry ? entry.summary : null;
    },

    confidence: () => {
      const { occurrences, attendance } = get();
      return dataConfidence(occurrences, attendance, todayKey()).percent;
    },

    /* ---------------------------------------------------------------- *
     * Attendance                                                        *
     * ---------------------------------------------------------------- */
    markAttendance: async (occurrenceId, action) => {
      const { occurrences, subjects, attendance } = get();
      const occurrence = occurrences.find((item) => item.id === occurrenceId);
      const subject = subjects.find((item) => item.id === occurrence?.subjectId);
      if (!occurrence || !subject) return;

      const weight = attendanceWeight(subject, occurrence);
      const existing = attendance.find((record) => record.occurrenceId === occurrenceId);
      const record: AttendanceRecord = {
        id: existing?.id ?? createId('att'),
        occurrenceId,
        subjectId: subject.id,
        semesterId: occurrence.semesterId,
        date: occurrence.date,
        status: action,
        weight,
        markedAt: nowInstant(),
        source: 'user',
        createdAt: existing?.createdAt ?? nowInstant(),
        updatedAt: nowInstant(),
      };

      // Optimistic update, then persist.
      set((state) => ({
        attendance: [...state.attendance.filter((item) => item.occurrenceId !== occurrenceId), record],
        occurrences: state.occurrences.map((item) =>
          item.id === occurrenceId
            ? { ...item, scheduleStatus: 'completed', updatedAt: nowInstant() }
            : item,
        ),
        syncState: 'syncing',
      }));

      try {
        await store.saveAttendanceRecord(record);
        await store.updateOccurrence(occurrenceId, { scheduleStatus: 'completed' });
        set({ syncState: 'synced', toast: toast(`Marked ${action}`, 'success') });
        // A marked class may have resolved an alert (or created a risk one).
        void get().syncNotifications();
      } catch {
        set({ syncState: 'pending', toast: toast('Saved locally — will sync when online', 'warning') });
      }
    },

    cancelClass: async ({ occurrenceId, reason, notConducted }) => {
      const { occurrences } = get();
      const occurrence = occurrences.find((item) => item.id === occurrenceId);
      if (!occurrence) return;

      const status = notConducted ? 'not_conducted' : 'cancelled';
      const change = buildCancellation(occurrence, reason);
      const patches = change.updated.map((item) => ({
        id: item.id,
        patch: { ...item.patch, scheduleStatus: status as ClassOccurrence['scheduleStatus'] },
      }));

      patchOccurrences(patches);
      set((state) => ({
        attendance: state.attendance.filter((record) => record.occurrenceId !== occurrenceId),
        syncState: 'syncing',
      }));

      await store.deleteAttendanceRecord(occurrenceId);
      for (const patch of patches) await store.updateOccurrence(patch.id, patch.patch);
      await audit({
        occurrenceId,
        semesterId: occurrence.semesterId,
        date: occurrence.date,
        action: 'cancelled',
        summary: notConducted ? 'Marked as not conducted' : 'Class cancelled',
        detail: reason,
      });
      set({ syncState: 'synced', toast: toast(notConducted ? 'Marked not conducted' : 'Class cancelled') });
    },

    clearAttendance: async (occurrenceId) => {
      const { attendance, occurrences } = get();
      const record = attendance.find((item) => item.occurrenceId === occurrenceId);
      const occurrence = occurrences.find((item) => item.id === occurrenceId);

      set((state) => ({
        attendance: state.attendance.filter((item) => item.occurrenceId !== occurrenceId),
        occurrences: state.occurrences.map((item) =>
          item.id === occurrenceId ? { ...item, scheduleStatus: 'scheduled' } : item,
        ),
      }));

      await store.deleteAttendanceRecord(occurrenceId);
      if (occurrence) {
        await store.updateOccurrence(occurrenceId, { scheduleStatus: 'scheduled' });
        await audit({
          occurrenceId,
          semesterId: occurrence.semesterId,
          date: occurrence.date,
          action: 'status_changed',
          summary: 'Attendance cleared',
          detail: record ? `Was ${record.status}` : null,
        });
      }
      set({ toast: toast('Attendance cleared', 'info') });
    },

    reviewMissing: async (occurrenceIds, action) => {
      for (const occurrenceId of occurrenceIds) {
        await get().markAttendance(occurrenceId, action);
      }
      set({ toast: toast(`${occurrenceIds.length} classes updated`) });
    },

    /* ---------------------------------------------------------------- *
     * Timetable changes                                                 *
     * ---------------------------------------------------------------- */
    addExtraClass: async (input) => {
      const semesterId = currentSemesterId();
      const occurrence = buildExtraClass({
        id: createId('occ'),
        semesterId,
        subjectId: input.subjectId,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        room: input.room,
        facultyOverride: null,
        classType: input.classType,
        periodCount: input.periodCount,
        notes: input.notes ?? null,
      });

      set((state) => ({
        occurrences: [...state.occurrences, occurrence].sort(
          (a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
        ),
      }));
      await store.saveOccurrences([occurrence]);
      await audit({
        occurrenceId: occurrence.id,
        semesterId,
        date: occurrence.date,
        action: 'extra_added',
        summary: 'Extra class added',
        detail: `${occurrence.startTime}–${occurrence.endTime}`,
      });
      set({ toast: toast('Extra class added') });
      return occurrence;
    },

    replaceClass: async ({ occurrenceId, subjectId, room }) => {
      const { occurrences } = get();
      const original = occurrences.find((item) => item.id === occurrenceId);
      if (!original) return;

      const change = buildReplacement(original, {
        id: createId('occ'),
        subjectId,
        room: room ?? original.room,
      });
      const created = change.created[0]!;

      set((state) => ({
        occurrences: [
          ...state.occurrences.map((item) =>
            item.id === original.id ? { ...item, ...change.updated[0]!.patch } : item,
          ),
          created,
        ],
        // The replaced class can no longer hold attendance.
        attendance: state.attendance.filter((record) => record.occurrenceId !== original.id),
      }));

      await store.deleteAttendanceRecord(original.id);
      for (const patch of change.updated) await store.updateOccurrence(patch.id, patch.patch);
      await store.saveOccurrences([created]);
      await audit({
        occurrenceId: original.id,
        semesterId: original.semesterId,
        date: original.date,
        action: 'replaced',
        summary: 'Class replaced',
        detail: `${get().subjectById(original.subjectId)?.shortName ?? 'Class'} → ${
          get().subjectById(subjectId)?.shortName ?? 'Class'
        }`,
      });
      set({ toast: toast('Class replaced for this date') });
    },

    changeOccurrenceTime: async (occurrenceId, startTime, endTime) => {
      const occurrence = get().occurrences.find((item) => item.id === occurrenceId);
      if (!occurrence) return;

      const change = buildOccurrenceOverride(occurrence, { startTime, endTime });
      patchOccurrences(change.updated);
      for (const patch of change.updated) await store.updateOccurrence(patch.id, patch.patch);
      await audit({
        occurrenceId,
        semesterId: occurrence.semesterId,
        date: occurrence.date,
        action: 'time_changed',
        summary: 'Class time changed',
        detail: `${occurrence.startTime}–${occurrence.endTime} → ${startTime}–${endTime}`,
      });
      set({ toast: toast('Time updated for this date') });
    },

    changeOccurrenceRoom: async (occurrenceId, room) => {
      const occurrence = get().occurrences.find((item) => item.id === occurrenceId);
      if (!occurrence) return;

      const change = buildOccurrenceOverride(occurrence, { room });
      patchOccurrences(change.updated);
      for (const patch of change.updated) await store.updateOccurrence(patch.id, patch.patch);
      await audit({
        occurrenceId,
        semesterId: occurrence.semesterId,
        date: occurrence.date,
        action: 'room_changed',
        summary: 'Room changed',
        detail: `${occurrence.room ?? '—'} → ${room}`,
      });
      set({ toast: toast('Room updated for this date') });
    },

    markDayOverride: async ({ date, kind, followDayOfWeek, label }) => {
      const semesterId = currentSemesterId();
      const override: CalendarOverride = {
        id: createId('ovr'),
        semesterId,
        date,
        kind,
        followDayOfWeek: followDayOfWeek ?? null,
        label: label ?? null,
        scope: 'personal',
        reason: null,
        createdAt: nowInstant(),
        updatedAt: nowInstant(),
      };

      set((state) => ({
        overrides: [...state.overrides.filter((item) => item.date !== date), override],
      }));
      await store.saveOverride(override);

      // Re-materialise the affected date so the change is visible immediately.
      const existingIds = new Set(get().occurrences.map((occurrence) => occurrence.id));
      const fresh = generateOccurrences({
        semester: get().semester!,
        slots: get().slots.filter((slot) => slot.kind === 'class'),
        overrides: get().overrides,
        from: date,
        to: date,
        existingIds,
      });
      if (fresh.occurrences.length > 0) {
        set((state) => ({ occurrences: [...state.occurrences, ...fresh.occurrences] }));
        await store.saveOccurrences(fresh.occurrences);
      }
      await audit({
        occurrenceId: null,
        semesterId,
        date,
        action: kind === 'holiday' ? 'holiday_marked' : 'follow_day_applied',
        summary:
          kind === 'holiday'
            ? 'Marked as college holiday'
            : kind === 'no_class'
              ? 'Marked as no-class day'
              : kind === 'working_saturday'
                ? 'Working Saturday applied'
                : 'Day schedule changed',
        detail: label ?? null,
      });
      set({ toast: toast('Day updated') });
    },

    clearDayOverride: async (date) => {
      const existing = get().overrides.find((item) => item.date === date);
      if (!existing) return;
      set((state) => ({ overrides: state.overrides.filter((item) => item.date !== date) }));
      await store.deleteOverride(existing.id);
      set({ toast: toast('Day reset', 'info') });
    },

    /* ---------------------------------------------------------------- *
     * Subjects & policy                                                 *
     * ---------------------------------------------------------------- */
    upsertSubject: async (subject) => {
      let activeSemester = get().semester;
      if (!activeSemester) {
        const today = new Date();
        const start = today.toISOString().slice(0, 10);
        const end = new Date(today.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const newSemester: Semester = {
          id: createId('sem'),
          userId: get().profile?.id ?? 'local',
          name: 'Current Semester',
          startDate: start,
          endDate: end,
          isActive: true,
          archived: false,
          createdAt: nowInstant(),
          updatedAt: nowInstant(),
        };
        await store.saveSemester(newSemester);
        set({ semester: newSemester });
        activeSemester = newSemester;
      }
      const subjectToSave: Subject = { ...subject, semesterId: subject.semesterId || activeSemester.id };
      set((state) => ({
        subjects: [...state.subjects.filter((item) => item.id !== subjectToSave.id), subjectToSave].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      }));
      await store.saveSubject(subjectToSave);
      set({ toast: toast('Subject saved') });
    },

    archiveSubject: async (subjectId) => {
      const subject = get().subjectById(subjectId);
      if (!subject) return;
      // Archive, never delete: historical attendance must survive.
      const archived: Subject = { ...subject, archived: true, updatedAt: nowInstant() };
      set((state) => ({
        subjects: state.subjects.map((item) => (item.id === subjectId ? archived : item)),
      }));
      await store.saveSubject(archived);
      set({ toast: toast('Subject archived — history kept', 'info') });
    },

    updateProfile: async (patch) => {
      const profile = get().profile;
      if (!profile) return;
      const updated: Profile = { ...profile, ...patch, updatedAt: nowInstant() };
      set({ profile: updated });
      await store.saveProfile(updated);
    },

    setAttendanceTarget: async (target) => {
      const profile = get().profile;
      if (!profile) return;
      const updated: Profile = { ...profile, attendanceTarget: target, updatedAt: nowInstant() };
      set({ profile: updated });
      await store.saveProfile(updated);
      set({ toast: toast(`Target set to ${target}%`) });
    },

    setCountMode: async (mode, subjectId) => {
      const { subjects, profile } = get();
      if (!subjectId && profile) {
        const updatedProfile: Profile = { ...profile, defaultCountMode: mode, updatedAt: nowInstant() };
        set({ profile: updatedProfile });
        await store.saveProfile(updatedProfile);
      }
      const targets = subjectId ? subjects.filter((item) => item.id === subjectId) : subjects;
      const updated = targets.map((subject) => ({ ...subject, attendanceCountMode: mode, updatedAt: nowInstant() }));
      set((state) => ({
        subjects: state.subjects.map(
          (subject) => updated.find((item) => item.id === subject.id) ?? subject,
        ),
      }));
      await store.saveSubjects(updated);

      // Weights are snapshotted on records; refresh unmarked projections only.
      set({ toast: toast('Calculation rule updated') });
    },

    /* ---------------------------------------------------------------- *
     * Timetable versions                                                *
     * ---------------------------------------------------------------- */
    createVersion: async (label, notes, createdBy) => {
      const { versions, slots, semester } = get();
      if (!semester) return;
      const nextNumber = Math.max(0, ...versions.map((version) => version.versionNumber)) + 1;
      const version: TimetableVersion = {
        id: createId('ver'),
        semesterId: semester.id,
        versionNumber: nextNumber,
        label,
        notes,
        signature: normalizeSignature(slots),
        isCurrent: true,
        createdBy,
        createdAt: nowInstant(),
      };

      const superseded = versions.map((item) => ({ ...item, isCurrent: false }));
      const withNew = [superseded.find((item) => item.id === version.id) ?? version, ...superseded];

      set({ versions: withNew });
      await store.saveVersions(withNew);
      set({ toast: toast(`Timetable saved as ${label}`) });
    },

    restoreVersion: async (versionId) => {
      const { versions, semester } = get();
      const target = versions.find((item) => item.id === versionId);
      if (!target || !semester) return;

      const restoredSlots = await store.listSlotsByVersion(versionId);
      const updatedVersions = versions.map((item) => ({ ...item, isCurrent: item.id === versionId }));
      set({ versions: updatedVersions, slots: restoredSlots });
      await store.saveVersions(updatedVersions);

      // Re-materialise only the future — past attendance is never rewritten.
      const range = futureGenerationRange(semester, new Date(), 45);
      const existingIds = new Set(get().occurrences.map((occurrence) => occurrence.id));
      const fresh = generateOccurrences({
        semester,
        slots: restoredSlots.filter((slot) => slot.kind === 'class'),
        overrides: get().overrides,
        from: range.from,
        to: range.to,
        existingIds,
      });
      if (fresh.occurrences.length > 0) {
        set((state) => ({ occurrences: [...state.occurrences, ...fresh.occurrences] }));
        await store.saveOccurrences(fresh.occurrences);
      }

      await audit({
        occurrenceId: null,
        semesterId: semester.id,
        date: todayKey(),
        action: 'restored',
        summary: `Restored ${target.label}`,
        detail: 'Future schedule updated. Past attendance was preserved.',
      });
      set({ toast: toast(`${target.label} restored — attendance history kept`) });
    },

    applyImportedTimetable: async ({ subjects, slots, notes }) => {
      let activeSemester = get().semester;
      if (!activeSemester) {
        const today = new Date();
        const start = today.toISOString().slice(0, 10);
        const end = new Date(today.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const newSemester: Semester = {
          id: createId('sem'),
          userId: get().profile?.id ?? 'local',
          name: 'Current Semester',
          startDate: start,
          endDate: end,
          isActive: true,
          archived: false,
          createdAt: nowInstant(),
          updatedAt: nowInstant(),
        };
        await store.saveSemester(newSemester);
        set({ semester: newSemester });
        activeSemester = newSemester;
      }
      const { versions, subjects: existingSubjects } = get();

      const merged = [...existingSubjects.filter((s) => !subjects.some((n) => n.id === s.id)), ...subjects];
      set({ subjects: merged });
      await store.saveSubjects(subjects);

      const nextNumber = Math.max(0, ...versions.map((version) => version.versionNumber)) + 1;
      const version: TimetableVersion = {
        id: createId('ver'),
        semesterId: activeSemester.id,
        versionNumber: nextNumber,
        label: `Version ${nextNumber}`,
        notes,
        signature: normalizeSignature(slots),
        isCurrent: true,
        createdBy: 'import',
        createdAt: nowInstant(),
      };
      const updatedVersions = [version, ...versions.map((item) => ({ ...item, isCurrent: false }))];
      set({ versions: updatedVersions, slots });
      await store.saveVersions(updatedVersions);
      await store.replaceSlots(activeSemester.id, version.id, slots);

      const range = futureGenerationRange(activeSemester, new Date(), 45);
      const existingIds = new Set(get().occurrences.map((occurrence) => occurrence.id));
      const fresh = generateOccurrences({
        semester: activeSemester,
        slots: slots.filter((slot) => slot.kind === 'class'),
        overrides: get().overrides,
        from: range.from,
        to: range.to,
        existingIds,
      });
      if (fresh.occurrences.length > 0) {
        set((state) => ({ occurrences: [...state.occurrences, ...fresh.occurrences] }));
        await store.saveOccurrences(fresh.occurrences);
      }

      set({ toast: toast('Timetable imported') });
    },

    /* ---------------------------------------------------------------- *
     * Notifications & settings                                          *
     * ---------------------------------------------------------------- */
    syncNotifications: async () => {
      const { occurrences, attendance, subjects, overrides, profile, notifications } = get();
      const drafts = buildNotifications({
        occurrences,
        attendance,
        subjects,
        overrides,
        profile,
        today: todayKey(),
        now: new Date(),
      });

      const fresh = newNotificationsOnly(drafts, notifications);
      if (fresh.length === 0) return 0;

      const created: AppNotification[] = fresh.map((draft) => ({
        ...draft,
        userId: profile?.id ?? 'local',
        createdAt: nowInstant(),
      }));

      // Newest first, so the inbox reads chronologically.
      set((state) => ({
        notifications: [...created, ...state.notifications].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        ),
      }));

      for (const notification of created) {
        await store.saveNotification(notification);
      }

      return created.length;
    },

    savePreferences: async (patch) => {
      const { preferences, profile } = get();
      if (!profile) return;
      const base: NotificationPreference =
        preferences ??
        ({
          id: 'notifpref',
          userId: profile.id,
          afterClassReminder: true,
          reminderDelayMinutes: 10,
          missingAttendanceReminder: true,
          attendanceRiskAlert: true,
          timetableChangeAlert: true,
          workingSaturdayAlert: true,
          combineBackToBack: true,
          updatedAt: nowInstant(),
        } satisfies NotificationPreference);

      const updated = { ...base, ...patch, updatedAt: nowInstant() };
      set({ preferences: updated });
      await store.savePreferences(updated);
    },

    markNotificationRead: async (id) => {
      set((state) => ({
        notifications: state.notifications.map((notification) =>
          notification.id === id ? { ...notification, readAt: nowInstant() } : notification,
        ),
      }));
      await store.markNotificationRead(id);
    },

    saveSettings: async (patch) => {
      const { settings } = get();
      const base: AppSettings =
        settings ?? { id: 'settings', theme: 'light', previewDate: null, onboarded: true };
      const updated = { ...base, ...patch };
      set({ settings: updated });
      await store.saveSettings(updated);
    },

    announce: (announcement) =>
      set({ toast: announcement ? { ...announcement, id: createId('toast') } : null }),
  };

  /* ------------------------------------------------------------------ *
   * Helpers that must exist before `initialize` runs them.              *
   * ------------------------------------------------------------------ */
  async function materializeFuture(): Promise<void> {
    const { semester, slots, overrides, occurrences } = get();
    if (!semester) return;
    const range = futureGenerationRange(semester, new Date(), 45);
    const existingIds = new Set(occurrences.map((occurrence) => occurrence.id));
    const fresh = generateOccurrences({
      semester,
      slots: slots.filter((slot) => slot.kind === 'class'),
      overrides,
      from: range.from,
      to: range.to,
      existingIds,
    });
    if (fresh.occurrences.length === 0) return;

    set((state) => ({ occurrences: [...state.occurrences, ...fresh.occurrences] }));
    await store.saveOccurrences(fresh.occurrences);
  }
});

/** Convenience selector: the current semester day the user is looking at. */
export function useTodayKey(): DateKey {
  return todayKey();
}

/** Next 14 days of date keys, used by date strips and pickers. */
export function useUpcomingDates(): DateKey[] {
  const today = todayKey();
  return Array.from({ length: 14 }, (_, index) => addDaysToKey(today, index));
}

export { slotsForDate, toInstant };
