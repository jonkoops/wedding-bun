import express from "express";
import session from "express-session";
import { Liquid } from "liquidjs";
import stringifyObject from "stringify-object";

import { initializeDocument } from "./db/db";
import { environment } from "./environment";
import { rsvpRouter } from "./routes/rsvp";

// Initialize database document
await initializeDocument();

// Set up Express
const app = express();

// Configure view engine
const liquid = new Liquid({
  extname: ".liquid",
  outputEscape: "escape",
  cache: environment.isProduction,
});

liquid.registerFilter("stringifyObject", (value) => stringifyObject(value));

app.engine("liquid", liquid.express());
app.set("views", "./views");
app.set("view engine", "liquid");

// Trust the first proxy when running in production, needed to enable secure cookies.
if (environment.isProduction) {
  app.set("trust proxy", 1);
}

// Configure session middleware
app.use(
  session({
    name: "session",
    resave: false,
    rolling: true,
    saveUninitialized: false,
    secret: environment.sessionSecret,
    cookie: {
      domain: environment.domain,
      httpOnly: true,
      // Expire after 10 minutes of inactivity
      maxAge: 10 * 60 * 1000,
      sameSite: "strict",
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
app.get("/travel-and-accommodations", (req, res) => res.render("travel-and-accommodations"));
app.get("/photos", (req, res) => res.render("photos"));

// Dynamic routes
app.use("/rsvp", rsvpRouter);

// Runtime client dependencies
app.use(
  "/vendor/alpinejs.js",
  express.static("node_modules/alpinejs/dist/module.esm.min.js"),
);

// Start server
app.listen(3000, "0.0.0.0");
