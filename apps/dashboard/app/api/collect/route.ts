import { NextRequest, NextResponse } from "next/server";
import { collectPayloadSchema } from "@claude-analysis/shared";
import { authenticateApiKey, ingestData } from "@/lib/db/queries/collect";

export async function POST(req: NextRequest) {
  // 1. Check Authorization header (Bearer token)
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing authorization" },
      { status: 401 },
    );
  }

  const apiKey = authHeader.slice("Bearer ".length);

  // 2. Authenticate API key
  const userId = await authenticateApiKey(apiKey);
  if (!userId) {
    return NextResponse.json(
      { error: "Invalid API key" },
      { status: 401 },
    );
  }

  // 3. Parse and validate body with collectPayloadSchema
  const body = await req.json();
  const result = collectPayloadSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: result.error.issues },
      { status: 400 },
    );
  }

  // 4. Call ingestData
  await ingestData(userId, result.data);

  // 5. Return success
  return NextResponse.json({ ok: true });
}
