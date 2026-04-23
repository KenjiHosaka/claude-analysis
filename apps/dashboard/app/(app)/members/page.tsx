import { connection } from "next/server";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { parseSearchParams } from "@/lib/search-params";
import { Header } from "@/components/layout/header";
import { getMemberList, getMemberCount } from "@/lib/db/queries/members";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${Math.round(tokens / 1_000)}K`;
  }
  return String(tokens);
}

const PAGE_SIZE = 20;

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await connection();
  const params = await searchParams;
  const { from, to } = parseSearchParams(params);

  const page = Math.max(1, Number(params.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [members, totalCount] = await Promise.all([
    getMemberList(from, to, PAGE_SIZE, offset),
    getMemberCount(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Build query string preserving from/to params for pagination links
  function pageUrl(p: number) {
    const sp = new URLSearchParams();
    if (params.from) sp.set("from", params.from);
    if (params.to) sp.set("to", params.to);
    sp.set("page", String(p));
    return `/members?${sp.toString()}`;
  }

  return (
    <>
      <Header title="Members" />
      <div className="space-y-6 p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12" />
              <TableHead>メンバー</TableHead>
              <TableHead className="text-right">セッション数</TableHead>
              <TableHead className="text-right">トークン消費量</TableHead>
              <TableHead className="text-right">スキル活用率</TableHead>
              <TableHead className="text-right">最終活動</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  メンバーが見つかりません
                </TableCell>
              </TableRow>
            ) : (
              members.map((m) => (
                <TableRow key={m.userId}>
                  <TableCell>
                    <Avatar size="sm">
                      <AvatarImage src={m.avatarUrl} alt={m.userName} />
                      <AvatarFallback>
                        {m.userName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/members/${m.userId}`}
                      className="font-medium hover:underline"
                    >
                      {m.userName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {m.sessionCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatTokens(m.totalTokens)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {(m.distributedSkillAdoptionRate * 100).toFixed(0)}%
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {m.lastActivityAt
                      ? formatDistanceToNow(new Date(m.lastActivityAt), {
                          addSuffix: true,
                          locale: ja,
                        })
                      : "-"}
                  </TableCell>
                </TableRow>
              ))
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
    </>
  );
}
