import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import { PageTransition } from '@/components/ui/AnimatedContainer';
import { cn } from '@/lib/cn';
import { useClassora } from '@/app/store';
import { FloatingNav } from './FloatingNav';
import { SidebarNav } from './SidebarNav';
import { ToastHost } from './ToastHost';
import { SyncIndicator } from './SyncIndicator';
import { InstallPrompt } from './InstallPrompt';
import { ClassCardSkeleton, MetricCardSkeleton } from '@/components/ui/feedback';

/**
 * Application Shell: Responsive multi-device frame.
 * - Mobile (< 768px): Centered single-column column with floating bottom capsule navbar.
 * - Tablet & Desktop (>= 768px): Left Sidebar + spacious multi-column main container.
 */
export function AppShell() {
  const ready = useClassora((state) => state.ready);
  const location = useLocation();

  // Every navigation starts at the top of the new screen.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  return (
    <div className="relative min-h-dvh bg-[#F4F6F9] text-slate-900 flex">
      <SyncIndicator />
      
      {/* Desktop & Tablet Sidebar Nav */}
      <SidebarNav />

      {/* Main Content Workspace */}
      <main className="flex-1 min-w-0 pb-28 md:pb-12">
        <div
          className={cn(
            'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6',
          )}
        >
          {ready ? (
            <AnimatePresence mode="wait">
              <PageTransition key={location.pathname}>
                <Outlet />
              </PageTransition>
            </AnimatePresence>
          ) : (
            <BootSkeleton />
          )}
          <InstallPrompt />
        </div>
      </main>

      {/* Mobile Floating Bottom Nav Dock */}
      <FloatingNav />
      <ToastHost />
    </div>
  );
}

function BootSkeleton() {
  return (
    <div className="space-y-4 px-4 pt-safe-plus-2 max-w-4xl mx-auto">
      <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
      <div className="h-8 w-52 animate-pulse rounded-full bg-slate-200" />
      <MetricCardSkeleton />
      <ClassCardSkeleton />
      <ClassCardSkeleton />
    </div>
  );
}
