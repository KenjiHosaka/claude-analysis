"use client";

import { useState, useMemo, type ReactNode } from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import { ArrowUpDown } from "lucide-react";
import { calculateCost } from "@claude-analysis/shared";
import type {
  CostByUserEntry,
  CostByProjectEntry,
} from "@claude-analysis/shared";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function totalTokens(
  models: { inputTokens: number; outputTokens: number; cacheTokens: number }[],
): number {
  return models.reduce(
    (sum, m) => sum + m.inputTokens + m.outputTokens + m.cacheTokens,
    0,
  );
}

function totalCost(
  models: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    cacheTokens: number;
  }[],
): number {
  return models.reduce(
    (sum, m) =>
      sum + calculateCost(m.model, m.inputTokens, m.outputTokens, m.cacheTokens),
    0,
  );
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

type SortKey = "tokens" | "cost" | "sessions";
type SortDir = "asc" | "desc";

function SortableHead({
  children,
  sortKey,
  currentKey,
  currentDir,
  onSort,
}: {
  children: ReactNode;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  return (
    <TableHead
      className="cursor-pointer select-none text-right"
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <ArrowUpDown
          className={`h-3 w-3 ${currentKey === sortKey ? "opacity-100" : "opacity-30"}`}
        />
      </span>
    </TableHead>
  );
}

// ---------------------------------------------------------------------------
// User table
// ---------------------------------------------------------------------------

function UserTable({ data }: { data: CostByUserEntry[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("cost");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const teamTotalCost = useMemo(
    () => data.reduce((sum, u) => sum + totalCost(u.models), 0),
    [data],
  );

  const sorted = useMemo(() => {
    const arr = [...data];
    arr.sort((a, b) => {
      let va: number;
      let vb: number;
      switch (sortKey) {
        case "tokens":
          va = totalTokens(a.models);
          vb = totalTokens(b.models);
          break;
        case "cost":
          va = totalCost(a.models);
          vb = totalCost(b.models);
          break;
        case "sessions":
          va = a.sessionCount;
          vb = b.sessionCount;
          break;
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return arr;
  }, [data, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ユーザー</TableHead>
          <SortableHead
            sortKey="sessions"
            currentKey={sortKey}
            currentDir={sortDir}
            onSort={handleSort}
          >
            セッション
          </SortableHead>
          <SortableHead
            sortKey="tokens"
            currentKey={sortKey}
            currentDir={sortDir}
            onSort={handleSort}
          >
            トークン
          </SortableHead>
          <SortableHead
            sortKey="cost"
            currentKey={sortKey}
            currentDir={sortDir}
            onSort={handleSort}
          >
            コスト
          </SortableHead>
          <TableHead className="text-right">チーム比率</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={5}
              className="py-8 text-center text-muted-foreground"
            >
              データがありません
            </TableCell>
          </TableRow>
        ) : (
          sorted.map((user) => {
            const cost = totalCost(user.models);
            const tokens = totalTokens(user.models);
            const ratio =
              teamTotalCost > 0
                ? ((cost / teamTotalCost) * 100).toFixed(1)
                : "0";
            return (
              <TableRow key={user.userId}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar size="sm">
                      <AvatarImage src={user.avatarUrl} alt={user.userName} />
                      <AvatarFallback>
                        {user.userName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{user.userName}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {user.sessionCount}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatTokens(tokens)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatUsd(cost)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {ratio}%
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// Project table
// ---------------------------------------------------------------------------

function ProjectTable({ data }: { data: CostByProjectEntry[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("cost");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const arr = [...data];
    arr.sort((a, b) => {
      let va: number;
      let vb: number;
      switch (sortKey) {
        case "tokens":
          va = totalTokens(a.models);
          vb = totalTokens(b.models);
          break;
        case "cost":
          va = totalCost(a.models);
          vb = totalCost(b.models);
          break;
        case "sessions":
          va = a.sessionCount;
          vb = b.sessionCount;
          break;
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return arr;
  }, [data, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>プロジェクト</TableHead>
          <SortableHead
            sortKey="sessions"
            currentKey={sortKey}
            currentDir={sortDir}
            onSort={handleSort}
          >
            セッション
          </SortableHead>
          <SortableHead
            sortKey="tokens"
            currentKey={sortKey}
            currentDir={sortDir}
            onSort={handleSort}
          >
            トークン
          </SortableHead>
          <SortableHead
            sortKey="cost"
            currentKey={sortKey}
            currentDir={sortDir}
            onSort={handleSort}
          >
            コスト
          </SortableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={4}
              className="py-8 text-center text-muted-foreground"
            >
              データがありません
            </TableCell>
          </TableRow>
        ) : (
          sorted.map((project) => {
            const cost = totalCost(project.models);
            const tokens = totalTokens(project.models);
            return (
              <TableRow key={project.project}>
                <TableCell className="font-medium">
                  {project.project}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {project.sessionCount}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatTokens(tokens)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatUsd(cost)}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// CostTable (main export)
// ---------------------------------------------------------------------------

interface CostTableProps {
  userCosts: CostByUserEntry[];
  projectCosts: CostByProjectEntry[];
}

export function CostTable({ userCosts, projectCosts }: CostTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>コスト内訳</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="user">
          <TabsList>
            <TabsTrigger value="user">ユーザー別</TabsTrigger>
            <TabsTrigger value="project">プロジェクト別</TabsTrigger>
          </TabsList>
          <TabsContent value="user">
            <UserTable data={userCosts} />
          </TabsContent>
          <TabsContent value="project">
            <ProjectTable data={projectCosts} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
