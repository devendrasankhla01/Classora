import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

import { cn } from '@/lib/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Inset blocks use the smaller radius and a hairline border. */
  variant?: 'elevated' | 'inset' | 'plain';
  as?: 'div' | 'section' | 'article' | 'li';
  onClick?: () => void;
  layoutId?: string;
}

/**
 * Modern Neumorphic Soft UI Porcelain Card with dynamic spring hover lift and tactile interactions.
 */
export function Card({ children, className, variant = 'elevated', onClick, layoutId }: CardProps) {
  return (
    <motion.div
      layoutId={layoutId}
      whileHover={
        onClick
          ? {
              y: -3,
              scale: 1.01,
              transition: { type: 'spring', stiffness: 450, damping: 25 },
            }
          : undefined
      }
      whileTap={
        onClick
          ? {
              scale: 0.98,
              y: 0,
              transition: { duration: 0.12 },
            }
          : undefined
      }
      className={cn(
        'relative transition-shadow duration-200',
        // Level 1 dashboard card: glassmorphic surface, 16px padding on mobile -> 24px on desktop
        variant === 'elevated' &&
          'glass-card rounded-2xl sm:rounded-card p-4 sm:p-5.5 lg:p-6 shadow-ambient ring-1 ring-black/[0.04] hover:shadow-elevated',
        variant === 'inset' &&
          'rounded-xl sm:rounded-block border border-divider bg-surface-muted/90 backdrop-blur-sm p-3.5 sm:p-4 shadow-inner',
        variant === 'plain' &&
          'rounded-xl sm:rounded-block bg-surface-muted/90 p-3.5 sm:p-4',
        onClick && 'cursor-pointer hover:border-indigo-400/40',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </motion.div>
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
