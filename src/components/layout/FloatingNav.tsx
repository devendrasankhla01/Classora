import { NavLink, useLocation } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';
import { haptics } from '@/platform';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/timetable', label: 'Timetable', icon: 'calendar_today' },
  { to: '/attendance', label: 'Attendance', icon: 'task_alt' },
  { to: '/analytics', label: 'Analytics', icon: 'insights' },
  { to: '/profile', label: 'Profile', icon: 'person' },
];

/**
 * Floating capsule navigation dock.
 *
 * DESIGN.md §Components 2: a frosted white pill pinned 24px above the safe
 * area, 64px tall with 6px/8px padding.
 *
 * Every destination behaves identically: the active tab expands into a dark
 * pill showing its icon *and* label, the rest stay 48px circular icon buttons.
 */
export function FloatingNav() {
  const location = useLocation();

  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-safe-plus-4 sm:pb-safe-plus-6 px-3"
    >
      <div
        className={cn(
          'pointer-events-auto flex h-14 sm:h-16 w-full max-w-[390px] sm:max-w-app items-center justify-around sm:justify-center gap-1 sm:gap-1.5 rounded-pill px-2 py-1',
          'border border-white/80 bg-white/95 shadow-floating backdrop-blur-dock',
        )}
      >
        {ITEMS.map((item) => {
          const active =
            item.to === '/'
              ? location.pathname === '/'
              : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              onClick={() => void haptics.impact('light')}
              className={cn(
                'flex h-10 sm:h-12 flex-none items-center justify-center rounded-pill',
                'transition-all duration-300 ease-porcelain',
                active
                  ? 'gap-1.5 bg-ink px-3 sm:px-4 text-white shadow-elevated'
                  : 'w-10 sm:w-12 text-ink-secondary hover:bg-[rgba(17,24,39,0.04)] active:bg-[rgba(17,24,39,0.04)]',
              )}
            >
              <Icon name={item.icon} size={active ? 17 : 20} filled={active} />
              {active ? <span className="text-label-md sm:text-label-lg font-medium text-white">{item.label}</span> : null}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
