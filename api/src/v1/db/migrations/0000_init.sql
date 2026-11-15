CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"group_id" uuid NOT NULL,
	"actor_user_id" text,
	"actor_member_id" uuid,
	"type" varchar(40) NOT NULL,
	"entity_id" uuid,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_lines" (
	"expense_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"paid_minor" bigint NOT NULL,
	"owed_minor" bigint NOT NULL,
	"paid_group_minor" bigint NOT NULL,
	"owed_group_minor" bigint NOT NULL,
	CONSTRAINT "expense_lines_expense_id_member_id_pk" PRIMARY KEY("expense_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"group_id" uuid NOT NULL,
	"description" varchar(140) NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" varchar(3) NOT NULL,
	"fx_rate" numeric(30, 12) DEFAULT '1' NOT NULL,
	"group_amount_minor" bigint NOT NULL,
	"category" varchar(32) DEFAULT 'general' NOT NULL,
	"date" date NOT NULL,
	"notes" text,
	"split" jsonb NOT NULL,
	"created_by_user_id" text,
	"updated_by_user_id" text,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fx_rates" (
	"base" varchar(3) NOT NULL,
	"quote" varchar(3) NOT NULL,
	"as_of" date NOT NULL,
	"rate" numeric(30, 12) NOT NULL,
	"source" varchar(32) NOT NULL,
	CONSTRAINT "fx_rates_base_quote_as_of_pk" PRIMARY KEY("base","quote","as_of")
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"type" varchar(16) DEFAULT 'other' NOT NULL,
	"emoji" varchar(16),
	"color" varchar(16),
	"simplify_debts" boolean DEFAULT true NOT NULL,
	"invite_token" varchar(64),
	"created_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "groups_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY NOT NULL,
	"group_id" uuid NOT NULL,
	"user_id" text,
	"display_name" varchar(60) NOT NULL,
	"role" varchar(8) DEFAULT 'member' NOT NULL,
	"left_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "settlements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"group_id" uuid NOT NULL,
	"from_member_id" uuid NOT NULL,
	"to_member_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" varchar(3) NOT NULL,
	"fx_rate" numeric(30, 12) DEFAULT '1' NOT NULL,
	"group_amount_minor" bigint NOT NULL,
	"method" varchar(8) DEFAULT 'cash' NOT NULL,
	"note" varchar(280),
	"date" date NOT NULL,
	"created_by_user_id" text,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"is_anonymous" boolean DEFAULT false,
	"default_currency" varchar(3),
	"locale" varchar(35),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_actor_member_id_members_id_fk" FOREIGN KEY ("actor_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_lines" ADD CONSTRAINT "expense_lines_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_lines" ADD CONSTRAINT "expense_lines_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_from_member_id_members_id_fk" FOREIGN KEY ("from_member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_to_member_id_members_id_fk" FOREIGN KEY ("to_member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_group_created_idx" ON "activity_events" USING btree ("group_id","created_at");--> statement-breakpoint
CREATE INDEX "activity_entity_idx" ON "activity_events" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "expense_lines_member_idx" ON "expense_lines" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "expenses_group_date_idx" ON "expenses" USING btree ("group_id","date","created_at");--> statement-breakpoint
CREATE INDEX "members_group_idx" ON "members" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "members_user_idx" ON "members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "members_group_user_uq" ON "members" USING btree ("group_id","user_id") WHERE "members"."user_id" is not null;--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "settlements_group_idx" ON "settlements" USING btree ("group_id","date");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");