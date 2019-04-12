import express from 'express';
import asyncHandler from 'express-async-handler';

import * as cache from '../services/cache';
import * as blogPosts from '../services/blogPosts';
import { blogpostUrl, pageUrl } from './util';

const router = express.Router();

router.get('/tags', asyncHandler(async (req, res) => {
  const tags = await blogPosts.getAllTags();
  res.json({
    tags
  });
}));

router.get('/:type(post|page)', asyncHandler(async (req, res) => {
  const type = req.params.type;
  const pageIndex = req.query.page_index || 0;
  const { items, totalPages } = await blogPosts.getItems({
    type,
    pageIndex,
    includePrivatePosts: true,
    pageSize: 10
  });

  res.json({
    items: items.map(p => ({
      ...p,
      url: type === 'post' ? blogpostUrl(p) : pageUrl(p)
    })),
    total_pages: totalPages
  });
}));

router.get('/:type(post|page)/:id', asyncHandler(async (req, res) => {
  const item = await blogPosts.getItemById(req.params.id, true);
  res.json(item);
}));

router.post('/:type(post|page)', asyncHandler(async (req, res) => {
  try {
    const newId = await blogPosts.createItem(req.params.type, {
      ...req.body,
      "author": {
        "name": req.user.name,
        "email": req.user.email,
        "website": ''
      }
    });

    res.json({ error: null, id: newId });
  }
  catch (err) {
    if (err.isJoi) {
      res.status(400).json({
        error: err.message
      });
    }
    else if (err.displayName === 'Conflict') {
      res.status(409).json({
        error: err.displayName
      });
    }
    else {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.params.type === 'post') {
    await cache.clearIndexPageCache();
  }
}));

router.delete('/:type(post|page)/:id', asyncHandler(async (req, res) => {
  try {
    await blogPosts.deleteItem(req.params.id);
    res.json({ error: null });
  }
  catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }

  if (req.params.type === 'post') {
    await cache.clearIndexPageCache();
  }  
}));

router.post('/:type(post|page)/:id', asyncHandler(async (req, res) => {
  try {
    await blogPosts.updateItem(req.params.id, req.params.type, req.body);
    res.json({ error: null });
  }
  catch (err) {
    if (err.isJoi) {
      res.status(400).json({
        error: err.message
      });
    }
    else {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.params.type === 'post') {
    await cache.clearIndexPageCache();
  }  
}));

export default router;
