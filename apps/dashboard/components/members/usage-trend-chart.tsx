"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MemberDetailAggregate } from "@claude-analysis/shared";

type Metric = "sessionCount" | "totalTokens";

const METRIC_CONFIG: Record<
  Metric,
  { label: string; color: string; format: (v: number) => string }
> = {
  sessionCount: {
    label: "セッション数",
    color: "#3b82f6",
    format: (v) => String(v),
  },
  totalTokens: {
    label: "トークン量",
    color: "#8b5cf6",
    format: (v) => {
      if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
      if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
      return String(v);
    },
  },
};

interface UsageTrendChartProps {
  data: MemberDetailAggregate["dailyTrend"];
}

export function UsageTrendChart({ data }: UsageTrendChartProps) {
  const [metric, setMetric] = useState<Metric>("sessionCount");
  const config = METRIC_CONFIG[metric];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>日別利用推移</CardTitle>
          <Tabs
            defaultValue="sessionCount"
            onValueChange={(v) => setMetric(v as Metric)}
          >
            <TabsList>
              <TabsTrigger value="sessionCount">セッション数</TabsTrigger>
              <TabsTrigger value="totalTokens">トークン量</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value: string) => value.slice(5)}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <p className="text-sm font-medium">{label}</p>
                      <p
                        className="text-xs"
                        style={{ color: config.color }}
                      >
                        {config.label}: {config.format(Number(payload[0].value))}
                      </p>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey={metric}
                stroke={config.color}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
