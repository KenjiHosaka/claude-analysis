"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
import { calculateCost } from "@claude-analysis/shared";
import type { DailyCostEntry } from "@claude-analysis/shared";

const MODEL_COLORS: Record<string, string> = {
  "claude-opus-4-6": "#f43f5e", // rose-500
  "claude-sonnet-4-6": "#3b82f6", // blue-500
  "claude-haiku-4-5": "#22c55e", // green-500
};

function getModelColor(model: string): string {
  return MODEL_COLORS[model] ?? "#9ca3af";
}

interface DailyCostChartProps {
  data: DailyCostEntry[];
}

export function DailyCostChart({ data }: DailyCostChartProps) {
  // Get unique models
  const models = Array.from(new Set(data.map((d) => d.model)));

  // Pivot data: each row is a date with cost per model
  const dateMap = new Map<string, Record<string, number>>();
  for (const entry of data) {
    if (!dateMap.has(entry.date)) {
      dateMap.set(entry.date, {});
    }
    const row = dateMap.get(entry.date)!;
    row[entry.model] = calculateCost(
      entry.model,
      entry.inputTokens,
      entry.outputTokens,
      entry.cacheTokens,
    );
  }

  const chartData = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, costs]) => ({ date, ...costs }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>日別コスト推移</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value: string) => value.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value: number) => `$${value.toFixed(1)}`}
                label={{
                  value: "USD",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 12 },
                }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const total = payload.reduce(
                    (sum, entry) => sum + (Number(entry.value) || 0),
                    0,
                  );
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <p className="text-sm font-medium">{label}</p>
                      {payload.map((entry) => (
                        <p
                          key={entry.name}
                          className="text-xs"
                          style={{ color: entry.color }}
                        >
                          {entry.name}: ${Number(entry.value).toFixed(2)}
                        </p>
                      ))}
                      <p className="mt-1 text-xs font-medium border-t pt-1">
                        合計: ${total.toFixed(2)}
                      </p>
                    </div>
                  );
                }}
              />
              {models.map((model) => (
                <Area
                  key={model}
                  type="monotone"
                  dataKey={model}
                  stackId="1"
                  stroke={getModelColor(model)}
                  fill={getModelColor(model)}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
