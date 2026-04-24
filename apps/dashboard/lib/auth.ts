import { db } from "./db";
import { users } from "./db/schema";

const DEV_MODE = !process.env.AUTH_GITHUB_ID;

// ---------------------------------------------------------------------------
// Dev mode: bypass OAuth, auto-login as first user in DB
// ---------------------------------------------------------------------------

type DevSession = {
  user: { id: string; name: string; email?: string | null; image?: string | null };
};

async function devAuth(): Promise<DevSession | null> {
  const firstUser = await db.query.users.findFirst();
  if (!firstUser) return null;
  return {
    user: {
      id: firstUser.id,
      name: firstUser.name,
      email: firstUser.email,
      image: firstUser.avatarUrl,
    },
  };
}

async function devSignIn() {
  // no-op in dev mode
}

async function devSignOut() {
  // no-op in dev mode
}

// ---------------------------------------------------------------------------
// Production mode: GitHub OAuth via Auth.js
// ---------------------------------------------------------------------------

async function loadNextAuth() {
  const NextAuth = (await import("next-auth")).default;
  const GitHub = (await import("next-auth/providers/github")).default;
  const { eq } = await import("drizzle-orm");

  return NextAuth({
    providers: [GitHub],
    pages: { signIn: "/login" },
    callbacks: {
      async signIn({ user, profile }) {
        if (!profile?.id) return false;
        const githubId = String(profile.id);
        const existing = await db.query.users.findFirst({
          where: eq(users.githubId, githubId),
        });
        if (!existing) {
          await db.insert(users).values({
            githubId,
            name:
              user.name ??
              (profile as unknown as { login?: string }).login ??
              "Unknown",
            avatarUrl: user.image ?? "",
            email: user.email,
          });
        } else {
          await db
            .update(users)
            .set({
              name:
                user.name ??
                (profile as unknown as { login?: string }).login ??
                existing.name,
              avatarUrl: user.image ?? existing.avatarUrl,
              email: user.email ?? existing.email,
            })
            .where(eq(users.githubId, githubId));
        }
        return true;
      },
      async jwt({ token, profile }) {
        if (profile?.id) {
          const githubId = String(profile.id);
          const { eq } = await import("drizzle-orm");
          const dbUser = await db.query.users.findFirst({
            where: eq(users.githubId, githubId),
          });
          if (dbUser) token.userId = dbUser.id;
        }
        return token;
      },
      async session({ session, token }) {
        if (token.userId) session.user.id = token.userId as string;
        return session;
      },
    },
  });
}

let _nextAuth: Awaited<ReturnType<typeof loadNextAuth>> | null = null;
async function getNextAuth() {
  if (!_nextAuth) _nextAuth = await loadNextAuth();
  return _nextAuth;
}

// ---------------------------------------------------------------------------
// Exports: switch between dev and production based on AUTH_GITHUB_ID
// ---------------------------------------------------------------------------

export async function auth() {
  if (DEV_MODE) return devAuth();
  const na = await getNextAuth();
  return na.auth();
}

export async function signIn(...args: unknown[]) {
  if (DEV_MODE) return devSignIn();
  const na = await getNextAuth();
  return (na.signIn as Function)(...args);
}

export async function signOut(...args: unknown[]) {
  if (DEV_MODE) return devSignOut();
  const na = await getNextAuth();
  return (na.signOut as Function)(...args);
}

export async function getHandlers() {
  if (DEV_MODE) {
    return {
      GET: () => new Response("Dev mode — no auth needed", { status: 200 }),
      POST: () => new Response("Dev mode — no auth needed", { status: 200 }),
    };
  }
  const na = await getNextAuth();
  return na.handlers;
}
