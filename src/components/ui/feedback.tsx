import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { Icon } from './Icon';

interface EmptyStateProps {
  icon: string;
  title: string;
  message: string;
  action?: ReactNode;
  className?: string;
}

/** Premium, minimal empty state — no cartoon illustrations. */
export function EmptyState({ icon, title, message, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-10 text-center', className)}>
      <span className="grid h-14 w-14 place-items-center rounded-full bg-surface text-ink-muted shadow-ambient">
        <Icon name={icon} size={24} />
      </span>
      <h3 className="mt-4 text-[16px] font-bold text-ink">{title}</h3>
      <p className="mt-1 max-w-[280px] text-[13px] leading-relaxed text-ink-secondary">{message}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

interface SkeletonProps {
  className?: string;
  rounded?: string;
}

export function Skeleton({ className, rounded = 'rounded-block' }: SkeletonProps) {
  return <div className={cn('animate-pulse bg-surface-sunken', rounded, className)} />;
}

/** Skeleton shaped like a class card — used while data loads. */
export function ClassCardSkeleton() {
  return (
    <div className="rounded-card bg-surface p-5 shadow-ambient">
      <Skeleton className="h-3 w-16" rounded="rounded-full" />
      <Skeleton className="mt-3 h-5 w-40" rounded="rounded-full" />
      <Skeleton className="mt-2.5 h-3 w-28" rounded="rounded-full" />
      <Skeleton className="mt-4 h-11 w-full" />
    </div>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="rounded-card bg-surface p-5 shadow-ambient">
      <Skeleton className="h-3 w-32" rounded="rounded-full" />
      <Skeleton className="mt-4 h-9 w-32" rounded="rounded-full" />
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
      </div>
    </div>
  );
}

interface LoadingStepsProps {
  steps: { label: string; state: 'done' | 'active' | 'pending' }[];
}

/** Honest progress for AI extraction — real states, no fake percentages. */
export function LoadingSteps({ steps }: LoadingStepsProps) {
  return (
    <ol className="space-y-3">
      {steps.map((step) => (
        <li key={step.label} className="flex items-center gap-3">
          <span
            className={cn(
              'grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-bold',
              step.state === 'done' && 'bg-safe-50 text-safe-700',
              step.state === 'active' && 'bg-brand-50 text-brand-700',
              step.state === 'pending' && 'bg-surface-sunken text-ink-muted',
            )}
          >
            {step.state === 'done' ? <Icon name="check" size={15} /> : step.state === 'active' ? <Spinner /> : null}
          </span>
          <span
            className={cn(
              'text-[13.5px] font-medium',
              step.state === 'pending' ? 'text-ink-muted' : 'text-ink',
            )}
          >
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Spinner() {
  return (
    <span
      className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-600"
      aria-hidden
    />
  );
}

interface ToastProps {
  message: string;
  tone: 'success' | 'info' | 'warning' | 'error';
  onDismiss?: () => void;
}

export function Toast({ message, tone, onDismiss }: ToastProps) {
  const icon =
    tone === 'success' ? 'check_circle' : tone === 'warning' ? 'error' : tone === 'error' ? 'report' : 'info';
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto flex items-center gap-2.5 rounded-pill bg-ink px-4 py-3 text-white shadow-floating"
    >
      <Icon
        name={icon}
        size={17}
        className={cn(
          tone === 'success' && 'text-safe-500',
          tone === 'warning' && 'text-warning-500',
          tone === 'error' && 'text-critical-500',
          tone === 'info' && 'text-brand-300',
        )}
        filled
      />
      <span className="text-[13px] font-semibold">{message}</span>
      {onDismiss ? (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="text-white/70">
          <Icon name="close" size={15} />
        </button>
      ) : null}
    </div>
  );
}
