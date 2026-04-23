import { notFound } from "next/navigation";
import { connection } from "next/server";
import { parseSearchParams } from "@/lib/search-params";
import { Header } from "@/components/layout/header";
import { getMemberDetail } from "@/lib/db/queries/members";
import { MemberHeader } from "@/components/members/member-header";
import { MemberKpiCards } from "@/components/members/member-kpi-cards";
import { UsageTrendChart } from "@/components/members/usage-trend-chart";
import { MemberSkillRanking } from "@/components/members/member-skill-ranking";
import { ProjectBreakdown } from "@/components/members/project-breakdown";
import { SubagentChart } from "@/components/members/subagent-chart";
import { RecentSessions } from "@/components/members/recent-sessions";

export default async function MemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { userId } = await params;
  const sp = await searchParams;
  const { from, to } = parseSearchParams(sp);
  await connection();

  const detail = await getMemberDetail(userId, from, to);
  if (!detail) notFound();

  return (
    <>
      <Header title="Member Detail" />
      <div className="space-y-6 p-6">
        <MemberHeader user={detail.user} />
        <MemberKpiCards kpi={detail.kpi} />
        <UsageTrendChart data={detail.dailyTrend} />
        <div className="grid grid-cols-2 gap-6">
          <MemberSkillRanking data={detail.skillRanking} />
          <ProjectBreakdown data={detail.projectBreakdown} />
        </div>
        <SubagentChart data={detail.subagentBreakdown} />
        <RecentSessions initialSessions={detail.recentSessions} />
      </div>
    </>
  );
}
