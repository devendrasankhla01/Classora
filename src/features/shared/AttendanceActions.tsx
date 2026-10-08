import { useState } from 'react';
import { motion } from 'framer-motion';

import { cn } from '@/lib/cn';
import { useClassora } from '@/app/store';
import { Icon } from '@/components/ui/Icon';
import type { AttendanceStatus, ClassOccurrence } from '@/types/domain';

interface AttendanceActionsProps {
  occurrence: ClassOccurrence;
  /** Compact variant for list cards. */
  compact?: boolean;
  className?: string;
  showUndo?: boolean;
}

/**
 * Quick attendance controls for a finished class. Marking is optimistic and
 * always reversible — undo restores the previous state.
 */
export function AttendanceActions({
  occurrence,
  compact,
  className,
  showUndo = false,
}: AttendanceActionsProps) {
  const markAttendance = useClassora((state) => state.markAttendance);
  const cancelClass = useClassora((state) => state.cancelClass);
  const clearAttendance = useClassora((state) => state.clearAttendance);

  const [busy, setBusy] = useState<AttendanceStatus | 'cancelled' | null>(null);

  const run = async (key: AttendanceStatus | 'cancelled', action: () => Promise<void>) => {
    setBusy(key);
    try {
      await action();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <ActionButton
        label="Present"
        icon="check"
        tone="safe"
        compact={compact}
        loading={busy === 'present'}
        onClick={() => void run('present', () => markAttendance(occurrence.id, 'present'))}
      />
      <ActionButton
        label="Absent"
        icon="close"
        tone="critical"
        compact={compact}
        loading={busy === 'absent'}
        onClick={() => void run('absent', () => markAttendance(occurrence.id, 'absent'))}
      />
      <ActionButton
        label="Cancelled"
        icon="block"
        tone="neutral"
        compact={compact}
        loading={busy === 'cancelled'}
        onClick={() =>
          void run('cancelled', () => cancelClass({ occurrenceId: occurrence.id, reason: null }))
        }
      />
      {showUndo ? (
        <motion.button
          type="button"
          onClick={() => void clearAttendance(occurrence.id)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="min-h-[40px] rounded-pill px-3 text-label-md text-ink-secondary underline decoration-ink-muted/40 underline-offset-4"
        >
          Undo
        </motion.button>
      ) : null}
    </div>
  );
}

function ActionButton({
  label,
  icon,
  tone,
  onClick,
  loading,
  compact,
}: {
  label: string;
  icon: string;
  tone: 'safe' | 'critical' | 'neutral';
  onClick: () => void;
  loading?: boolean;
  compact?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={loading}
      whileHover={{ scale: 1.05, y: -1 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className={cn(
        'inline-flex min-h-[40px] items-center gap-1.5 rounded-pill font-bold transition-shadow disabled:opacity-60',
        compact ? 'px-3.5 text-body-sm shadow-xs' : 'px-4 text-body-sm shadow-sm',
        tone === 'safe' && 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60',
        tone === 'critical' && 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200/60',
        tone === 'neutral' && 'bg-surface-sunken text-ink-secondary hover:bg-slate-200/60 border border-slate-200/60',
      )}
    >
      <Icon
        name={loading ? 'progress_activity' : icon}
        size={15}
        className={loading ? 'animate-spin' : ''}
      />
      {label}
    </motion.button>
  );
}
