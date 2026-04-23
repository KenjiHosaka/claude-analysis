import { Skeleton } from "@/components/ui/skeleton";

export default function MembersLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between border-b px-6 py-4 -mx-6 -mt-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-60" />
      </div>

      {/* Table skeleton */}
      <div className="w-full">
        {/* Table header */}
        <div className="flex items-center gap-4 border-b px-2 py-2">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="ml-auto h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Table rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b px-2 py-3">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="ml-auto h-4 w-12" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-center gap-4">
        <Skeleton className="h-7 w-14" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-14" />
      </div>
    </div>
  );
}
