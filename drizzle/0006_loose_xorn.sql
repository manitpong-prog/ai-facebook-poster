CREATE TABLE "workspace_ai_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"provider" text DEFAULT 'gemini' NOT NULL,
	"model" text,
	"api_key_encrypted" text,
	"api_key_iv" text,
	"api_key_auth_tag" text,
	"api_key_last_four" varchar(4),
	"encryption_version" integer DEFAULT 1 NOT NULL,
	"last_tested_at" timestamp with time zone,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_ai_settings" ADD CONSTRAINT "workspace_ai_settings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_ai_settings_workspace_id_unique" ON "workspace_ai_settings" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_ai_settings_workspace_id_idx" ON "workspace_ai_settings" USING btree ("workspace_id");