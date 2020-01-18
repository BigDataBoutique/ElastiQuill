import _ from "lodash";
import express from "express";
import asyncHandler from "express-async-handler";

import * as logging from "../services/logging";
import * as comments from "../services/comments";
import * as blogPosts from "../services/blogPosts";
import { preparePost, prepareComments } from "./util";

const router = express.Router();

router.get(
  "/all",
  asyncHandler(async (req, res) => {
    const interval = req.query.interval || "1d";
    const startDate = req.query.start ? new Date(req.query.start) : null;

    const stats = await logging.getStats({
      interval,
      startDate,
      type: req.query.type,
      postId: req.query.item_id,
    });

    const { commentsByDate } = await comments.getStats({
      interval,
      startDate,
      postId: req.query.item_id || null,
    });

    let most_viewed_post = preparePost(stats.most_viewed_post) || {};
    stats.most_viewed_post = {
      title: most_viewed_post.title,
      url: most_viewed_post.url,
      full_url: most_viewed_post.full_url,
      published_at: most_viewed_post.published_at,
      comments_count: most_viewed_post.comments_count,
      views_count: most_viewed_post.views_count,
      visitors_count: most_viewed_post.visitors_count,
    };
    stats.comments_by_date = commentsByDate;
    stats.popular_posts = stats.popular_posts.map(preparePost);

    if (!req.query.item_id) {
      const { postsCount, postsByDate } = await blogPosts.getStats({
        type: "post",
        startDate,
        interval,
      });
      stats.posts_count = postsCount;
      stats.posts_by_date = postsByDate;
    }

    res.json(stats);
  })
);

router.get(
  "/comments",
  asyncHandler(async (req, res) => {
    const {
      commentsByDate,
      commentsCount,
      recentComments,
      mostCommentedPosts,
    } = await comments.getStats({
      postId: req.query.post_id || null,
    });
    const posts = await blogPosts.getItemsByIds(
      _.uniqBy(recentComments.map(c => c.post_id))
    );

    res.json({
      comments_count: commentsCount,
      comments_by_date: commentsByDate,
      recent_comments: prepareComments(
        recentComments.map(c => {
          const post = _.find(posts, ["id", c.post_id]);
          if (post) {
            const prepared = preparePost(post);
            c.url = prepared.url + "#" + c.comment_id;
            c.post_title = prepared.title;
            c.post_url = prepared.url;
          }
          return c;
        })
      ),
      most_commented_posts: mostCommentedPosts.map(preparePost),
    });
  })
);

export default router;
