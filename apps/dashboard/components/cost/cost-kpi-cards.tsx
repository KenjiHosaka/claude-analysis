import { ArrowUp, ArrowDown } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import type { CostKpiAggregate } from "@claude-analysis/shared";

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function Comparison({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) {
  const change = percentChange(current, previous);
  if (change === null) return null;

  const isPositive = change >= 0;
  const Icon = isPositive ? ArrowUp : ArrowDown;
  const colorClass = isPositive ? "text-green-600" : "text-red-600";

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs ${colorClass}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(change).toFixed(1)}%
    </span>
  );
}

interface CostKpiCardsProps {
  data: CostKpiAggregate;
}

export function CostKpiCards({ data }: CostKpiCardsProps) {
  const cards = [
    {
      title: "総トークン数",
      value: formatTokens(data.totalTokens),
      current: data.totalTokens,
      previous: data.previousPeriod.totalTokens,
    },
    {
      title: "推定コスト",
      value: formatUsd(data.estimatedCostUsd),
      current: data.estimatedCostUsd,
      previous: data.previousPeriod.estimatedCostUsd,
    },
    {
      title: "Opus比率",
      value: `${(data.opusRatio * 100).toFixed(0)}%`,
      current: data.opusRatio,
      previous: data.previousPeriod.opusRatio,
    },
    {
      title: "平均セッションコスト",
      value: formatUsd(data.avgSessionCostUsd),
      current: data.avgSessionCostUsd,
      previous: data.previousPeriod.avgSessionCostUsd,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{card.value}</span>
              <Comparison current={card.current} previous={card.previous} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
