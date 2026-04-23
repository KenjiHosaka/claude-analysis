import { subDays, format } from "date-fns";

export type SearchParams = { from?: string; to?: string; repo?: string };

export function parseSearchParams(params: SearchParams) {
  const today = new Date();
  const from = params.from ? new Date(params.from) : subDays(today, 30);
  const to = params.to ? new Date(params.to) : today;
  const repo = params.repo ?? undefined;
  return { from, to, repo };
}

export function formatDateParam(date: Date): string {
  return format(date, "yyyy-MM-dd");
}
