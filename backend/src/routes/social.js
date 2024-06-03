import _ from "lodash";
import express from "express";
import asyncHandler from "express-async-handler";

import * as blogPosts from "../services/blogPosts";
import * as social from "../services/social";
import { config } from "../config";
import { preparePost } from "./util";
import * as logging from "../services/logging";

const router = express.Router();

router.get(
  "/availability",
  asyncHandler(async (req, res) => {
    res.json(social.getAvailability(req.user.connected));
  })
);

router.post(
  "/post/linkedin/:id",
  asyncHandler(async (req, res) => {
    const post = await blogPosts.getItemById({ id: req.params.id });
    if (!post) {
      return res.sendStatus(404);
    }
    if (!req.user.connected.linkedin) {
      throw new Error("Linkedin is not connected");
    }

    const link = config.blog.url + preparePost(post).url;
    const imgUrl = post.metadata && post.metadata.header_image_url;
    try {
      const { token, profileId } = req.user.connected.linkedin;
      const resp = await social.postToLinkedin(
        profileId,
        token,
        post.title,
        link,
        imgUrl,
        post.tags
      );
      res.json({
        url: resp.url,
      });
    } catch (err) {
      await logging.logError("update-linkedin-post", err, req, res);
      res.json({
        error: err,
      });
    }
  })
);

router.post(
  "/post/reddit/:id",
  asyncHandler(async (req, res) => {
    const { subreddit } = req.body;

    if (!req.user.connected.reddit) {
      throw new Error("Reddit is not connected");
    }

    const post = await blogPosts.getItemById({ id: req.params.id });
    if (!post) {
      return res.sendStatus(404);
    }
    const link = config.blog.url + preparePost(post).url;
    try {
      const resp = await social.postToReddit(
        req.user.connected.reddit,
        post.title,
        link,
        subreddit
      );
      res.json({
        url: resp.url,
      });
    } catch (err) {
      res.json({
        error: err.message,
      });
    }
  })
);

router.post(
  "/post/twitter/:id",
  asyncHandler(async (req, res) => {
    const post = await blogPosts.getItemById({ id: req.params.id });
    if (!post) {
      return res.sendStatus(404);
    }
    const imgUrl = post.metadata && post.metadata.header_image_url;
    const link = config.blog.url + preparePost(post).url;
    try {
      const resp = await social.postToTwitter(
        post.title,
        link,
        imgUrl,
        post.tags
      );
      res.json({
        url: resp.url,
      });
    } catch (err) {
      res.json({
        error: err,
      });
    }
  })
);

router.post(
  "/post/medium/:id",
  asyncHandler(async (req, res) => {
    const post = await blogPosts.getItemById({ id: req.params.id });
    if (!post) {
      return res.sendStatus(404);
    }
    if (_.get(post, "metadata.medium_crosspost_url")) {
      res.json({
        error: "Item is already cross-posted",
      });
      return;
    }

    try {
      const { url } = await social.postToMedium(
        req.user.connected.medium,
        preparePost(post)
      );

      await blogPosts.updateItemPartial(req.params.id, {
        metadata: {
          medium_crosspost_url: url,
        },
      });

      res.json({ url });
    } catch (err) {
      res.json({
        error: err.message,
      });
    }
  })
);

export default router;
