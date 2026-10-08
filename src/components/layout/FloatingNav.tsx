import { NavLink, useLocation } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';
import { haptics } from '@/platform';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/timetable', label: 'Timetable', icon: 'calendar_today' },
  { to: '/analytics', label: 'Analytics', icon: 'bar_chart' },
  { to: '/profile', label: 'Profile', icon: 'person' },
];

export function FloatingNav() {
  const location = useLocation();

  return (
    <nav
      aria-label="Primary Mobile Navigation"
      className="md:hidden pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-safe-plus-3 px-4"
    >
      <div
        className={cn(
          'pointer-events-auto flex h-16 w-full max-w-[380px] items-center justify-around rounded-full px-3 py-1.5',
          'border border-white/90 bg-white/95 shadow-[0_12px_40px_rgba(0,0,0,0.12)] backdrop-blur-2xl',
        )}
      >
        {NAV_ITEMS.map((item) => {
          const active =
            item.to === '/'
              ? location.pathname === '/'
              : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              aria-label={item.label}
              onClick={() => void haptics.impact('light')}
              className={cn(
                'flex h-11 items-center justify-center rounded-full transition-all duration-300',
                active
                  ? 'gap-1.5 bg-gradient-to-r from-[#38b6ff] to-[#0094e8] px-4 text-white shadow-md shadow-sky-500/30'
                  : 'w-11 text-slate-400 hover:bg-slate-100 hover:text-slate-700',
              )}
            >
              <Icon name={item.icon} size={active ? 18 : 22} filled={active} />
              {active ? <span className="text-xs font-extrabold">{item.label}</span> : null}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}


