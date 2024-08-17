import { Router, type Request, type Response } from "express";
import asyncHandler from "express-async-handler";
import { z } from "zod";
import { createInvitation, getInvitationByEmail, getInvitationById, updateInvitation } from "../db/queries";
import type { Guest, UnidentifiedInvitation } from "../db/schema";
import { environment } from "../environment";
import { processBoolean } from "../utils";

const RsvpFormGuest = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
});

const RsvpForm = z.object({
  attending: z.preprocess(processBoolean, z.boolean()),
  email: z.string().trim().email(),
  notes: z.string().trim(),
  primaryGuest: RsvpFormGuest,
  guests: RsvpFormGuest.array().optional().default([]),
});

type FormState = z.infer<typeof RsvpForm>;

const DEFAULT_INVITE_FORM_STATE: FormState = {
  attending: true,
  email: "",
  notes: "",
  primaryGuest: {
    firstName: "",
    lastName: "",
  },
  guests: [],
};

export const rsvpRouter = Router();

rsvpRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { authorized, invitationId } = req.session;


    // If the user has not yet entered a valid code, render the code form.
    if (!authorized) {
      return renderCodeForm(req, res);
    }

    // If the user has not RSVP'd yet, render the confirmation form with the default state.
    if (typeof invitationId === "undefined") {
      return renderConfirmationForm(req, res);
    }

    const invitation = await getInvitationById(invitationId);

    // If the invitation no longer exists, render the confirmation form with the default state.
    if (!invitation) {
      delete req.session.invitationId;
      return renderConfirmationForm(req, res)
    }
  
    // Render the RSVP confirmation form with the invitation.
    return renderConfirmationForm(req, res, { formState: invitationToFormState(invitation) });
  }),
);

rsvpRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { code } = req.body;

    // If the user submitted a code, handle it.
    if (typeof code === "string") {
      return handleCodeSubmission(req, res, code);
    }

    // If the user submitted an RSVP, handle it.
    return handleRsvpSubmission(req, res);
  }),
);

function handleCodeSubmission(req: Request, res: Response, code: string) {
  // Check if the submitted code matches our super secret passcode.
  const isValid = code.toLowerCase() === environment.passcode.toLowerCase();

  // If the code is valid show the RSVP confirmation page.
  if (isValid) {
    req.session.authorized = true;
    return renderConfirmationForm(req, res);
  }

  // Otherwise, render the code page with an error message.
  return renderCodeForm(req, res, { invalidCode: true });
}


async function handleRsvpSubmission(req: Request, res: Response) {
  const { authorized, invitationId } = req.session;

  // If the user is not authorized to submit an RSVP, render the code form again.
  if (!authorized) {
    return renderCodeForm(req, res, { sessionExpired: true });
  }

  // Look up the original invitation from the session.
  const originalInvitation = typeof invitationId !== "undefined"
    ? await getInvitationById(invitationId)
    : undefined;

  try {
    // Parse the request body and convert it to an invitation.
    const formState = RsvpForm.parse(req.body);
    const parsedFormState = formStateToInvitation(formState);
    const conflictingInvitation = await getInvitationByEmail(parsedFormState.email);

    // Check if the email is already in use by another invitation.
    if (conflictingInvitation && conflictingInvitation.id !== originalInvitation?.id) {
      return renderConfirmationForm(req, res, { emailTaken: true, formState: formState });
    }

    const updatedInvitationId = originalInvitation
      ? await updateInvitation({ ...parsedFormState, id: originalInvitation.id })
      : await createInvitation(parsedFormState);

    // Store the invitation ID in the session so it can be retrieved later.
    req.session.invitationId = updatedInvitationId;

    return renderConfirmationForm(req, res, { formState: invitationToFormState(parsedFormState) });
  } catch (error) {
    console.error("Error updating invitation:", error);
    return renderError(req, res);
  }
}

interface CodeFormParams {
  invalidCode?: boolean;
  sessionExpired?: boolean;
}

function renderCodeForm(req: Request, res: Response, params: CodeFormParams = {}) {
  res.render("rsvp-code", params);
}

interface ConfirmationFormParams {
  emailTaken?: boolean;
  formState: FormState;
}

function renderConfirmationForm(
  req: Request,
  res: Response,
  params: ConfirmationFormParams = { formState: DEFAULT_INVITE_FORM_STATE },
) {
  res.render("rsvp-confirm", params);
}

function renderError(req: Request, res: Response) {
  res.render("rsvp-error");
}

function formStateToInvitation(formState: FormState): UnidentifiedInvitation {
  const guests: Guest[] = formState.guests.map((guest) => ({
    firstName: guest.firstName,
    lastName: guest.lastName,
  }));

  return {
    status: formState.attending ? "accepted" : "rejected",
    email: formState.email,
    notes: formState.notes,
    primaryGuest: {
      firstName: formState.primaryGuest.firstName,
      lastName: formState.primaryGuest.lastName,
    },
    guests,
  };
}

function invitationToFormState(invitation: UnidentifiedInvitation): FormState {
  return {
    attending: invitation.status === "accepted",
    email: invitation.email,
    notes: invitation.notes,
    primaryGuest: {
      firstName: invitation.primaryGuest.firstName,
      lastName: invitation.primaryGuest.lastName,
    },
    guests: invitation.guests.map((guest) => ({
      firstName: guest.firstName,
      lastName: guest.lastName,
    })),
  };
}
