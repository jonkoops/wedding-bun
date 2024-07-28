import "express-session";

declare module "express-session" {
  interface SessionData {
    authorized: true;
    invitationId: string;
  }
}
