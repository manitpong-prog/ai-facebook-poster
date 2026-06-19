CREATE TYPE "public"."content_topic_status" AS ENUM('active', 'paused', 'used', 'archived');--> statement-breakpoint
CREATE TABLE "content_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"created_post_id" uuid,
	"title" text NOT NULL,
	"notes" text,
	"status" "content_topic_status" DEFAULT 'active' NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"used_at" timestamp with time zone,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_topics" ADD CONSTRAINT "content_topics_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_topics" ADD CONSTRAINT "content_topics_created_post_id_posts_id_fk" FOREIGN KEY ("created_post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_topics_workspace_id_idx" ON "content_topics" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "content_topics_status_idx" ON "content_topics" USING btree ("status");--> statement-breakpoint
CREATE INDEX "content_topics_workspace_status_idx" ON "content_topics" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "content_topics_priority_idx" ON "content_topics" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "content_topics_created_post_id_idx" ON "content_topics" USING btree ("created_post_id");