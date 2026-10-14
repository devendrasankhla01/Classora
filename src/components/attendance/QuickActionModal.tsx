import { useNavigate } from 'react-router-dom';
import { useClassora } from '@/app/store';
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole';
import { useTodayOccurrences } from '@/hooks/useScheduleData';
import { Icon } from '@/components/ui/Icon';
import { formatTimeRange } from '@/lib/date';
import { cn } from '@/lib/cn';

interface QuickActionModalProps {
  onClose: () => void;
}

export function QuickActionModal({ onClose }: QuickActionModalProps) {
  const navigate = useNavigate();
  const { canMarkAttendance } = useCurrentUserRole();
  const today = useTodayOccurrences();
  const attendance = useClassora((state) => state.attendance);
  const subjects = useClassora((state) => state.subjects);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-sheet-up space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-50 text-sky-600 font-bold">
              <Icon name="add_task" size={22} />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {canMarkAttendance ? 'Faculty Quick Actions' : 'Academic Quick Actions'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {canMarkAttendance ? 'Take class roll call or manage timetable' : 'Today’s schedule & verified status'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Quick Today's Classes List */}
        {today.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Today's Schedule & Attendance
            </p>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {today.map((occurrence) => {
                const sub = subjects.find((s) => s.id === occurrence.subjectId);
                const record = attendance.find((a) => a.occurrenceId === occurrence.id);

                return (
                  <div
                    key={occurrence.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 truncate">{sub?.name ?? 'Lecture'}</p>
                      <p className="text-xs text-slate-500 font-medium truncate">
                        {formatTimeRange(occurrence.startTime, occurrence.endTime)} • {occurrence.room ?? 'Room TBD'}
                      </p>
                    </div>

                    {canMarkAttendance ? (
                      // Teacher controls
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            navigate(`/faculty/attendance?occurrenceId=${occurrence.id}&date=${occurrence.date}`);
                          }}
                          className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 transition flex items-center gap-1"
                        >
                          <Icon name="fact_check" size={14} />
                          {record ? 'Edit Roll' : 'Roll Call'}
                        </button>
                      </div>
                    ) : (
                      // Student read-only indicator
                      <div className="shrink-0">
                        {record ? (
                          <span
                            className={cn(
                              'px-2.5 py-1 text-xs font-extrabold rounded-xl inline-flex items-center gap-1',
                              record.status === 'present'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800',
                            )}
                          >
                            <Icon name={record.status === 'present' ? 'check' : 'close'} size={13} />
                            {record.status === 'present' ? 'Present' : 'Absent'}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400 bg-slate-200/60 px-2 py-1 rounded-lg">
                            Scheduled
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/timetable/import');
            }}
            className="flex flex-col items-start p-4 rounded-2xl bg-sky-50 text-sky-700 hover:bg-sky-100 transition border border-sky-100"
          >
            <Icon name="upload_file" size={24} className="mb-2 text-sky-600" />
            <span className="text-sm font-bold">Import Timetable</span>
            <span className="text-[11px] text-sky-600/80">PDF, ERP or Photo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/profile/subjects');
            }}
            className="flex flex-col items-start p-4 rounded-2xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition border border-purple-100"
          >
            <Icon name="library_add" size={24} className="mb-2 text-purple-600" />
            <span className="text-sm font-bold">Add Subject</span>
            <span className="text-[11px] text-purple-600/80">Manage subjects</span>
          </button>
        </div>

        {/* Primary CTA */}
        <button
          type="button"
          onClick={() => {
            onClose();
            navigate('/attendance');
          }}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white font-bold text-sm shadow-md shadow-sky-500/20 hover:opacity-95 transition"
        >
          View Full Attendance Register
        </button>
      </div>
    </div>
  );
}
