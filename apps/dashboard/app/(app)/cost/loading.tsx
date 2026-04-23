import { Skeleton } from "@/components/ui/skeleton";

export default function CostLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between border-b px-6 py-4 -mx-6 -mt-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-60" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>

      {/* Daily cost chart skeleton */}
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <Skeleton className="mb-4 h-5 w-40" />
        <Skeleton className="h-[300px] w-full" />
      </div>

      {/* Model + IO breakdown skeleton */}
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <Skeleton className="mb-4 h-5 w-32" />
          <Skeleton className="h-[300px] w-full" />
        </div>
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <Skeleton className="mb-4 h-5 w-40" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>

      {/* Cost table skeleton */}
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <Skeleton className="mb-4 h-5 w-28" />
        <Skeleton className="mb-2 h-8 w-48" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
