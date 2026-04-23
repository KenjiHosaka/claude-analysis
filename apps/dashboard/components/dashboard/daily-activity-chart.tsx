"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import type { DailyActivityEntry } from "@claude-analysis/shared";

interface DailyActivityChartProps {
  data: DailyActivityEntry[];
}

export function DailyActivityChart({ data }: DailyActivityChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    tokensK: d.totalTokens / 1000,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>日別アクティビティ</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value: string) => value.slice(5)}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12 }}
                label={{
                  value: "Sessions",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 12 },
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                label={{
                  value: "Tokens (K)",
                  angle: 90,
                  position: "insideRight",
                  style: { fontSize: 12 },
                }}
              />
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
                          {entry.name === "sessionCount"
                            ? "セッション"
                            : "トークン (K)"}
                          : {Number(entry.value).toLocaleString()}
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="sessionCount"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="tokensK"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
