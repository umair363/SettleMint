CREATE TABLE "friend_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_user_id" text NOT NULL,
	"to_user_id" text,
	"label" varchar(254) NOT NULL,
	"status" varchar(8) DEFAULT 'pending' NOT NULL,
	"group_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "username" varchar(20);--> statement-breakpoint
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_from_user_id_user_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_to_user_id_user_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "friend_requests_to_idx" ON "friend_requests" USING btree ("to_user_id","status");--> statement-breakpoint
CREATE INDEX "friend_requests_from_idx" ON "friend_requests" USING btree ("from_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "friend_requests_pair_uq" ON "friend_requests" USING btree ("from_user_id","to_user_id") WHERE "friend_requests"."to_user_id" is not null;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_username_unique" UNIQUE("username");