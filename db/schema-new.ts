import { relations } from 'drizzle-orm';
import { integer, primaryKey, sqliteTable, text, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';

export const invitations = sqliteTable('invitations', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  status: text('status', { enum: ['ACCEPTED', 'REJECTED'] }).notNull(),
  email: text('email').unique().notNull(),
  notes: text('notes'),
});

export const invitationsRelations = relations(invitations, ({ many }) => ({
  invitationsToGuests: many(invitationsToGuests),
}));

export const guests = sqliteTable('guests', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
});

export const guestsRelations = relations(guests, ({ many }) => ({
  invitationsToGuests: many(invitationsToGuests),
}));

export const invitationsToGuests = sqliteTable('invitations_to_guests', {
  invitationId: integer('invitation_id').notNull().references(() => invitations.id, { onDelete: 'cascade' }),
  guestId: integer('guest_id').notNull().references(() => guests.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.invitationId, t.guestId] }),
}));

export const invitationsToGuestsRelations = relations(invitationsToGuests, ({ one }) => ({
  group: one(invitations, {
    fields: [invitationsToGuests.invitationId],
    references: [invitations.id],
  }),
  user: one(guests, {
    fields: [invitationsToGuests.guestId],
    references: [guests.id],
  }),
}));
