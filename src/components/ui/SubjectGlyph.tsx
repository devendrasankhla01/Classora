import { cn } from '@/lib/cn';
import { Icon } from './Icon';
import type { Subject } from '@/types/domain';

const TONES: Record<string, string> = {
  indigo: 'bg-brand-50 text-brand-600',
  amber: 'bg-warning-50 text-warning-600',
  emerald: 'bg-safe-50 text-safe-600',
  rose: 'bg-critical-50 text-critical-500',
  sky: 'bg-[#E8F2FE] text-[#2563EB]',
  violet: 'bg-[#F3EBFF] text-[#7C3AED]',
};

const GLYPHS: Record<string, string> = {
  theory: 'functions',
  lab: 'terminal',
  other: 'school',
};

export function SubjectGlyph({
  subject,
  size = 44,
  className,
}: {
  subject: Pick<Subject, 'classType' | 'colorKey'>;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-[14px]',
        TONES[subject.colorKey] ?? TONES.indigo,
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Icon name={GLYPHS[subject.classType] ?? 'school'} size={Math.round(size * 0.46)} />
    </span>
  );
}
