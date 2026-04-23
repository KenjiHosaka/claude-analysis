"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Repository {
  id: string;
  owner: string;
  name: string;
}

interface RepositorySelectorProps {
  repositories: Repository[];
}

export function RepositorySelector({
  repositories,
}: RepositorySelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentRepo = searchParams.get("repo") ?? "all";

  const handleChange = useCallback(
    (value: string | null) => {
      if (!value) return;
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all") {
        params.delete("repo");
      } else {
        params.set("repo", value);
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams]
  );

  return (
    <Select value={currentRepo} onValueChange={handleChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select repository" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All repositories</SelectItem>
        {repositories.map((repo) => (
          <SelectItem key={repo.id} value={repo.id}>
            {repo.owner}/{repo.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
