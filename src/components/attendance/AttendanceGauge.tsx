import { cn } from '@/lib/cn';

interface AttendanceGaugeProps {
  /** 0–100. `null` renders an empty track with a dash. */
  value: number | null;
  label?: string;
  caption?: string;
  className?: string;
  size?: number;
}

/**
 * The Home "speedometer" arc: a 180° stroke with rounded caps, indigo fill on a
 * muted track, matching the approved design.
 */
export function AttendanceGauge({
  value,
  label,
  caption = 'Overall attendance',
  className,
  size = 240,
}: AttendanceGaugeProps) {
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const centerX = size / 2;
  const centerY = size / 2;
  const arcLength = Math.PI * radius;
  const clamped = value === null ? 0 : Math.max(0, Math.min(100, value));
  const progress = (clamped / 100) * arcLength;

  return (
    <div className={cn('relative mx-auto', className)} style={{ width: size, height: size / 2 + 34 }}>
      <svg width={size} height={size / 2 + 24} viewBox={`0 0 ${size} ${size / 2 + 24}`} role="img"
        aria-label={value === null ? 'Attendance unavailable' : `${clamped.toFixed(1)} percent attendance`}>
        <defs>
          <linearGradient id="gauge-fill" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>
        </defs>
        <path
          d={`M ${stroke / 2} ${centerY} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${centerY}`}
          fill="none"
          stroke="#EDEDF1"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <path
          d={`M ${stroke / 2} ${centerY} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${centerY}`}
          fill="none"
          stroke="url(#gauge-fill)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${arcLength}`}
          className="transition-[stroke-dasharray] duration-700 ease-porcelain"
        />
        <text
          x={centerX}
          y={centerY - 18}
          textAnchor="middle"
          className="fill-ink"
          style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.02em' }}
        >
          {label ?? (value === null ? '—' : `${clamped.toFixed(1)}%`)}
        </text>
      </svg>
      <p className="mt-1 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
        {caption}
      </p>
    </div>
  );
}

interface AttendanceRingProps {
  value: number | null;
  delta?: number | null;
  size?: number;
  className?: string;
}

/**
 * The Attendance screen ring: full circle with a teal→indigo gradient sweep.
 */
export function AttendanceRing({ value, delta, size = 190, className }: AttendanceRingProps) {
  const stroke = 14;
  const radius = (size - stroke) / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const clamped = value === null ? 0 : Math.max(0, Math.min(100, value));
  const dash = (clamped / 100) * circumference;

  return (
    <div className={cn('relative grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img"
        aria-label={value === null ? 'Attendance unavailable' : `${clamped.toFixed(1)} percent attendance`}>
        <defs>
          <linearGradient id="ring-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0F9D8C" />
            <stop offset="55%" stopColor="#3F5BD9" />
            <stop offset="100%" stopColor="#5B4BE0" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#ECECF0"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#ring-fill)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          className="transition-[stroke-dasharray] duration-700 ease-porcelain"
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="text-[38px] font-extrabold leading-none tracking-[-0.03em]">
          {value === null ? '—' : `${clamped.toFixed(1)}%`}
        </span>
        {delta !== null && delta !== undefined ? (
          <span className="mx-auto mt-1.5 inline-flex items-center gap-1 rounded-pill bg-white/80 px-2 py-0.5 text-[11px] font-bold text-safe-700">
            ↗ {delta > 0 ? '+' : ''}
            {delta.toFixed(1)}% NET
          </span>
        ) : null}
      </div>
    </div>
  );
}
