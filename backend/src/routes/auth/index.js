import express from "express";
import jwt from "jsonwebtoken";
import passport from "passport";

import * as logging from "../../services/logging";
import { frontendAddress } from "../../app";
import { config } from "../../config";

import initJwt from "./jwt";
import initGoogle from "./google";
import initGithub from "./github";
import initAnonymous from "./anonymous";

const router = express.Router();
const socialAuthSources = [];

const ADMIN_ROUTE = config.blog["admin-route"];
const ADMIN_EMAILS = config.blog["admin-emails"];
const PUBLISHER_EMAILS = config.blog["publisher-emails"];
const JWT_SECRET = config.blog["jwt-secret"];
const BLOG_URL = config.blog["url"];
const VALID_ROLES = ["admin", "publisher"];
export const AUTH_INFO_TOKEN_COOKIE = "auth-info-token";

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

if (ADMIN_EMAILS.isEmpty()) {
  throw new Error("blog.admin-emails configuration variable is not set");
}

router.get(
  "/whoami",
  passport.authenticate("jwt", { session: false }),
  function(req, res) {
    updateUserRole(req);
    res.json(req.user);
  }
);

router.get("/auth-sources", function(req, res) {
  res.json(socialAuthSources);
});

router.get("/logout", function(req, res) {
  res.clearCookie(AUTH_INFO_TOKEN_COOKIE);
  res.redirect(303, BLOG_URL);
});

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((serialized, done) => done(null, serialized));

initJwt(passport);

try {
  initGoogle(passport, router, handleRequest);
  socialAuthSources.push("google");
} catch (e) {
  console.error("Failed to init Google auth:", e.message);
}

try {
  initGithub(passport, router, handleRequest);
  socialAuthSources.push("github");
} catch (e) {
  console.error("Failed to init Github auth:", e.message);
}

if (isAnonymousAuthAllowed()) {
  initAnonymous(passport, router, handleRequest);
  socialAuthSources.push("anonymous");
}

router.use((err, req, res) => {
  redirectToFrontend(res, {
    message: err.message,
  });
});

async function handleRequest(req, res) {
  if (!req.user) {
    redirectToFrontend(res, {
      emails: res.locals.profileEmails,
    });

    logging.logAuthAttempt(
      {
        email: res.locals.profileEmails,
        success: false,
      },
      req,
      res
    );
    return;
  }

  updateJwtToken(req, res);
  redirectToFrontend(res);

  logging.logAuthAttempt(
    {
      email: req.user.authorizedBy,
      success: true,
    },
    req,
    res
  );
}

export function getJwtToken(req) {
  return jwt.sign(
    {
      user: req.user,
    },
    JWT_SECRET
  );
}

export function updateJwtToken(req, res) {
  res.cookie("jwt-token", getJwtToken(req), {
    maxAge: 10 * 1000,
    sameSite: "Lax",
  });
}

export function authInfoTokenMiddleware(req, res, next) {
  const token = req.cookies[AUTH_INFO_TOKEN_COOKIE];
  if (!token) {
    next();
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    try {
      if (decoded.authorizedBy && decoded.authorizedBy !== "_all_") {
        req.isAuthorizedAdmin = true;
      }
    } catch (ignored) {
      // Ignored
    }

    next();
  });
}

export function updateUserRole(req) {
  let role = null;

  if (ADMIN_EMAILS.match(req.user.authorizedBy)) {
    role = "admin";
  } else if (PUBLISHER_EMAILS.match(req.user.authorizedBy)) {
    role = "publisher";
  }

  if (role) {
    req.user.role = role;
  }
}

export function updateAuthInfoToken(req, res) {
  let token = req.cookies[AUTH_INFO_TOKEN_COOKIE];
  if (req.user) {
    token = createAuthInfoToken(req.user.authorizedBy);
  }

  if (!token) {
    return;
  }

  res.cookie(AUTH_INFO_TOKEN_COOKIE, token, {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: "Lax",
  });
}

export function createAuthInfoToken(authorizedBy) {
  return jwt.sign(
    {
      authorizedBy,
    },
    JWT_SECRET
  );
}

export function restrictRolesMiddleware(...roles) {
  for (const role of roles) {
    if (!VALID_ROLES.includes(role)) {
      throw new Error("Invalid role " + role);
    }
  }

  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      const error = new Error("You are not allowed to access this API.");
      error.status = 403;
      next(error);
      return;
    }
    next();
  };
}

export const passportDefaultCallback = (err, req, res, profile, next) => {
  if (err) {
    return next(err);
  }

  let user = null;
  const profileEmails = profile.emails.map(em => em.value);
  for (const email of profileEmails) {
    const foundRule =
      ADMIN_EMAILS.match(email) || PUBLISHER_EMAILS.match(email);
    if (foundRule) {
      user = {
        name: profile.displayName ? profile.displayName : profile.username,
        authorizedBy: foundRule,
        emails: profileEmails,
      };
      break;
    }
  }

  if (!user) {
    res.locals.profileEmails = profileEmails;
    res.status(401);
    next(null, false);
    return;
  }

  req.logIn(user, function(err) {
    if (err) {
      return next(err);
    }

    return next();
  });
};

function isAnonymousAuthAllowed() {
  return socialAuthSources.length === 0 && ADMIN_EMAILS.isMatchAll();
}

function redirectToFrontend(res, loginError) {
  let url = frontendAddress() + ADMIN_ROUTE;
  if (loginError) {
    const errorBase64 = Buffer.from(JSON.stringify(loginError)).toString(
      "base64"
    );
    url += "#/login/error/" + errorBase64;
  }

  res.redirect(url);
}

export default router;
