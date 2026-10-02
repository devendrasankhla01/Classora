import { useEffect } from 'react';

import { useClassora } from '@/app/store';
import { Toast } from '@/components/ui/feedback';

/** Single-slot toast feedback, auto-dismissed after a few seconds. */
export function ToastHost() {
  const toast = useClassora((state) => state.toast);
  const announce = useClassora((state) => state.announce);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => announce(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast, announce]);

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[108px] z-50 flex justify-center px-5">
      <Toast
        message={toast.message}
        tone={toast.tone}
        onDismiss={() => announce(null)}
      />
    </div>
  );
}
