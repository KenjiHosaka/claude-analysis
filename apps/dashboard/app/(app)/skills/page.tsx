import { connection } from "next/server";
import { parseSearchParams } from "@/lib/search-params";
import { Header } from "@/components/layout/header";
import {
  getSkillKpi,
  getSkillHeatmap,
  getUnusedSkills,
  getSkillTrend,
  getDistributedSkills,
  addDistributedSkill,
  updateDistributedSkill,
  deleteDistributedSkill,
} from "@/lib/db/queries/skills";
import { SkillKpiCards } from "@/components/skills/skill-kpi-cards";
import { SkillHeatmap } from "@/components/skills/skill-heatmap";
import { UnusedSkills } from "@/components/skills/unused-skills";
import { SkillTrendChart } from "@/components/skills/skill-trend-chart";
import { SkillManagement } from "@/components/skills/skill-management";
import { SkillPageTabs } from "./tabs";

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await connection();
  const params = await searchParams;
  const { from, to, repo } = parseSearchParams(params);

  const [kpi, heatmap, unused, trend, distributed] = await Promise.all([
    getSkillKpi(from, to, repo),
    getSkillHeatmap(from, to, repo),
    getUnusedSkills(from, to, repo),
    getSkillTrend(from, to, repo),
    getDistributedSkills(),
  ]);

  async function handleAdd(
    skillName: string,
    description?: string,
  ): Promise<void> {
    "use server";
    await addDistributedSkill(skillName, description);
  }

  async function handleUpdate(
    id: string,
    skillName: string,
    description?: string,
  ): Promise<void> {
    "use server";
    await updateDistributedSkill(id, skillName, description);
  }

  async function handleDelete(id: string): Promise<void> {
    "use server";
    await deleteDistributedSkill(id);
  }

  return (
    <>
      <Header title="Skills" />
      <div className="space-y-6 p-6">
        <SkillPageTabs
          analysisContent={
            <div className="space-y-6">
              <SkillKpiCards data={kpi} />
              <SkillHeatmap data={heatmap} />
              <div className="grid grid-cols-2 gap-6">
                <SkillTrendChart data={trend} />
                <UnusedSkills data={unused} />
              </div>
            </div>
          }
          managementContent={
            <SkillManagement
              skills={distributed}
              addAction={handleAdd}
              updateAction={handleUpdate}
              deleteAction={handleDelete}
            />
          }
        />
      </div>
    </>
  );
}
