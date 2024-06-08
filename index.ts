import { eq } from 'drizzle-orm';
import express from 'express';
import asyncHandler from 'express-async-handler';
import session from 'express-session';
import { Liquid } from 'liquidjs';
import stringifyObject from 'stringify-object';
import { z } from 'zod';
import { db, initializeDatabase } from './db/db';
import { getInvitationByCode } from './db/queries';
import { guests, invitations } from './db/schema';

// Initialize database
initializeDatabase();

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// Configure view engine
const liquid = new Liquid({
  extname: '.liquid',
  outputEscape: 'escape',
  cache: isProduction,
});

liquid.registerFilter('stringifyObject', (value) => stringifyObject(value));

app.engine('liquid', liquid.express());
app.set('views', './views');
app.set('view engine', 'liquid');

// Configure session middleware
if (!process.env.SESSION_SECRET) {
  throw new Error('A session secret must be set.');
}

declare module 'express-session' {
  interface SessionData {
    rsvpCode: string;
  }
}

app.use(
  session({
    name: 'session',
    resave: false,
    rolling: true,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET,
    cookie: {
      domain: process.env.DOMAIN,
      httpOnly: true,
      // Expire after 10 minutes of inactivity
      maxAge: 10 * 60 * 1000,
      sameSite: 'strict',
      secure: isProduction,
    },
  }),
);

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => res.render('index'));
app.get('/our-story', (req, res) => res.render('our-story'));
app.get('/the-wedding', (req, res) => res.render('the-wedding'));
app.get('/travel-and-accommodations', (req, res) => res.render('travel-and-accommodations'));
app.get('/photos', (req, res) => res.render('photos'));

app.get(
  '/rsvp',
  asyncHandler(async (req, res) => {
    const rsvpCode = req.query.code ?? req.session.rsvpCode;

    // If no invitation code is provided, render the RSVP code page to allow the user to enter one.
    if (typeof rsvpCode !== 'string') {
      return res.render('rsvp-code');
    }

    // Look up the invitation by the provided code.
    const invitation = await getInvitationByCode(rsvpCode.toLowerCase());

    // If the invitation cannot be found the code is invalid, render the RSVP code page with an error message.
    if (typeof invitation === 'undefined') {
      return res.render('rsvp-code', { invalidCode: true });
    }

    // Store the invitation code in the session if it is not already present.
    if (req.session.rsvpCode !== rsvpCode) {
      req.session.rsvpCode = invitation.code;
    }

    // Render the RSVP confirmation form with the invitation.
    return res.render('rsvp-confirm', { formState: inviteToFormState(invitation) });
  }),
);

function processBoolean(value: unknown): boolean {
  return value === 'true';
}

function processInteger(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const parsed = Number.parseInt(value);

  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
}

const RsvpFormGuest = z.object({
  id: z.preprocess(processInteger, z.number()).optional(),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
});

const RsvpForm = z.object({
  attending: z.preprocess(processBoolean, z.boolean()),
  email: z.string().trim().email().optional(),
  guests: RsvpFormGuest.array().optional().default([]),
});

app.post(
  '/rsvp',
  asyncHandler(async (req, res) => {
    const rsvpCode = req.session.rsvpCode;

    // If the session does not contain an invitation code, render the RSVP code page to allow the user to enter one.
    if (typeof rsvpCode !== 'string') {
      return res.render('rsvp-code');
    }

    // Look up the invitation by the stored code.
    const invitation = await getInvitationByCode(rsvpCode);

    // If the invitation cannot be found the code is invalid, render the RSVP code page with an error message.
    if (typeof invitation === 'undefined') {
      return res.render('rsvp-code', { invalidCode: true });
    }

    // TODO: Handle parsing errors
    const bodyParsed = RsvpForm.parse(req.body);

    await db.transaction(async (tx) => {
      // If the user is not attending, update the invitation status and return.
      if (!bodyParsed.attending) {
        await tx.update(invitations).set({ status: 'Rejected' }).where(eq(invitations.id, invitation.id));
        return;
      }

      const existingGuestIds = new Set(invitation.guests.map((guest) => guest.id));
      const newGuestIds = new Set(bodyParsed.guests.map((guest) => guest.id).filter((id): id is number => typeof id === 'number'));

      // Guests without an ID are to be created.
      const guestsToCreate = bodyParsed.guests.filter(({ id }) => typeof id === 'undefined');
      // Guests with an ID are to be updated. Only guests that previously existed are to be updated to prevent tampering.
      const guestsToUpdate = bodyParsed.guests.filter(({ id }) => typeof id !== 'undefined' && existingGuestIds.has(id));
      // Guests that were not included in the request are to be deleted.
      const guestsToDelete = invitation.guests.filter(({ id }) => !newGuestIds.has(id));

      // Update the invitation.
      await tx
        .update(invitations)
        .set({
          status: bodyParsed.attending ? 'Accepted' : 'Rejected',
          email: bodyParsed.email,
        })
        .where(eq(invitations.id, invitation.id));

      // Add new guests.
      for (const guest of guestsToCreate) {
        await tx.insert(guests).values({
          firstName: guest.firstName,
          lastName: guest.lastName,
          invitationId: invitation.id,
        });
      }

      // Update existing guests with new information.
      for (const guest of guestsToUpdate) {
        await tx.update(guests).set({ firstName: guest.firstName, lastName: guest.lastName }).where(eq(guests.id, guest.id!));
      }

      // Delete guests that are no longer present.
      for (const guest of guestsToDelete) {
        await tx.delete(guests).where(eq(guests.id, guest.id));
      }
    });

    const updatedInvitation = await getInvitationByCode(rsvpCode);

    // Render the RSVP confirmation page with the updated invitation.
    return res.render('rsvp-confirm', { formState: inviteToFormState(updatedInvitation) });
  }),
);

const DEFAULT_FORM_STATE = {
  attending: true,
  email: undefined,
  guests: [
    {
      firstName: '',
      lastName: '',
    },
  ],
};

function inviteToFormState(invitation: Awaited<ReturnType<typeof getInvitationByCode>>): z.infer<typeof RsvpForm> {
  // If the invitation does not exist, return a default form state.
  if (!invitation) {
    return DEFAULT_FORM_STATE;
  }

  const guests =
    invitation.guests.length > 0
      ? invitation.guests.map((guest) => ({
          id: guest.id,
          firstName: guest.firstName,
          lastName: guest.lastName,
        }))
      : DEFAULT_FORM_STATE.guests;

  // Convert the invitation to a form state.
  return {
    attending: invitation.status === 'Accepted',
    email: invitation.email ?? undefined,
    guests,
  };
}

// Serve static files
app.use('/vendor/alpinejs.js', express.static('node_modules/alpinejs/dist/module.esm.min.js'));

// Start server
app.listen(3000);
