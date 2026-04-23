import { ArrowUp, ArrowDown } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import type { MemberDetailAggregate } from "@claude-analysis/shared";

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
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

interface MemberKpiCardsProps {
  kpi: MemberDetailAggregate["kpi"];
}

export function MemberKpiCards({ kpi }: MemberKpiCardsProps) {
  const cards = [
    {
      title: "セッション数",
      value: String(kpi.sessionCount),
      current: kpi.sessionCount,
      previous: kpi.previousPeriod.sessionCount,
    },
    {
      title: "トークン消費量",
      value: formatTokens(kpi.totalTokens),
      current: kpi.totalTokens,
      previous: kpi.previousPeriod.totalTokens,
    },
    {
      title: "スキル呼び出し数",
      value: String(kpi.skillInvocationCount),
      current: kpi.skillInvocationCount,
      previous: kpi.previousPeriod.skillInvocationCount,
    },
    {
      title: "配布スキル活用率",
      value: `${(kpi.distributedSkillAdoptionRate * 100).toFixed(0)}%`,
      current: kpi.distributedSkillAdoptionRate,
      previous: kpi.previousPeriod.distributedSkillAdoptionRate,
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
              <Comparison
                current={card.current}
                previous={card.previous}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
