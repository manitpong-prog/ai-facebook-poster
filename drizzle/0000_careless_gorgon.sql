CREATE TYPE "public"."facebook_page_status" AS ENUM('not_connected', 'connected', 'expired', 'error');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('draft', 'generated', 'scheduled', 'posting', 'posted', 'cancelled', 'error');--> statement-breakpoint
CREATE TYPE "public"."publish_mode" AS ENUM('draft', 'post_now', 'schedule');--> statement-breakpoint
CREATE TYPE "public"."workspace_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TABLE "ai_usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"post_id" uuid,
	"model" text,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"cost_estimate_usd" numeric(12, 6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "facebook_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"page_name" text,
	"page_id" text,
	"access_token_encrypted" text,
	"token_expires_at" timestamp with time zone,
	"status" "facebook_page_status" DEFAULT 'not_connected' NOT NULL,
	"last_tested_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"facebook_page_id" uuid,
	"writing_profile_id" uuid,
	"topic" text NOT NULL,
	"style_override" text,
	"generated_text" text,
	"status" "post_status" DEFAULT 'draft' NOT NULL,
	"publish_mode" "publish_mode" DEFAULT 'draft' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"posting_started_at" timestamp with time zone,
	"posted_at" timestamp with time zone,
	"facebook_post_id" text,
	"facebook_post_url" text,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "workspace_role" DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "writing_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text DEFAULT 'สไตล์หลักของฉัน' NOT NULL,
	"tone" text,
	"target_audience" text,
	"rules" text,
	"favorite_words" text,
	"banned_words" text,
	"call_to_action" text,
	"sample_posts" text,
	"max_words" integer DEFAULT 300 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facebook_pages" ADD CONSTRAINT "facebook_pages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_facebook_page_id_facebook_pages_id_fk" FOREIGN KEY ("facebook_page_id") REFERENCES "public"."facebook_pages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_writing_profile_id_writing_profiles_id_fk" FOREIGN KEY ("writing_profile_id") REFERENCES "public"."writing_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writing_profiles" ADD CONSTRAINT "writing_profiles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_usage_logs_workspace_id_idx" ON "ai_usage_logs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "ai_usage_logs_post_id_idx" ON "ai_usage_logs" USING btree ("post_id");--> statement-breakpoint
CREATE UNIQUE INDEX "facebook_pages_workspace_page_id_unique" ON "facebook_pages" USING btree ("workspace_id","page_id");--> statement-breakpoint
CREATE INDEX "facebook_pages_workspace_id_idx" ON "facebook_pages" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "posts_workspace_id_idx" ON "posts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "posts_status_idx" ON "posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "posts_scheduled_at_idx" ON "posts" USING btree ("scheduled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_facebook_post_id_unique" ON "posts" USING btree ("facebook_post_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_members_workspace_user_unique" ON "workspace_members" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_slug_unique" ON "workspaces" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "workspaces_owner_user_id_idx" ON "workspaces" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "writing_profiles_workspace_id_idx" ON "writing_profiles" USING btree ("workspace_id");