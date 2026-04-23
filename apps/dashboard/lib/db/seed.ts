import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  users,
  sessions,
  tokenUsages,
  skillUsages,
  subagentUsages,
  repositories,
  pullRequests,
  prSessions,
  distributedSkills,
} from "./schema";
import { subDays, addHours } from "date-fns";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

function randomDateWithinDays(days: number): Date {
  const now = new Date();
  const start = subDays(now, days);
  const diff = now.getTime() - start.getTime();
  return new Date(start.getTime() + Math.random() * diff);
}

// ---------------------------------------------------------------------------
// Seed data definitions
// ---------------------------------------------------------------------------

const USER_DEFS = [
  { name: "Alice", githubId: "1001" },
  { name: "Bob", githubId: "1002" },
  { name: "Charlie", githubId: "1003" },
] as const;

const SKILL_DEFS: { skillName: string; description: string }[] = [
  { skillName: "brainstorming", description: "アイデア出しやブレインストーミングを支援するスキル" },
  { skillName: "debugging", description: "バグの特定と修正を支援するデバッグスキル" },
  { skillName: "tdd", description: "テスト駆動開発を実践するためのスキル" },
  { skillName: "code-reviewer", description: "コードレビューを効率的に行うスキル" },
  { skillName: "writing-plans", description: "実装計画やドキュメントの作成を支援するスキル" },
];

const REPO_DEFS = [
  { owner: "myorg", name: "frontend", url: "https://github.com/myorg/frontend" },
  { owner: "myorg", name: "backend", url: "https://github.com/myorg/backend" },
];

const BRANCHES = [
  "feature/auth",
  "feature/dashboard",
  "fix/bug-123",
  "refactor/api",
] as const;

const PROJECTS = [
  "/Users/dev/myorg/frontend",
  "/Users/dev/myorg/backend",
];

const MODELS = ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5"];

const SKILL_NAMES = [
  "brainstorming",
  "debugging",
  "tdd",
  "code-reviewer",
  "writing-plans",
  "frontend-design",
];

const AGENT_TYPES = ["Explore", "Plan", "code-reviewer", "general-purpose"];

const PR_TITLES: Record<string, string[]> = {
  "feature/auth": [
    "Add OAuth2 login flow",
    "Implement JWT refresh tokens",
    "Add session management",
  ],
  "feature/dashboard": [
    "Add analytics dashboard",
    "Implement chart components",
    "Add dashboard filters",
  ],
  "fix/bug-123": [
    "Fix null pointer in user service",
    "Fix race condition in cache",
    "Fix pagination off-by-one",
  ],
  "refactor/api": [
    "Refactor API error handling",
    "Extract shared middleware",
    "Migrate to new router",
  ],
};

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function seed() {
  console.log("Seeding database...");

  // ---- Users ----
  const insertedUsers = await db
    .insert(users)
    .values(
      USER_DEFS.map((u) => ({
        githubId: u.githubId,
        name: u.name,
        avatarUrl: `https://avatars.githubusercontent.com/u/${u.githubId}`,
        email: `${u.name.toLowerCase()}@example.com`,
        role: "member" as const,
      }))
    )
    .returning();
  console.log(`  Created ${insertedUsers.length} users`);

  // ---- Distributed Skills ----
  const insertedSkills = await db
    .insert(distributedSkills)
    .values(SKILL_DEFS)
    .returning();
  console.log(`  Created ${insertedSkills.length} distributed skills`);

  // ---- Repositories ----
  const insertedRepos = await db
    .insert(repositories)
    .values(REPO_DEFS)
    .returning();
  console.log(`  Created ${insertedRepos.length} repositories`);

  // ---- Sessions + per-session data ----
  let totalSessions = 0;
  let totalTokenUsages = 0;
  let totalSkillUsages = 0;
  let totalSubagentUsages = 0;

  // Collect all created sessions so we can link PRs later
  const allSessions: {
    id: string;
    userId: string;
    branch: string | null;
    startedAt: Date;
  }[] = [];

  for (const user of insertedUsers) {
    const sessionCount = randomInt(30, 60);

    for (let i = 0; i < sessionCount; i++) {
      const startedAt = randomDateWithinDays(60);
      const durationHours = 1 + Math.random() * 2; // 1-3 hours
      const endedAt = addHours(startedAt, durationHours);
      const branch =
        Math.random() < 0.8 ? randomElement([...BRANCHES]) : null;

      const [session] = await db
        .insert(sessions)
        .values({
          externalId: `${user.id}-session-${i}`,
          userId: user.id,
          project: randomElement(PROJECTS),
          branch,
          startedAt,
          endedAt,
          sessionKind: "interactive",
        })
        .returning();

      allSessions.push({
        id: session.id,
        userId: user.id,
        branch,
        startedAt,
      });
      totalSessions++;

      // -- TokenUsage (1 per session) --
      await db.insert(tokenUsages).values({
        sessionId: session.id,
        model: randomElement(MODELS),
        inputTokens: randomInt(0, 50000),
        outputTokens: randomInt(0, 20000),
        cacheTokens: randomInt(0, 30000),
      });
      totalTokenUsages++;

      // -- SkillUsages (0-3 per session) --
      const skillCount = randomInt(0, 3);
      for (let s = 0; s < skillCount; s++) {
        const invokedAt = new Date(
          startedAt.getTime() +
            Math.random() * (endedAt.getTime() - startedAt.getTime())
        );
        await db.insert(skillUsages).values({
          sessionId: session.id,
          skillName: randomElement(SKILL_NAMES),
          invokedAt,
        });
        totalSkillUsages++;
      }

      // -- SubagentUsages (0-2 per session) --
      const subagentCount = randomInt(0, 2);
      for (let a = 0; a < subagentCount; a++) {
        await db.insert(subagentUsages).values({
          sessionId: session.id,
          agentType: randomElement(AGENT_TYPES),
          toolCallsCount: randomInt(0, 20),
          tokensUsed: randomInt(0, 10000),
        });
        totalSubagentUsages++;
      }
    }
  }

  console.log(`  Created ${totalSessions} sessions`);
  console.log(`  Created ${totalTokenUsages} token usages`);
  console.log(`  Created ${totalSkillUsages} skill usages`);
  console.log(`  Created ${totalSubagentUsages} subagent usages`);

  // ---- Pull Requests (10 per repo = 20 total) ----
  let totalPRs = 0;
  let totalPrSessions = 0;

  for (const repo of insertedRepos) {
    for (let prIdx = 0; prIdx < 10; prIdx++) {
      const branch = randomElement([...BRANCHES]);
      const createdAt = randomDateWithinDays(60);
      const isMerged = Math.random() < 0.7;
      const mergedAt = isMerged
        ? addHours(createdAt, randomInt(24, 72))
        : null;
      const author = randomElement(insertedUsers);
      const titles = PR_TITLES[branch] ?? [`Work on ${branch}`];

      const [pr] = await db
        .insert(pullRequests)
        .values({
          repositoryId: repo.id,
          prNumber: prIdx + 1,
          branch,
          title: randomElement(titles),
          author: author.name,
          createdAt,
          mergedAt,
          closedAt: mergedAt, // closed when merged, null otherwise
        })
        .returning();
      totalPRs++;

      // ---- PR-Session links (up to 3 matching sessions) ----
      const matchingSessions = allSessions
        .filter((s) => s.branch === branch)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      for (const ms of matchingSessions) {
        await db.insert(prSessions).values({
          pullRequestId: pr.id,
          sessionId: ms.id,
        });
        totalPrSessions++;
      }
    }
  }

  console.log(`  Created ${totalPRs} pull requests`);
  console.log(`  Created ${totalPrSessions} PR-session links`);

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
