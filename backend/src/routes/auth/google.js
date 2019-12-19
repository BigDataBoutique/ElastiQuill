import _ from "lodash";
import { OAuth2Strategy as GoogleStrategy } from "passport-google-oauth";

import { passportDefaultCallback } from "./index";
import { config } from "../../app";

export default function(passport, router, handleRequest) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: _.get(config, "credentials.google.oauth-client-id"),
        clientSecret: _.get(config, "credentials.google.oauth-client-secret"),
        callbackURL: config.blog.url + "/api/auth/google/callback",
      },
      (accessToken, refreshToken, profile, done) => done(null, profile)
    )
  );

  router.get(
    "/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
      accessType: "offline",
      approvalPrompt: "force",
    })
  );

  router.get(
    "/google/callback",
    function(req, res, next) {
      return passport.authenticate(
        "google",
        {
          failureRedirect: "/login#unknown-user",
        },
        function(err, user) {
          res.locals.authAttemptBackend = "google";
          return passportDefaultCallback(err, req, res, user, next);
        }
      )(req, res, next);
    },
    handleRequest
  );
}
