CREATE TABLE "automation_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"mode" text DEFAULT 'draft_only' NOT NULL,
	"frequency_days" integer DEFAULT 1 NOT NULL,
	"post_time" varchar(5) DEFAULT '09:00' NOT NULL,
	"timezone" text DEFAULT 'Asia/Bangkok' NOT NULL,
	"next_run_at" timestamp with time zone,
	"last_run_at" timestamp with time zone,
	"last_post_id" uuid,
	"last_result" text,
	"last_error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "automation_settings" ADD CONSTRAINT "automation_settings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_settings" ADD CONSTRAINT "automation_settings_last_post_id_posts_id_fk" FOREIGN KEY ("last_post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "automation_settings_workspace_id_unique" ON "automation_settings" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "automation_settings_workspace_id_idx" ON "automation_settings" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "automation_settings_enabled_next_run_idx" ON "automation_settings" USING btree ("is_enabled","next_run_at");