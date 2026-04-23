"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  LabelList,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import type { MemberSkillRateEntry } from "@claude-analysis/shared";

interface MemberSkillChartProps {
  data: MemberSkillRateEntry[];
}

function rateColor(rate: number): string {
  if (rate >= 80) return "#22c55e";
  if (rate >= 60) return "#84cc16";
  if (rate >= 40) return "#eab308";
  if (rate >= 20) return "#f97316";
  return "#ef4444";
}

export function MemberSkillChart({ data }: MemberSkillChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    rate:
      d.totalDistributedSkillCount > 0
        ? (d.usedDistributedSkillCount / d.totalDistributedSkillCount) * 100
        : 0,
    label: `${d.usedDistributedSkillCount}/${d.totalDistributedSkillCount} スキル使用`,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>メンバー別スキル活用率</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={chartData}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
              <YAxis
                type="category"
                dataKey="userName"
                width={100}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const entry = payload[0].payload as (typeof chartData)[number];
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <p className="text-sm font-medium">{entry.userName}</p>
                      <p className="text-xs text-muted-foreground">
                        活用率: {entry.rate.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.label}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={rateColor(entry.rate)} />
                ))}
                <LabelList
                  dataKey="label"
                  position="right"
                  style={{ fontSize: 11, fill: "currentColor" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
