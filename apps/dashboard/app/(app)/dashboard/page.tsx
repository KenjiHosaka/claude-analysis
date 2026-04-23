import { connection } from "next/server";
import { parseSearchParams } from "@/lib/search-params";
import { Header } from "@/components/layout/header";
import {
  getTeamKpi,
  getDailyActivity,
  getSkillRanking,
  getMemberSkillRates,
} from "@/lib/db/queries/dashboard";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { DailyActivityChart } from "@/components/dashboard/daily-activity-chart";
import { SkillRanking } from "@/components/dashboard/skill-ranking";
import { MemberSkillChart } from "@/components/dashboard/member-skill-chart";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await connection();
  const params = await searchParams;
  const { from, to, repo } = parseSearchParams(params);

  const [kpi, daily, skills, members] = await Promise.all([
    getTeamKpi(from, to, repo),
    getDailyActivity(from, to, repo),
    getSkillRanking(from, to, repo),
    getMemberSkillRates(from, to, repo),
  ]);

  return (
    <>
      <Header title="Dashboard" />
      <div className="space-y-6 p-6">
        <KpiCards data={kpi} />
        <div className="grid grid-cols-2 gap-6">
          <DailyActivityChart data={daily} />
          <SkillRanking data={skills} />
        </div>
        <MemberSkillChart data={members} />
      </div>
    </>
  );
}
