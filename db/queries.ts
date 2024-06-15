import { eq, type InferInsertModel, type InferModel } from "drizzle-orm";
import { db } from "./db";
import { guests, invitations } from "./schema";


export function getInvitationById(id: number) {
  return db.query.invitations.findFirst({ where: eq(invitations.id, id), with: { guests: true } });
}


export interface CreateInvitationQueryGuest extends  Pick<InferInsertModel<typeof guests>, 'firstName' | 'lastName'> {}

export interface CreateInvitationQuery extends Pick<InferInsertModel<typeof invitations>, 'status' | 'email' | 'notes'> {
  primaryGuest: CreateInvitationQueryGuest;
  guests: CreateInvitationQueryGuest[];
}

export async function createInvitation(data: CreateInvitationQuery): Promise<number> {
  return db.transaction(async (tx) => {
    await tx.insert(guests).values({
      firstName: data.primaryGuest.firstName,
      lastName: data.primaryGuest.lastName,
    });

    // const [{ invitationId }] = await tx.insert(invitations).values({
    //   email: data.email,
    //   status: data.status,
    //   notes: data.notes,
    //   primaryGuestId: 
    // }).returning({
    //   invitationId: invitations.id,
    // });

    

    for (const guest of data.guests) {
      await tx.insert(guests).values({
        firstName: guest.firstName,
        lastName: guest.lastName,
        invitationId,
      });
    }

    return invitationId;
  });
}
