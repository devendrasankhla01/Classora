import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useClassora } from '@/app/store';
import { AppHeader } from '@/components/layout/AppHeader';
import { Avatar } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/controls';
import { useActiveSubjects } from '@/hooks/useClassoraData';
import { signOutEverywhere } from '@/features/auth/LoginScreen';

/**
 * Profile Screen — Crafted after Reference Screenshot 6 (Shahinur Rahman Tasknur Profile)
 * Features:
 * - Center Avatar with Cyan/Sky-Blue outline ring
 * - Edit Profile sky-blue pill button
 * - Clean option list cards (Phone, Task list, Notifications, Settings, Password)
 * - Sky Blue full-width Log Out CTA button
 */
export function ProfileScreen() {
  const profile = useClassora((state) => state.profile);
  const subjects = useActiveSubjects();
  const navigate = useNavigate();

  const [resetOpen, setResetOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const resetDemoData = useClassora((state) => state.resetDemoData);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <AppHeader title="Profile" showBack />

      {/* Identity Card matching Screenshot 6 */}
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center space-y-3">
        {/* Large Avatar with Bright Sky Blue Ring */}
        <div className="relative p-1 rounded-full ring-4 ring-[#38B6FF] shadow-md shadow-sky-500/20">
          <Avatar name={profile?.name ?? 'Shahinur Rahman'} size={96} />
        </div>

        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {profile?.name ?? 'Shahinur Rahman'}
          </h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">
            {profile?.studentId ? `ID: ${profile.studentId}` : 'shahinurstk02@gmail.com'} • Target: {profile?.attendanceTarget ?? 85}%
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#38B6FF] text-white font-bold text-xs shadow-md shadow-sky-500/25 hover:bg-sky-500 transition active:scale-95"
        >
          <Icon name="edit" size={16} />
          Edit Profile
        </button>
      </div>

      {/* Option Items List matching Screenshot 6 */}
      <div className="rounded-3xl bg-white p-3 shadow-sm border border-slate-100 space-y-1">
        <OptionRow
          icon="call"
          title="+8801234567890"
          subtitle="Phone Number"
          to="/settings"
          iconColor="text-[#38B6FF]"
          bgColor="bg-sky-50"
        />
        <OptionRow
          icon="task_alt"
          title="Task list (Manage subjects)"
          subtitle={`${subjects.length} active courses & subjects`}
          to="/profile/subjects"
          iconColor="text-[#9B51E0]"
          bgColor="bg-purple-50"
        />
        <OptionRow
          icon="notifications"
          title="Notification"
          subtitle="Reminders & class alerts"
          to="/profile/notifications"
          iconColor="text-[#38B6FF]"
          bgColor="bg-sky-50"
        />
        <OptionRow
          icon="settings"
          title="Settings"
          subtitle="Display & data preferences"
          to="/settings"
          iconColor="text-indigo-500"
          bgColor="bg-indigo-50"
        />
        <OptionRow
          icon="lock"
          title="Password"
          subtitle="Account credentials & security"
          to="/settings"
          iconColor="text-slate-600"
          bgColor="bg-slate-100"
        />
      </div>

      {/* Log Out CTA Button matching Screenshot 6 */}
      <div className="pt-2 space-y-3">
        {confirmLogout ? (
          <div className="rounded-3xl bg-white p-5 shadow-md border border-slate-100 space-y-3 text-center">
            <p className="text-sm font-bold text-slate-900">Log out of Classora?</p>
            <p className="text-xs text-slate-500">Your data remains safe and synced.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmLogout(false)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void (async () => {
                    await signOutEverywhere();
                    setConfirmLogout(false);
                    navigate('/login', { replace: true });
                  })();
                }}
                className="flex-1 py-3 rounded-2xl bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-500/20"
              >
                Confirm Log Out
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            className="w-full py-4 rounded-2xl bg-[#38B6FF] hover:bg-[#0094e8] text-white font-bold text-sm shadow-lg shadow-sky-500/30 transition active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <Icon name="logout" size={18} />
            Log out
          </button>
        )}

        <button
          type="button"
          onClick={() => setResetOpen(true)}
          className="w-full text-center text-xs text-slate-400 hover:text-slate-600 font-medium py-2"
        >
          Clear Application Data
        </button>
      </div>

      <BottomSheet
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Clear all application data?"
        description="This removes all subjects, timetables, and attendance records on this device. This action cannot be undone."
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" block onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              block
              onClick={() => {
                setResetOpen(false);
                void resetDemoData();
              }}
            >
              Clear All
            </Button>
          </div>
        }
      >
        <p className="pt-1 text-xs text-slate-500">
          Tip: export a JSON backup first if you want to keep your current records.
        </p>
      </BottomSheet>
    </div>
  );
}

function OptionRow({
  icon,
  title,
  subtitle,
  to,
  iconColor,
  bgColor,
}: {
  icon: string;
  title: string;
  subtitle: string;
  to: string;
  iconColor: string;
  bgColor: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 p-3.5 rounded-2xl bg-[#F6F8FA] hover:bg-slate-100 transition active:scale-[0.995]"
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${bgColor} ${iconColor}`}>
        <Icon name={icon} size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold text-slate-900">{title}</p>
        <p className="text-xs text-slate-400 font-semibold">{subtitle}</p>
      </div>
      <Icon name="chevron_right" size={20} className="text-slate-400" />
    </Link>
  );
}

