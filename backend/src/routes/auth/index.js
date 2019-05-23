import express from 'express';
import jwt from 'jsonwebtoken';
import passport from 'passport';

import * as logging from '../../services/logging';
import { frontendAddress, config } from '../../app';

import initJwt from './jwt';
import initGoogle from './google';
import initGithub from './github';
import initAnonymous from './anonymous';

const router = express.Router();
const socialAuthSources = [];

const ADMIN_ROUTE = config.blog['admin-route'];
const ADMIN_EMAILS = config.blog['admin-emails'];
const JWT_SECRET = config.blog['jwt-secret'];
const BLOG_URL = config.blog['url'];
const AUTH_INFO_TOKEN_COOKIE = 'auth-info-token';

if (ADMIN_EMAILS.isEmpty()) {
  throw new Error('blog.admin-emails configuration variable is not set')
}

router.get('/whoami', passport.authenticate('jwt', { session: false }), function (req, res) {
  res.json(req.user);
});

router.get('/auth-sources', function (req, res) {
  res.json(socialAuthSources);
});

router.get('/logout', function (req, res) {
  res.clearCookie(AUTH_INFO_TOKEN_COOKIE);
  res.redirect(BLOG_URL);
});

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((serialized, done) => done(null, serialized));

initJwt(passport);

try {
  initGoogle(passport, router, handleRequest);
  socialAuthSources.push('google');
} catch (e) {
  console.error('Failed to init Google auth:', e.message);
}

try {
  initGithub(passport, router, handleRequest);
  socialAuthSources.push('github');
} catch (e) {
  console.error('Failed to init Github auth:', e.message);
}

if (isAnonymousAuthAllowed()) {
  initAnonymous(passport, router, handleRequest);
  socialAuthSources.push('anonymous');  
}

router.use((err, req, res, next) => {
  redirectToFrontend(res, {
    message: err.message
  });
});

async function handleRequest(req, res) {
  if (! req.user) {
    redirectToFrontend(res, {
      emails: res.locals.profileEmails
    });

    logging.logAuthAttempt({
      email: res.locals.profileEmails,
      success: false
    }, req, res);
    return;
  }

  updateJwtToken(req, res);
  redirectToFrontend(res);

  logging.logAuthAttempt({
    email: req.user.email,
    success: true
  }, req, res);
}

export function getJwtToken(req) {
  return jwt.sign({
    user: req.user
  }, JWT_SECRET);  
}

export function updateJwtToken(req, res) {
  res.cookie('jwt-token', getJwtToken(req), {
    maxAge: 10 * 1000,
    sameSite: 'Lax'
  });
}

export function authInfoTokenMiddleware(req, res, next) {
  const token = req.cookies[AUTH_INFO_TOKEN_COOKIE];
  if (! token) {
    next();
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    try {
      if (decoded.authorizedBy && decoded.authorizedBy !== '_all_') {
        req.isAuthorizedAdmin = true;
      }
    }
    catch (ignored) {}

    next();
  });
}

export function updateAuthInfoToken(req, res) {
  let token = req.cookies[AUTH_INFO_TOKEN_COOKIE];
  if (req.user) {
    token = jwt.sign({
      authorizedBy: req.user.authorizedBy
    }, JWT_SECRET);
  }

  if (! token) {
    return;
  }

  res.cookie(AUTH_INFO_TOKEN_COOKIE, token, {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: 'Lax'
  });  
}

export const passportDefaultCallback = (err, req, res, profile, next) => {
  if (err) {
    return next(err);
  }

  let user = null;
  const profileEmails = profile.emails.map(em => em.value);
  for (const email of profileEmails) {
    const foundRule = ADMIN_EMAILS.match(email);
    if (foundRule) {
      user = {
        name: profile.displayName ? profile.displayName : profile.username,
        authorizedBy: foundRule,
        email
      };
      break;
    }
  }

  if (! user) {
    res.locals.profileEmails = profileEmails;
    res.status(401);
    next(null, false);
    return;
  }

  req.logIn(user, function (err) {
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
    const errorBase64 = Buffer.from(JSON.stringify(loginError)).toString('base64');
    url += '#/login/error/' + errorBase64;
  }

  res.redirect(url);
}

export default router;
