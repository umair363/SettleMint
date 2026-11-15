CREATE TABLE "recurring_rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"group_id" uuid NOT NULL,
	"template" jsonb NOT NULL,
	"frequency" varchar(8) NOT NULL,
	"interval" integer DEFAULT 1 NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"generated" integer DEFAULT 0 NOT NULL,
	"next_date" date NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"paused_reason" varchar(200),
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "recurring_rule_id" uuid;--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recurring_due_idx" ON "recurring_rules" USING btree ("active","next_date");--> statement-breakpoint
CREATE INDEX "recurring_group_idx" ON "recurring_rules" USING btree ("group_id");