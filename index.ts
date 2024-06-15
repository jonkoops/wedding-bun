import { eq } from 'drizzle-orm';
import express, { type Request, type Response } from 'express';
import asyncHandler from 'express-async-handler';
import session from 'express-session';
import { Liquid } from 'liquidjs';
import stringifyObject from 'stringify-object';
import { z } from 'zod';
import { db, initializeDatabase } from './db/db';
import { getInvitationById } from './db/queries';
import { guests, invitations } from './db/schema';

const {  DOMAIN, SESSION_SECRET, PASSCODE, NODE_ENV } = process.env;

// Check environment variables
if (!DOMAIN) {
  throw new Error('The \'DOMAIN\' environment variable must be set.');
}

if (!SESSION_SECRET) {
  throw new Error('The \'SESSION_SECRET\' environment variable must be set.');
}

if (!PASSCODE) {
  throw new Error('The \'PASSCODE\' environment variable must be set.');
}

// Initialize database
initializeDatabase();

const app = express();
const isProduction = NODE_ENV === 'production';

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
declare module 'express-session' {
  interface SessionData {
    inviteId: number;
  }
}

app.use(
  session({
    name: 'session',
    resave: false,
    rolling: true,
    saveUninitialized: false,
    secret: SESSION_SECRET,
    cookie: {
      domain: DOMAIN,
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

// Files to be served statically.
app.use(express.static('public'))

// Routes
app.get('/', (req, res) => res.render('index'));
app.get('/the-wedding', (req, res) => res.render('the-wedding'));
app.get('/travel-and-accommodations', (req, res) => res.render('travel-and-accommodations'));
app.get('/photos', (req, res) => res.render('photos'));

// TODO: Allow the user to get back to their reservation with a magic link.

app.get(
  '/rsvp',
  asyncHandler(async (req, res) => {
    const { inviteId } = req.session;

    // If an invitation ID is stored in the session, handle the request with the invitation.
    if (typeof inviteId !== 'undefined') {
      return handleWithInvite(req, res, inviteId);
    }

    const { code } = req.query;

    // If a code is provided, handle the request with the code.
    if (typeof code === 'string') {
      handleWithCode(req, res, code);
      return;
    }

    // Otherwise, render the default page.
    handleWithDefault(req, res);
  }),
);

async function handleWithInvite(req: Request, res: Response, inviteId: number) {
  const invitation = await getInvitationById(inviteId);

  // If the invitation does not exist, show the default page.
  if (typeof invitation === 'undefined') {
    delete req.session.inviteId;
    handleWithDefault(req, res);
    return;
  }

  // Store the invitation ID in the session if it is not already present.
  if (req.session.inviteId !== inviteId) {
    req.session.inviteId = invitation.id;
  }

  // Render the RSVP confirmation page with the invitation.
  res.render('rsvp-confirm', { formState: inviteToFormState(invitation) });
}

async function handleWithCode(req: Request, res: Response, code: string) {
  // Check if the code matches the passcode.
  const isValid = code.toLowerCase() === PASSCODE!.toLowerCase();

  // If the code is valid show the RSVP confirmation page.
  if (isValid) {
    res.render('rsvp-confirm', { formState: DEFAULT_FORM_STATE });
    return;
  }

  // Otherwise, render the code page with an error message.
  res.render('rsvp-password', { invalidCode: true });
}

async function handleWithDefault(req: Request, res: Response) {
  // Render the code page.
  res.render('rsvp-password');
}

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
  email: z.string().trim().email(),
  notes: z.string().trim(),
  primaryGuest: RsvpFormGuest,
  guests: RsvpFormGuest.array(),
});

const DEFAULT_FORM_STATE: z.infer<typeof RsvpForm> = {
  attending: true,
  email: '',
  notes: '',
  primaryGuest: {
    firstName: '',
    lastName: '',
  },
  guests: [],
};

app.post(
  '/rsvp',
  asyncHandler(async (req, res) => {
    const { inviteId } = req.session;

    // If the session does not contain an invitation if fall back to the default page.
    if (typeof inviteId !== 'string') {
      handleWithDefault(req, res);
      return;
    }

    // Look up the invitation from the session.
    const invitation = await getInvitationById(inviteId);

    // If the invitation cannot be found fall back to the default page.
    if (typeof invitation === 'undefined') {
      handleWithDefault(req, res);
      return;
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

    const updatedInvitation = await getInvitationById(invitation.id);

    // Render the RSVP confirmation page with the updated invitation.
    return res.render('rsvp-confirm', { formState: inviteToFormState(updatedInvitation) });
  }),
);

function inviteToFormState(invitation: Awaited<ReturnType<typeof getInvitationById>>): z.infer<typeof RsvpForm> {
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
app.listen(3000, '0.0.0.0');
