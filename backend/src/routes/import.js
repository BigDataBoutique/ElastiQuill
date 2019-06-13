import _ from 'lodash';
import Joi from 'joi';
import express from 'express';
import request from 'request-promise';
import asyncHandler from 'express-async-handler';

import * as blogPosts from '../services/blogPosts';

const router = express.Router();

router.post('/', asyncHandler(async (req, res) => {
  const url = _.trimEnd(req.body.url, '/')
  const jsonUrl = url.endsWith('.json') ? url : url + '.json';

  let resp;
  try {
    resp = JSON.parse(await request.get(jsonUrl));
    if (resp.tags) {
      resp.tags = resp.tags.map(t => t.key);
    }
  }
  catch (err) {
    throw new Error('Failed to fetch ' + jsonUrl);
  }

  const result = Joi.validate(resp, blogPosts.CreatePostArgSchema, {
    allowUnknown: true,
    stripUnknown: true
  });

  if (result.error) {
    throw result.error;
  }

  const createPostArgs = _.set(result.value, 'metadata.canonical_url', url);
  const postId = await blogPosts.createItem('post', createPostArgs);

  res.json({
    post_id: postId
  });
}));

export default router;
