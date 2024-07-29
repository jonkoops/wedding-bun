const { SESSION_SECRET, PASSCODE, NODE_ENV } = process.env;

// Check environment variables
if (!SESSION_SECRET) {
  throw new Error("The 'SESSION_SECRET' environment variable must be set.");
}

if (!PASSCODE) {
  throw new Error("The 'PASSCODE' environment variable must be set.");
}

export const environment = {
  sessionSecret: SESSION_SECRET,
  passcode: PASSCODE,
  isProduction: NODE_ENV === "production",
};
