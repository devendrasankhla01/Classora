import type { ReactNode } from 'react';

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
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-[30px] w-[52px] shrink-0 rounded-pill transition-colors duration-200',
        checked ? 'bg-brand-600' : 'bg-ink/15',
      )}
    >
      <span
        className={cn(
          'absolute top-[3px] h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ease-porcelain',
          checked ? 'translate-x-[25px]' : 'translate-x-[3px]',
        )}
      />
    </button>
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
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        onClick={() => onChange(clamp(value - step))}
        className="grid h-8 w-8 place-items-center rounded-full text-ink-secondary transition active:scale-95"
      >
        <Icon name="remove" size={16} />
      </button>
      <span className="min-w-[52px] text-center text-label-lg tabular-nums">
        {format ? format(value) : value}
      </span>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        onClick={() => onChange(clamp(value + step))}
        className="grid h-8 w-8 place-items-center rounded-full text-ink-secondary transition active:scale-95"
      >
        <Icon name="add" size={16} />
      </button>
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
    <button
      {...rest}
      className={cn(
        // DESIGN.md §Components 5: 48px tall pill, label-lg type, 0.98 tap scale.
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-pill px-5 text-label-lg transition-all duration-200 ease-porcelain active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
        block && 'w-full',
        variant === 'primary' && 'bg-brand-600 text-white shadow-elevated hover:bg-brand-700',
        variant === 'secondary' &&
          'border border-edge bg-surface text-ink hover:bg-surface-muted',
        variant === 'ghost' && 'text-brand-700 hover:bg-brand-50',
        variant === 'danger' && 'bg-critical-500/[0.12] text-critical-700 hover:bg-critical-100',
        className,
      )}
    >
      {icon ? <Icon name={icon} size={18} /> : null}
      {children}
      {trailingIcon ? <Icon name={trailingIcon} size={18} /> : null}
    </button>
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
