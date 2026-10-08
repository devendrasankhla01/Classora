import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

import { cn } from '@/lib/cn';
import { Icon } from './Icon';

/* ------------------------------------------------------------------ *
 * Toggle                                                              *
 * ------------------------------------------------------------------ */
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id?: string;
}

export function Toggle({ checked, onChange, label, id }: ToggleProps) {
  return (
    <motion.button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      whileTap={{ scale: 0.92 }}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-1 transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500/30',
        checked ? 'bg-gradient-to-r from-indigo-600 to-brand-600 shadow-[0_2px_8px_rgba(79,70,229,0.4)]' : 'bg-slate-200/90 shadow-inner',
      )}
    >
      <motion.span
        aria-hidden="true"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 600, damping: 30 }}
        className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0"
      />
    </motion.button>
  );
}

/* ------------------------------------------------------------------ *
 * Stepper (used by the attendance target)                             *
 * ------------------------------------------------------------------ */
interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  format?: (value: number) => string;
}

export function Stepper({ value, onChange, min = 50, max = 95, step = 5, label, format }: StepperProps) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next));
  return (
    <div className="flex items-center gap-1 rounded-pill bg-surface p-1 shadow-ambient ring-1 ring-hairline">
      <motion.button
        type="button"
        aria-label={`Decrease ${label}`}
        onClick={() => onChange(clamp(value - step))}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.85 }}
        className="grid h-8 w-8 place-items-center rounded-full text-ink-secondary transition active:bg-slate-100"
      >
        <Icon name="remove" size={16} />
      </motion.button>
      <span className="min-w-[52px] text-center text-label-lg tabular-nums">
        {format ? format(value) : value}
      </span>
      <motion.button
        type="button"
        aria-label={`Increase ${label}`}
        onClick={() => onChange(clamp(value + step))}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.85 }}
        className="grid h-8 w-8 place-items-center rounded-full text-ink-secondary transition active:bg-slate-100"
      >
        <Icon name="add" size={16} />
      </motion.button>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Form fields                                                         *
 * ------------------------------------------------------------------ */
interface FieldShellProps {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, children, className }: FieldShellProps) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-label-md text-ink-secondary">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-label-sm text-ink-muted">{hint}</span> : null}
    </label>
  );
}

const CONTROL_CLASS =
  'h-12 w-full rounded-block border border-edge bg-surface px-3.5 text-body-md text-ink placeholder:text-ink-muted focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/15';

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(CONTROL_CLASS, props.className)} />;
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(CONTROL_CLASS, 'appearance-none pr-9', props.className)} />;
}

/* ------------------------------------------------------------------ *
 * Buttons                                                             *
 * ------------------------------------------------------------------ */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: string;
  trailingIcon?: string;
  block?: boolean;
}

export function Button({
  variant = 'primary',
  icon,
  trailingIcon,
  block,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: rest.disabled ? 1 : 1.015, y: rest.disabled ? 0 : -1 }}
      whileTap={{ scale: rest.disabled ? 1 : 0.95, y: rest.disabled ? 0 : 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      {...(rest as any)}
      className={cn(
        'inline-flex min-h-11 sm:min-h-12 items-center justify-center gap-2 rounded-xl sm:rounded-pill px-4 sm:px-5 text-label-lg font-semibold transition-shadow duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        block && 'w-full',
        variant === 'primary' &&
          'bg-gradient-to-b from-indigo-500 via-indigo-600 to-indigo-700 text-white shadow-[0_6px_20px_rgba(79,70,229,0.35),inset_0_1px_0_rgba(255,255,255,0.3)] hover:brightness-105 active:shadow-[0_2px_8px_rgba(79,70,229,0.3)]',
        variant === 'secondary' &&
          'border border-slate-200/90 bg-gradient-to-b from-white to-slate-100/90 text-slate-800 shadow-[0_3px_10px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,1)] hover:bg-slate-50',
        variant === 'ghost' && 'text-brand-700 hover:bg-brand-50/80',
        variant === 'danger' &&
          'bg-gradient-to-b from-red-500 to-red-600 text-white shadow-[0_6px_18px_rgba(239,68,68,0.3),inset_0_1px_0_rgba(255,255,255,0.25)] hover:brightness-105',
        className,
      )}
    >
      {icon ? <Icon name={icon} size={18} /> : null}
      {children}
      {trailingIcon ? <Icon name={trailingIcon} size={18} /> : null}
    </motion.button>
  );
}

/* ------------------------------------------------------------------ *
 * Avatar + subject icon tile                                          *
 * ------------------------------------------------------------------ */
export function Avatar({
  name,
  size = 40,
  className,
  badge,
}: {
  name: string;
  size?: number;
  className?: string;
  badge?: boolean;
}) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <span className={cn('relative inline-grid shrink-0 place-items-center', className)}>
      <span
        className="grid place-items-center rounded-full bg-brand-600 font-bold text-white shadow-ambient"
        style={{ width: size, height: size, fontSize: size * 0.36 }}
      >
        {initials || 'C'}
      </span>
      {badge ? (
        <span className="absolute -bottom-0.5 -right-0.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-safe-500 text-white ring-2 ring-surface">
          <Icon name="check" size={12} weight={700} />
        </span>
      ) : null}
    </span>
  );
}

const TILE_TONES: Record<string, string> = {
  indigo: 'bg-brand-50 text-brand-600',
  amber: 'bg-warning-50 text-warning-600',
  emerald: 'bg-safe-50 text-safe-600',
  rose: 'bg-critical-50 text-critical-500',
  sky: 'bg-[#E8F2FE] text-[#2563EB]',
  violet: 'bg-[#F3EBFF] text-[#7C3AED]',
};

export function IconTile({
  icon,
  tone = 'indigo',
  size = 44,
  className,
  iconSize = 20,
}: {
  icon: string;
  tone?: keyof typeof TILE_TONES | string;
  size?: number;
  className?: string;
  iconSize?: number;
}) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-[14px]',
        TILE_TONES[tone] ?? TILE_TONES.indigo,
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Icon name={icon} size={iconSize} />
    </span>
  );
}
