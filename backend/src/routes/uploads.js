import _ from 'lodash';
import express from 'express';
import passport from 'passport';
import asyncHandler from 'express-async-handler';

import * as storage from '../services/storage';

const router = express.Router();

router.post('/image', storage.getUploadHandler(), (req, res) => {
  res.json({
    files: req.files.map(f => ({
      url: f.path || f.location
    }))
  });
});

export default router;
