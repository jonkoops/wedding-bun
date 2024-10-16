import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { createInvitation, getInvitationByCode, getInvitationByEmail, getInvitationById, updateInvitation } from "../db/queries";
import type { Guest, UnidentifiedInvitation } from "../db/schema";
import { codeRequired } from "../middleware/code-required";
import { sendRsvpConfirmedMail, sendRsvpDetailsMail } from "../misc/email";
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

rsvpRouter.use(codeRequired);

rsvpRouter.get("/", async (req, res) => {
  const { invitationId } = req.session;

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
  return renderConfirmationForm(req, res, { isNew: false, formState: invitationToFormState(invitation) });
});

rsvpRouter.post("/", async (req, res) => {
  const { invitationId } = req.session;

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
      return renderConfirmationForm(req, res, {
        isNew: true,
        emailTaken: true,
        formState
      });
    }

    const updatedInvitationId = typeof originalInvitation !== 'undefined'
      ? await updateInvitation({ ...originalInvitation, ...parsedFormState })
      : await createInvitation(parsedFormState);

    // Store the invitation ID in the session so it can be retrieved later.
    req.session.invitationId = updatedInvitationId;

    const didCreate = typeof originalInvitation === 'undefined';
    const updatedInvitation = await getInvitationById(updatedInvitationId);

    // Should never happen, but let's handle it anyways.
    if (!updatedInvitation) {
      console.error("Could not send RSVP mail, no invitation found.");
      return renderError(req, res);
    }

    // Send the RSVP confirmation email to the guest if the invitation was created.
    if (didCreate) {
      await sendRsvpConfirmedMail(updatedInvitation);
    }

    // Send the RSVP details email to the 'back office'.
    await sendRsvpDetailsMail(updatedInvitation, didCreate);

    return renderConfirmationForm(req, res, {
      isNew: false,
      didCreate: didCreate,
      didUpdate: !didCreate,
      formState: invitationToFormState(parsedFormState)
    });
  } catch (error) {
    console.error("Error updating invitation:", error);
    return renderError(req, res);
  }
});

rsvpRouter.get("/:code", async (req, res) => {
  const code = req.params.code;
  
  if (typeof code !== "string") {
    return renderError(req, res);
  }
  
  let invite;

  try {
    invite = await getInvitationByCode(code);
  } catch (error) {
    return renderError(req, res);
  }

  if (typeof invite === "undefined") {
    return renderError(req, res);
  }

  req.session.authorized = true;
  req.session.invitationId = invite.id;

  res.redirect(301, "/rsvp");
});

interface ConfirmationFormParams {
  isNew: boolean;
  didCreate?: boolean;
  didUpdate?: boolean;
  emailTaken?: boolean;
  formState: FormState;
}

function renderConfirmationForm(
  req: Request,
  res: Response,
  params: ConfirmationFormParams = { isNew: true, formState: DEFAULT_INVITE_FORM_STATE },
) {
  res.render("rsvp-confirm", params);
}

function renderError(req: Request, res: Response) {
  res
    .status(500)
    .render("rsvp-error");
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
