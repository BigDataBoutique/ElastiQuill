import _ from 'lodash';
import express from 'express';
import asyncHandler from 'express-async-handler';

import * as logging from '../services/logging';
import * as comments from '../services/comments';
import * as blogPosts from '../services/blogPosts';
import { preparePost, prepareComments, blogpostUrl } from './util';

const router = express.Router();

router.get('/all', asyncHandler(async (req, res) => {
  const interval = req.query.interval || '1d';
  const startDate = new Date(req.query.start);

  const stats = await logging.getStats({
    interval,
    startDate,
    type: req.query.type,
    postId: req.query.item_id,
  });

  const { commentsByDate } = await comments.getStats({
    interval,
    startDate,
    postId: req.query.item_id || null
  });

  stats.comments_by_date = commentsByDate;
  stats.popular_posts = stats.popular_posts.map(preparePost);


  if (! req.query.item_id) {
    const { postsCount, postsByDate  } = await blogPosts.getStats({ startDate, interval });
    stats.posts_count = postsCount;
    stats.posts_by_date = postsByDate;
  }

  res.json(stats);
}));

router.get('/comments', asyncHandler(async (req, res) => {
  const { commentsByDate, commentsCount, recentComments, mostCommentedPosts } = await comments.getStats({
    postId: req.query.post_id || null
  });
  const posts = await blogPosts.getItemsByIds(recentComments.map(c => c.post_id));

  res.json({
    comments_count: commentsCount,
    comments_by_date: commentsByDate,
    recent_comments: recentComments.map(c => {
      const post = _.find(posts, ['id', c.post_id]);
      if (post) {
        const prepared = preparePost(post);
        c.url = prepared.url + '#' + c.comment_id;
        c.post_title = prepared.title;
        c.post_url = prepared.url;
      }
      return c;
    }),
    most_commented_posts: mostCommentedPosts.map(preparePost)
  });
}));


export default router;
