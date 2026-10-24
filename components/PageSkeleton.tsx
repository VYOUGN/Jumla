// Shown the moment a menu item is clicked, while the page loads, so a click is
// never left without a response. The menu and header around it stay in place.
export function PageSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="جارٍ التحميل">
      <div className="mb-3 h-8 w-48 rounded-lg bg-surface-2" />
      <div className="mb-8 h-4 w-80 max-w-full rounded bg-surface-2" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="h-32 bg-surface-2" />
            <div className="space-y-2 p-4">
              <div className="h-4 w-2/3 rounded bg-surface-2" />
              <div className="h-3 w-1/2 rounded bg-surface-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
