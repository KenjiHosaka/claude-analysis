"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import type { ModelBreakdownEntry } from "@claude-analysis/shared";

const MODEL_COLORS: Record<string, string> = {
  "claude-opus-4-6": "#f43f5e",
  "claude-sonnet-4-6": "#3b82f6",
  "claude-haiku-4-5": "#22c55e",
};

const FALLBACK_COLORS = ["#9ca3af", "#6366f1", "#f97316", "#eab308"];

function getColor(model: string, index: number): string {
  return MODEL_COLORS[model] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

interface ModelBreakdownProps {
  data: ModelBreakdownEntry[];
}

export function ModelBreakdown({ data }: ModelBreakdownProps) {
  const totalCost = data.reduce((sum, d) => sum + d.estimatedCostUsd, 0);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>モデル別内訳</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-8 text-center">
            データがありません
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>モデル別内訳</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="estimatedCostUsd"
                nameKey="model"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getColor(entry.model, index)}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const entry = payload[0].payload as ModelBreakdownEntry;
                  const ratio =
                    totalCost > 0
                      ? ((entry.estimatedCostUsd / totalCost) * 100).toFixed(1)
                      : "0";
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <p className="text-sm font-medium">{entry.model}</p>
                      <p className="text-xs text-muted-foreground">
                        コスト: {formatUsd(entry.estimatedCostUsd)} ({ratio}%)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        トークン:{" "}
                        {entry.totalTokens.toLocaleString()}
                      </p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">合計</p>
              <p className="text-lg font-bold">{formatUsd(totalCost)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
