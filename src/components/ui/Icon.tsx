import { cn } from '@/lib/cn';

/**
 * Material Symbols Rounded — the icon family used by the approved design.
 * The font is self-hosted (no CDN), so icons render offline and in the PWA.
 */
export interface IconProps {
  name: string;
  className?: string;
  /** Filled variant for active/selected states. */
  filled?: boolean;
  size?: number;
  weight?: number;
  'aria-hidden'?: boolean;
  title?: string;
}

export function Icon({
  name,
  className,
  filled = false,
  size = 20,
  weight = 500,
  title,
}: IconProps) {
  return (
    <span
      className={cn('material-symbols-rounded select-none leading-none', className)}
      style={{
        fontSize: `${size}px`,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${size}`,
      }}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
    >
      {name}
    </span>
  );
}
