const {
  HOST,
  DATABASE_URL,
  SESSION_SECRET,
  PASSCODE,
  PHOTOS_URL,
  SMTP_HOST,
  SMTP_PORT,
  NODE_ENV,
  SMTP_USER,
  SMTP_PASSWORD,
  EMAIL_FROM,
} = process.env;

if (!HOST) {
  throw new Error("The 'HOST' environment variable must be set.");
}

// Check environment variables
if (!DATABASE_URL) {
  throw new Error("The 'DATABASE_URL' environment variable must be set.");
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

if (!SMTP_HOST) {
  throw new Error("The 'SMTP_HOST' environment variable must be set.");
}

if (!SMTP_PORT) {
  throw new Error("The 'SMTP_PORT' environment variable must be set.");
}

const smtpPort = Number(SMTP_PORT);

if (Number.isNaN(smtpPort)) {
  throw new Error("The 'SMTP_PORT' environment variable must be a valid number.");
}

if (!SMTP_USER) {
  throw new Error("The 'SMTP_USER' environment variable must be set.");
}

if (!SMTP_PASSWORD) {
  throw new Error("The 'SMTP_PASSWORD' environment variable must be set.");
}

if (!EMAIL_FROM) {
  throw new Error("The 'EMAIL_FROM' environment variable must be set.");
}

export const environment = {
  host: HOST,
  databaseUrl: DATABASE_URL,
  sessionSecret: SESSION_SECRET,
  passcode: PASSCODE,
  photosUrl: PHOTOS_URL,
  smtpHost: SMTP_HOST,
  smtpPort,
  smtpUser: SMTP_USER,
  smtpPassword: SMTP_PASSWORD,
  emailFrom: EMAIL_FROM,
  isProduction: NODE_ENV === "production",
};
