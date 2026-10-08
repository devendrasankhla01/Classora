import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useClassora } from '@/app/store';
import { Avatar } from '@/components/ui/controls';
import { useAggregateStats } from '@/hooks/useScheduleData';
import { QuickActionModal } from '@/components/attendance/QuickActionModal';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/timetable', label: 'Timetable', icon: 'calendar_today' },
  { to: '/attendance', label: 'Attendance', icon: 'task_alt' },
  { to: '/analytics', label: 'Analytics', icon: 'bar_chart' },
  { to: '/profile', label: 'Profile', icon: 'person' },
];

export function SidebarNav() {
  const location = useLocation();
  const profile = useClassora((state) => state.profile);
  const stats = useAggregateStats();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <aside className="hidden md:flex flex-col w-72 border-r border-slate-100 bg-white/90 backdrop-blur-xl shrink-0 h-dvh sticky top-0 p-6 justify-between shadow-sm z-30">
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-1 pt-1">
            <BrandLogo variant="horizontal" size="md" />
          </div>

          {/* User Mini Card matching Reference Profile style */}
          {profile ? (
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#F6F8FA] border border-slate-100/90 shadow-2xs">
              <div className="relative p-0.5 rounded-full ring-2 ring-[#38B6FF]">
                <Avatar name={profile.name} size={40} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-slate-900 truncate">{profile.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-slate-400 font-bold">{stats.percentage}% Target</span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Quick Action (+) Button for Tablet/Desktop */}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#38b6ff] via-[#1bb0ff] to-[#0094e8] text-white font-extrabold text-xs shadow-md shadow-sky-500/25 flex items-center justify-center gap-2 hover:opacity-95 transition active:scale-98"
          >
            <Icon name="add" size={18} weight={700} />
            Quick Mark / Action
          </button>

          {/* Navigation Section */}
          <nav aria-label="Sidebar navigation" className="space-y-1.5">
            <p className="px-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              Main Menu
            </p>
            {ITEMS.map((item) => {
              const active =
                item.to === '/'
                  ? location.pathname === '/'
                  : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200',
                    active
                      ? 'bg-gradient-to-r from-[#38b6ff] to-[#0094e8] text-white shadow-md shadow-sky-500/25 scale-[1.01]'
                      : 'text-slate-500 hover:bg-[#F6F8FA] hover:text-slate-900',
                  )}
                >
                  <Icon name={item.icon} size={20} filled={active} className={active ? 'text-white' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer / App Info */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <NavLink
            to="/settings"
            className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
          >
            <Icon name="settings" size={18} />
            <span>Settings</span>
          </NavLink>
          <div className="px-4 text-[11px] text-slate-400 font-semibold">
            Classora • Smart Assistant
          </div>
        </div>
      </aside>

      {modalOpen ? <QuickActionModal onClose={() => setModalOpen(false)} /> : null}
    </>
  );
}

