CREATE TABLE "auto_pilot_run_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"automation_setting_id" uuid,
	"post_id" uuid,
	"run_trigger" text DEFAULT 'manual' NOT NULL,
	"mode" text DEFAULT 'draft_only' NOT NULL,
	"status" text DEFAULT 'started' NOT NULL,
	"topic_title" text,
	"scheduled_for_publish" boolean DEFAULT false NOT NULL,
	"auto_pilot_summary" text,
	"publish_summary" text,
	"error_message" text,
	"due_count" integer DEFAULT 0 NOT NULL,
	"published_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auto_pilot_run_logs" ADD CONSTRAINT "auto_pilot_run_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_pilot_run_logs" ADD CONSTRAINT "auto_pilot_run_logs_automation_setting_id_automation_settings_id_fk" FOREIGN KEY ("automation_setting_id") REFERENCES "public"."automation_settings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_pilot_run_logs" ADD CONSTRAINT "auto_pilot_run_logs_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auto_pilot_run_logs_workspace_id_idx" ON "auto_pilot_run_logs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "auto_pilot_run_logs_workspace_created_idx" ON "auto_pilot_run_logs" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "auto_pilot_run_logs_status_idx" ON "auto_pilot_run_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "auto_pilot_run_logs_post_id_idx" ON "auto_pilot_run_logs" USING btree ("post_id");
