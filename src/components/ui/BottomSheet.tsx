import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { cn } from '@/lib/cn';
import { Icon } from './Icon';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  /** Sticky footer actions. */
  footer?: ReactNode;
  className?: string;
}

/**
 * Modern iOS/Smart Home style spring bottom sheet with backdrop blur and drag-to-dismiss.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = window.setTimeout(() => {
      const focusable = sheetRef.current?.querySelector<HTMLElement>(
        'input, select, textarea, button:not([data-sheet-close])',
      );
      focusable?.focus({ preventScroll: true });
    }, 220);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-ink/40 backdrop-blur-md"
            onClick={onClose}
            data-sheet-close
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 380,
              damping: 32,
              mass: 0.8,
            }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                onClose();
              }
            }}
            className={cn(
              'relative z-10 max-h-[92dvh] w-full max-w-app overflow-hidden rounded-t-card-lg bg-surface shadow-elevated touch-none',
              className,
            )}
          >
            <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-4">
              <div className="min-w-0 flex-1">
                <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-ink/20 hover:bg-ink/30 transition-colors" aria-hidden />
                {title ? <h2 className="text-headline-sm font-bold text-ink">{title}</h2> : null}
                {description ? (
                  <p className="mt-1 text-body-sm text-ink-secondary">{description}</p>
                ) : null}
              </div>
              <motion.button
                type="button"
                data-sheet-close
                onClick={onClose}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Close sheet"
                className="mt-2 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-sunken text-ink-secondary hover:text-ink transition-colors"
              >
                <Icon name="close" size={18} />
              </motion.button>
            </div>

            <div className="max-h-[70dvh] overflow-y-auto overscroll-contain px-5 pb-4 touch-pan-y">{children}</div>

            {footer ? (
              <div className="border-t border-divider bg-surface/80 px-5 pb-safe-plus-3 pt-3 backdrop-blur">
                {footer}
              </div>
            ) : (
              <div className="pb-safe" />
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
