"use client";

import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { MemberDetailAggregate } from "@claude-analysis/shared";

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return "-";
  const diffMs = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 60) return `${mins}分`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}時間${remainMins > 0 ? `${remainMins}分` : ""}`;
}

interface RecentSessionsProps {
  initialSessions: MemberDetailAggregate["recentSessions"];
}

export function RecentSessions({ initialSessions }: RecentSessionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>最近のセッション</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>開始日時</TableHead>
              <TableHead>プロジェクト</TableHead>
              <TableHead className="text-right">時間</TableHead>
              <TableHead className="text-right">トークン</TableHead>
              <TableHead className="text-right">スキル数</TableHead>
              <TableHead className="text-right">サブエージェント数</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialSessions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-8"
                >
                  セッションがありません
                </TableCell>
              </TableRow>
            ) : (
              initialSessions.map((session) => (
                <TableRow key={session.sessionId}>
                  <TableCell>
                    {format(
                      new Date(session.startedAt),
                      "MM/dd HH:mm",
                      { locale: ja },
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{session.project}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatDuration(session.startedAt, session.endedAt)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatTokens(session.totalTokens)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {session.skillCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {session.subagentCount}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
