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
        'relative transition-all duration-200',
        // Level 1 dashboard card: glassmorphic surface, 16px padding on mobile -> 24px on desktop
        variant === 'elevated' &&
          'glass-card rounded-2xl sm:rounded-card p-4 sm:p-5.5 lg:p-6 shadow-ambient ring-1 ring-black/[0.04]',
        variant === 'inset' &&
          'rounded-xl sm:rounded-block border border-divider bg-surface-muted/90 backdrop-blur-sm p-3.5 sm:p-4',
        variant === 'plain' &&
          'rounded-xl sm:rounded-block bg-surface-muted/90 p-3.5 sm:p-4',
        onClick && 'cursor-pointer active:scale-[0.985] hover:border-brand-500/30',
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
        <h2 className="text-headline-sm text-ink">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-body-sm text-ink-secondary">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
