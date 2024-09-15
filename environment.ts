const { DATABASE_URL, SESSION_SECRET, PASSCODE, PHOTOS_URL, NODE_ENV } = process.env;

// Check environment variables
if (!DATABASE_URL) {
  throw new Error("The 'DATABASE_URL) environment variable must be set.");
}

if (!SESSION_SECRET) {
  throw new Error("The 'SESSION_SECRET' environment variable must be set.");
}

if (!PASSCODE) {
  throw new Error("The 'PASSCODE' environment variable must be set.");
}

if (!PHOTOS_URL) {
  throw new Error("The 'PHOTOS_URL' environment variable must be set.");
}

export const environment = {
  databaseUrl: DATABASE_URL,
  sessionSecret: SESSION_SECRET,
  passcode: PASSCODE,
  photosUrl: PHOTOS_URL,
  isProduction: NODE_ENV === "production",
};
