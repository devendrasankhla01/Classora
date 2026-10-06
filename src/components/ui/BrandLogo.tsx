interface BrandLogoProps {
  variant?: 'horizontal' | 'mark' | 'wordmark';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function BrandLogo({ variant = 'horizontal', size = 'md', className = '' }: BrandLogoProps) {
  const sizeConfig = {
    sm: { mark: 'w-7 h-7 rounded-lg text-sm', font: 'text-base', gap: 'gap-2' },
    md: { mark: 'w-8 h-8 rounded-xl text-base', font: 'text-lg', gap: 'gap-2.5' },
    lg: { mark: 'w-14 h-14 rounded-2xl text-2xl', font: 'text-2xl', gap: 'gap-3' },
  }[size];

  const MarkIcon = () => (
    <div
      className={`relative grid shrink-0 place-items-center bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 text-white shadow-md shadow-indigo-500/20 ring-1 ring-white/20 transition-all ${sizeConfig.mark}`}
    >
      <svg
        className="h-[60%] w-[60%] fill-current drop-shadow-sm"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Graduation cap icon */}
        <path d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18C5 17.18 8.13 20 12 20C15.87 20 19 17.18 19 17.18V13.18L12 17L5 13.18Z" />
      </svg>
    </div>
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
