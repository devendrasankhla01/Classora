import { useEffect } from 'react';

import { cn } from '@/lib/cn';
import { useClassora } from '@/app/store';
import { Icon } from '@/components/ui/Icon';

/**
 * Subtle connectivity state. Never interrupts the student: it only appears
 * while offline or while local changes are waiting to sync.
 */
export function SyncIndicator() {
  const syncState = useClassora((state) => state.syncState);
  const mode = useClassora((state) => state.mode);
  const setSyncState = useClassora((state) => state.setSyncState);

  useEffect(() => {
    const goOnline = () => setSyncState('synced');
    const goOffline = () => setSyncState('offline');

    if (!navigator.onLine) goOffline();
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [setSyncState]);

  if (syncState === 'synced') return null;

  const label =
    syncState === 'offline'
      ? 'Offline — changes are saved on this device'
      : syncState === 'syncing'
        ? 'Syncing…'
        : 'Waiting to sync';

  return (
    <div className="fixed inset-x-0 top-0 z-40 flex justify-center pt-safe">
      <div
        className={cn(
          'mt-2 inline-flex items-center gap-2 rounded-pill px-3.5 py-1.5 text-[11.5px] font-semibold shadow-ambient',
          syncState === 'offline' ? 'bg-warning-50 text-warning-700' : 'bg-brand-50 text-brand-700',
        )}
      >
        <Icon name={syncState === 'offline' ? 'cloud_off' : 'sync'} size={14} />
        {label}
        {mode === 'local' ? null : null}
      </div>
    </div>
  );
}
