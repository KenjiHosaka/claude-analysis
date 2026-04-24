"use client";

import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import type { SkillHeatmapAggregate } from "@claude-analysis/shared";

interface SkillHeatmapProps {
  data: SkillHeatmapAggregate;
}

function intensityClass(value: number, max: number): string {
  if (max === 0 || value === 0) return "bg-muted";
  const ratio = value / max;
  if (ratio <= 0.25) return "bg-blue-100 dark:bg-blue-950";
  if (ratio <= 0.5) return "bg-blue-300 dark:bg-blue-800";
  if (ratio <= 0.75) return "bg-blue-500 dark:bg-blue-600";
  return "bg-blue-700 dark:bg-blue-400";
}

export function SkillHeatmap({ data }: SkillHeatmapProps) {
  const [tooltip, setTooltip] = useState<{
    skillName: string;
    userName: string;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  const maxCount = Math.max(...data.matrix.map((m) => m.usageCount), 0);

  // Build lookup for quick cell access
  const cellMap = new Map<string, number>();
  for (const cell of data.matrix) {
    cellMap.set(`${cell.skillName}::${cell.userId}`, cell.usageCount);
  }

  // Member name lookup
  const memberMap = new Map<string, string>();
  for (const m of data.members) {
    memberMap.set(m.userId, m.userName);
  }

  if (data.skills.length === 0 || data.members.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>スキル活用ヒートマップ</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            データがありません
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>スキル活用ヒートマップ</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-x-auto">
          <div
            className="grid gap-px"
            style={{
              gridTemplateColumns: `160px repeat(${data.members.length}, minmax(60px, 1fr))`,
            }}
          >
            {/* Header row: empty corner + member names */}
            <div className="sticky left-0 z-10 bg-card" />
            {data.members.map((member) => (
              <div
                key={member.userId}
                className="flex flex-col items-center gap-1 px-1 py-2 text-center"
              >
                <img
                  src={member.avatarUrl}
                  alt={member.userName}
                  className="h-6 w-6 rounded-full"
                />
                <span className="text-xs text-muted-foreground truncate max-w-[56px]">
                  {member.userName}
                </span>
              </div>
            ))}

            {/* Skill rows */}
            {data.skills.map((skill) => (
              <React.Fragment key={skill}>
                <div
                  className="sticky left-0 z-10 flex items-center bg-card pr-2 text-sm font-medium truncate"
                >
                  {skill}
                </div>
                {data.members.map((member) => {
                  const val =
                    cellMap.get(`${skill}::${member.userId}`) ?? 0;
                  return (
                    <div
                      key={`${skill}-${member.userId}`}
                      className={`flex items-center justify-center rounded-sm h-8 text-xs font-medium cursor-default ${intensityClass(val, maxCount)} ${val > 0 ? "text-white dark:text-white" : "text-muted-foreground"}`}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({
                          skillName: skill,
                          userName:
                            memberMap.get(member.userId) ?? member.userId,
                          count: val,
                          x: rect.left + rect.width / 2,
                          y: rect.top - 8,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {val > 0 ? val : ""}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          {/* Tooltip */}
          {tooltip && (
            <div
              className="pointer-events-none fixed z-50 rounded-lg border bg-background p-2 shadow-sm text-xs"
              style={{
                left: tooltip.x,
                top: tooltip.y,
                transform: "translate(-50%, -100%)",
              }}
            >
              <p className="font-medium">{tooltip.skillName}</p>
              <p className="text-muted-foreground">{tooltip.userName}</p>
              <p>
                使用回数: <span className="font-medium">{tooltip.count}</span>
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
