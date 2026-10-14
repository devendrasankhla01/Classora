import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useClassora } from '@/app/store';
import { MASTER_STUDENT_ROSTER } from '@/services/usnTimetable';
import { AppHeader } from '@/components/layout/AppHeader';
import { Icon } from '@/components/ui/Icon';
import { Button, TextInput } from '@/components/ui/controls';
import { formatMediumDate, formatTimeRange, todayKey } from '@/lib/date';
import { cn } from '@/lib/cn';
import { haptics } from '@/platform';
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole';
import type { ClassOccurrence, DateKey } from '@/types/domain';

export const ROLL_STORAGE_PREFIX = 'classora_roll_record_v1_';

export function getSavedRollCall(occurrenceId: string): Record<string, 'present' | 'absent'> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${ROLL_STORAGE_PREFIX}${occurrenceId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveRollCallToStorage(
  occurrenceId: string,
  records: Record<string, 'present' | 'absent'>,
  facultyName: string,
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${ROLL_STORAGE_PREFIX}${occurrenceId}`, JSON.stringify(records));
    window.localStorage.setItem(
      `${ROLL_STORAGE_PREFIX}${occurrenceId}_meta`,
      JSON.stringify({
        facultyName,
        updatedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // ignore
  }
}

export function FacultyAttendanceScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { canMarkAttendance, userLabel } = useCurrentUserRole();

  const occurrences = useClassora((state) => state.occurrences);
  const subjects = useClassora((state) => state.subjects);
  const attendance = useClassora((state) => state.attendance);
  const markAttendance = useClassora((state) => state.markAttendance);
  const profile = useClassora((state) => state.profile);
  const announce = useClassora((state) => state.announce);

  // Initial parameters from query string if available
  const initialOccurrenceId = searchParams.get('occurrenceId');
  const initialDate = (searchParams.get('date') as DateKey) || todayKey();

  const [selectedDate, setSelectedDate] = useState<DateKey>(initialDate);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string | null>(initialOccurrenceId);
  const [batchFilter, setBatchFilter] = useState<'all' | 'A1' | 'A2'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSavedMeta, setLastSavedMeta] = useState<{ facultyName: string; updatedAt: string } | null>(null);

  // List of all registered students sorted by USN
  const allStudents = useMemo(() => {
    return Object.values(MASTER_STUDENT_ROSTER).sort((a, b) => a.usn.localeCompare(b.usn));
  }, []);

  // Occurrences for selected date
  const dayOccurrences = useMemo(() => {
    return occurrences
      .filter((o) => o.date === selectedDate && o.scheduleStatus !== 'holiday')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [occurrences, selectedDate]);

  // Current active occurrence
  const currentOccurrence: ClassOccurrence | null = useMemo(() => {
    if (selectedOccurrenceId) {
      const found = dayOccurrences.find((o) => o.id === selectedOccurrenceId);
      if (found) return found;
    }
    if (selectedSubjectId !== 'all') {
      const matchSub = dayOccurrences.find((o) => o.subjectId === selectedSubjectId);
      if (matchSub) return matchSub;
    }
    return dayOccurrences[0] ?? null;
  }, [dayOccurrences, selectedOccurrenceId, selectedSubjectId]);

  // Subject of the active occurrence
  const currentSubject = useMemo(() => {
    if (!currentOccurrence) return null;
    return subjects.find((s) => s.id === currentOccurrence.subjectId) ?? null;
  }, [currentOccurrence, subjects]);

  // Roll call attendance state map: { [usn]: 'present' | 'absent' }
  const [rollMap, setRollMap] = useState<Record<string, 'present' | 'absent'>>({});

  // Load existing roll call record when occurrence changes
  useEffect(() => {
    if (!currentOccurrence) {
      setRollMap({});
      setLastSavedMeta(null);
      return;
    }

    const saved = getSavedRollCall(currentOccurrence.id);
    if (saved) {
      setRollMap(saved);
      try {
        const metaRaw = window.localStorage.getItem(`${ROLL_STORAGE_PREFIX}${currentOccurrence.id}_meta`);
        if (metaRaw) setLastSavedMeta(JSON.parse(metaRaw));
      } catch {
        setLastSavedMeta(null);
      }
    } else {
      // Default: check if store already has a general attendance status
      const existingRecord = attendance.find((a) => a.occurrenceId === currentOccurrence.id);
      const defaultStatus: 'present' | 'absent' = existingRecord?.status === 'absent' ? 'absent' : 'present';

      const initialMap: Record<string, 'present' | 'absent'> = {};
      for (const student of allStudents) {
        initialMap[student.usn] = defaultStatus;
      }
      setRollMap(initialMap);
      setLastSavedMeta(null);
    }
  }, [currentOccurrence?.id, allStudents, attendance]);

  // Filtered student list according to batch & search query
  const filteredStudents = useMemo(() => {
    return allStudents.filter((student) => {
      if (batchFilter !== 'all' && student.batch !== batchFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesUsn = student.usn.toLowerCase().includes(q);
        const matchesName = student.name.toLowerCase().includes(q);
        if (!matchesUsn && !matchesName) return false;
      }
      return true;
    });
  }, [allStudents, batchFilter, searchQuery]);

  // Real-time roll stats
  const stats = useMemo(() => {
    const total = filteredStudents.length;
    let present = 0;
    for (const student of filteredStudents) {
      if (rollMap[student.usn] === 'present') present++;
    }
    const absent = total - present;
    const percentage = total > 0 ? (present / total) * 100 : 0;
    return { total, present, absent, percentage };
  }, [filteredStudents, rollMap]);

  // Toggle individual student status
  const toggleStudent = (usn: string, status: 'present' | 'absent') => {
    void haptics.impact('light');
    setRollMap((prev) => ({
      ...prev,
      [usn]: status,
    }));
  };

  // Bulk actions
  const markAll = (status: 'present' | 'absent') => {
    void haptics.impact('medium');
    setRollMap((prev) => {
      const next = { ...prev };
      for (const student of filteredStudents) {
        next[student.usn] = status;
      }
      return next;
    });
  };

  const invertSelection = () => {
    void haptics.impact('light');
    setRollMap((prev) => {
      const next = { ...prev };
      for (const student of filteredStudents) {
        next[student.usn] = prev[student.usn] === 'present' ? 'absent' : 'present';
      }
      return next;
    });
  };

  // Save and submit attendance for this class
  const handleSaveAttendance = async () => {
    if (!currentOccurrence || !currentSubject) return;

    setIsSubmitting(true);
    try {
      const facultyName = profile?.name || currentSubject.faculty || 'Course Professor';

      // 1. Save student-level roll to storage
      saveRollCallToStorage(currentOccurrence.id, rollMap, facultyName);

      // 2. Determine student status (if current logged in profile is student, use their USN)
      const currentUsn = profile?.studentId || '4PM25CS043';
      const studentVerdict: 'present' | 'absent' = rollMap[currentUsn] ?? (stats.percentage >= 50 ? 'present' : 'absent');

      // 3. Mark in official store & database
      await markAttendance(currentOccurrence.id, studentVerdict);

      // 4. Update metadata state
      setLastSavedMeta({
        facultyName,
        updatedAt: new Date().toISOString(),
      });

      announce({
        message: `Attendance submitted for ${currentSubject.shortName}! (${stats.present}/${stats.total} Present)`,
        tone: 'success',
      });
    } catch {
      announce({
        message: 'Could not submit attendance. Please try again.',
        tone: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canMarkAttendance) {
    return (
      <div className="space-y-6 pb-28 max-w-lg mx-auto p-4 text-center">
        <AppHeader title="Faculty Attendance" showBack />
        <div className="neu-card rounded-3xl p-8 space-y-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-50 text-amber-600 mx-auto">
            <Icon name="lock" size={32} />
          </div>
          <h2 className="text-lg font-black text-slate-800">Faculty Access Only</h2>
          <p className="text-sm text-slate-500">
            Attendance marking is strictly restricted to teachers and faculty. Students can view verified records from their Attendance dashboard.
          </p>
          <Button onClick={() => navigate('/attendance')} className="w-full">
            Back to My Attendance
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28 max-w-4xl mx-auto">
      <AppHeader
        title="Faculty Roll Call"
        subtitle="Official Attendance Register"
        showBack
      />

      {/* Role Authority Banner */}
      <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-4 shadow-lg shadow-emerald-600/20">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/20 backdrop-blur-md text-white font-bold">
            <Icon name="verified_user" size={24} />
          </span>
          <div>
            <h2 className="text-sm font-black tracking-tight">Faculty Attendance Authority</h2>
            <p className="text-xs text-emerald-100 font-medium">
              Only authorized teachers can mark or update student attendance.
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-extrabold backdrop-blur-md">
          <Icon name="lock" size={14} />
          {userLabel}
        </span>
      </div>

      {/* Session / Class Selector Card */}
      <section className="neu-card rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Select Class & Session
          </h3>
          {lastSavedMeta ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full">
              <Icon name="check_circle" size={14} className="text-emerald-600" />
              Saved by {lastSavedMeta.facultyName}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-3 py-1 rounded-full">
              <Icon name="pending" size={14} className="text-amber-600" />
              Pending Roll Call
            </span>
          )}
        </div>

        {/* Date & Subject Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Date Picker */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
              Lecture Date:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(e.target.value as DateKey);
                  setSelectedOccurrenceId(null);
                }
              }}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Subject Filter */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
              Course / Subject:
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setSelectedOccurrenceId(null);
              }}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Scheduled Classes</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.shortName} — {sub.name} ({sub.faculty ?? 'Faculty'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Periods Carousel / Selector */}
        {dayOccurrences.length > 0 ? (
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
              Available Periods ({formatMediumDate(selectedDate)}):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {dayOccurrences.map((occ) => {
                const sub = subjects.find((s) => s.id === occ.subjectId);
                const isSelected = currentOccurrence?.id === occ.id;
                const isSaved = getSavedRollCall(occ.id) !== null;

                return (
                  <button
                    key={occ.id}
                    type="button"
                    onClick={() => setSelectedOccurrenceId(occ.id)}
                    className={cn(
                      'p-3 rounded-2xl text-left border transition active:scale-98 flex flex-col justify-between',
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/80 shadow-md ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50',
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-extrabold text-slate-900 truncate">
                        {sub?.shortName ?? 'Class'}
                      </span>
                      {isSaved ? (
                        <Icon name="check_circle" size={16} className="text-emerald-600 shrink-0" />
                      ) : (
                        <Icon name="radio_button_unchecked" size={16} className="text-slate-300 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-semibold mt-1">
                      {formatTimeRange(occ.startTime, occ.endTime)} • {occ.room ?? 'Room TBD'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-amber-50 p-4 border border-amber-200/60 text-center">
            <p className="text-xs font-bold text-amber-900">
              No periods scheduled for {formatMediumDate(selectedDate)}. Choose another date above.
            </p>
          </div>
        )}
      </section>

      {/* Student Roll Call Register */}
      {currentOccurrence ? (
        <section className="space-y-4">
          {/* Controls & Quick Actions Header */}
          <div className="neu-card rounded-3xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {currentSubject?.name} ({currentSubject?.shortName})
                </h3>
                <p className="text-xs text-slate-400 font-semibold">
                  Section A • {formatTimeRange(currentOccurrence.startTime, currentOccurrence.endTime)} • {currentOccurrence.room ?? 'Hall E201'}
                </p>
              </div>

              {/* Live Attendance Stat Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black">
                  {stats.present} Present
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-rose-100 text-rose-800 text-xs font-black">
                  {stats.absent} Absent
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-sky-100 text-sky-800 text-xs font-black">
                  {stats.percentage.toFixed(0)}% Turnout
                </span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pt-2 border-t border-slate-100">
              {/* Batch Pills */}
              <div className="flex items-center gap-1.5 rounded-full bg-slate-100 p-1">
                {(['all', 'A1', 'A2'] as const).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBatchFilter(b)}
                    className={cn(
                      'px-3.5 py-1 rounded-full text-xs font-extrabold transition',
                      batchFilter === b
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900',
                    )}
                  >
                    {b === 'all' ? 'All (60)' : b === 'A1' ? 'Batch A-1 (33)' : 'Batch A-2 (29)'}
                  </button>
                ))}
              </div>

              {/* Fast Roll Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => markAll('present')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold shadow-sm active:scale-95 transition flex items-center gap-1"
                >
                  <Icon name="done_all" size={16} />
                  All Present
                </button>
                <button
                  type="button"
                  onClick={() => markAll('absent')}
                  className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-extrabold shadow-sm active:scale-95 transition flex items-center gap-1"
                >
                  <Icon name="close" size={16} />
                  All Absent
                </button>
                <button
                  type="button"
                  onClick={invertSelection}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold active:scale-95 transition"
                  title="Invert Selection"
                >
                  <Icon name="swap_horiz" size={16} />
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <TextInput
                placeholder="Search student by name or USN (e.g. 4PM25CS043)…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <Icon name="close" size={18} />
                </button>
              ) : null}
            </div>
          </div>

          {/* Students Roll Call Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredStudents.map((student) => {
              const status = rollMap[student.usn] ?? 'present';
              const isPresent = status === 'present';

              return (
                <div
                  key={student.usn}
                  className={cn(
                    'p-4 rounded-3xl transition-all duration-200 border flex items-center justify-between gap-3',
                    isPresent
                      ? 'bg-white border-emerald-200 shadow-sm'
                      : 'bg-rose-50/50 border-rose-200 shadow-sm',
                  )}
                >
                  {/* Left info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs text-slate-900 truncate">
                        {student.name}
                      </span>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">
                        {student.batch}
                      </span>
                    </div>
                    <p className="text-[11px] font-extrabold text-slate-400 mt-0.5 tracking-wider">
                      {student.usn}
                    </p>
                  </div>

                  {/* Tactile Toggle Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleStudent(student.usn, 'present')}
                      className={cn(
                        'h-9 px-3.5 rounded-xl font-black text-xs transition active:scale-95 flex items-center gap-1',
                        isPresent
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-600/20'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200',
                      )}
                    >
                      <Icon name="check" size={15} />
                      P
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleStudent(student.usn, 'absent')}
                      className={cn(
                        'h-9 px-3.5 rounded-xl font-black text-xs transition active:scale-95 flex items-center gap-1',
                        !isPresent
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-600/20'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200',
                      )}
                    >
                      <Icon name="close" size={15} />
                      A
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Sticky Bottom Action Submission Bar */}
      {currentOccurrence ? (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-white/90 backdrop-blur-2xl border-t border-slate-200/80 p-4 shadow-2xl">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-slate-400">Class Roll Summary</p>
              <p className="text-sm font-extrabold text-slate-900">
                {stats.present} Present • {stats.absent} Absent ({stats.percentage.toFixed(0)}%)
              </p>
            </div>

            <Button
              type="button"
              variant="primary"
              disabled={isSubmitting}
              onClick={() => void handleSaveAttendance()}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 hover:opacity-95 active:scale-98 transition flex items-center justify-center gap-2"
            >
              <Icon name="save" size={18} />
              {isSubmitting ? 'Submitting Attendance…' : lastSavedMeta ? 'Update Attendance Record' : 'Save & Submit Attendance'}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
