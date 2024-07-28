export type Document = {
  invitations: Record<string, Invitation>;
};

export interface Invitation {
  id: string;
  status: "ACCEPTED" | "REJECTED";
  email: string;
  notes: string;
  primaryGuest: Guest;
  guests: Guest[];
}

export interface Guest {
  firstName: string;
  lastName: string;
}
