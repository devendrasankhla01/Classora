import { Link, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';
import { useClassora } from '@/app/store';

interface AppHeaderProps {
  eyebrow?: string;
  wordmark?: boolean;
  title?: string;
  overline?: string;
  subtitle?: string;
  showActions?: boolean;
  showBack?: boolean;
  leading?: ReactNode;
  className?: string;
  unreadCount?: number;
  filterTab?: 'all' | 'ongoing' | 'completed';
  onFilterChange?: (tab: 'all' | 'ongoing' | 'completed') => void;
  showSearch?: boolean;
  onSearchClick?: () => void;
}

export function AppHeader({
  title,
  overline,
  subtitle,
  showActions = true,
  showBack = false,
  leading,
  className,
  unreadCount = 0,
  filterTab,
  onFilterChange,
  showSearch = true,
  onSearchClick,
}: AppHeaderProps) {
  const profile = useClassora((state) => state.profile);
  const navigate = useNavigate();
  const firstName = profile?.name ? profile.name.split(' ')[0] : 'Shahinur';

  return (
    <header className={cn('pb-4 pt-1', className)}>
      {leading ? <div className="mb-3">{leading}</div> : null}

      <div className="flex items-center justify-between gap-3">
        {/* Left Section: Back Button OR Profile Avatar Greeting */}
        <div className="flex items-center gap-3.5 min-w-0">
          {showBack ? (
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Go Back"
              className="neu-btn-soft grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-slate-700 active:scale-95"
            >
              <Icon name="arrow_back" size={20} />
            </button>
          ) : (
            <Link
              to="/profile"
              aria-label="Profile"
              className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full ring-4 ring-[#38B6FF]/80 shadow-[0_6px_20px_rgba(56,182,255,0.25)] transition active:scale-95"
            >
              {profile ? (
                <Avatar name={profile.name} size={48} />
              ) : (
                <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 text-white font-bold">
                  <Icon name="person" size={22} />
                </span>
              )}
            </Link>
          )}

          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 truncate tracking-tight">
              {title || `Hi, ${firstName}`}
            </h1>
            <p className="text-xs font-bold text-slate-400 mt-0.5">
              {overline ?? '01 Jan 2024'}
            </p>
          </div>
        </div>

        {/* Right Section: Actions (Search & Notification Bell) */}
        {showActions ? (
          <div className="flex shrink-0 items-center gap-2.5">
            {showSearch ? (
              <button
                type="button"
                onClick={onSearchClick}
                aria-label="Search"
                className="neu-btn-soft grid h-11 w-11 place-items-center rounded-2xl text-slate-600 active:scale-95"
              >
                <Icon name="search" size={20} />
              </button>
            ) : null}

            <Link
              to="/notifications"
              aria-label="Notifications"
              className="neu-btn-soft relative grid h-11 w-11 place-items-center rounded-2xl text-slate-700 active:scale-95"
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
        <p className="mt-2 text-xs sm:text-sm text-slate-500 font-semibold">
          {subtitle}
        </p>
      ) : null}

      {/* Neumorphic Soft UI Filter Tabs bar */}
      {onFilterChange && filterTab ? (
        <div className="mt-4 flex items-center gap-2 overflow-x-auto p-1.5 rounded-2xl neu-sunken no-scrollbar">
          {(['all', 'ongoing', 'completed'] as const).map((tab) => {
            const active = filterTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => onFilterChange(tab)}
                className={cn(
                  'flex-1 min-w-[90px] py-2 rounded-xl text-xs font-extrabold capitalize transition-all duration-200 text-center',
                  active
                    ? 'neu-pill-btn text-white'
                    : 'text-slate-500 hover:text-slate-900',
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

