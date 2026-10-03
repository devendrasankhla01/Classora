import { useId } from 'react';

import { cn } from '@/lib/cn';

/**
 * Attendance meters.
 *
 * Matches the Stitch references (`attendify_attendance` / `attendify_home`):
 *   - track  #EEF0F3
 *   - stroke with rounded caps
 *   - the sweep runs through a diagonal gradient, indigo #4F46E5 into deep
 *     green #006C49 — the colour transition itself carries the "healthy"
 *     reading, so no separate benchmark colour flip is needed
 *   - metric numerals use tabular figures with negative tracking
 */
const TRACK = '#EEF0F3';
const GRADIENT_FROM = '#4F46E5';
const GRADIENT_TO = '#006C49';
/** Stroke geometry taken from the reference: 12 units on a 160 viewBox. */
const STROKE_RATIO = 12 / 160;
const STROKE_MIN = 8;
const STROKE_MAX = 12;

export function strokeFor(size: number): number {
  return Math.max(STROKE_MIN, Math.min(STROKE_MAX, size * STROKE_RATIO));
}

interface AttendanceGaugeProps {
  /** 0–100. `null` renders an empty track with a dash. */
  value: number | null;
  label?: string;
  caption?: string;
  className?: string;
  size?: number;
  /** Benchmark shown in the accessible label (e.g. 75). */
  target?: number | null;
}

/**
 * The Home "speedometer" arc: a 180° stroke with rounded caps, gradient fill on
 * a porcelain track.
 */
export function AttendanceGauge({
  value,
  label,
  caption = 'Overall attendance',
  className,
  size = 240,
  target = null,
}: AttendanceGaugeProps) {
  const gradientId = useId().replace(/:/g, '');
  const stroke = strokeFor(size);
  const radius = (size - stroke) / 2;
  const centerX = size / 2;
  const centerY = size / 2;
  const arcLength = Math.PI * radius;
  const clamped = value === null ? 0 : Math.max(0, Math.min(100, value));
  const progress = (clamped / 100) * arcLength;
  const path = `M ${stroke / 2} ${centerY} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${centerY}`;
  const accessibleLabel =
    value === null
      ? 'Attendance unavailable'
      : `${clamped.toFixed(1)} percent attendance${target === null ? '' : `, target ${target} percent`}`;

  return (
    <div className={cn('relative mx-auto', className)} style={{ width: size, height: size / 2 + 34 }}>
      <svg
        width={size}
        height={size / 2 + stroke}
        viewBox={`0 0 ${size} ${size / 2 + stroke}`}
        role="img"
        aria-label={accessibleLabel}
      >
        <defs>
          <linearGradient id={`gauge-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={GRADIENT_FROM} />
            <stop offset="100%" stopColor={GRADIENT_TO} />
          </linearGradient>
        </defs>
        <path d={path} fill="none" stroke={TRACK} strokeWidth={stroke} strokeLinecap="round" />
        <path
          d={path}
          fill="none"
          stroke={`url(#gauge-${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${arcLength}`}
          className="transition-[stroke-dasharray] duration-700 ease-porcelain"
        />
        <text
          x={centerX}
          y={centerY - 14}
          textAnchor="middle"
          className="fill-ink"
          style={{
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {label ?? (value === null ? '—' : `${clamped.toFixed(1)}%`)}
        </text>
      </svg>
      <p className="mt-1 text-center text-label-sm uppercase tracking-[0.03em] text-ink-muted">{caption}</p>
    </div>
  );
}

interface AttendanceRingProps {
  value: number | null;
  delta?: number | null;
  size?: number;
  className?: string;
  /** Benchmark shown in the accessible label (e.g. 75). */
  target?: number | null;
}

/** The Attendance screen ring: a full-circle gradient sweep. */
export function AttendanceRing({ value, delta, size = 190, className, target = null }: AttendanceRingProps) {
  const gradientId = useId().replace(/:/g, '');
  const stroke = strokeFor(size);
  const radius = (size - stroke) / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = value === null ? 0 : Math.max(0, Math.min(100, value));
  const dash = (clamped / 100) * circumference;
  const accessibleLabel =
    value === null
      ? 'Attendance unavailable'
      : `${clamped.toFixed(1)} percent attendance${target === null ? '' : `, target ${target} percent`}`;

  return (
    <div className={cn('relative grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={accessibleLabel}>
        <defs>
          <linearGradient id={`ring-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={GRADIENT_FROM} />
            <stop offset="100%" stopColor={GRADIENT_TO} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={TRACK} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#ring-${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          className="transition-[stroke-dasharray] duration-700 ease-porcelain"
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="text-metric-xl tabular-nums leading-none">
          {value === null ? '—' : `${clamped.toFixed(1)}%`}
        </span>
        {delta !== null && delta !== undefined ? (
          <span className="mx-auto mt-1.5 inline-flex items-center gap-1 rounded-pill bg-surface px-2.5 py-0.5 text-label-sm text-safe-700">
            <span aria-hidden>↗</span>
            {delta > 0 ? '+' : ''}
            {delta.toFixed(1)}% NET
          </span>
        ) : null}
      </div>
    </div>
  );
}
