interface BrandLogoProps {
  variant?: 'horizontal' | 'mark' | 'wordmark';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function BrandLogo({ variant = 'horizontal', size = 'md', className = '' }: BrandLogoProps) {
  const sizeConfig = {
    sm: { mark: 'w-7 h-7', font: 'text-base', gap: 'gap-2' },
    md: { mark: 'w-8 h-8', font: 'text-lg', gap: 'gap-2.5' },
    lg: { mark: 'w-14 h-14', font: 'text-2xl', gap: 'gap-3' },
  }[size];

  const MarkIcon = () => (
    <img
      src="/branding/campusone-mark.png"
      alt="CampusOne Logo"
      className={`shrink-0 object-contain drop-shadow-sm transition-transform hover:scale-105 ${sizeConfig.mark} ${className}`}
    />
  );

  const TextWordmark = () => (
    <span className={`font-bold tracking-tight text-slate-900 ${sizeConfig.font}`}>
      Campus
      <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
        One
      </span>
    </span>
  );

  if (variant === 'mark') {
    return <MarkIcon />;
  }

  if (variant === 'wordmark') {
    return <TextWordmark />;
  }

  return (
    <div className={`inline-flex items-center ${sizeConfig.gap} ${className}`}>
      <MarkIcon />
      <TextWordmark />
    </div>
  );
}
