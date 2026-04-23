import { AlertTriangle } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import type { UnusedSkillEntry } from "@claude-analysis/shared";

interface UnusedSkillsProps {
  data: UnusedSkillEntry[];
}

export function UnusedSkills({ data }: UnusedSkillsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>未活用スキル</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            全スキルが活用されています
          </p>
        ) : (
          <ul className="space-y-3">
            {data.map((skill) => (
              <li
                key={skill.skillName}
                className="flex items-start gap-3 text-sm"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{skill.skillName}</p>
                  {skill.description && (
                    <p className="text-muted-foreground">
                      {skill.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    登録日: {skill.registeredAt.slice(0, 10)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
