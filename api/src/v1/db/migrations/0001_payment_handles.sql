CREATE TABLE "payment_handles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" varchar(16) NOT NULL,
	"value" varchar(120) NOT NULL,
	"label" varchar(40),
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_handles" ADD CONSTRAINT "payment_handles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_handles_user_idx" ON "payment_handles" USING btree ("user_id");