"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import type { MemberDetailAggregate } from "@claude-analysis/shared";

const AGENT_COLORS: Record<string, string> = {
  Explore: "#3b82f6",
  Plan: "#22c55e",
  "code-reviewer": "#8b5cf6",
  "general-purpose": "#f97316",
};

const DEFAULT_COLOR = "#9ca3af";

interface SubagentChartProps {
  data: MemberDetailAggregate["subagentBreakdown"];
}

export function SubagentChart({ data }: SubagentChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>サブエージェント使用内訳</CardTitle>
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
        <CardTitle>サブエージェント使用内訳</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis
                dataKey="agentType"
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const entry = payload[0]
                    .payload as MemberDetailAggregate["subagentBreakdown"][number];
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <p className="text-sm font-medium">{entry.agentType}</p>
                      <p className="text-xs text-muted-foreground">
                        ツール呼び出し: {entry.toolCallsCount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        トークン: {entry.tokensUsed.toLocaleString()}
                      </p>
                    </div>
                  );
                }}
              />
              <Legend />
              <Bar
                dataKey="toolCallsCount"
                name="ツール呼び出し数"
                radius={[4, 4, 0, 0]}
                fill="#3b82f6"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Export for use in the bar cell coloring
export function getAgentColor(agentType: string): string {
  return AGENT_COLORS[agentType] ?? DEFAULT_COLOR;
}
