// ---------------------------------------------------------------------------
// Filter context
// ---------------------------------------------------------------------------

export type FilterContext = {
  from: Date;
  to: Date;
  repo?: string;
};

// ---------------------------------------------------------------------------
// Dashboard aggregates
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Members aggregates
// ---------------------------------------------------------------------------

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
  user: {
    userId: string;
    userName: string;
    avatarUrl: string;
  };
  kpi: {
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
  dailyTrend: {
    date: string;
    sessionCount: number;
    totalTokens: number;
  }[];
  skillRanking: {
    skillName: string;
    usageCount: number;
    isDistributed: boolean;
  }[];
  projectBreakdown: {
    project: string;
    sessionCount: number;
    totalTokens: number;
  }[];
  subagentBreakdown: {
    agentType: string;
    toolCallsCount: number;
    tokensUsed: number;
  }[];
  recentSessions: {
    sessionId: string;
    project: string;
    startedAt: string;
    endedAt: string | null;
    totalTokens: number;
    skillCount: number;
    subagentCount: number;
  }[];
};

// ---------------------------------------------------------------------------
// Skills aggregates
// ---------------------------------------------------------------------------

export type SkillKpiAggregate = {
  distributedSkillCount: number;
  adoptionRate: number;
  unusedSkillCount: number;
};

export type SkillHeatmapAggregate = {
  skills: string[];
  members: {
    userId: string;
    userName: string;
    avatarUrl: string;
  }[];
  matrix: {
    skillName: string;
    userId: string;
    usageCount: number;
  }[];
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

// ---------------------------------------------------------------------------
// PRs aggregates
// ---------------------------------------------------------------------------

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
  skills: {
    skillName: string;
    usageCount: number;
    isDistributed: boolean;
  }[];
  sessions: {
    sessionId: string;
    startedAt: string;
    endedAt: string | null;
    totalTokens: number;
    skillCount: number;
    subagentCount: number;
  }[];
};

// ---------------------------------------------------------------------------
// Cost aggregates
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Collect API payload
// ---------------------------------------------------------------------------

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
