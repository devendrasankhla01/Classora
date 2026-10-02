import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { useClassora } from '@/app/store';
import { FloatingNav } from './FloatingNav';
import { ToastHost } from './ToastHost';
import { SyncIndicator } from './SyncIndicator';
import { ClassCardSkeleton, MetricCardSkeleton } from '@/components/ui/feedback';

/**
 * Application frame: centred mobile-first column, safe-area padding, floating
 * navigation and the toast host. Screens render inside the `Outlet`.
 */
export function AppShell() {
  const ready = useClassora((state) => state.ready);
  const location = useLocation();

  // Every navigation starts at the top of the new screen.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  return (
    <div className="relative min-h-dvh bg-canvas">
      <SyncIndicator />
      <div
        className={cn(
          'mx-auto w-full max-w-app pb-32',
          // Desktop keeps the same focused column instead of stretching cards.
          'lg:max-w-app-wide',
        )}
      >
        {ready ? <Outlet /> : <BootSkeleton />}
      </div>
      <FloatingNav />
      <ToastHost />
    </div>
  );
}

function BootSkeleton() {
  return (
    <div className="space-y-4 px-5 pt-safe-plus-2">
      <div className="h-4 w-24 animate-pulse rounded-full bg-surface-sunken" />
      <div className="h-8 w-52 animate-pulse rounded-full bg-surface-sunken" />
      <MetricCardSkeleton />
      <ClassCardSkeleton />
      <ClassCardSkeleton />
    </div>
  );
}
