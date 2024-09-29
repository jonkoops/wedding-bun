import { createTransport } from "nodemailer";

import type { UnidentifiedInvitation } from "../db/schema";
import { environment } from "../environment";
import { liquid } from "./liquid";

const transporter = createTransport({
  host: environment.smtpHost,
  port: environment.smtpPort,
  auth: {
    user: environment.smtpUser,
    pass: environment.smtpPassword,
  }
});

export async function sendRsvpConfirmedMail(invite: UnidentifiedInvitation) {
  const html = await renderRsvpConfirmed(invite);

  await transporter.sendMail({
    from: environment.emailFrom,
    to: invite.email,
    subject: "RSVP Confirmed!",
    html,
  });
}


function renderRsvpConfirmed(invite: UnidentifiedInvitation) {
  return liquid.renderFile("email/rsvp-confirmed", invite);
}
