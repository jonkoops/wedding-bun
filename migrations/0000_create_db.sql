DO $$ BEGIN
 CREATE TYPE "public"."invitationStatus" AS ENUM('accepted', 'rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" "invitationStatus" NOT NULL,
	"email" text NOT NULL,
	"notes" text NOT NULL,
	"primaryGuest" json NOT NULL,
	"guests" json NOT NULL,
	CONSTRAINT "invitations_email_unique" UNIQUE("email")
);
