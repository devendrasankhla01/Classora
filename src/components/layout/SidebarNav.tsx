import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useClassora } from '@/app/store';
import { Avatar } from '@/components/ui/controls';
import { useAggregateStats } from '@/hooks/useScheduleData';

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

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-slate-200/80 bg-white/90 backdrop-blur-xl shrink-0 h-dvh sticky top-0 p-5 justify-between shadow-sm z-30">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pt-2">
          <BrandLogo variant="horizontal" size="md" />
        </div>

        {/* User Mini Card */}
        {profile ? (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <Avatar name={profile.name} size={42} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 truncate">{profile.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-slate-500 font-medium">{stats.percentage}% Target</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Navigation Section */}
        <nav aria-label="Sidebar navigation" className="space-y-1.5">
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Main Navigation
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
                  'flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200',
                  active
                    ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25 scale-[1.02]'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900',
                )}
              >
                <Icon name={item.icon} size={20} filled={active} className={active ? 'text-white' : 'text-slate-500'} />
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
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
        >
          <Icon name="settings" size={18} />
          <span>Settings</span>
        </NavLink>
        <div className="px-4 text-[11px] text-slate-400">
          CampusOne v0.1.0 • Offline Ready
        </div>
      </div>
    </aside>
  );
}
