ALTER TABLE "invitations" ADD COLUMN "code" uuid DEFAULT gen_random_uuid() NOT NULL;