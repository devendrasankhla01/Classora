import { useNavigate } from 'react-router-dom';
import { useClassora } from '@/app/store';
import { useTodayOccurrences } from '@/hooks/useScheduleData';
import { Icon } from '@/components/ui/Icon';
import { formatTimeRange } from '@/lib/date';
import { haptics } from '@/platform';

interface QuickActionModalProps {
  onClose: () => void;
}

export function QuickActionModal({ onClose }: QuickActionModalProps) {
  const navigate = useNavigate();
  const today = useTodayOccurrences();
  const markAttendance = useClassora((state) => state.markAttendance);
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
              <h3 className="text-lg font-bold text-slate-900">Quick Actions</h3>
              <p className="text-xs text-slate-500 font-medium">Mark attendance or manage schedule</p>
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
              Today's Classes
            </p>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {today.map((occurrence) => {
                const sub = subjects.find((s) => s.id === occurrence.subjectId);
                return (
                  <div
                    key={occurrence.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">{sub?.name ?? 'Lecture'}</p>
                      <p className="text-xs text-slate-500 font-medium">
                        {formatTimeRange(occurrence.startTime, occurrence.endTime)} • {occurrence.room ?? 'Room TBD'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          void haptics.impact('light');
                          void markAttendance(occurrence.id, 'present');
                          onClose();
                        }}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 transition"
                      >
                        Present
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void haptics.impact('light');
                          void markAttendance(occurrence.id, 'absent');
                          onClose();
                        }}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-500 text-white shadow-sm hover:bg-rose-600 transition"
                      >
                        Absent
                      </button>
                    </div>
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
