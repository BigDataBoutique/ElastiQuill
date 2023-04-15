import express from "express";
import passport from "passport";
import querystring from "querystring";
import asyncHandler from "express-async-handler";
import request from "request-promise";

import { getJwtToken, updateJwtToken } from "../auth";
import { frontendAddress } from "../../app";
import { config } from "../../config";

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.redirect(
      "https://www.linkedin.com/oauth/v2/authorization?" +
        querystring.stringify({
          response_type: "code",
          client_id: config.credentials.linkedin["client-id"],
          redirect_uri:
            config.blog.url +
            config.blog["api-route"] +
            "/connect/linkedin/callback",
          state: getJwtToken(req),
          scope: "r_liteprofile r_emailaddress w_member_social",
        })
    );
  })
);

router.get(
  "/callback",
  passport.authenticate("jwt", { session: false }),
  asyncHandler(async (req, res) => {
    if (req.query.error) {
      if (
        req.query.error === "user_cancelled_login" ||
        req.query.error === "user_cancelled_authorize"
      ) {
        res.redirect(frontendAddress() + config.blog["admin-route"]);
        return;
      }
      throw new Error("Linkedin error: " + req.query.error);
    }

    const accessTokenResp = await request({
      url: "https://www.linkedin.com/oauth/v2/accessToken",
      qs: {
        grant_type: "authorization_code",
        code: req.query.code,
        redirect_uri:
          config.blog.url +
          config.blog["api-route"] +
          "/connect/linkedin/callback",
        client_id: config.credentials.linkedin["client-id"],
        client_secret: config.credentials.linkedin["client-secret"],
      },
    });

    const token = JSON.parse(accessTokenResp).access_token;
    const profile = JSON.parse(
      await request(
        "https://api.linkedin.com/v2/me?oauth2_access_token=" + token
      )
    );

    req.user.connected = req.user.connected || {};
    req.user.connected.linkedin = {
      token,
      profileId: profile.id,
    };
    updateJwtToken(req, res);

    res.redirect(frontendAddress() + config.blog["admin-route"]);
  })
);

export default router;
