import { eq } from "drizzle-orm";
import { db } from "./db";
import { invitations, type UnidentifiedInvitation, type Invitation } from "./schema";

export function getInvitationById(id: number): Promise<Invitation | undefined> {
  return db.query.invitations.findFirst({ where: eq(invitations.id, id) });
}

export function getInvitationByEmail(email: string): Promise<Invitation | undefined> {
  return db.query.invitations.findFirst({ where: eq(invitations.email, email) });
}

export async function createInvitation(invitation: UnidentifiedInvitation): Promise<number> {
  const result = await db.insert(invitations).values(invitation).returning({ id: invitations.id });
  return result[0]!.id;
}

export async function updateInvitation(invitation: Invitation): Promise<number> {
  const result = await db.update(invitations)
    .set(invitation)
    .where(eq(invitations.id, invitation.id))
    .returning({ id: invitations.id });
  
  return result[0]!.id;
}
