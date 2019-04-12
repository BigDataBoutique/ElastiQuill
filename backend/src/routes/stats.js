import _ from 'lodash';
import express from 'express';
import asyncHandler from 'express-async-handler';

import * as logging from '../services/logging';
import * as comments from '../services/comments';
import * as blogPosts from '../services/blogPosts';
import { preparePost, prepareComments, blogpostUrl } from './util';

const router = express.Router();

router.get('/:type(post|page)/:id', asyncHandler(async (req, res) => {
  const stats = await logging.getStats({
    type: req.params.type,
    postId: req.params.id
  });

  res.json(stats);
}));

router.get('/visits', asyncHandler(async (req, res) => {
  const stats = await logging.getStats({
    startDate: null,
    endDate: null
  });

  stats.popular_posts = stats.popular_posts.map(preparePost);

  res.json(stats);
}));

router.get('/comments', asyncHandler(async (req, res) => {
  const { recentComments, mostCommentedPosts } = await comments.getCommentsStats({
    postId: req.query.post_id || null
  });
  const posts = await blogPosts.getItemsByIds(recentComments.map(c => c.post_id));

  res.json({
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
