// Shown the moment a lesson is opened, while it loads.
export function LessonSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="جارٍ تحميل الدرس">
      <div className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <div className="size-8 rounded-full bg-surface-2" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 rounded bg-surface-2" />
            <div className="h-1 rounded-full bg-surface-2" />
          </div>
          <div className="size-8 rounded-full bg-surface-2" />
          <div className="size-8 rounded-full bg-surface-2" />
        </div>
      </div>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 sm:py-14">
        <div className="h-48 rounded-2xl bg-surface-2 sm:h-60" />
        <div className="h-8 w-2/3 rounded-lg bg-surface-2" />
        <div className="h-4 w-1/2 rounded bg-surface-2" />
        <div className="h-10 w-32 rounded-xl bg-surface-2" />
      </div>
    </div>
  );
}
