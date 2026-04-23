"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import type { SkillTrendEntry } from "@claude-analysis/shared";

interface SkillTrendChartProps {
  data: SkillTrendEntry[];
}

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

export function SkillTrendChart({ data }: SkillTrendChartProps) {
  // Pivot data: group by date, with each skill as a separate key
  const skillNames = [...new Set(data.map((d) => d.skillName))].slice(0, 5);
  const dateMap = new Map<string, Record<string, number>>();

  for (const entry of data) {
    if (!skillNames.includes(entry.skillName)) continue;
    if (!dateMap.has(entry.date)) {
      dateMap.set(entry.date, {});
    }
    const record = dateMap.get(entry.date)!;
    record[entry.skillName] = entry.usageCount;
  }

  const chartData = [...dateMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({
      date,
      ...values,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>スキルトレンド</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            データがありません
          </p>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value: string) => value.slice(5)}
                />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <p className="text-sm font-medium">{label}</p>
                        {payload.map((entry) => (
                          <p
                            key={entry.name}
                            className="text-xs"
                            style={{ color: entry.color }}
                          >
                            {entry.name}: {entry.value}
                          </p>
                        ))}
                      </div>
                    );
                  }}
                />
                <Legend />
                {skillNames.map((name, i) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
