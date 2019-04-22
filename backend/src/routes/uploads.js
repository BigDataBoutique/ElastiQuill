import express from 'express';

import * as storage from '../services/storage';
import * as blogPosts from '../services/blogPosts';

const router = express.Router();

const uploadHandler = storage.getUploadHandler({
  filenamePrefix(req, file) {
    if (req.query.post_id) {
      return req.query.post_id.substring(blogPosts.BLOGPOST_ID_PREFIX.length) + '_';
    }
  }
});

router.post('/image', uploadHandler, (req, res) => {
  res.json({
    files: req.files.map(f => ({
      url: f.path || f.location
    }))
  });
});

export default router;
