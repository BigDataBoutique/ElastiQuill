import zlib from 'zlib';
import express from 'express';
import asyncHandler from 'express-async-handler';

import * as commentsService from '../services/comments';
import * as blogPostsService from '../services/blogPosts';
import * as loggingService from '../services/logging';

const router = express.Router();

router.get('/content', asyncHandler(async (req, res) => {
  const comments = await commentsService.getAllComments();
  const posts = await blogPostsService.getAllItems({
    type: 'post',
  });

  res.set({
    'Content-Disposition': 'attachment; filename=backup.json',
    'Content-Type': 'application/json'
  });

  res.json({
    posts,
    comments
  })
}));

router.get('/logs', asyncHandler(async (req, res) => {
  const gzip = zlib.createGzip();
  let requestClosedUnexpectedly = false;

  res.writeHead(200, {
    'Content-Disposition': `attachment;filename=logs.jsonl.gz`
  });

  req.on('close', () => {
    requestClosedUnexpectedly = true;
  });

  gzip.pipe(res);

  const allLogs = loggingService.allLogsGenerator();
  for await (const batch of allLogs) {
    gzip.write(batch
      .map(hit => JSON.stringify(hit._source) + '\n')
      .join(''));
  }
  gzip.end();
}));

export default router;
