CREATE TABLE "ai_usage" (
	"user_id" text NOT NULL,
	"period" varchar(7) NOT NULL,
	"scans" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ai_usage_user_id_period_pk" PRIMARY KEY("user_id","period")
);
--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;