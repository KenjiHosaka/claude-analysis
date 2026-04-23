import { Suspense } from "react";
import { connection } from "next/server";
import { parseSearchParams } from "@/lib/search-params";
import { Header } from "@/components/layout/header";
import { getPrKpi, getPrList } from "@/lib/db/queries/prs";
import { PrKpiCards } from "@/components/prs/pr-kpi-cards";
import { PrFilters } from "@/components/prs/pr-filters";
import { PrTable } from "@/components/prs/pr-table";

const PAGE_SIZE = 20;

export default async function PrsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await connection();
  const params = await searchParams;
  const { from, to, repo } = parseSearchParams(params);

  const status = params.status ?? undefined;
  const q = params.q ?? undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [kpi, prList] = await Promise.all([
    getPrKpi(from, to, repo),
    getPrList(from, to, repo, status, q, PAGE_SIZE, offset),
  ]);

  return (
    <>
      <Header title="PRs" />
      <div className="space-y-6 p-6">
        <PrKpiCards data={kpi} />
        <Suspense>
          <PrFilters />
        </Suspense>
        <PrTable
          data={prList.rows}
          totalCount={prList.totalCount}
          page={page}
        />
      </div>
    </>
  );
}
