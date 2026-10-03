import { useEffect, useRef, type ReactNode } from 'react';

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
 * iOS-style bottom sheet: dimmed backdrop, grabber, safe-area aware padding.
 * Focus is trapped lightly (escape to close, scroll locked while open).
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <button
        type="button"
        data-sheet-close
        aria-label="Close"
        className="absolute inset-0 animate-fade-in bg-ink/35 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className={cn(
          'relative z-10 max-h-[92dvh] w-full max-w-app animate-sheet-up overflow-hidden rounded-t-card-lg bg-surface shadow-elevated',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-4">
          <div className="min-w-0 flex-1">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink/15" aria-hidden />
            {title ? <h2 className="text-headline-sm">{title}</h2> : null}
            {description ? (
              <p className="mt-1 text-body-sm text-ink-secondary">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            data-sheet-close
            onClick={onClose}
            aria-label="Close sheet"
            className="mt-2 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface-sunken text-ink-secondary"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="max-h-[70dvh] overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>

        {footer ? (
          <div className="border-t border-divider bg-surface/80 px-5 pb-safe-plus-3 pt-3 backdrop-blur">
            {footer}
          </div>
        ) : (
          <div className="pb-safe" />
        )}
      </div>
    </div>
  );
}
