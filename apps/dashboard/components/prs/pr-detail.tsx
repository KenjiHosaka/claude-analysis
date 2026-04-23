"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import type { PrDetailAggregate } from "@claude-analysis/shared";

interface PrDetailProps {
  prId: string;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${Math.round(tokens / 1_000)}K`;
  }
  return String(tokens);
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PrDetail({ prId }: PrDetailProps) {
  const [data, setData] = useState<PrDetailAggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/prs/${prId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch PR detail");
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setData(json as PrDetailAggregate);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [prId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">読み込み中...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-4 text-center text-sm text-destructive">
        {error ?? "データの取得に失敗しました"}
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 py-3">
      {/* PR info header */}
      <div className="space-y-1">
        <div className="text-sm text-muted-foreground">
          {data.pr.repoOwner}/{data.pr.repoName} #{data.pr.prNumber}
        </div>
        <div className="font-medium">{data.pr.title}</div>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>Author: {data.pr.author}</span>
          <span>Branch: {data.pr.branch}</span>
          <span>作成: {formatDateTime(data.pr.createdAt)}</span>
          {data.pr.mergedAt && (
            <span>マージ: {formatDateTime(data.pr.mergedAt)}</span>
          )}
        </div>
      </div>

      {/* Skill badges */}
      {data.skills.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">
            使用スキル
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.skills.map((s) => (
              <Badge
                key={s.skillName}
                variant={s.isDistributed ? "default" : "secondary"}
              >
                {s.skillName}
                <span className="ml-1 opacity-70">x{s.usageCount}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Related sessions table */}
      {data.sessions.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">
            関連セッション
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>セッションID</TableHead>
                <TableHead>開始</TableHead>
                <TableHead>終了</TableHead>
                <TableHead className="text-right">トークン</TableHead>
                <TableHead className="text-right">スキル</TableHead>
                <TableHead className="text-right">サブエージェント</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.sessions.map((s) => (
                <TableRow key={s.sessionId}>
                  <TableCell className="font-mono text-xs">
                    {s.sessionId.slice(0, 8)}...
                  </TableCell>
                  <TableCell>{formatDateTime(s.startedAt)}</TableCell>
                  <TableCell>
                    {s.endedAt ? formatDateTime(s.endedAt) : "-"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatTokens(s.totalTokens)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.skillCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.subagentCount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
