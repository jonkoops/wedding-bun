import { readDocument, writeDocument } from "./db";
import type { Invitation } from "./schema";

export async function getInvitationById(id: string): Promise<Invitation | undefined> {
  const document = await readDocument();
  return document.invitations[id];
}

export async function getAllInvitations(): Promise<Invitation[]> {
  const document = await readDocument();
  return Object.values(document.invitations);
}

export async function getInvitationByEmail(email: string): Promise<Invitation | undefined> {
  const invitations = await getAllInvitations();
  return invitations.find((invitation) => invitation.email === email);
}

export async function updateInvitation(invitation: Invitation): Promise<void> {
  const document = await readDocument();

  await writeDocument({
    ...document,
    invitations: {
      ...document.invitations,
      [invitation.id]: invitation,
    },
  });
}
