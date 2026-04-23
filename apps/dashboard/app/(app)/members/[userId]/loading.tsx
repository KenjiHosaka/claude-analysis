import { Skeleton } from "@/components/ui/skeleton";

export default function MemberDetailLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between border-b px-6 py-4 -mx-6 -mt-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-60" />
      </div>

      {/* Member header skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
          </div>
        </div>
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl ring-1 ring-foreground/10 p-4 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>

      {/* Trend chart skeleton */}
      <div className="rounded-xl ring-1 ring-foreground/10 p-4 space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-[300px] w-full" />
      </div>

      {/* Two-column charts skeleton */}
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-xl ring-1 ring-foreground/10 p-4 space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-[300px] w-full" />
        </div>
        <div className="rounded-xl ring-1 ring-foreground/10 p-4 space-y-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>

      {/* Subagent chart skeleton */}
      <div className="rounded-xl ring-1 ring-foreground/10 p-4 space-y-3">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-[300px] w-full" />
      </div>

      {/* Recent sessions table skeleton */}
      <div className="rounded-xl ring-1 ring-foreground/10 p-4 space-y-3">
        <Skeleton className="h-5 w-36" />
        <div className="space-y-2">
          <div className="flex gap-4 border-b py-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 border-b py-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
