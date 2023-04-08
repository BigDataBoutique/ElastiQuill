import _ from "lodash";
import { Strategy as GitHubStrategy } from "passport-github";

import { API_ROUTE } from "../index";
import { passportDefaultCallback } from "./index";
import { config } from "../../config";

export default function(passport, router, handleRequest) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: _.get(config, "credentials.github.oauth-client-id"),
        clientSecret: _.get(config, "credentials.github.oauth-client-secret"),
        callbackURL: config.blog.url + API_ROUTE + "/auth/github/callback",
        scope: "user:email",
      },
      (accessToken, refreshToken, profile, done) => done(null, profile)
    )
  );

  router.get("/github", passport.authenticate("github"));

  router.get(
    "/github/callback",
    function(req, res, next) {
      return passport.authenticate(
        "github",
        {
          failureRedirect: "/login#unknown-user",
        },
        function(err, user) {
          res.locals.authAttemptBackend = "github";
          return passportDefaultCallback(err, req, res, user, next);
        }
      )(req, res, next);
    },
    handleRequest
  );
}
