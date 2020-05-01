import url from "url";
import express from "express";
import asyncHandler from "express-async-handler";

import * as comments from "../services/comments";
import * as blogPosts from "../services/blogPosts";
import {
  blogpostUrl,
  pageUrl,
  isItemEditable,
  preparePost,
  prepareComments,
} from "./util";
import { config } from "../config";

const router = express.Router();

router.get(
  "/tags",
  asyncHandler(async (req, res) => {
    const { tags, series } = await blogPosts.getAllTags();
    res.json({
      tags,
      series,
    });
  })
);

router.get(
  "/:type(post|page)",
  asyncHandler(async (req, res) => {
    const type = req.params.type;
    const pageIndex = req.query.page_index || 0;
    const searchQuery = req.query.query.length ? req.query.query : null;
    const hideUnpublished = req.query.hideUnpublished == "true";

    const { items, totalPages } = await blogPosts.getItems({
      type,
      pageIndex,
      search: searchQuery,
      includePrivatePosts: !hideUnpublished,
      pageSize: 10,
    });

    let getUrl = null;
    switch (type) {
      case "post":
        getUrl = blogpostUrl;
        break;
      case "page":
        getUrl = pageUrl;
        break;
    }

    const processedItems = items
      .filter(it => {
        if (req.user.role === "admin" || it.is_published === true) {
          return true;
        }
        return req.user.emails.includes(it.author.email);
      })
      .map(it => ({
        ...it,
        url: getUrl(it),
        is_editable: isItemEditable(it, req.user),
        full_url: url.resolve(config.blog.url, getUrl(it)),
        draft: req.user.emails.includes(it.author.email) ? it.draft : null,
      }));

    res.json({
      items: processedItems,
      total_pages: totalPages,
    });
  })
);

router.get(
  "/post/:postId/comment",
  asyncHandler(async (req, res) => {
    const data = await comments.getComments({
      postIds: [req.params.postId],
      disableFiltering: true,
    });

    const post = await blogPosts.getItemById({ id: req.params.postId });
    const prepared = preparePost(post);

    res.json(
      prepareComments(data, false, c => {
        c.url = prepared.url + "#" + c.comment_id;
      })
    );
  })
);

router.get(
  "/:type(post|page)/:id",
  asyncHandler(async (req, res) => {
    const withComments = req.params.type === "post";
    const item = await blogPosts.getItemById({
      id: req.params.id,
      withComments,
    });
    item.url = blogpostUrl(item);
    res.json(item);
  })
);

router.post(
  "/:type(post|page)",
  asyncHandler(async (req, res) => {
    try {
      const email =
        req.user.authorizedBy === "_all_"
          ? req.user.emails[0]
          : req.user.authorizedBy;
      const newId = await blogPosts.createItem(req.params.type, {
        ...req.body,
        author: {
          name: req.user.name,
          email,
          website: "",
        },
      });
      const item = await blogPosts.getItemById({ id: newId });

      res.json({ error: null, id: newId, url: blogpostUrl(item) });
    } catch (err) {
      if (err.isJoi) {
        res.status(400).json({
          error: err.message,
        });
      } else if (err.displayName === "Conflict") {
        res.status(409).json({
          error: err.displayName,
        });
      } else {
        console.error(err);
        res.status(500).json({ error: "Server error" });
      }
    }
  })
);

router.delete(
  "/:type(post|page)/:id",
  asyncHandler(async (req, res) => {
    try {
      const item = await blogPosts.getItemById({ id: req.params.id });
      if (!isItemEditable(item, req.user)) {
        res.sendStatus(400);
        return;
      }

      await blogPosts.deleteItem(req.params.id);
      res.json({ error: null });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  })
);

router.post(
  "/:type(post|page)/:id",
  asyncHandler(async (req, res) => {
    try {
      const item = await blogPosts.getItemById({ id: req.params.id });
      if (!isItemEditable(item, req.user)) {
        res.sendStatus(400);
        return;
      }

      await blogPosts.updateItem(req.params.id, req.params.type, req.body);
      res.json({ error: null, id: req.params.id, url: blogpostUrl(item) });
    } catch (err) {
      if (err.isJoi) {
        res.status(400).json({
          error: err.message,
        });
      } else {
        console.error(err);
        res.status(500).json({ error: "Server error" });
      }
    }
  })
);

router.delete(
  "/comment/:path",
  asyncHandler(async (req, res) => {
    try {
      await comments.deleteComment(req.params.path.split(","));
      res.json({
        error: null,
      });
    } catch (err) {
      res.json({
        error: err.message,
      });
    }
  })
);

router.post(
  "/comment/:path",
  asyncHandler(async (req, res) => {
    try {
      await comments.updateComment(req.params.path.split(","), {
        spam: req.body.spam,
        approved: !req.body.spam,
      });
      res.json({
        error: null,
      });
    } catch (err) {
      res.json({
        error: err.message,
      });
    }
  })
);

export default router;
