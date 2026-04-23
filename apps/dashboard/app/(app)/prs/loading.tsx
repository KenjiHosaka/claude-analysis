import { Skeleton } from "@/components/ui/skeleton";

export default function PrsLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between border-b px-6 py-4 -mx-6 -mt-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-60" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>

      {/* Filters skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-28" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="space-y-2 p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
