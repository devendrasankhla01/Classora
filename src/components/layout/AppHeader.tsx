import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';
import { useClassora } from '@/app/store';
import { BrandLogo } from '@/components/ui/BrandLogo';

interface AppHeaderProps {
  eyebrow?: string;
  /** Swap the text eyebrow for the Classora wordmark artwork. */
  wordmark?: boolean;
  title: string;
  /** Muted line rendered directly above the title (e.g. the current date). */
  overline?: string;
  /** Large secondary heading shown under the title (e.g. "Today's Schedule"). */
  subtitle?: string;
  showActions?: boolean;
  leading?: ReactNode;
  className?: string;
  unreadCount?: number;
}

/**
 * Screen header used across the app: small brand eyebrow, page title, optional
 * gradient-free supporting title, and the notification / profile controls.
 */
export function AppHeader({
  eyebrow = 'CampusOne',
  wordmark = true,
  title,
  overline,
  subtitle,
  showActions = true,
  leading,
  className,
  unreadCount = 0,
}: AppHeaderProps) {
  const profile = useClassora((state) => state.profile);

  return (
    <header className={cn('px-5 pb-4 pt-safe-plus-2', className)}>
      {leading ? <div className="mb-3">{leading}</div> : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {wordmark ? (
            <BrandLogo variant="horizontal" size="sm" />
          ) : (
            <p className="text-label-sm uppercase text-ink-muted">{eyebrow}</p>
          )}
          {overline ? (
            <p className="mt-2 text-body-lg font-medium text-ink-secondary">{overline}</p>
          ) : null}
          <h1 className="mt-1 text-headline-lg text-ink">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-headline-md text-ink-secondary">
              {subtitle}
            </p>
          ) : null}
        </div>

        {showActions ? (
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/notifications"
              aria-label="Notifications"
              className="relative grid h-10 w-10 place-items-center rounded-full bg-surface text-ink shadow-ambient ring-1 ring-hairline transition active:scale-95"
            >
              <Icon name="notifications" size={19} />
              {unreadCount > 0 ? (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-critical-500 ring-2 ring-surface" />
              ) : null}
            </Link>
            <Link
              to="/profile"
              aria-label="Profile"
              className="grid h-10 w-10 place-items-center overflow-hidden rounded-full shadow-ambient ring-1 ring-hairline"
            >
              {profile ? (
                <Avatar name={profile.name} size={40} />
              ) : (
                <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-600 text-white">
                  <Icon name="person" size={18} />
                </span>
              )}
            </Link>
          </div>
        ) : null}
      </div>
    </header>
  );
}
