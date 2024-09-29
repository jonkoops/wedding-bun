import express from "express";
import session from "express-session";

import { initializeDatabase } from "./db/db";
import { environment } from "./environment";
import { DrizzleStore } from "./misc/drizzle-store";
import { liquid } from "./misc/liquid";
import { photosRouter } from "./routes/photos";
import { rsvpRouter } from "./routes/rsvp";

// Initialize database
await initializeDatabase();

// Set up Express
const app = express();

// Configure view engine
app.engine("liquid", liquid.express());
app.set("view engine", "liquid");

// Trust the first proxy when running in production, needed to enable secure cookies.
if (environment.isProduction) {
  app.set("trust proxy", 1);
}

// Redirect requests to 'www' subdomain to the root domain.
app.use((req, res, next) => {
  if (req.subdomains.at(-1) === "www") {
    res.redirect(301, `https://${req.hostname.replace("www.", "")}${req.url}`);
  } else {
    next();
  }
});

// Configure session middleware
const drizzleStore = new DrizzleStore();

app.use(
  session({
    store: drizzleStore,
    name: "session",
    resave: false,
    rolling: true,
    saveUninitialized: false,
    secret: environment.sessionSecret,
    cookie: {
      httpOnly: true,
      // Expire after 10 minutes of inactivity
      maxAge: 10 * 60 * 1000,
      sameSite: "lax",
      secure: environment.isProduction,
    },
  }),
);

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));

// Files to be served statically.
app.use(express.static("public"));

// Static page routes
app.get("/", (req, res) => res.render("index"));
app.get("/the-wedding", (req, res) => res.render("the-wedding"));
app.get("/travel-and-stay", (req, res) => res.render("travel-and-stay"));

// Dynamic routes
app.use("/rsvp", rsvpRouter);
app.use("/photos", photosRouter);

// Runtime client dependencies
app.use(
  "/vendor/alpinejs.js",
  express.static("node_modules/alpinejs/dist/module.esm.min.js"),
);

// Start server
app.listen(3000, "0.0.0.0");
