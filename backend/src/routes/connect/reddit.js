import express from "express";
import passport from "passport";
import querystring from "querystring";
import asyncHandler from "express-async-handler";

import { getJwtToken, updateJwtToken } from "../auth";
import { config, frontendAddress } from "../../app";
import * as social from "../../services/social";

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.redirect(
      "https://www.reddit.com/api/v1/authorize?" +
        querystring.stringify({
          response_type: "code",
          duration: "permanent",
          client_id: config.credentials.reddit["client-id"],
          redirect_uri: config.blog.url + "/api/connect/reddit/callback",
          state: getJwtToken(req),
          scope: "submit",
        })
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

      throw new Error("Reddit error: " + req.query.error);
    }

    const resp = await social.fetchRedditAccessToken({
      code: req.query.code,
      callback: config.blog.url + "/api/connect/reddit/callback",
    });

    req.user.connected = req.user.connected || {};
    req.user.connected.reddit = resp;
    updateJwtToken(req, res);

    res.redirect(frontendAddress() + config.blog["admin-route"]);
  })
);

export default router;
