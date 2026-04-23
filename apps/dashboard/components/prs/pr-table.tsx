"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { PrDetail } from "./pr-detail";
import type { PrListEntry } from "@claude-analysis/shared";

interface PrTableProps {
  data: PrListEntry[];
  totalCount: number;
  page: number;
}

const PAGE_SIZE = 20;

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${Math.round(tokens / 1_000)}K`;
  }
  return String(tokens);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(entry: PrListEntry): string {
  if (entry.mergedAt) return "Merged";
  if (entry.closedAt) return "Closed";
  return "Open";
}

function statusColor(entry: PrListEntry): string {
  if (entry.mergedAt) return "text-purple-600 dark:text-purple-400";
  if (entry.closedAt) return "text-red-600 dark:text-red-400";
  return "text-green-600 dark:text-green-400";
}

export function PrTable({ data, totalCount, page }: PrTableProps) {
  const searchParams = useSearchParams();
  const [expandedPrId, setExpandedPrId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Check if a specific repo is filtered
  const repoParam = searchParams.get("repo");

  function pageUrl(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    return `/prs?${params.toString()}`;
  }

  function handleRowClick(prId: string) {
    setExpandedPrId((prev) => (prev === prId ? null : prId));
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">#</TableHead>
            <TableHead>タイトル</TableHead>
            <TableHead>作者</TableHead>
            <TableHead className="text-right">スキル数</TableHead>
            <TableHead className="text-right">トークン</TableHead>
            <TableHead className="text-right">日時</TableHead>
            <TableHead className="w-16">状態</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="py-8 text-center text-muted-foreground"
              >
                PRが見つかりません
              </TableCell>
            </TableRow>
          ) : (
            data.flatMap((pr) => {
              const isExpanded = expandedPrId === pr.prId;
              const rows = [
                <TableRow
                  key={pr.prId}
                  className="cursor-pointer"
                  aria-expanded={isExpanded}
                  onClick={() => handleRowClick(pr.prId)}
                >
                  <TableCell className="tabular-nums">{pr.prNumber}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      {!repoParam && (
                        <span className="text-xs text-muted-foreground">
                          {pr.repoOwner}/{pr.repoName}
                        </span>
                      )}
                      <span className="font-medium">{pr.title}</span>
                    </div>
                  </TableCell>
                  <TableCell>{pr.author}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {pr.uniqueSkillCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatTokens(pr.totalTokens)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatDate(pr.createdAt)}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium ${statusColor(pr)}`}>
                      {statusLabel(pr)}
                    </span>
                  </TableCell>
                </TableRow>,
              ];

              if (isExpanded) {
                rows.push(
                  <TableRow key={`${pr.prId}-detail`}>
                    <TableCell colSpan={7} className="bg-muted/30 p-0">
                      <PrDetail prId={pr.prId} />
                    </TableCell>
                  </TableRow>,
                );
              }

              return rows;
            })
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-4">
        {page > 1 ? (
          <Link
            href={pageUrl(page - 1)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            前へ
          </Link>
        ) : (
          <Button variant="outline" size="sm" disabled>
            前へ
          </Button>
        )}
        <span className="text-sm text-muted-foreground">
          ページ {page} / {totalPages}
        </span>
        {page < totalPages ? (
          <Link
            href={pageUrl(page + 1)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            次へ
          </Link>
        ) : (
          <Button variant="outline" size="sm" disabled>
            次へ
          </Button>
        )}
      </div>
    </div>
  );
}
