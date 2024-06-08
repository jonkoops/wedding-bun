import { eq } from "drizzle-orm";
import { db } from "./db";
import { invitations } from "./schema";

export function getInvitationByCode(code: string) {
  return db.query.invitations.findFirst({ where: eq(invitations.code, code), with: { guests: true } });
}
