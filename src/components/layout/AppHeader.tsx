import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';
import { useClassora } from '@/app/store';

interface AppHeaderProps {
  eyebrow?: string;
  wordmark?: boolean;
  title: string;
  overline?: string;
  subtitle?: string;
  showActions?: boolean;
  leading?: ReactNode;
  className?: string;
  unreadCount?: number;
  filterTab?: 'all' | 'ongoing' | 'completed';
  onFilterChange?: (tab: 'all' | 'ongoing' | 'completed') => void;
}

export function AppHeader({
  title,
  overline,
  subtitle,
  showActions = true,
  leading,
  className,
  unreadCount = 0,
  filterTab,
  onFilterChange,
}: AppHeaderProps) {
  const profile = useClassora((state) => state.profile);
  const firstName = profile?.name ? profile.name.split(' ')[0] : 'Student';

  return (
    <header className={cn('pb-5 pt-2', className)}>
      {leading ? <div className="mb-3">{leading}</div> : null}

      <div className="flex items-center justify-between gap-4">
        {/* User Profile Header (Tasknur Reference Style) */}
        <div className="flex items-center gap-3.5 min-w-0">
          <Link
            to="/profile"
            aria-label="Profile"
            className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full ring-2 ring-sky-400 shadow-md shadow-sky-500/10 transition active:scale-95"
          >
            {profile ? (
              <Avatar name={profile.name} size={48} />
            ) : (
              <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-bold">
                <Icon name="person" size={22} />
              </span>
            )}
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate tracking-tight">
              {title || `Hi, ${firstName}`}
            </h1>
            <p className="text-xs font-semibold text-slate-500">
              {overline ?? '01 Jan 2024'}
            </p>
          </div>
        </div>

        {/* Actions (Notifications & Search) */}
        {showActions ? (
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/notifications"
              aria-label="Notifications"
              className="relative grid h-11 w-11 place-items-center rounded-2xl bg-white text-slate-700 shadow-sm border border-slate-100 hover:bg-slate-50 transition active:scale-95"
            >
              <Icon name="notifications" size={20} />
              {unreadCount > 0 ? (
                <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
              ) : null}
            </Link>
          </div>
        ) : null}
      </div>

      {subtitle ? (
        <p className="mt-2 text-sm text-slate-600 font-medium">
          {subtitle}
        </p>
      ) : null}

      {/* Filter Tabs bar inspired by Reference Screenshots 2 & 4 */}
      {onFilterChange && filterTab ? (
        <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {(['all', 'ongoing', 'completed'] as const).map((tab) => {
            const active = filterTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => onFilterChange(tab)}
                className={cn(
                  'px-5 py-2 rounded-xl text-xs font-bold capitalize transition-all duration-200',
                  active
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                    : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50',
                )}
              >
                {tab}
              </button>
            );
          })}
        </div>
      ) : null}
    </header>
  );
}
