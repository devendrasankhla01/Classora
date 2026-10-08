import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';
import { haptics } from '@/platform';
import { QuickActionModal } from '@/components/attendance/QuickActionModal';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const LEFT_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/timetable', label: 'Timetable', icon: 'calendar_today' },
];

const RIGHT_ITEMS: NavItem[] = [
  { to: '/analytics', label: 'Analytics', icon: 'bar_chart' },
  { to: '/profile', label: 'Profile', icon: 'person' },
];

export function FloatingNav() {
  const location = useLocation();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="Primary Mobile Navigation"
        className="md:hidden pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-safe-plus-3 px-4"
      >
        <div
          className={cn(
            'pointer-events-auto flex h-16 w-full max-w-[410px] items-center justify-between rounded-full px-3 py-1.5',
            'border border-white/90 bg-white/95 shadow-[0_12px_40px_rgba(0,0,0,0.12)] backdrop-blur-2xl',
          )}
        >
          {/* Left items */}
          <div className="flex items-center gap-1.5">
            {LEFT_ITEMS.map((item) => {
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

          {/* Center Floating (+) Action Button inspired by Tasknur reference design */}
          <button
            type="button"
            aria-label="Quick Action"
            onClick={() => {
              void haptics.impact('medium');
              setModalOpen(true);
            }}
            className={cn(
              'relative -top-5 flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white',
              'bg-gradient-to-tr from-[#38b6ff] via-[#1bb0ff] to-[#0094e8] shadow-[0_8px_25px_rgba(56,182,255,0.45)]',
              'ring-4 ring-white transition-all duration-200 active:scale-90 hover:scale-105',
            )}
          >
            <Icon name="add" size={28} weight={700} />
          </button>

          {/* Right items */}
          <div className="flex items-center gap-1.5">
            {RIGHT_ITEMS.map((item) => {
              const active =
                location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

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
        </div>
      </nav>

      {/* Quick Action Drawer / Modal */}
      {modalOpen ? <QuickActionModal onClose={() => setModalOpen(false)} /> : null}
    </>
  );
}

