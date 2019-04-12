import _ from 'lodash';
import express from 'express';
import asyncHandler from 'express-async-handler';
import MarkdownIt from 'markdown-it';
import * as blogPosts from '../services/blogPosts';
import { cachePageHandler } from '../services/cache';
import { preparePage } from './util';

const router = express.Router();
const md = new MarkdownIt();

router.get('/:slug', cachePageHandler(asyncHandler(async (req, res, next) => {
  let page;
  try {
    page = await blogPosts.getItemById(req.params.slug);
  }
  catch (err) {
    next();
    return;
  }

  res.locals.logData = {
    read_item: {
      id: req.params.slug,
      type: 'page',
      slug: page.slug
    }
  };

  if (! _.isEmpty(page.private_viewing_key)) {
    if (page.private_viewing_key !== req.query.secret) {
      res.status(404).render('error', {
        message: 'Page not found',
        error: {
          status: 404
        }
      });
      return;
    }
  }

  res.render('page', {
    sidebarWidgetData: res.locals.sidebarWidgetData,
    headerImageUrl: page.metadata.header_image_url,
    title: page.title,
    description: page.description,
    page: preparePage(page)
  });
})));

export default router;
