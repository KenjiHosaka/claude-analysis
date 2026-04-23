import { Skeleton } from "@/components/ui/skeleton";

export default function SkillsLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between border-b px-6 py-4 -mx-6 -mt-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-60" />
      </div>

      {/* Tabs skeleton */}
      <Skeleton className="h-8 w-56" />

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

      {/* Heatmap skeleton */}
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <Skeleton className="mb-4 h-5 w-56" />
        <Skeleton className="h-[200px] w-full" />
      </div>

      {/* Trend + Unused skeleton */}
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <Skeleton className="mb-4 h-5 w-40" />
          <Skeleton className="h-[300px] w-full" />
        </div>
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <Skeleton className="mb-4 h-5 w-40" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
    </div>
  );
}
