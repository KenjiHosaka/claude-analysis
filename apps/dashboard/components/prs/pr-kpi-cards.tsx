import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import type { PrKpiAggregate } from "@claude-analysis/shared";

interface PrKpiCardsProps {
  data: PrKpiAggregate;
}

export function PrKpiCards({ data }: PrKpiCardsProps) {
  const cards = [
    {
      title: "PR総数",
      value: String(data.totalPrCount),
    },
    {
      title: "スキル使用PR率(%)",
      value: `${data.prsWithSkillsRate.toFixed(1)}%`,
    },
    {
      title: "PR平均スキル数",
      value: data.avgSkillsPerPr.toFixed(1),
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{card.value}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
