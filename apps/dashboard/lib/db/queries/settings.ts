import { eq, isNull, and } from "drizzle-orm";
import { randomBytes, createHash } from "node:crypto";
import { db } from "@/lib/db";
import { apiKeys, repositories } from "@/lib/db/schema";

export async function getApiKey(userId: string) {
  const rows = await db
    .select({
      id: apiKeys.id,
      keyPrefix: apiKeys.keyPrefix,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
    .limit(1);

  return rows.length > 0 ? rows[0] : null;
}

export async function generateApiKey(userId: string): Promise<string> {
  // Revoke all existing keys for this user
  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)));

  // Generate new key: ca_ + 32 random hex bytes
  const rawKey = "ca_" + randomBytes(32).toString("hex");
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 7); // "ca_xxxx"

  await db.insert(apiKeys).values({
    userId,
    keyHash,
    keyPrefix,
  });

  return rawKey;
}

export async function getRepositories() {
  return db.select().from(repositories);
}

export async function addRepository(owner: string, name: string) {
  await db.insert(repositories).values({
    owner,
    name,
    url: `https://github.com/${owner}/${name}`,
  });
}

export async function deleteRepository(id: string) {
  await db.delete(repositories).where(eq(repositories.id, id));
}
