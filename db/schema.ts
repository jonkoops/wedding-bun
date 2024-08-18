import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { json, pgEnum, pgTable, serial, text } from "drizzle-orm/pg-core";
import type { SessionData } from "express-session";

export interface Guest {
  firstName: string;
  lastName: string;
}

export const invitationStatus = pgEnum('invitationStatus', ['accepted', 'rejected']);

export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  status: invitationStatus("status").notNull(),
  email: text("email").unique().notNull(),
  notes: text("notes").notNull(),
  primaryGuest: json("primaryGuest").$type<Guest>().notNull(),
  guests: json("guests").$type<Guest[]>().notNull(),
});

export type Invitation = InferSelectModel<typeof invitations>;
export type UnidentifiedInvitation = InferInsertModel<typeof invitations>;

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  data: json("data").$type<SessionData>().notNull(),
});

export type Session = InferSelectModel<typeof sessions>;
