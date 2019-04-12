import _ from 'lodash';
import url from 'url';
import express from 'express';
import inbound from 'inbound';
import passport from 'passport';
import asyncHandler from 'express-async-handler';
import routingTableRouter from './routingTable';
import blogRouter from './blog';
import pageRouter from './page';
import apiRouter from './api';
import contactRouter from './contact';
import * as blogPosts from '../services/blogPosts';
import * as logging from '../services/logging';
import { preparePost } from './util';
import { config } from '../app';

const BLOG_ROUTE_PREFIX = config.blog['blog-route-prefix'];

const router = express.Router();

router.get('/healthz', (req, res) => {
  res.status(200).json({status: 'ok'});
});

if (BLOG_ROUTE_PREFIX.length && BLOG_ROUTE_PREFIX !== '/') {
  router.get('/', (req, res) => res.redirect(BLOG_ROUTE_PREFIX));
}

// lowercase urls
router.use((req, res, next) => {
  if (req.path.toLowerCase() !== req.path) {
    var parsedUrl = url.parse(req.originalUrl)
    parsedUrl.pathname = parsedUrl.pathname.toLowerCase()
    res.redirect(url.format(parsedUrl));
  } else {
    next();
  }
});

// parse referrer
router.use((req, res, next) => {
  const referrer = req.header('referrer');
  const href = req.url;

  inbound.referrer.parse(href, referrer, (err, desc) => {
    req.referrer = desc.referrer;
    if (referrer) {
      req.referrer.from_domain = url.parse(referrer).hostname;
    }
    next(err);
  });
});

router.use(asyncHandler(async (req, res, next) => {
  const startTime = new Date().getTime();
  res.on('finish', () => {
    logging.logVisit(req, res, new Date().getTime() - startTime);
  });

  res.locals.gaTrackingId = _.get(config, 'credentials.google.analytics-code', null);
  res.locals.adminRoute = config.blog['admin-route'];

  const { items, allTags } = await blogPosts.getItems({ type: 'post', pageIndex: 0, pageSize: 10 });
  res.locals.recentPosts = items.map(preparePost);
  res.locals.sidebarWidgetData = {
    recentPosts: res.locals.recentPosts,
    allTags
  };
  next();
}));

router.use(routingTableRouter);
router.use('/api', apiRouter);
router.use('/contact', contactRouter);
router.use(BLOG_ROUTE_PREFIX, blogRouter);
router.use(pageRouter);

export default router;
