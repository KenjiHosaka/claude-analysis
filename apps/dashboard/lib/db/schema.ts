import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  bigint,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  githubId: text("github_id").unique().notNull(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url").notNull(),
  email: text("email"),
  role: text("role").default("member"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalId: text("external_id").unique().notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  project: text("project").notNull(),
  branch: text("branch"),
  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at"),
  sessionKind: text("session_kind").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tokenUsages = pgTable("token_usages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .references(() => sessions.id)
    .notNull(),
  model: text("model").notNull(),
  inputTokens: bigint("input_tokens", { mode: "number" }).notNull(),
  outputTokens: bigint("output_tokens", { mode: "number" }).notNull(),
  cacheTokens: bigint("cache_tokens", { mode: "number" }).notNull(),
});

export const skillUsages = pgTable("skill_usages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .references(() => sessions.id)
    .notNull(),
  skillName: text("skill_name").notNull(),
  invokedAt: timestamp("invoked_at").notNull(),
});

export const subagentUsages = pgTable("subagent_usages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .references(() => sessions.id)
    .notNull(),
  agentType: text("agent_type").notNull(),
  toolCallsCount: integer("tool_calls_count").notNull(),
  tokensUsed: bigint("tokens_used", { mode: "number" }).notNull(),
});

export const repositories = pgTable(
  "repositories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    owner: text("owner").notNull(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("repositories_owner_name_idx").on(table.owner, table.name)]
);

export const pullRequests = pgTable("pull_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  repositoryId: uuid("repository_id")
    .references(() => repositories.id)
    .notNull(),
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
  pullRequestId: uuid("pull_request_id")
    .references(() => pullRequests.id)
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => sessions.id)
    .notNull(),
});

export const distributedSkills = pgTable("distributed_skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  skillName: text("skill_name").unique().notNull(),
  description: text("description"),
  registeredAt: timestamp("registered_at").defaultNow().notNull(),
});

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
});
