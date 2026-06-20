import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const workspaceRoleEnum = pgEnum("workspace_role", [
  "owner",
  "admin",
  "member",
]);

export const facebookPageStatusEnum = pgEnum("facebook_page_status", [
  "not_connected",
  "connected",
  "expired",
  "error",
]);

export const postStatusEnum = pgEnum("post_status", [
  "draft",
  "generated",
  "scheduled",
  "posting",
  "posted",
  "cancelled",
  "error",
]);

export const contentTopicStatusEnum = pgEnum("content_topic_status", [
  "active",
  "paused",
  "used",
  "archived",
]);

export const publishModeEnum = pgEnum("publish_mode", [
  "draft",
  "post_now",
  "schedule",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

// =====================================================
// Better Auth Core Tables
// Required tables: user, session, account, verification
// =====================================================

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("user_email_idx").on(table.email)],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("session_user_id_idx").on(table.userId),
    index("session_token_idx").on(table.token),
  ],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    index("account_provider_account_idx").on(table.providerId, table.accountId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUserId: text("owner_user_id").notNull(),
    name: text("name").notNull(),
    slug: varchar("slug", { length: 120 }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("workspaces_slug_unique").on(table.slug),
    index("workspaces_owner_user_id_idx").on(table.ownerUserId),
  ],
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    role: workspaceRoleEnum("role").default("owner").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("workspace_members_workspace_user_unique").on(
      table.workspaceId,
      table.userId,
    ),
    index("workspace_members_user_id_idx").on(table.userId),
  ],
);

export const facebookPages = pgTable(
  "facebook_pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    pageName: text("page_name"),
    pageId: text("page_id"),
    accessTokenEncrypted: text("access_token_encrypted"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    status: facebookPageStatusEnum("status").default("not_connected").notNull(),
    lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),

    ...timestamps,
  },
  (table) => [
    uniqueIndex("facebook_pages_workspace_page_id_unique").on(
      table.workspaceId,
      table.pageId,
    ),
    index("facebook_pages_workspace_id_idx").on(table.workspaceId),
  ],
);

export const writingProfiles = pgTable(
  "writing_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    name: text("name").default("สไตล์หลักของฉัน").notNull(),
    tone: text("tone"),
    targetAudience: text("target_audience"),
    rules: text("rules"),
    favoriteWords: text("favorite_words"),
    bannedWords: text("banned_words"),
    callToAction: text("call_to_action"),
    samplePosts: text("sample_posts"),
    maxWords: integer("max_words").default(300).notNull(),
    isDefault: boolean("is_default").default(false).notNull(),

    ...timestamps,
  },
  (table) => [index("writing_profiles_workspace_id_idx").on(table.workspaceId)],
);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    facebookPageId: uuid("facebook_page_id").references(() => facebookPages.id, {
      onDelete: "set null",
    }),
    writingProfileId: uuid("writing_profile_id").references(
      () => writingProfiles.id,
      { onDelete: "set null" },
    ),

    topic: text("topic").notNull(),
    styleOverride: text("style_override"),
    generatedText: text("generated_text"),

    status: postStatusEnum("status").default("draft").notNull(),
    publishMode: publishModeEnum("publish_mode").default("draft").notNull(),

    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    postingStartedAt: timestamp("posting_started_at", { withTimezone: true }),
    postedAt: timestamp("posted_at", { withTimezone: true }),

    facebookPostId: text("facebook_post_id"),
    facebookPostUrl: text("facebook_post_url"),

    errorMessage: text("error_message"),
    retryCount: integer("retry_count").default(0).notNull(),

    createdByUserId: text("created_by_user_id"),

    ...timestamps,
  },
  (table) => [
    index("posts_workspace_id_idx").on(table.workspaceId),
    index("posts_status_idx").on(table.status),
    index("posts_scheduled_at_idx").on(table.scheduledAt),
    uniqueIndex("posts_facebook_post_id_unique").on(table.facebookPostId),
  ],
);



export const contentTopics = pgTable(
  "content_topics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    createdPostId: uuid("created_post_id").references(() => posts.id, {
      onDelete: "set null",
    }),

    title: text("title").notNull(),
    notes: text("notes"),
    status: contentTopicStatusEnum("status").default("active").notNull(),
    priority: integer("priority").default(100).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdByUserId: text("created_by_user_id"),

    ...timestamps,
  },
  (table) => [
    index("content_topics_workspace_id_idx").on(table.workspaceId),
    index("content_topics_status_idx").on(table.status),
    index("content_topics_workspace_status_idx").on(
      table.workspaceId,
      table.status,
    ),
    index("content_topics_priority_idx").on(table.priority),
    index("content_topics_created_post_id_idx").on(table.createdPostId),
  ],
);


export const automationSettings = pgTable(
  "automation_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    isEnabled: boolean("is_enabled").default(false).notNull(),
    mode: text("mode").default("draft_only").notNull(),
    frequencyDays: integer("frequency_days").default(1).notNull(),
    postTime: varchar("post_time", { length: 5 }).default("09:00").notNull(),
    timezone: text("timezone").default("Asia/Bangkok").notNull(),

    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    lastPostId: uuid("last_post_id").references(() => posts.id, {
      onDelete: "set null",
    }),
    lastResult: text("last_result"),
    lastErrorMessage: text("last_error_message"),

    ...timestamps,
  },
  (table) => [
    uniqueIndex("automation_settings_workspace_id_unique").on(table.workspaceId),
    index("automation_settings_workspace_id_idx").on(table.workspaceId),
    index("automation_settings_enabled_next_run_idx").on(
      table.isEnabled,
      table.nextRunAt,
    ),
  ],
);


export const autoPilotRunLogs = pgTable(
  "auto_pilot_run_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    automationSettingId: uuid("automation_setting_id").references(
      () => automationSettings.id,
      { onDelete: "set null" },
    ),
    postId: uuid("post_id").references(() => posts.id, {
      onDelete: "set null",
    }),

    runTrigger: text("run_trigger").default("manual").notNull(),
    mode: text("mode").default("draft_only").notNull(),
    status: text("status").default("started").notNull(),
    topicTitle: text("topic_title"),
    scheduledForPublish: boolean("scheduled_for_publish").default(false).notNull(),

    autoPilotSummary: text("auto_pilot_summary"),
    publishSummary: text("publish_summary"),
    errorMessage: text("error_message"),

    dueCount: integer("due_count").default(0).notNull(),
    publishedCount: integer("published_count").default(0).notNull(),
    failedCount: integer("failed_count").default(0).notNull(),
    skippedCount: integer("skipped_count").default(0).notNull(),

    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),

    ...timestamps,
  },
  (table) => [
    index("auto_pilot_run_logs_workspace_id_idx").on(table.workspaceId),
    index("auto_pilot_run_logs_workspace_created_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
    index("auto_pilot_run_logs_status_idx").on(table.status),
    index("auto_pilot_run_logs_post_id_idx").on(table.postId),
  ],
);

export const aiUsageLogs = pgTable(
  "ai_usage_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    postId: uuid("post_id").references(() => posts.id, {
      onDelete: "set null",
    }),

    model: text("model"),
    inputTokens: integer("input_tokens").default(0).notNull(),
    outputTokens: integer("output_tokens").default(0).notNull(),
    totalTokens: integer("total_tokens").default(0).notNull(),
    costEstimateUsd: numeric("cost_estimate_usd", {
      precision: 12,
      scale: 6,
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("ai_usage_logs_workspace_id_idx").on(table.workspaceId),
    index("ai_usage_logs_post_id_idx").on(table.postId),
  ],
);
