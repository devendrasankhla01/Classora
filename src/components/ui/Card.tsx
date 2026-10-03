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
        // Level 1 dashboard card: pure white, 24px radius, 24px padding,
        // hairline separation and ambient diffusion.
        variant === 'elevated' && 'rounded-card bg-surface p-6 shadow-ambient ring-1 ring-hairline',
        variant === 'inset' && 'rounded-block border border-divider bg-surface-muted p-4',
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
        <h2 className="text-headline-sm text-ink">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-body-sm text-ink-secondary">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
