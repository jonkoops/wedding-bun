import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const invitations = sqliteTable('invitations', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  status: text('status', { enum: ['Pending', 'Accepted', 'Rejected'] }).notNull().default('Pending'),
  code: text('code', { length: 4 }).notNull().unique(),
  email: text('email').unique(),
});

export const invitationsRelations = relations(invitations, ({ many }) => ({
  guests: many(guests),
}));

export const guests = sqliteTable('guests', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  invitationId: integer('invitation_id').notNull().references(() => invitations.id, { onDelete: 'cascade' }),
});

export const guestsRelations = relations(guests, ({ one }) => ({
  invitation: one(invitations, { fields: [guests.invitationId], references: [invitations.id] }),
}));
