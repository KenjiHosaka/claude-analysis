import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import type { SkillKpiAggregate } from "@claude-analysis/shared";

interface SkillKpiCardsProps {
  data: SkillKpiAggregate;
}

export function SkillKpiCards({ data }: SkillKpiCardsProps) {
  const cards = [
    {
      title: "配布スキル数",
      value: String(data.distributedSkillCount),
    },
    {
      title: "活用率(%)",
      value: `${data.adoptionRate.toFixed(1)}%`,
    },
    {
      title: "未活用スキル数",
      value: String(data.unusedSkillCount),
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
