import { motion } from 'framer-motion';
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
      <motion.div
        initial={{ y: 28, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          'pointer-events-auto flex h-16 w-full max-w-[390px] items-center justify-around rounded-full px-3 py-1.5',
          'glass-card-elevated backdrop-blur-2xl border border-white/90 shadow-[0_16px_40px_rgba(31,38,135,0.15)] bg-white/80',
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
              className="relative flex items-center justify-center py-1"
            >
              <motion.div
                whileTap={{ scale: 0.88 }}
                whileHover={{ scale: active ? 1 : 1.08 }}
                className={cn(
                  'relative z-10 flex h-11 items-center justify-center rounded-full px-4 font-bold transition-colors duration-200',
                  active ? 'text-white' : 'text-slate-400 hover:text-slate-800',
                )}
              >
                {active && (
                  <motion.div
                    layoutId="liquid-active-pill"
                    transition={{
                      type: 'spring',
                      stiffness: 340,
                      damping: 23,
                      mass: 0.7,
                    }}
                    className="absolute inset-0 z-[-1] rounded-full bg-gradient-to-r from-[#38b6ff] via-[#1bb0ff] to-[#0094e8] shadow-[0_6px_22px_rgba(56,182,255,0.48),inset_0_1.5px_2px_rgba(255,255,255,0.85)]"
                  >
                    {/* Liquid Specular Top Highlight */}
                    <span className="absolute inset-x-2 top-1 h-1 rounded-full bg-white/40 blur-[0.5px]" />
                  </motion.div>
                )}
                <motion.span
                  animate={active ? { scale: [0.85, 1.2, 0.96, 1.03, 1], rotate: [0, -3, 3, 0] } : { scale: 1, rotate: 0 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-1.5"
                >
                  <Icon name={item.icon} size={active ? 18 : 22} filled={active} />
                  {active ? (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden whitespace-nowrap text-xs font-extrabold"
                    >
                      {item.label}
                    </motion.span>
                  ) : null}
                </motion.span>
              </motion.div>
            </NavLink>
          );
        })}
      </motion.div>
    </nav>
  );
}


