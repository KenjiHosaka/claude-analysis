import { connection } from "next/server";
import { parseSearchParams } from "@/lib/search-params";
import { Header } from "@/components/layout/header";
import {
  getCostKpi,
  getDailyCost,
  getModelBreakdown,
  getCostByUser,
  getCostByProject,
} from "@/lib/db/queries/cost";
import { CostKpiCards } from "@/components/cost/cost-kpi-cards";
import { DailyCostChart } from "@/components/cost/daily-cost-chart";
import { ModelBreakdown } from "@/components/cost/model-breakdown";
import { IoBreakdown } from "@/components/cost/io-breakdown";
import { CostTable } from "@/components/cost/cost-table";

export default async function CostPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await connection();
  const params = await searchParams;
  const { from, to, repo } = parseSearchParams(params);

  const [kpi, daily, modelBreakdown, userCosts, projectCosts] =
    await Promise.all([
      getCostKpi(from, to, repo),
      getDailyCost(from, to, repo),
      getModelBreakdown(from, to, repo),
      getCostByUser(from, to, repo),
      getCostByProject(from, to, repo),
    ]);

  return (
    <>
      <Header title="Cost" />
      <div className="space-y-6 p-6">
        <CostKpiCards data={kpi} />
        <DailyCostChart data={daily} />
        <div className="grid grid-cols-2 gap-6">
          <ModelBreakdown data={modelBreakdown} />
          <IoBreakdown data={modelBreakdown} />
        </div>
        <CostTable userCosts={userCosts} projectCosts={projectCosts} />
      </div>
    </>
  );
}
