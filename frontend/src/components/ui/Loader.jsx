import { cn } from '../../lib/utils';

export function Spinner({ className, size = 'md' }) {
  const sizes = { sm: 'w-4 h-4 border-2', md: 'w-6 h-6 border-2', lg: 'w-10 h-10 border-[3px]' };
  return (
    <div
      className={cn(
        'inline-block border-current border-t-transparent rounded-full animate-spin',
        sizes[size], className
      )}
      role="status" aria-label="Loading"
    />
  );
}

export function PageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-space-md bg-background">
      <span className="text-4xl select-none">✈️</span>
      <Spinner size="lg" className="text-secondary" />
      <p className="font-manrope text-body-sm text-on-surface-variant">Loading TripSync…</p>
    </div>
  );
}

export function SectionLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner size="lg" className="text-secondary" />
    </div>
  );
}
