import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import session from "express-session";
import expressJSDocSwagger from "express-jsdoc-swagger";
import dotenv from "dotenv";

import passport from "passport";

import { ensureLoggedIn } from "connect-ensure-login";
import { addNewEmail, serverAdapter } from "./queues/email.queue";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const LocalStrategy = require("passport-local").Strategy;

passport.use(
  new LocalStrategy((username: string, password: string, cb: any) => {
    if (username === "bull" && password === "board") {
      return cb(null, { user: "bull-board" });
    }
    return cb(null, false);
  })
);

passport.serializeUser((user: any, cb) => {
  cb(null, user);
});

passport.deserializeUser((user: any, cb) => {
  cb(null, user);
});

dotenv.config();

const PORT = process.env.PORT || 3000;

const app = express();

app.use(
  session({ secret: "keyboard cat", saveUninitialized: true, resave: true })
);
app.use(bodyParser.json());
app.use(passport.initialize());
app.use(passport.session());

const options = {
  info: {
    version:
      process.env.npm_package_version !== undefined
        ? process.env.npm_package_version
        : "UNDEFINED",
    title: "Effective Altruism UW\u2013Madison API",
    description:
      "API for Effective Altruism UW\u2013Madison website and other services. \
      Facilitates newsletter sign-ups, sending emails, listing events, and more.",
    contact: {
      name: "Effective Altruism UW\u2013Madison",
      url: "https://eauw.org/",
      email: "contact@eauw.org"
    },
    license: {
      name: "MIT"
    }
  },
  servers: [
    { url: "http://localhost:3000", description: "Development server" },
    { url: "https://api.eauw.org", description: "Production server" }
  ],
  baseDir: __dirname,
  filesPattern: "*.+(ts|js)",
  exposeSwaggerUI: true,
  swaggerUIPath: "/docs",
  exposeApiDocs: true,
  apiDocsPath: "/swagger.json",
  notRequiredAsNullable: false
};

expressJSDocSwagger(app)(options);

/**
  Protect queues route
 */
app.get("/ui/login", (req, res) => {
  res.json({ invalid: req.query.invalid === "true" });
});

app.post(
  "/ui/login",
  passport.authenticate("local", { failureRedirect: "/ui/login?invalid=true" }),
  (req, res) => {
    res.redirect("/ui");
  }
);

/**
  Use queue for Bull Board
 */
serverAdapter.setBasePath("/queues");
app.use(
  "/queues",
  ensureLoggedIn({ redirectTo: "/ui/login" }),
  serverAdapter.getRouter()
);

/**
 * POST /email
 * @summary Attempts to add email to list
 *          (Google Sheets and Google Groups)
 *          by dispatching a queue worker.
 *          A confirmation email is also sent.
 * @tags email
 * @param {string} firstName.query.required - the first name to add to the list
 * @param {string} email.query.required - the email to add to the list
 * @return {object} 200 - success response - application/json
 * @example response - 200 - success response example
 * {
 *  "message": "email registered."
 * }
 * @return {object} 400 - Bad request response
 * @example response - 400 - Bad request response example
 * {
 *  "error": "missing email!"
 * }
 * @return {object} 500 - error response
 * @example response - 500 - error response example
 * {
 *  "error": "null has no properties"
 * }
 */
app.post("/email", async (req: Request, res: Response) => {
  try {
    const { firstName, email } = req.body;
    if (firstName === null && email === null) {
      return res.status(400).json({ error: "missing first name and email!" });
    }
    if (firstName === null) {
      return res.status(400).json({ error: "missing first name!" });
    }
    if (email === null) {
      return res.status(400).json({ error: "missing email!" });
    }
    await addNewEmail(email, firstName);
  } catch (error: any) {
    return res.status(500).json({ error: error.toString() });
  }

  return res.status(200).json({ message: "email registered." });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`listening on port ${PORT}`);
});
