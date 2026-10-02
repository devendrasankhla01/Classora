import { NavLink, useLocation } from 'react-router-dom';

import { Icon } from '@/components/ui/Icon';

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
 * The floating capsule navigation from the approved design: a white pill that
 * hovers above the safe area. The active destination expands — Home shows a
 * labelled dark pill, the other destinations show the indigo disc.
 */
export function FloatingNav() {
  const location = useLocation();

  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-safe-plus-3"
    >
      <div className="pointer-events-auto mx-4 flex w-full max-w-app items-center justify-between gap-1 rounded-pill bg-surface/95 px-2.5 py-2 shadow-floating ring-1 ring-black/[0.05] backdrop-blur-md">
        {ITEMS.map((item) => {
          const active =
            item.to === '/'
              ? location.pathname === '/'
              : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
          const isHome = item.to === '/';

          return (
            <NavLink
              key={item.to}
              to={item.to}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className="flex min-h-[44px] flex-1 items-center justify-center rounded-pill transition-all duration-200 ease-porcelain"
            >
              {active ? (
                isHome ? (
                  <span className="flex items-center gap-2 rounded-pill bg-[#0F1729] px-4 py-2.5 text-white shadow-elevated">
                    <Icon name={item.icon} size={18} filled />
                    <span className="text-[13.5px] font-bold">{item.label}</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-400" aria-hidden />
                  </span>
                ) : (
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-600 text-white shadow-elevated">
                    <Icon name={item.icon} size={19} filled />
                  </span>
                )
              ) : (
                <span className="grid h-11 w-11 place-items-center text-ink-secondary transition-colors hover:text-ink">
                  <Icon name={item.icon} size={21} />
                </span>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
