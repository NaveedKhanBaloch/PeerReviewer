export function LoadingSkeleton({ variant = 'card' }: { variant?: 'sidebar-item' | 'report' | 'card' | 'table-row' }) {
  if (variant === 'sidebar-item') {
    return <div className="h-24 animate-pulse rounded-2xl bg-slate-800/80" />;
  }
  if (variant === 'table-row') {
    return <div className="h-12 animate-pulse rounded-lg bg-slate-100" />;
  }
  if (variant === 'report') {
    return (
      <div className="space-y-4">
        <div className="h-28 animate-pulse rounded-3xl bg-white" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
        <div className="h-48 animate-pulse rounded-3xl bg-white" />
      </div>
    );
  }
  return <div className="h-32 animate-pulse rounded-2xl bg-white" />;
}
