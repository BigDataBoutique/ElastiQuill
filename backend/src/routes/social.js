import express from 'express';
import asyncHandler from 'express-async-handler';

import * as blogPosts from '../services/blogPosts';
import * as social from '../services/social';
import { config } from '../app';
import { preparePost } from './util';

const router = express.Router();

router.get('/availability', asyncHandler(async (req, res) => {
  res.json(social.getAvailability(req.user.connected));
}));

router.post('/post/linkedin/:id', asyncHandler(async (req, res) => {
  const post = await blogPosts.getItemById(req.params.id);
  if (! req.user.connected.linkedin) {
    throw new Error('Linkedin is not connected');
  }

  const link = config.blog.url + preparePost(post).url;
  try {
    const { token, profileId } = req.user.connected.linkedin;
    const resp = await social.postToLinkedin(profileId, token, post.title, link);
    res.json({
      url: resp.url
    });
  }
  catch (err) {
    console.log(err);
    res.json({
      error: err
    });
  }
}));

router.post('/post/reddit/:id', asyncHandler(async (req, res) => {
  const { subreddit } = req.body;

  const post = await blogPosts.getItemById(req.params.id);
  const link =  config.blog.url + preparePost(post).url;
  try {
    const resp = await social.postToReddit(post.title, link, subreddit);
    res.json({
      url: resp.url
    });
  }
  catch (err) {
    res.json({
      error: err.message
    });
  }
}));

router.post('/post/twitter/:id', asyncHandler(async (req, res) => {
  const post = await blogPosts.getItemById(req.params.id);
  const link =  config.blog.url + preparePost(post).url;
  try {
    const resp = await social.postToTwitter(`${post.title} ${link}`);
    res.json({
      url: resp.url
    });
  }
  catch (err) {
    res.json({
      error: err
    });
  }
}));

export default router;
