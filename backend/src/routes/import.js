import _ from "lodash";
import Joi from "joi";
import express from "express";
import axios from "axios";
import asyncHandler from "express-async-handler";

import * as blogPosts from "../services/blogPosts";

const router = express.Router();

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { url: rawUrl, keep_canonical_url, publish_now } = req.body;

    const url = _.trimEnd(rawUrl, "/");
    const jsonUrl = url.endsWith(".json") ? url : url + ".json";

    let resp;
    try {
      const response = await axios.get(jsonUrl);
      resp = response.data;
      if (resp.tags) {
        resp.tags = resp.tags.map(t => t.key);
      }
      resp.is_published = publish_now;
      _.set(resp, "metadata.canonical_url", keep_canonical_url ? url : null);
    } catch (err) {
      throw new Error("Failed to fetch " + jsonUrl);
    }

    const result = blogPosts.CreatePostArgSchema.validate(resp, {
      allowUnknown: true,
      stripUnknown: true,
    });

    if (result.error) {
      throw result.error;
    }

    const postId = await blogPosts.createItem("post", result.value);

    res.json({
      post_id: postId,
    });
  })
);

export default router;
