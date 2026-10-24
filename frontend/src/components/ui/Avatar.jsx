import { getInitials, avatarColor, cn } from '../../lib/utils';

export function Avatar({ name = '', size = 'md', className }) {
  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center text-white font-manrope font-bold shrink-0',
        sizes[size], avatarColor(name), className
      )}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  );
}
