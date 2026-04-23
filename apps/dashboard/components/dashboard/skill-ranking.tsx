"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import type { SkillRankingEntry } from "@claude-analysis/shared";

interface SkillRankingProps {
  data: SkillRankingEntry[];
}

export function SkillRanking({ data }: SkillRankingProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>スキル使用ランキング</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={data}>
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="skillName"
                width={120}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const entry = payload[0].payload as SkillRankingEntry;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <p className="text-sm font-medium">{entry.skillName}</p>
                      <p className="text-xs text-muted-foreground">
                        使用回数: {entry.usageCount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ユーザー数: {entry.userCount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.isDistributed ? "配布スキル" : "非配布スキル"}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="usageCount" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isDistributed ? "#3b82f6" : "#9ca3af"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
