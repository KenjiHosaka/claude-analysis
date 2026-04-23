import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

export const { handlers, signIn, signOut, auth } = NextAuth({
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
