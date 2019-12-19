import _ from "lodash";
import express from "express";
import passport from "passport";
import medium from "medium-sdk";
import asyncHandler from "express-async-handler";

import { getJwtToken, updateJwtToken } from "../auth";
import { config, frontendAddress } from "../../app";

const router = express.Router();

const redirectURL = config.blog.url + "/api/connect/medium/callback";

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const state = getJwtToken(req);

    res.redirect(
      makeClient().getAuthorizationUrl(state, redirectURL, [
        medium.Scope.BASIC_PROFILE,
        medium.Scope.PUBLISH_POST,
      ])
    );
  })
);

router.get(
  "/callback",
  passport.authenticate("jwt", { session: false }),
  asyncHandler(async (req, res) => {
    if (req.query.error) {
      if (req.query.error === "access_denied") {
        res.redirect(frontendAddress() + config.blog["admin-route"]);
        return;
      }

      throw new Error("Medium error: " + req.query.error);
    }

    makeClient().exchangeAuthorizationCode(
      req.query.code,
      redirectURL,
      (err, token) => {
        req.user.connected = req.user.connected || {};
        req.user.connected.medium = { token };
        updateJwtToken(req, res);
        res.redirect(frontendAddress() + config.blog["admin-route"]);
      }
    );
  })
);

export default router;

function makeClient() {
  return new medium.MediumClient({
    clientId: _.get(config, "credentials.medium.client-id"),
    clientSecret: _.get(config, "credentials.medium.client-secret"),
  });
}
