import { NextRequest, NextResponse } from "next/server";
import { getPrDetail } from "@/lib/db/queries/prs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ prId: string }> },
) {
  const { prId } = await params;

  const detail = await getPrDetail(prId);
  if (!detail) {
    return NextResponse.json({ error: "PR not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}
