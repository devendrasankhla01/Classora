import { useMemo, useState } from 'react';

import { cn } from '@/lib/cn';
import { Card, SectionHeader } from '@/components/ui/Card';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Icon } from '@/components/ui/Icon';
import { formatMediumDate, todayKey } from '@/lib/date';
import { buildHeatmap, type HeatmapDay } from './analyticsMath';
import type { AttendanceRecord, ClassOccurrence, Subject } from '@/types/domain';

const CELL_TONES: Record<HeatmapDay['health'], string> = {
  safe: 'bg-safe-500',
  warning: 'bg-warning-500',
  critical: 'bg-critical-500',
  empty: 'bg-surface-sunken',
  future: 'bg-surface-sunken/60',
  holiday: 'bg-brand-100',
  no_data: 'bg-surface-sunken',
};

interface AttendanceHeatmapProps {
  occurrences: ClassOccurrence[];
  attendance: AttendanceRecord[];
  subjects: Subject[];
}

/**
 * Attendance calendar. Deliberately not a GitHub-style grid: soft rounded
 * cells in the porcelain palette, with a day detail sheet on tap.
 */
export function AttendanceHeatmap({ occurrences, attendance }: AttendanceHeatmapProps) {
  const today = todayKey();
  const [selected, setSelected] = useState<HeatmapDay | null>(null);

  const { weeks, monthLabel } = useMemo(() => {
    const start = new Date(`${today}T00:00:00`);
    start.setDate(1);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 2);
    end.setDate(0);

    const days = buildHeatmap(
      occurrences,
      attendance,
      `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`,
      `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`,
      today,
    );

    // Pad to Monday-aligned weeks for a tidy grid.
    const padded: (HeatmapDay | null)[] = [];
    const firstDay = new Date(`${days[0]!.date}T00:00:00`).getDay();
    const leading = (firstDay + 6) % 7;
    for (let index = 0; index < leading; index += 1) padded.push(null);
    padded.push(...days);

    const grouped: (HeatmapDay | null)[][] = [];
    for (let index = 0; index < padded.length; index += 7) grouped.push(padded.slice(index, index + 7));

    return {
      weeks: grouped,
      monthLabel: start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    };
  }, [occurrences, attendance, today]);

  return (
    <Card>
      <SectionHeader
        title="Attendance Calendar"
        subtitle={monthLabel}
        action={
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-secondary">
            <span className="h-2.5 w-2.5 rounded-[4px] bg-safe-500" /> all present
          </span>
        }
      />

      <div className="grid grid-cols-7 gap-1.5">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, index) => (
          <span key={`${label}-${index}`} className="text-center text-[10.5px] font-bold text-ink-muted">
            {label}
          </span>
        ))}
        {weeks.flat().map((day, index) =>
          day === null ? (
            <span key={`pad-${index}`} className="aspect-square" />
          ) : (
            <button
              key={day.date}
              type="button"
              onClick={() => setSelected(day)}
              aria-label={`${formatMediumDate(day.date)} — ${day.present} present, ${day.absent} absent`}
              className={cn(
                'flex aspect-square items-center justify-center rounded-[9px] text-[11px] font-bold transition active:scale-95',
                CELL_TONES[day.health],
                day.health === 'safe' || day.health === 'critical' || day.health === 'warning'
                  ? 'text-white'
                  : 'text-ink-secondary',
                day.date === today && 'ring-2 ring-brand-500 ring-offset-1 ring-offset-surface',
              )}
            >
              {Number(day.date.slice(-2))}
            </button>
          ),
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-semibold text-ink-secondary">
        <Legend tone="bg-safe-500" label="All present" />
        <Legend tone="bg-warning-500" label="Mixed" />
        <Legend tone="bg-critical-500" label="Absences" />
        <Legend tone="bg-brand-100" label="Holiday" />
        <Legend tone="bg-surface-sunken" label="No classes" />
      </div>

      <BottomSheet
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? formatMediumDate(selected.date) : ''}
        description="Attendance recorded on this date"
      >
        {selected ? (
          <div className="space-y-2.5 pt-1">
            <DetailRow label="Classes conducted" value={selected.classes} icon="event" />
            <DetailRow label="Present" value={selected.present} icon="check_circle" tone="safe" />
            <DetailRow label="Absent" value={selected.absent} icon="cancel" tone="critical" />
            <DetailRow label="Cancelled" value={selected.cancelled} icon="block" tone="neutral" />
            <DetailRow label="Unmarked" value={selected.unmarked} icon="pending_actions" tone="warning" />
          </div>
        ) : null}
      </BottomSheet>
    </Card>
  );
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('h-2.5 w-2.5 rounded-[4px]', tone)} />
      {label}
    </span>
  );
}

function DetailRow({
  label,
  value,
  icon,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  icon: string;
  tone?: 'safe' | 'critical' | 'warning' | 'neutral';
}) {
  return (
    <div className="flex items-center justify-between rounded-block bg-surface px-3.5 py-3 shadow-ambient ring-1 ring-black/[0.03]">
      <span className="inline-flex items-center gap-2.5 text-[13.5px] font-semibold">
        <Icon
          name={icon}
          size={17}
          className={cn(
            tone === 'safe' && 'text-safe-600',
            tone === 'critical' && 'text-critical-500',
            tone === 'warning' && 'text-warning-500',
            tone === 'neutral' && 'text-ink-muted',
          )}
        />
        {label}
      </span>
      <span className="text-[15px] font-extrabold tabular-nums">{value}</span>
    </div>
  );
}
