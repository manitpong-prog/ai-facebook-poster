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
  (table) => [
    index("writing_profiles_workspace_id_idx").on(table.workspaceId),
  ],
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