import { Link } from 'react-router-dom';

import { useClassora } from '@/app/store';
import { useAggregateStats, useConfidence, useSafeMissTotal } from '@/hooks/useScheduleData';
import { AttendanceGauge } from '@/components/attendance/AttendanceGauge';
import { Icon } from '@/components/ui/Icon';
import { IconTile } from '@/components/ui/controls';
import { Pill } from '@/components/ui/chips';
import { classoraGreen, classoraInkMuted, classoraRed } from '@/lib/palette';

/**
 * Attendance Overview: gauge, safe-zone insight and the attended / missed /
 * conducted breakdown. Every value comes from the attendance engine.
 */
export function AttendanceOverviewCard() {
  const stats = useAggregateStats();
  const confidence = useConfidence();
  const profile = useClassora((state) => state.profile);
  const target = profile?.attendanceTarget ?? 75;

  // Safe misses are simulated per subject against its own upcoming classes,
  // so lab weights and per-subject targets are respected.
  const safeMisses = useSafeMissTotal();

  return (
    <section className="rounded-card bg-surface p-5 shadow-ambient ring-1 ring-hairline">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconTile icon="analytics" tone="indigo" size={38} iconSize={19} />
          <h2 className="text-headline-sm">Attendance Overview</h2>
        </div>
        <Pill>Target: {target}%</Pill>
      </div>

      <div className="mt-4">
        <AttendanceGauge value={stats.percentage} caption="Overall attendance" size={204} target={target} />
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-block bg-safe-50 p-3.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-safe-500 text-white">
          <Icon name="check" size={17} weight={700} />
        </span>
        <p className="text-body-md font-medium text-safe-700">
          {safeMisses > 0 ? (
            <>
              <span className="font-bold">Safe Zone:</span> You can safely miss up to{' '}
              <Link
                to="/can-i-skip"
                className="font-bold underline decoration-safe-500/50 underline-offset-2"
              >
                {safeMisses} more {safeMisses === 1 ? 'class' : 'classes'}
              </Link>{' '}
              while staying above {target}%.
            </>
          ) : (
            <>
              <span className="font-bold">At risk:</span> no buffer left — attend your upcoming classes to
              stay above {target}%.
            </>
          )}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 divide-x divide-divider rounded-block border border-divider bg-surface-muted py-3.5">
        <StatColumn label="Attended" value={stats.attended} color={classoraGreen} />
        <StatColumn label="Missed" value={stats.missed} color={classoraRed} />
        <StatColumn label="Conducted" value={stats.conducted} color={classoraInkMuted} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 px-0.5">
        <span className="inline-flex items-center gap-1.5 text-label-md text-ink-secondary">
          <Icon name="verified" size={15} className="text-brand-600" />
          Data confidence {confidence.percent}%
        </span>
        {confidence.missingClasses > 0 ? (
          <Link to="/attendance/review" className="text-label-md text-brand-700">
            Review {confidence.missingClasses} missing
          </Link>
        ) : (
          <span className="text-label-md text-ink-muted">You’re all caught up</span>
        )}
      </div>
    </section>
  );
}

function StatColumn({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="px-3 text-center">
      <p className="inline-flex items-center gap-1.5 text-label-sm uppercase tracking-[0.03em] text-ink-muted">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </p>
      <p className="mt-1.5 text-metric-sm tabular-nums">{value}</p>
    </div>
  );
}
