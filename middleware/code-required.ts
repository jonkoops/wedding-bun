import { Router, type Request, type Response } from "express";
import { environment } from "../environment";

export const codeRequired = Router();

codeRequired.get("/", (req, res, next) => {
  const { authorized } = req.session;
  
  // If the user is authorized, continue to the next handler.
  if (authorized) {
    return next();
  }

  // Otherwise, render the code form.
  return renderCodeForm(req, res);
});

codeRequired.post("/", (req, res, next) => {
  const { authorized } = req.session;
  
  // If the user is authorized, continue to the next handler.
  if (authorized) {
    return next();
  }

  const { code } = req.body;

  // If the user has not yet entered a code, render the code form.
  if (typeof code !== "string") {
    // Optionally show an error message if the user's session has expired when submitting a form.
    const sessionExpired = req.method === "POST";
    return renderCodeForm(req, res, { sessionExpired });
  }

  // Check if the submitted code matches our super secret passcode.
  const isValid = code.toLowerCase() === environment.passcode.toLowerCase();  

  // If the code is valid, mark the user as authorized and redirect back to the original URL.
  if (isValid) {
    req.session.authorized = true;
    return res.redirect(req.originalUrl);
  }

  // Otherwise, render the code form with an error message.
  return renderCodeForm(req, res, { invalidCode: true });
});

interface CodeFormParams {
  invalidCode?: boolean;
  sessionExpired?: boolean;
}

function renderCodeForm(req: Request, res: Response, params: CodeFormParams = {}) {
  const isRsvpPage = req.baseUrl === "/rsvp";

  res.render("code/form", {
    ...params,
    isRsvpPage
  });
}
