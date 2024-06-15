import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';

export const invitations = sqliteTable('invitations', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  attending: integer('attending', { mode: 'boolean' }).notNull(),
  email: text('email').unique().notNull(),
  notes: text('notes'),
  primaryGuestId: integer('primary_guest_id').notNull().references((): AnySQLiteColumn => guests.id, { onDelete: 'cascade' }),
});

export const invitationsRelations = relations(invitations, ({ one, many }) => ({
  primaryGuest: one(guests, { relationName: 'primaryGuest', fields: [invitations.primaryGuestId], references: [guests.id] }),
  guests: many(guests),
}));

export const guests = sqliteTable('guests', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  invitationId: integer('invitation_id').notNull().references(() => invitations.id,  { onDelete: 'cascade' }),
});

export const guestsRelations = relations(guests, ({ one }) => ({
  invitation: one(invitations, { fields: [guests.invitationId], references: [invitations.id] }),
}));
