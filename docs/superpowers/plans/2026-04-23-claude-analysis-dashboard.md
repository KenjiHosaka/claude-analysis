# Claude Code Usage Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dashboard web application that visualizes Claude Code usage across a 6-20 person development team, tracking skill adoption, subagent usage, token consumption, and PR-level skill tracking.

**Architecture:** Turborepo monorepo with a Next.js 15 (App Router) dashboard app and a collector CLI package. Data is ingested via a REST API from collector agents on team members' machines. PostgreSQL (RDS) stores all data, accessed via Drizzle ORM. Auth.js handles GitHub OAuth.

**Tech Stack:** TypeScript (strict), Next.js 15, Drizzle ORM, PostgreSQL, Auth.js v5, shadcn/ui, Tailwind CSS v4, Recharts, Zod, Commander.js, Turborepo, Docker

**Specs:** `docs/superpowers/specs/` contains the design spec, domain model, and per-page specs.

---

## File Structure

```
claude-analysis/
├── apps/
│   └── dashboard/
│       ├── app/
│       │   ├── layout.tsx                        # Root layout with auth check
│       │   ├── (auth)/login/page.tsx             # Login page
│       │   ├── (app)/layout.tsx                  # Authenticated layout (sidebar+header)
│       │   ├── (app)/dashboard/page.tsx          # Team summary
│       │   ├── (app)/dashboard/loading.tsx
│       │   ├── (app)/members/page.tsx            # Member list
│       │   ├── (app)/members/loading.tsx
│       │   ├── (app)/members/[userId]/page.tsx   # Member detail
│       │   ├── (app)/members/[userId]/loading.tsx
│       │   ├── (app)/skills/page.tsx             # Skill analysis + management
│       │   ├── (app)/skills/loading.tsx
│       │   ├── (app)/prs/page.tsx                # PR tracking
│       │   ├── (app)/prs/loading.tsx
│       │   ├── (app)/cost/page.tsx               # Cost analysis
│       │   ├── (app)/cost/loading.tsx
│       │   ├── (app)/settings/page.tsx           # Settings
│       │   └── api/
│       │       ├── auth/[...nextauth]/route.ts   # Auth.js API routes
│       │       ├── collect/route.ts              # Data collection endpoint
│       │       └── prs/[prId]/route.ts           # PR detail API
│       ├── components/
│       │   ├── layout/
│       │   │   ├── sidebar.tsx
│       │   │   ├── sidebar-nav.tsx
│       │   │   ├── repository-selector.tsx
│       │   │   ├── sidebar-user-menu.tsx
│       │   │   ├── header.tsx
│       │   │   └── date-range-picker.tsx
│       │   ├── ui/                               # shadcn/ui components
│       │   ├── dashboard/
│       │   │   ├── kpi-cards.tsx
│       │   │   ├── daily-activity-chart.tsx
│       │   │   ├── skill-ranking.tsx
│       │   │   └── member-skill-chart.tsx
│       │   ├── members/
│       │   │   ├── member-header.tsx
│       │   │   ├── member-kpi-cards.tsx
│       │   │   ├── usage-trend-chart.tsx
│       │   │   ├── member-skill-ranking.tsx
│       │   │   ├── project-breakdown.tsx
│       │   │   ├── subagent-chart.tsx
│       │   │   └── recent-sessions.tsx
│       │   ├── skills/
│       │   │   ├── skill-kpi-cards.tsx
│       │   │   ├── skill-heatmap.tsx
│       │   │   ├── unused-skills.tsx
│       │   │   ├── skill-trend-chart.tsx
│       │   │   └── skill-management.tsx
│       │   ├── prs/
│       │   │   ├── pr-kpi-cards.tsx
│       │   │   ├── pr-filters.tsx
│       │   │   ├── pr-table.tsx
│       │   │   └── pr-detail.tsx
│       │   ├── cost/
│       │   │   ├── cost-kpi-cards.tsx
│       │   │   ├── daily-cost-chart.tsx
│       │   │   ├── model-breakdown.tsx
│       │   │   ├── io-breakdown.tsx
│       │   │   └── cost-table.tsx
│       │   └── settings/
│       │       ├── profile-section.tsx
│       │       ├── api-key-section.tsx
│       │       └── repository-section.tsx
│       ├── lib/
│       │   ├── db/
│       │   │   ├── index.ts                      # Drizzle client
│       │   │   ├── schema.ts                     # All table schemas
│       │   │   └── queries/
│       │   │       ├── dashboard.ts
│       │   │       ├── members.ts
│       │   │       ├── skills.ts
│       │   │       ├── prs.ts
│       │   │       ├── cost.ts
│       │   │       └── settings.ts
│       │   ├── auth.ts                           # Auth.js config
│       │   └── search-params.ts                  # URL state helpers
│       ├── drizzle.config.ts
│       ├── Dockerfile
│       ├── next.config.ts
│       ├── postcss.config.mjs
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       ├── components.json                       # shadcn/ui config
│       └── package.json
├── packages/
│   ├── collector/
│   │   ├── src/
│   │   │   ├── index.ts                          # CLI entry point
│   │   │   ├── commands/init.ts
│   │   │   ├── commands/sync.ts
│   │   │   ├── parsers/sessions.ts
│   │   │   ├── parsers/tokens.ts
│   │   │   ├── parsers/skills.ts
│   │   │   ├── parsers/subagents.ts
│   │   │   └── client/api.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── shared/
│       ├── src/
│       │   ├── index.ts
│       │   ├── types.ts                          # Aggregate type definitions
│       │   ├── schemas.ts                        # Zod schemas for API
│       │   └── pricing.ts                        # Model pricing constants
│       ├── tsconfig.json
│       └── package.json
├── turbo.json
├── package.json
├── docker-compose.yml                            # Local dev: PostgreSQL
└── .env.example
```

---

## Task 1: Monorepo Scaffold

**Files:**
- Create: `package.json`
- Create: `turbo.json`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `apps/dashboard/package.json`
- Create: `apps/dashboard/tsconfig.json`
- Create: `.env.example`
- Create: `docker-compose.yml`
- Create: `.gitignore`

- [ ] **Step 1: Create root package.json with Turborepo**

```json
{
  "name": "claude-analysis",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "db:push": "turbo db:push",
    "db:seed": "turbo db:seed"
  },
  "devDependencies": {
    "turbo": "^2"
  }
}
```

- [ ] **Step 2: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "db:push": {
      "cache": false
    },
    "db:seed": {
      "cache": false
    }
  }
}
```

- [ ] **Step 3: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 4: Create shared package**

`packages/shared/package.json`:
```json
{
  "name": "@claude-analysis/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.24"
  },
  "devDependencies": {
    "typescript": "^5.7"
  }
}
```

`packages/shared/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

`packages/shared/src/index.ts`:
```ts
export * from "./types";
export * from "./schemas";
export * from "./pricing";
```

- [ ] **Step 5: Scaffold Next.js dashboard app**

Run:
```bash
cd apps && pnpm create next-app dashboard --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack
```

Then update `apps/dashboard/package.json` to add workspace dependency:
```json
{
  "dependencies": {
    "@claude-analysis/shared": "workspace:*"
  }
}
```

- [ ] **Step 6: Create docker-compose.yml for local PostgreSQL**

```yaml
services:
  postgres:
    image: postgres:17
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: claude_analysis
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

- [ ] **Step 7: Create .env.example**

```
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/claude_analysis

# Auth.js
AUTH_SECRET=generate-with-openssl-rand-base64-32
AUTH_GITHUB_ID=your-github-oauth-app-id
AUTH_GITHUB_SECRET=your-github-oauth-app-secret

# App
NEXTAUTH_URL=http://localhost:3000
```

- [ ] **Step 8: Create .gitignore**

```
node_modules/
.next/
dist/
.env
.env.local
.turbo/
```

- [ ] **Step 9: Install dependencies and verify monorepo**

Run:
```bash
pnpm install
pnpm build
```
Expected: Build succeeds with no errors.

- [ ] **Step 10: Start local PostgreSQL**

Run:
```bash
docker compose up -d
```
Expected: PostgreSQL container running on port 5432.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: scaffold Turborepo monorepo with Next.js dashboard and shared package"
```

---

## Task 2: Shared Types, Schemas, and Pricing

**Files:**
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/schemas.ts`
- Create: `packages/shared/src/pricing.ts`

- [ ] **Step 1: Define aggregate types**

`packages/shared/src/types.ts`:
```ts
// -- Filter context (shared across all pages) --
export type FilterContext = {
  from: Date;
  to: Date;
  repo?: string;
};

// -- Dashboard aggregates --
export type TeamKpiAggregate = {
  sessionCount: number;
  totalTokens: number;
  skillInvocationCount: number;
  distributedSkillAdoptionRate: number;
  previousPeriod: {
    sessionCount: number;
    totalTokens: number;
    skillInvocationCount: number;
    distributedSkillAdoptionRate: number;
  };
};

export type DailyActivityEntry = {
  date: string;
  sessionCount: number;
  totalTokens: number;
};

export type SkillRankingEntry = {
  skillName: string;
  usageCount: number;
  userCount: number;
  isDistributed: boolean;
};

export type MemberSkillRateEntry = {
  userId: string;
  userName: string;
  avatarUrl: string;
  usedDistributedSkillCount: number;
  totalDistributedSkillCount: number;
};

// -- Members aggregates --
export type MemberListEntry = {
  userId: string;
  userName: string;
  avatarUrl: string;
  sessionCount: number;
  totalTokens: number;
  distributedSkillAdoptionRate: number;
  lastActivityAt: string | null;
};

export type MemberDetailAggregate = {
  user: { id: string; name: string; avatarUrl: string; email: string };
  kpi: {
    sessionCount: number;
    totalTokens: number;
    subagentInvocationCount: number;
    distributedSkillAdoptionRate: number;
    previousPeriod: {
      sessionCount: number;
      totalTokens: number;
      subagentInvocationCount: number;
      distributedSkillAdoptionRate: number;
    };
  };
  dailyTrend: { date: string; sessionCount: number; totalTokens: number; skillCount: number }[];
  skillRanking: { skillName: string; usageCount: number; isDistributed: boolean }[];
  projectBreakdown: { project: string; sessionCount: number }[];
  subagentBreakdown: { date: string; agentType: string; invocationCount: number }[];
  recentSessions: {
    sessionId: string;
    startedAt: string;
    endedAt: string | null;
    project: string;
    branch: string | null;
    totalTokens: number;
    skills: string[];
    subagentTypes: string[];
    linkedPrNumber: number | null;
  }[];
};

// -- Skills aggregates --
export type SkillKpiAggregate = {
  distributedSkillCount: number;
  adoptionRate: number;
  unusedSkillCount: number;
};

export type SkillHeatmapAggregate = {
  skills: string[];
  members: { userId: string; userName: string; avatarUrl: string }[];
  matrix: { skillName: string; userId: string; usageCount: number }[];
};

export type UnusedSkillEntry = {
  skillName: string;
  description: string | null;
  registeredAt: string;
};

export type SkillTrendEntry = {
  date: string;
  skillName: string;
  usageCount: number;
};

// -- PRs aggregates --
export type PrKpiAggregate = {
  totalPrCount: number;
  prsWithSkillsRate: number;
  avgSkillsPerPr: number;
};

export type PrListEntry = {
  prId: string;
  prNumber: number;
  title: string;
  author: string;
  branch: string;
  repoOwner: string;
  repoName: string;
  createdAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  uniqueSkillCount: number;
  totalTokens: number;
};

export type PrDetailAggregate = {
  pr: {
    prNumber: number;
    title: string;
    author: string;
    branch: string;
    repoOwner: string;
    repoName: string;
    createdAt: string;
    mergedAt: string | null;
  };
  skills: { skillName: string; usageCount: number; isDistributed: boolean }[];
  sessions: {
    sessionId: string;
    startedAt: string;
    endedAt: string | null;
    totalTokens: number;
    skillCount: number;
    subagentCount: number;
  }[];
};

// -- Cost aggregates --
export type CostKpiAggregate = {
  totalTokens: number;
  estimatedCostUsd: number;
  opusRatio: number;
  avgSessionCostUsd: number;
  previousPeriod: {
    totalTokens: number;
    estimatedCostUsd: number;
    opusRatio: number;
    avgSessionCostUsd: number;
  };
};

export type DailyCostEntry = {
  date: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
};

export type ModelBreakdownEntry = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
};

export type CostByUserEntry = {
  userId: string;
  userName: string;
  avatarUrl: string;
  sessionCount: number;
  models: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    cacheTokens: number;
  }[];
};

export type CostByProjectEntry = {
  project: string;
  sessionCount: number;
  models: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    cacheTokens: number;
  }[];
};

// -- Collect API payload --
export type CollectPayload = {
  sessions: {
    sessionId: string;
    project: string;
    branch: string | null;
    startedAt: string;
    endedAt: string | null;
    sessionKind: string;
  }[];
  tokenUsages: {
    sessionId: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cacheTokens: number;
  }[];
  skillUsages: {
    sessionId: string;
    skillName: string;
    invokedAt: string;
  }[];
  subagentUsages: {
    sessionId: string;
    agentType: string;
    toolCallsCount: number;
    tokensUsed: number;
  }[];
};
```

- [ ] **Step 2: Define Zod schemas for API validation**

`packages/shared/src/schemas.ts`:
```ts
import { z } from "zod";

const sessionSchema = z.object({
  sessionId: z.string(),
  project: z.string(),
  branch: z.string().nullable(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable(),
  sessionKind: z.string(),
});

const tokenUsageSchema = z.object({
  sessionId: z.string(),
  model: z.string(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cacheTokens: z.number().int().nonnegative(),
});

const skillUsageSchema = z.object({
  sessionId: z.string(),
  skillName: z.string(),
  invokedAt: z.string().datetime(),
});

const subagentUsageSchema = z.object({
  sessionId: z.string(),
  agentType: z.string(),
  toolCallsCount: z.number().int().nonnegative(),
  tokensUsed: z.number().int().nonnegative(),
});

export const collectPayloadSchema = z.object({
  sessions: z.array(sessionSchema),
  tokenUsages: z.array(tokenUsageSchema),
  skillUsages: z.array(skillUsageSchema),
  subagentUsages: z.array(subagentUsageSchema),
});

export const distributedSkillSchema = z.object({
  skillName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const repositorySchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
});
```

- [ ] **Step 3: Define model pricing constants**

`packages/shared/src/pricing.ts`:
```ts
export type ModelPricing = {
  inputPerMillion: number;
  outputPerMillion: number;
  cacheReadPerMillion: number;
};

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "claude-opus-4-6": {
    inputPerMillion: 15.0,
    outputPerMillion: 75.0,
    cacheReadPerMillion: 1.5,
  },
  "claude-sonnet-4-6": {
    inputPerMillion: 3.0,
    outputPerMillion: 15.0,
    cacheReadPerMillion: 0.3,
  },
  "claude-haiku-4-5": {
    inputPerMillion: 0.8,
    outputPerMillion: 4.0,
    cacheReadPerMillion: 0.08,
  },
};

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheTokens: number,
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  return (
    (inputTokens / 1_000_000) * pricing.inputPerMillion +
    (outputTokens / 1_000_000) * pricing.outputPerMillion +
    (cacheTokens / 1_000_000) * pricing.cacheReadPerMillion
  );
}
```

- [ ] **Step 4: Verify shared package builds**

Run:
```bash
cd packages/shared && pnpm lint
```
Expected: No TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/
git commit -m "feat: add shared types, Zod schemas, and model pricing"
```

---

## Task 3: Database Schema

**Files:**
- Create: `apps/dashboard/lib/db/schema.ts`
- Create: `apps/dashboard/lib/db/index.ts`
- Create: `apps/dashboard/drizzle.config.ts`

- [ ] **Step 1: Install Drizzle dependencies**

Run:
```bash
cd apps/dashboard && pnpm add drizzle-orm postgres && pnpm add -D drizzle-kit
```

- [ ] **Step 2: Define all table schemas**

`apps/dashboard/lib/db/schema.ts`:
```ts
import { pgTable, uuid, text, integer, timestamp, bigint, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  githubId: text("github_id").notNull().unique(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url").notNull(),
  email: text("email"),
  role: text("role").default("member"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalId: text("external_id").notNull().unique(),
  userId: uuid("user_id").notNull().references(() => users.id),
  project: text("project").notNull(),
  branch: text("branch"),
  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at"),
  sessionKind: text("session_kind").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tokenUsages = pgTable("token_usages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => sessions.id),
  model: text("model").notNull(),
  inputTokens: bigint("input_tokens", { mode: "number" }).notNull(),
  outputTokens: bigint("output_tokens", { mode: "number" }).notNull(),
  cacheTokens: bigint("cache_tokens", { mode: "number" }).notNull(),
});

export const skillUsages = pgTable("skill_usages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => sessions.id),
  skillName: text("skill_name").notNull(),
  invokedAt: timestamp("invoked_at").notNull(),
});

export const subagentUsages = pgTable("subagent_usages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => sessions.id),
  agentType: text("agent_type").notNull(),
  toolCallsCount: integer("tool_calls_count").notNull(),
  tokensUsed: bigint("tokens_used", { mode: "number" }).notNull(),
});

export const repositories = pgTable("repositories", {
  id: uuid("id").primaryKey().defaultRandom(),
  owner: text("owner").notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("repositories_owner_name_idx").on(table.owner, table.name),
]);

export const pullRequests = pgTable("pull_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  repositoryId: uuid("repository_id").notNull().references(() => repositories.id),
  prNumber: integer("pr_number").notNull(),
  branch: text("branch").notNull(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  createdAt: timestamp("created_at").notNull(),
  mergedAt: timestamp("merged_at"),
  closedAt: timestamp("closed_at"),
});

export const prSessions = pgTable("pr_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  pullRequestId: uuid("pull_request_id").notNull().references(() => pullRequests.id),
  sessionId: uuid("session_id").notNull().references(() => sessions.id),
});

export const distributedSkills = pgTable("distributed_skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  skillName: text("skill_name").notNull().unique(),
  description: text("description"),
  registeredAt: timestamp("registered_at").defaultNow().notNull(),
});

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
});
```

- [ ] **Step 3: Create Drizzle client**

`apps/dashboard/lib/db/index.ts`:
```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
```

- [ ] **Step 4: Create Drizzle config**

`apps/dashboard/drizzle.config.ts`:
```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 5: Add db scripts to dashboard package.json**

Add to `apps/dashboard/package.json` scripts:
```json
{
  "scripts": {
    "db:push": "drizzle-kit push",
    "db:seed": "tsx lib/db/seed.ts",
    "db:studio": "drizzle-kit studio"
  }
}
```

- [ ] **Step 6: Push schema to database**

Run:
```bash
cp .env.example apps/dashboard/.env.local
cd apps/dashboard && pnpm db:push
```
Expected: All tables created successfully.

- [ ] **Step 7: Commit**

```bash
git add apps/dashboard/lib/db/ apps/dashboard/drizzle.config.ts apps/dashboard/package.json
git commit -m "feat: add Drizzle ORM schema with all tables"
```

---

## Task 4: Authentication (Auth.js + GitHub OAuth)

**Files:**
- Create: `apps/dashboard/lib/auth.ts`
- Create: `apps/dashboard/app/api/auth/[...nextauth]/route.ts`
- Create: `apps/dashboard/app/(auth)/login/page.tsx`
- Modify: `apps/dashboard/app/layout.tsx`
- Create: `apps/dashboard/middleware.ts`

- [ ] **Step 1: Install Auth.js**

Run:
```bash
cd apps/dashboard && pnpm add next-auth@beta
```

- [ ] **Step 2: Create Auth.js config**

`apps/dashboard/lib/auth.ts`:
```ts
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [GitHub],
  pages: {
    signIn: "/login",
  },
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
          name: user.name ?? profile.login ?? "Unknown",
          avatarUrl: user.image ?? "",
          email: user.email,
        });
      } else {
        await db
          .update(users)
          .set({
            name: user.name ?? profile.login ?? existing.name,
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
        if (dbUser) {
          token.userId = dbUser.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
});
```

- [ ] **Step 3: Create API route**

`apps/dashboard/app/api/auth/[...nextauth]/route.ts`:
```ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 4: Create middleware for auth protection**

`apps/dashboard/middleware.ts`:
```ts
export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/((?!login|api/auth|api/collect|_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 5: Create login page**

`apps/dashboard/app/(auth)/login/page.tsx`:
```tsx
import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold">Claude Analysis</h1>
        <p className="text-muted-foreground">
          チームのClaude Code使用状況を可視化するダッシュボード
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90"
          >
            GitHubでログイン
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Update root layout**

`apps/dashboard/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Claude Analysis",
  description: "Claude Code Usage Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 7: Verify login page renders**

Run:
```bash
cd apps/dashboard && pnpm dev
```
Open: `http://localhost:3000/login`
Expected: Login page displays with "GitHubでログイン" button.

- [ ] **Step 8: Commit**

```bash
git add apps/dashboard/lib/auth.ts apps/dashboard/app/api/auth/ apps/dashboard/app/\(auth\)/ apps/dashboard/middleware.ts apps/dashboard/app/layout.tsx
git commit -m "feat: add GitHub OAuth authentication with Auth.js"
```

---

## Task 5: shadcn/ui Setup + Common Layout

**Files:**
- Create: `apps/dashboard/components/ui/*` (shadcn components)
- Create: `apps/dashboard/components/layout/sidebar.tsx`
- Create: `apps/dashboard/components/layout/sidebar-nav.tsx`
- Create: `apps/dashboard/components/layout/repository-selector.tsx`
- Create: `apps/dashboard/components/layout/sidebar-user-menu.tsx`
- Create: `apps/dashboard/components/layout/header.tsx`
- Create: `apps/dashboard/components/layout/date-range-picker.tsx`
- Create: `apps/dashboard/app/(app)/layout.tsx`
- Create: `apps/dashboard/lib/search-params.ts`

- [ ] **Step 1: Initialize shadcn/ui**

Run:
```bash
cd apps/dashboard && pnpm dlx shadcn@latest init -d
```

- [ ] **Step 2: Add required shadcn components**

Run:
```bash
pnpm dlx shadcn@latest add button card dropdown-menu avatar popover calendar select separator badge table skeleton tabs dialog input label tooltip
```

- [ ] **Step 3: Create URL search params helper**

`apps/dashboard/lib/search-params.ts`:
```ts
import { subDays, format } from "date-fns";

export type SearchParams = {
  from?: string;
  to?: string;
  repo?: string;
};

export function parseSearchParams(params: SearchParams) {
  const today = new Date();
  const from = params.from ? new Date(params.from) : subDays(today, 30);
  const to = params.to ? new Date(params.to) : today;
  const repo = params.repo ?? undefined;
  return { from, to, repo };
}

export function formatDateParam(date: Date): string {
  return format(date, "yyyy-MM-dd");
}
```

Install date-fns:
```bash
pnpm add date-fns
```

- [ ] **Step 4: Create sidebar-nav component**

`apps/dashboard/components/layout/sidebar-nav.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Zap, GitPullRequest, DollarSign, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Members", href: "/members", icon: Users },
  { label: "Skills", href: "/skills", icon: Zap },
  { label: "PRs", href: "/prs", icon: GitPullRequest },
  { label: "Cost", href: "/cost", icon: DollarSign },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

Install lucide-react:
```bash
pnpm add lucide-react
```

- [ ] **Step 5: Create repository-selector component**

`apps/dashboard/components/layout/repository-selector.tsx`:
```tsx
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Repository = { id: string; owner: string; name: string };

export function RepositorySelector({ repositories }: { repositories: Repository[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentRepo = searchParams.get("repo") ?? "all";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("repo");
    } else {
      params.set("repo", value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-2">
      <p className="px-3 text-xs font-semibold uppercase text-muted-foreground">Repository</p>
      <Select value={currentRepo} onValueChange={handleChange}>
        <SelectTrigger className="mx-2">
          <SelectValue placeholder="All repositories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All repositories</SelectItem>
          {repositories.map((repo) => (
            <SelectItem key={repo.id} value={`${repo.owner}/${repo.name}`}>
              {repo.owner}/{repo.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

- [ ] **Step 6: Create sidebar-user-menu component**

`apps/dashboard/components/layout/sidebar-user-menu.tsx`:
```tsx
import { auth, signOut } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { Settings } from "lucide-react";

export async function SidebarUserMenu() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <div className="space-y-2">
      <Link
        href="/settings"
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <Settings className="h-4 w-4" />
        Settings
      </Link>
      <div className="flex items-center gap-3 px-3 py-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={session.user.image ?? ""} />
          <AvatarFallback>{session.user.name?.[0] ?? "?"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{session.user.name}</p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" className="text-xs text-muted-foreground hover:text-foreground">
            Logout
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create sidebar component**

`apps/dashboard/components/layout/sidebar.tsx`:
```tsx
import { SidebarNav } from "./sidebar-nav";
import { RepositorySelector } from "./repository-selector";
import { SidebarUserMenu } from "./sidebar-user-menu";
import { db } from "@/lib/db";
import { repositories } from "@/lib/db/schema";

export async function Sidebar() {
  const repos = await db.select().from(repositories);

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-background">
      <div className="p-4">
        <h1 className="text-lg font-bold">Claude Analysis</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-2">
        <SidebarNav />
        <div className="mt-6">
          <RepositorySelector repositories={repos} />
        </div>
      </div>
      <div className="border-t p-2">
        <SidebarUserMenu />
      </div>
    </aside>
  );
}
```

- [ ] **Step 8: Create date-range-picker component**

`apps/dashboard/components/layout/date-range-picker.tsx`:
```tsx
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format, subDays } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

const presets = [
  { label: "7日", days: 7 },
  { label: "30日", days: 30 },
  { label: "90日", days: 90 },
];

export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const today = new Date();
  const from = fromParam ? new Date(fromParam) : subDays(today, 30);
  const to = toParam ? new Date(toParam) : today;

  const [range, setRange] = useState<DateRange | undefined>({ from, to });

  function applyRange(newFrom: Date, newTo: Date) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", format(newFrom, "yyyy-MM-dd"));
    params.set("to", format(newTo, "yyyy-MM-dd"));
    router.push(`${pathname}?${params.toString()}`);
  }

  function handlePreset(days: string) {
    const d = Number(days);
    const newFrom = subDays(today, d);
    setRange({ from: newFrom, to: today });
    applyRange(newFrom, today);
  }

  return (
    <div className="flex items-center gap-2">
      <Select onValueChange={handlePreset}>
        <SelectTrigger className="w-24">
          <SelectValue placeholder="期間" />
        </SelectTrigger>
        <SelectContent>
          {presets.map((p) => (
            <SelectItem key={p.days} value={String(p.days)}>
              直近{p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            {range?.from && range?.to
              ? `${format(range.from, "MM/dd")} - ${format(range.to, "MM/dd")}`
              : "期間を選択"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={range}
            onSelect={(newRange) => {
              setRange(newRange);
              if (newRange?.from && newRange?.to) {
                applyRange(newRange.from, newRange.to);
              }
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
```

- [ ] **Step 9: Create header component**

`apps/dashboard/components/layout/header.tsx`:
```tsx
import { DateRangePicker } from "./date-range-picker";

export function Header({ title }: { title: string }) {
  return (
    <header className="flex items-center justify-between border-b px-6 py-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      <DateRangePicker />
    </header>
  );
}
```

- [ ] **Step 10: Create authenticated app layout**

`apps/dashboard/app/(app)/layout.tsx`:
```tsx
import { Sidebar } from "@/components/layout/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
```

- [ ] **Step 11: Create placeholder dashboard page**

`apps/dashboard/app/(app)/dashboard/page.tsx`:
```tsx
import { Header } from "@/components/layout/header";

export default function DashboardPage() {
  return (
    <>
      <Header title="Dashboard" />
      <div className="p-6">
        <p className="text-muted-foreground">Dashboard coming soon...</p>
      </div>
    </>
  );
}
```

- [ ] **Step 12: Verify layout renders**

Run:
```bash
cd apps/dashboard && pnpm dev
```
Open: `http://localhost:3000/dashboard` (after authenticating)
Expected: Sidebar with navigation, header with date picker, placeholder content.

- [ ] **Step 13: Commit**

```bash
git add apps/dashboard/components/layout/ apps/dashboard/components/ui/ apps/dashboard/app/\(app\)/ apps/dashboard/lib/search-params.ts apps/dashboard/components.json
git commit -m "feat: add common layout with sidebar, header, date range picker"
```

---

## Task 6: Collect API Endpoint

**Files:**
- Create: `apps/dashboard/app/api/collect/route.ts`
- Create: `apps/dashboard/lib/db/queries/collect.ts`

- [ ] **Step 1: Create data ingestion query logic**

`apps/dashboard/lib/db/queries/collect.ts`:
```ts
import { db } from "@/lib/db";
import { sessions, tokenUsages, skillUsages, subagentUsages, apiKeys, prSessions, pullRequests } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { createHash } from "crypto";
import type { CollectPayload } from "@claude-analysis/shared";

export async function authenticateApiKey(key: string): Promise<string | null> {
  const hash = createHash("sha256").update(key).digest("hex");
  const result = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.keyHash, hash), isNull(apiKeys.revokedAt)),
  });
  return result?.userId ?? null;
}

export async function ingestData(userId: string, payload: CollectPayload) {
  // Upsert sessions
  for (const s of payload.sessions) {
    const existing = await db.query.sessions.findFirst({
      where: eq(sessions.externalId, s.sessionId),
    });
    if (existing) {
      await db
        .update(sessions)
        .set({
          endedAt: s.endedAt ? new Date(s.endedAt) : null,
        })
        .where(eq(sessions.externalId, s.sessionId));
    } else {
      await db.insert(sessions).values({
        externalId: s.sessionId,
        userId,
        project: s.project,
        branch: s.branch,
        startedAt: new Date(s.startedAt),
        endedAt: s.endedAt ? new Date(s.endedAt) : null,
        sessionKind: s.sessionKind,
      });
    }
  }

  // Get session ID mapping (external -> internal)
  const sessionMap = new Map<string, string>();
  for (const s of payload.sessions) {
    const row = await db.query.sessions.findFirst({
      where: eq(sessions.externalId, s.sessionId),
    });
    if (row) sessionMap.set(s.sessionId, row.id);
  }

  // Insert token usages
  for (const t of payload.tokenUsages) {
    const sessionId = sessionMap.get(t.sessionId);
    if (!sessionId) continue;
    await db.insert(tokenUsages).values({
      sessionId,
      model: t.model,
      inputTokens: t.inputTokens,
      outputTokens: t.outputTokens,
      cacheTokens: t.cacheTokens,
    });
  }

  // Insert skill usages
  for (const s of payload.skillUsages) {
    const sessionId = sessionMap.get(s.sessionId);
    if (!sessionId) continue;
    await db.insert(skillUsages).values({
      sessionId,
      skillName: s.skillName,
      invokedAt: new Date(s.invokedAt),
    });
  }

  // Insert subagent usages
  for (const s of payload.subagentUsages) {
    const sessionId = sessionMap.get(s.sessionId);
    if (!sessionId) continue;
    await db.insert(subagentUsages).values({
      sessionId,
      agentType: s.agentType,
      toolCallsCount: s.toolCallsCount,
      tokensUsed: s.tokensUsed,
    });
  }

  // Link sessions to PRs by branch name
  for (const s of payload.sessions) {
    if (!s.branch) continue;
    const sessionId = sessionMap.get(s.sessionId);
    if (!sessionId) continue;

    const matchingPrs = await db
      .select()
      .from(pullRequests)
      .where(eq(pullRequests.branch, s.branch));

    for (const pr of matchingPrs) {
      const existingLink = await db.query.prSessions.findFirst({
        where: and(
          eq(prSessions.pullRequestId, pr.id),
          eq(prSessions.sessionId, sessionId),
        ),
      });
      if (!existingLink) {
        await db.insert(prSessions).values({
          pullRequestId: pr.id,
          sessionId,
        });
      }
    }
  }
}
```

- [ ] **Step 2: Create collect API route**

`apps/dashboard/app/api/collect/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { collectPayloadSchema } from "@claude-analysis/shared";
import { authenticateApiKey, ingestData } from "@/lib/db/queries/collect";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
  }

  const apiKey = authHeader.slice(7);
  const userId = await authenticateApiKey(apiKey);
  if (!userId) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const body = await req.json();
  const result = collectPayloadSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid payload", details: result.error.issues }, { status: 400 });
  }

  await ingestData(userId, result.data);

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verify endpoint responds**

Run:
```bash
curl -X POST http://localhost:3000/api/collect \
  -H "Content-Type: application/json" \
  -d '{}' -w "\n%{http_code}"
```
Expected: `401` (no auth header).

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/app/api/collect/ apps/dashboard/lib/db/queries/collect.ts
git commit -m "feat: add data collection API endpoint with API key auth"
```

---

## Task 7: Settings Page (API Keys + Repository Management)

**Files:**
- Create: `apps/dashboard/app/(app)/settings/page.tsx`
- Create: `apps/dashboard/components/settings/profile-section.tsx`
- Create: `apps/dashboard/components/settings/api-key-section.tsx`
- Create: `apps/dashboard/components/settings/repository-section.tsx`
- Create: `apps/dashboard/lib/db/queries/settings.ts`

- [ ] **Step 1: Create settings query functions**

`apps/dashboard/lib/db/queries/settings.ts`:
```ts
import { db } from "@/lib/db";
import { apiKeys, repositories } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";

export async function getApiKey(userId: string) {
  return db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)),
  });
}

export async function generateApiKey(userId: string) {
  // Revoke existing keys
  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)));

  // Generate new key
  const rawKey = `ca_${randomBytes(32).toString("hex")}`;
  const hash = createHash("sha256").update(rawKey).digest("hex");
  const prefix = rawKey.slice(0, 7);

  await db.insert(apiKeys).values({
    userId,
    keyHash: hash,
    keyPrefix: prefix,
  });

  return rawKey; // Only returned once
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
```

- [ ] **Step 2: Create profile section component**

`apps/dashboard/components/settings/profile-section.tsx`:
```tsx
import { auth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function ProfileSection() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>プロフィール</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={session.user.image ?? ""} />
          <AvatarFallback>{session.user.name?.[0]}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-lg font-medium">{session.user.name}</p>
          <p className="text-sm text-muted-foreground">{session.user.email}</p>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Create API key section component**

`apps/dashboard/components/settings/api-key-section.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ApiKeyInfo = { keyPrefix: string; createdAt: string } | null;

export function ApiKeySection({
  initialKey,
  generateAction,
}: {
  initialKey: ApiKeyInfo;
  generateAction: () => Promise<string>;
}) {
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyInfo, setKeyInfo] = useState(initialKey);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    const key = await generateAction();
    setNewKey(key);
    setKeyInfo({ keyPrefix: key.slice(0, 7), createdAt: new Date().toISOString() });
  }

  function handleCopy() {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>APIキー</CardTitle>
        <CardDescription>Collector CLIの認証に使用します</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {newKey ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-green-600">新しいキーが生成されました（この画面でのみ表示）:</p>
            <code className="block rounded bg-muted p-3 text-sm break-all">{newKey}</code>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? "コピーしました" : "コピー"}
            </Button>
          </div>
        ) : keyInfo ? (
          <div className="text-sm">
            <p>現在のキー: <code>{keyInfo.keyPrefix}****...****</code></p>
            <p className="text-muted-foreground">作成日: {new Date(keyInfo.createdAt).toLocaleDateString("ja-JP")}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">APIキーがまだ生成されていません。</p>
        )}
        <Button onClick={handleGenerate}>
          {keyInfo ? "キーを再生成" : "キーを生成"}
        </Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Create repository section component**

`apps/dashboard/components/settings/repository-section.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";

type Repository = { id: string; owner: string; name: string };

export function RepositorySection({
  initialRepos,
  addAction,
  deleteAction,
}: {
  initialRepos: Repository[];
  addAction: (owner: string, name: string) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;
}) {
  const [repos, setRepos] = useState(initialRepos);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);

  async function handleAdd() {
    const parts = input.split("/");
    if (parts.length !== 2) return;
    const [owner, name] = parts;
    await addAction(owner, name);
    setRepos([...repos, { id: crypto.randomUUID(), owner, name }]);
    setInput("");
    setOpen(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("このリポジトリを削除しますか？")) return;
    await deleteAction(id);
    setRepos(repos.filter((r) => r.id !== id));
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>リポジトリ</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">+ リポジトリを追加</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>リポジトリを追加</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="owner/repo-name"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <Button onClick={handleAdd} disabled={!input.includes("/")}>
                追加
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {repos.length === 0 ? (
          <p className="text-sm text-muted-foreground">リポジトリが登録されていません。</p>
        ) : (
          <ul className="space-y-2">
            {repos.map((repo) => (
              <li key={repo.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className="text-sm">{repo.owner}/{repo.name}</span>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(repo.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Create settings page with server actions**

`apps/dashboard/app/(app)/settings/page.tsx`:
```tsx
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { ProfileSection } from "@/components/settings/profile-section";
import { ApiKeySection } from "@/components/settings/api-key-section";
import { RepositorySection } from "@/components/settings/repository-section";
import {
  getApiKey,
  generateApiKey,
  getRepositories,
  addRepository,
  deleteRepository,
} from "@/lib/db/queries/settings";

export default async function SettingsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const existingKey = await getApiKey(userId);
  const repos = await getRepositories();

  async function handleGenerateKey() {
    "use server";
    const s = await auth();
    return generateApiKey(s!.user!.id!);
  }

  async function handleAddRepo(owner: string, name: string) {
    "use server";
    await addRepository(owner, name);
  }

  async function handleDeleteRepo(id: string) {
    "use server";
    await deleteRepository(id);
  }

  return (
    <>
      <Header title="Settings" />
      <div className="max-w-2xl space-y-6 p-6">
        <ProfileSection />
        <ApiKeySection
          initialKey={
            existingKey
              ? { keyPrefix: existingKey.keyPrefix, createdAt: existingKey.createdAt.toISOString() }
              : null
          }
          generateAction={handleGenerateKey}
        />
        <RepositorySection
          initialRepos={repos}
          addAction={handleAddRepo}
          deleteAction={handleDeleteRepo}
        />
      </div>
    </>
  );
}
```

- [ ] **Step 6: Verify settings page**

Open: `http://localhost:3000/settings`
Expected: Profile, API key management, and repository management sections render.

- [ ] **Step 7: Commit**

```bash
git add apps/dashboard/app/\(app\)/settings/ apps/dashboard/components/settings/ apps/dashboard/lib/db/queries/settings.ts
git commit -m "feat: add settings page with API key and repository management"
```

---

## Task 8: Database Seed Data

**Files:**
- Create: `apps/dashboard/lib/db/seed.ts`

- [ ] **Step 1: Create seed script**

`apps/dashboard/lib/db/seed.ts`:
```ts
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

async function seed() {
  console.log("Seeding database...");

  // Users
  const [user1] = await db
    .insert(users)
    .values([
      { githubId: "1001", name: "Alice", avatarUrl: "https://avatars.githubusercontent.com/u/1001", email: "alice@example.com" },
      { githubId: "1002", name: "Bob", avatarUrl: "https://avatars.githubusercontent.com/u/1002", email: "bob@example.com" },
      { githubId: "1003", name: "Charlie", avatarUrl: "https://avatars.githubusercontent.com/u/1003", email: "charlie@example.com" },
    ])
    .returning();

  const allUsers = await db.select().from(users);

  // Distributed skills
  await db.insert(distributedSkills).values([
    { skillName: "brainstorming", description: "アイデアをデザインに変換" },
    { skillName: "debugging", description: "バグの調査と修正" },
    { skillName: "tdd", description: "テスト駆動開発" },
    { skillName: "code-reviewer", description: "コードレビューの自動化" },
    { skillName: "writing-plans", description: "実装計画の作成" },
  ]);

  // Repositories
  const [repo1] = await db
    .insert(repositories)
    .values([
      { owner: "myorg", name: "frontend", url: "https://github.com/myorg/frontend" },
      { owner: "myorg", name: "backend", url: "https://github.com/myorg/backend" },
    ])
    .returning();

  const allRepos = await db.select().from(repositories);

  // Generate sessions and related data for the past 60 days
  const now = new Date();
  const models = ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5"];
  const branches = ["feature/auth", "feature/dashboard", "fix/bug-123", "refactor/api", null];
  const skills = ["brainstorming", "debugging", "tdd", "code-reviewer", "writing-plans", "frontend-design"];
  const agentTypes = ["Explore", "Plan", "code-reviewer", "general-purpose"];

  for (const user of allUsers) {
    const sessionCount = 30 + Math.floor(Math.random() * 30);
    for (let i = 0; i < sessionCount; i++) {
      const startedAt = subDays(now, Math.floor(Math.random() * 60));
      const endedAt = addHours(startedAt, Math.random() * 3);
      const branch = branches[Math.floor(Math.random() * branches.length)];
      const project = Math.random() > 0.5 ? "/Users/dev/myorg/frontend" : "/Users/dev/myorg/backend";

      const [session] = await db
        .insert(sessions)
        .values({
          externalId: `${user.id}-session-${i}`,
          userId: user.id,
          project,
          branch,
          startedAt,
          endedAt,
          sessionKind: "interactive",
        })
        .returning();

      // Token usages
      const model = models[Math.floor(Math.random() * models.length)];
      await db.insert(tokenUsages).values({
        sessionId: session.id,
        model,
        inputTokens: Math.floor(Math.random() * 50000),
        outputTokens: Math.floor(Math.random() * 20000),
        cacheTokens: Math.floor(Math.random() * 30000),
      });

      // Skill usages (0-3 per session)
      const skillCount = Math.floor(Math.random() * 4);
      for (let j = 0; j < skillCount; j++) {
        await db.insert(skillUsages).values({
          sessionId: session.id,
          skillName: skills[Math.floor(Math.random() * skills.length)],
          invokedAt: addHours(startedAt, Math.random() * 2),
        });
      }

      // Subagent usages (0-2 per session)
      const agentCount = Math.floor(Math.random() * 3);
      for (let j = 0; j < agentCount; j++) {
        await db.insert(subagentUsages).values({
          sessionId: session.id,
          agentType: agentTypes[Math.floor(Math.random() * agentTypes.length)],
          toolCallsCount: Math.floor(Math.random() * 20),
          tokensUsed: Math.floor(Math.random() * 10000),
        });
      }
    }
  }

  // Pull requests
  const prBranches = ["feature/auth", "feature/dashboard", "fix/bug-123", "refactor/api"];
  for (const repo of allRepos) {
    for (let i = 1; i <= 10; i++) {
      const branch = prBranches[Math.floor(Math.random() * prBranches.length)];
      const createdAt = subDays(now, Math.floor(Math.random() * 60));
      const merged = Math.random() > 0.3;

      const [pr] = await db
        .insert(pullRequests)
        .values({
          repositoryId: repo.id,
          prNumber: i,
          branch,
          title: `PR #${i}: ${branch.replace("/", " ")}`,
          author: allUsers[Math.floor(Math.random() * allUsers.length)].name,
          createdAt,
          mergedAt: merged ? addHours(createdAt, 24 + Math.random() * 48) : null,
        })
        .returning();

      // Link sessions to PRs by branch
      const matchingSessions = await db
        .select()
        .from(sessions)
        .where(
          // Simple: link sessions with matching branch
          require("drizzle-orm").eq(sessions.branch, branch),
        );

      for (const s of matchingSessions.slice(0, 3)) {
        await db.insert(prSessions).values({
          pullRequestId: pr.id,
          sessionId: s.id,
        }).onConflictDoNothing();
      }
    }
  }

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch(console.error);
```

Install tsx:
```bash
cd apps/dashboard && pnpm add -D tsx
```

- [ ] **Step 2: Run seed**

Run:
```bash
cd apps/dashboard && pnpm db:seed
```
Expected: "Seed complete!" output.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/lib/db/seed.ts
git commit -m "feat: add database seed script with sample data"
```

---

## Task 9: Dashboard Page

**Files:**
- Create: `apps/dashboard/lib/db/queries/dashboard.ts`
- Create: `apps/dashboard/components/dashboard/kpi-cards.tsx`
- Create: `apps/dashboard/components/dashboard/daily-activity-chart.tsx`
- Create: `apps/dashboard/components/dashboard/skill-ranking.tsx`
- Create: `apps/dashboard/components/dashboard/member-skill-chart.tsx`
- Modify: `apps/dashboard/app/(app)/dashboard/page.tsx`
- Create: `apps/dashboard/app/(app)/dashboard/loading.tsx`

Install Recharts:
```bash
cd apps/dashboard && pnpm add recharts
```

- [ ] **Step 1: Create dashboard query functions**

`apps/dashboard/lib/db/queries/dashboard.ts` — Implement `getTeamKpi`, `getDailyActivity`, `getSkillRanking`, `getMemberSkillRates` using Drizzle ORM with the SQL queries defined in `docs/superpowers/specs/pages/01-dashboard.md`.

Each function accepts `(from: Date, to: Date, repo?: string)` and returns the aggregate type from `@claude-analysis/shared`.

- [ ] **Step 2: Create KpiCards component**

`apps/dashboard/components/dashboard/kpi-cards.tsx` — Server component displaying 4 KPI cards (sessions, tokens, skill invocations, adoption rate) with previous period comparison (green ↑ / red ↓).

- [ ] **Step 3: Create DailyActivityChart component**

`apps/dashboard/components/dashboard/daily-activity-chart.tsx` — Client component using Recharts `ComposedChart` with dual Y-axes (sessions left, tokens right as thousands).

- [ ] **Step 4: Create SkillRanking component**

`apps/dashboard/components/dashboard/skill-ranking.tsx` — Client component using Recharts `BarChart` (horizontal) showing Top 10 skills, color-coded (blue=distributed, grey=other).

- [ ] **Step 5: Create MemberSkillChart component**

`apps/dashboard/components/dashboard/member-skill-chart.tsx` — Client component using Recharts `BarChart` (horizontal) showing per-member adoption rates with gradient coloring.

- [ ] **Step 6: Wire up dashboard page**

Update `apps/dashboard/app/(app)/dashboard/page.tsx` to use Server Component pattern: fetch data in the page, pass as props to chart components.

- [ ] **Step 7: Create loading.tsx skeleton**

`apps/dashboard/app/(app)/dashboard/loading.tsx` — Skeleton UI with card placeholders and chart area placeholders.

- [ ] **Step 8: Verify dashboard page**

Open: `http://localhost:3000/dashboard`
Expected: KPI cards with numbers, activity chart, skill ranking, member skill rates all render with seed data.

- [ ] **Step 9: Commit**

```bash
git add apps/dashboard/lib/db/queries/dashboard.ts apps/dashboard/components/dashboard/ apps/dashboard/app/\(app\)/dashboard/
git commit -m "feat: implement dashboard page with KPIs, activity chart, skill ranking"
```

---

## Task 10: Members List Page

**Files:**
- Create: `apps/dashboard/lib/db/queries/members.ts`
- Create: `apps/dashboard/app/(app)/members/page.tsx`
- Create: `apps/dashboard/app/(app)/members/loading.tsx`

- [ ] **Step 1: Create member list query**

`apps/dashboard/lib/db/queries/members.ts` — Implement `getMemberList(from, to, limit, offset)` returning `MemberListEntry[]`.

- [ ] **Step 2: Create members list page**

`apps/dashboard/app/(app)/members/page.tsx` — Server component with search bar (client), sortable table, pagination. Links to `/members/[userId]`.

- [ ] **Step 3: Create loading skeleton**

- [ ] **Step 4: Verify and commit**

```bash
git add apps/dashboard/lib/db/queries/members.ts apps/dashboard/app/\(app\)/members/
git commit -m "feat: implement members list page with search and pagination"
```

---

## Task 11: Member Detail Page

**Files:**
- Create: `apps/dashboard/app/(app)/members/[userId]/page.tsx`
- Create: `apps/dashboard/app/(app)/members/[userId]/loading.tsx`
- Create: `apps/dashboard/components/members/member-header.tsx`
- Create: `apps/dashboard/components/members/member-kpi-cards.tsx`
- Create: `apps/dashboard/components/members/usage-trend-chart.tsx`
- Create: `apps/dashboard/components/members/member-skill-ranking.tsx`
- Create: `apps/dashboard/components/members/project-breakdown.tsx`
- Create: `apps/dashboard/components/members/subagent-chart.tsx`
- Create: `apps/dashboard/components/members/recent-sessions.tsx`

- [ ] **Step 1: Add member detail queries to members.ts**

Add `getMemberDetail(userId, from, to)` returning `MemberDetailAggregate`.

- [ ] **Step 2: Create member-header component**

Avatar, name, email, back link.

- [ ] **Step 3: Create member-kpi-cards component**

4 KPI cards with previous period comparison.

- [ ] **Step 4: Create usage-trend-chart component**

Client component with tab switching (sessions/tokens/skills) using Recharts `LineChart`.

- [ ] **Step 5: Create member-skill-ranking component**

Horizontal bar chart of personal skill usage.

- [ ] **Step 6: Create project-breakdown component**

Recharts `PieChart` (donut) showing project distribution.

- [ ] **Step 7: Create subagent-chart component**

Recharts stacked `BarChart` by agent type per day.

- [ ] **Step 8: Create recent-sessions component**

Table with "load more" button. Skill/subagent badges.

- [ ] **Step 9: Wire up member detail page**

- [ ] **Step 10: Verify and commit**

```bash
git add apps/dashboard/app/\(app\)/members/\[userId\]/ apps/dashboard/components/members/
git commit -m "feat: implement member detail page with charts and session list"
```

---

## Task 12: Skills Page

**Files:**
- Create: `apps/dashboard/lib/db/queries/skills.ts`
- Create: `apps/dashboard/components/skills/skill-kpi-cards.tsx`
- Create: `apps/dashboard/components/skills/skill-heatmap.tsx`
- Create: `apps/dashboard/components/skills/unused-skills.tsx`
- Create: `apps/dashboard/components/skills/skill-trend-chart.tsx`
- Create: `apps/dashboard/components/skills/skill-management.tsx`
- Create: `apps/dashboard/app/(app)/skills/page.tsx`
- Create: `apps/dashboard/app/(app)/skills/loading.tsx`

- [ ] **Step 1: Create skills query functions**

Implement `getSkillKpi`, `getSkillHeatmap`, `getUnusedSkills`, `getSkillTrend`, `getDistributedSkills`, and CRUD actions for distributed skills.

- [ ] **Step 2: Create skill-kpi-cards component**

3 KPI cards: distributed count, adoption rate, unused count.

- [ ] **Step 3: Create skill-heatmap component**

Client component rendering a CSS grid heatmap (skills x members), color intensity by usage count. Clickable skill names.

- [ ] **Step 4: Create unused-skills component**

Server component listing unused skills with warning icons.

- [ ] **Step 5: Create skill-trend-chart component**

Client component with Recharts `LineChart`, multiple series (Top 5 skills), legend toggle.

- [ ] **Step 6: Create skill-management component**

Client component with CRUD table, add/edit dialog, delete confirmation. Uses server actions.

- [ ] **Step 7: Wire up skills page with tabs**

Two tabs: "活用分析" (analysis) and "スキル管理" (management).

- [ ] **Step 8: Verify and commit**

```bash
git add apps/dashboard/lib/db/queries/skills.ts apps/dashboard/components/skills/ apps/dashboard/app/\(app\)/skills/
git commit -m "feat: implement skills page with heatmap, trends, and management"
```

---

## Task 13: PRs Page

**Files:**
- Create: `apps/dashboard/lib/db/queries/prs.ts`
- Create: `apps/dashboard/components/prs/pr-kpi-cards.tsx`
- Create: `apps/dashboard/components/prs/pr-filters.tsx`
- Create: `apps/dashboard/components/prs/pr-table.tsx`
- Create: `apps/dashboard/components/prs/pr-detail.tsx`
- Create: `apps/dashboard/app/(app)/prs/page.tsx`
- Create: `apps/dashboard/app/(app)/prs/loading.tsx`
- Create: `apps/dashboard/app/api/prs/[prId]/route.ts`

- [ ] **Step 1: Create PR query functions**

Implement `getPrKpi`, `getPrList` (with filters), `getPrDetail`.

- [ ] **Step 2: Create PR detail API route**

`apps/dashboard/app/api/prs/[prId]/route.ts` — Returns `PrDetailAggregate` for accordion expansion.

- [ ] **Step 3: Create pr-kpi-cards component**

3 KPI cards: total PRs, skill usage rate, avg skills per PR.

- [ ] **Step 4: Create pr-filters component**

Client component with search input (debounced) and status dropdown. Syncs with URL params.

- [ ] **Step 5: Create pr-table component**

Client component with sortable table, row click to expand accordion.

- [ ] **Step 6: Create pr-detail component**

Client component fetching from `/api/prs/[prId]` on expand. Shows PR info, skill badges, related sessions table.

- [ ] **Step 7: Wire up PRs page**

Server component fetching initial data, passing to client components.

- [ ] **Step 8: Verify and commit**

```bash
git add apps/dashboard/lib/db/queries/prs.ts apps/dashboard/components/prs/ apps/dashboard/app/\(app\)/prs/ apps/dashboard/app/api/prs/
git commit -m "feat: implement PRs page with filters, table, and detail expansion"
```

---

## Task 14: Cost Page

**Files:**
- Create: `apps/dashboard/lib/db/queries/cost.ts`
- Create: `apps/dashboard/components/cost/cost-kpi-cards.tsx`
- Create: `apps/dashboard/components/cost/daily-cost-chart.tsx`
- Create: `apps/dashboard/components/cost/model-breakdown.tsx`
- Create: `apps/dashboard/components/cost/io-breakdown.tsx`
- Create: `apps/dashboard/components/cost/cost-table.tsx`
- Create: `apps/dashboard/app/(app)/cost/page.tsx`
- Create: `apps/dashboard/app/(app)/cost/loading.tsx`

- [ ] **Step 1: Create cost query functions**

Implement `getCostKpi`, `getDailyCost`, `getModelBreakdown`, `getCostByUser`, `getCostByProject`. Use `calculateCost` from shared package for USD estimates.

- [ ] **Step 2: Create cost-kpi-cards component**

4 KPI cards: total tokens, estimated cost, Opus ratio, avg session cost.

- [ ] **Step 3: Create daily-cost-chart component**

Client component using Recharts `AreaChart` (stacked) with model color coding.

- [ ] **Step 4: Create model-breakdown component**

Client component using Recharts `PieChart` (donut) with token/cost toggle.

- [ ] **Step 5: Create io-breakdown component**

Client component using Recharts stacked `BarChart` (input/output/cache per model).

- [ ] **Step 6: Create cost-table component**

Client component with tabs (user/project), sortable table.

- [ ] **Step 7: Wire up cost page**

- [ ] **Step 8: Verify and commit**

```bash
git add apps/dashboard/lib/db/queries/cost.ts apps/dashboard/components/cost/ apps/dashboard/app/\(app\)/cost/
git commit -m "feat: implement cost analysis page with charts and breakdown tables"
```

---

## Task 15: Collector CLI

**Files:**
- Create: `packages/collector/package.json`
- Create: `packages/collector/tsconfig.json`
- Create: `packages/collector/src/index.ts`
- Create: `packages/collector/src/commands/init.ts`
- Create: `packages/collector/src/commands/sync.ts`
- Create: `packages/collector/src/parsers/sessions.ts`
- Create: `packages/collector/src/parsers/tokens.ts`
- Create: `packages/collector/src/parsers/skills.ts`
- Create: `packages/collector/src/parsers/subagents.ts`
- Create: `packages/collector/src/client/api.ts`

- [ ] **Step 1: Create collector package.json**

```json
{
  "name": "@claude-analysis/collector",
  "version": "0.0.1",
  "bin": { "claude-analysis-collector": "./dist/index.js" },
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@claude-analysis/shared": "workspace:*",
    "commander": "^13",
    "glob": "^11"
  },
  "devDependencies": {
    "tsup": "^8",
    "tsx": "^4",
    "typescript": "^5.7"
  }
}
```

- [ ] **Step 2: Create CLI entry point**

`packages/collector/src/index.ts`:
```ts
#!/usr/bin/env node
import { program } from "commander";
import { initCommand } from "./commands/init";
import { syncCommand } from "./commands/sync";

program.name("claude-analysis-collector").version("0.0.1");
program.command("init").description("Configure collector").action(initCommand);
program.command("sync").description("Sync data to dashboard").action(syncCommand);
program.parse();
```

- [ ] **Step 3: Create init command**

Interactive prompt to set serverUrl and apiKey, saves to `~/.claude-analysis.json`.

- [ ] **Step 4: Create session parser**

Reads `~/.claude/sessions/*.json`, extracts session metadata.

- [ ] **Step 5: Create token parser**

Reads `~/.claude/projects/*/` session JSONL files, extracts per-session token usage by model.

- [ ] **Step 6: Create skill parser**

Reads session JSONL files, extracts Skill tool invocations.

- [ ] **Step 7: Create subagent parser**

Reads subagent directories under `~/.claude/projects/*/`, extracts agent type and tool call counts.

- [ ] **Step 8: Create API client**

`packages/collector/src/client/api.ts` — Sends `CollectPayload` to `POST /api/collect` with API key auth.

- [ ] **Step 9: Create sync command**

Orchestrates parsers, builds payload, sends via API client. Tracks last sync timestamp for differential sync.

- [ ] **Step 10: Build and test CLI**

Run:
```bash
cd packages/collector && pnpm build && node dist/index.js --help
```
Expected: CLI help output showing `init` and `sync` commands.

- [ ] **Step 11: Commit**

```bash
git add packages/collector/
git commit -m "feat: implement collector CLI with parsers and sync command"
```

---

## Task 16: Docker Setup

**Files:**
- Create: `apps/dashboard/Dockerfile`

- [ ] **Step 1: Create multi-stage Dockerfile**

`apps/dashboard/Dockerfile`:
```dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/dashboard/package.json apps/dashboard/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/dashboard/node_modules ./apps/dashboard/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter dashboard build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/dashboard/public ./apps/dashboard/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/dashboard/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/dashboard/.next/static ./apps/dashboard/.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "apps/dashboard/server.js"]
```

- [ ] **Step 2: Add standalone output to next.config.ts**

```ts
const nextConfig = {
  output: "standalone",
};
export default nextConfig;
```

- [ ] **Step 3: Build and test Docker image**

Run:
```bash
docker build -t claude-analysis -f apps/dashboard/Dockerfile .
```
Expected: Image builds successfully.

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/Dockerfile apps/dashboard/next.config.ts
git commit -m "feat: add Docker multi-stage build for k8s deployment"
```

---

## Task 17: Final Integration Test

- [ ] **Step 1: Start all services**

```bash
docker compose up -d
cd apps/dashboard && pnpm db:push && pnpm db:seed && pnpm dev
```

- [ ] **Step 2: Verify all pages**

Navigate through each page and verify data renders:
1. `/login` — GitHub login button
2. `/dashboard` — KPIs, charts with seed data
3. `/members` — Member list with sorting
4. `/members/[userId]` — Detail page with all charts
5. `/skills` — Heatmap, trends, management tab
6. `/prs` — PR list with filters and detail expansion
7. `/cost` — Cost charts and tables
8. `/settings` — API key generation, repository management

- [ ] **Step 3: Test collector CLI**

```bash
cd packages/collector && pnpm dev init
cd packages/collector && pnpm dev sync
```
Expected: Data successfully sent to dashboard API.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Claude Code Usage Dashboard v1"
```
