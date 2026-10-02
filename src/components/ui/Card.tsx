import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Inset blocks use the smaller radius and a hairline border. */
  variant?: 'elevated' | 'inset' | 'plain';
  as?: 'div' | 'section' | 'article' | 'li';
  onClick?: () => void;
}

/**
 * The porcelain card: white surface, generous radius, ambient shadow only.
 */
export function Card({ children, className, variant = 'elevated', as = 'div', onClick }: CardProps) {
  const Tag = as;
  return (
    <Tag
      className={cn(
        'relative',
        variant === 'elevated' &&
          'rounded-card bg-surface p-5 shadow-ambient ring-1 ring-black/[0.03]',
        variant === 'inset' && 'rounded-block border border-black/[0.06] bg-surface-muted p-4',
        variant === 'plain' && 'rounded-block bg-surface-muted p-4',
        onClick && 'cursor-pointer transition-transform duration-200 active:scale-[0.99]',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </Tag>
  );
}

interface SectionHeaderProps {
  title: string;
  action?: ReactNode;
  className?: string;
  subtitle?: string;
}

export function SectionHeader({ title, action, className, subtitle }: SectionHeaderProps) {
  return (
    <div className={cn('mb-3 flex items-end justify-between gap-3', className)}>
      <div>
        <h2 className="text-[17px] font-bold tracking-[-0.01em] text-ink">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-[13px] text-ink-secondary">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
