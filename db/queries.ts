import { eq } from "drizzle-orm";
import type { SessionData } from "express-session";
import { db } from "./db";
import { invitations, sessions, type Invitation, type Session, type UnidentifiedInvitation } from "./schema";

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

export function getSessionById(id: string): Promise<Session | undefined> {
  return db.query.sessions.findFirst({ where: eq(sessions.id, id) });
}

export async function setSession(id: string, data: SessionData): Promise<void> {
  await db
    .insert(sessions)
    .values({ id, data })
    .onConflictDoUpdate({  target: sessions.id, set: { data } });
}

export async function deleteSession(id: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, id));
}
