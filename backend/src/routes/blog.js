import _ from 'lodash';
import RSS from 'rss';
import url from 'url';
import path from 'path';
import express from 'express';
import request from 'request-promise-native';
import asyncHandler from 'express-async-handler';
import * as recaptcha from '../services/recaptcha';
import * as blogPosts from '../services/blogPosts';
import * as comments from '../services/comments';
import * as akismet from '../services/akismet';
import * as emails from '../services/emails';
import * as events from '../services/events';
import { cachePageHandler, cacheAndReturn, clearPageCache } from '../services/cache';
import { preparePost, preparePage, preparePostJson, blogpostUrl } from './util';
import { config } from '../app';

const router = express.Router();

const PAGE_SIZE = 10;

events.onChange('post', () => clearPageCache(config.blog['blog-route-prefix']));
router.get('/', cachePageHandler(asyncHandler(handlePostsRequest('index'))));

router.get('/page/:pageNum', asyncHandler(handlePostsRequest('index')));
router.get('/tagged/:tag', asyncHandler(handlePostsRequest('tagged')));
router.get('/tagged/:tag/page/:pageNum', asyncHandler(handlePostsRequest('tagged')));
router.get('/series/:series', asyncHandler(handlePostsRequest('series')));
router.get('/series/:series/page/:pageNum', asyncHandler(handlePostsRequest('series')));
router.get('/search', asyncHandler(handlePostsRequest('search')))
router.get('/search/page/:pageNum', asyncHandler(handlePostsRequest('search')))

router.get('/rss', asyncHandler(async (req, res) => {
  const { items } = await cacheAndReturn('recent-items', async () => {
    return blogPosts.getItems({ type: 'post', pageIndex: 0, pageSize: 10 })
  });

  const recentPosts = items.map(preparePost);

  const rss = new RSS({
    title: config.blog.title,
    description: config.blog.description,
    site_url: config.blog.url,
    generator: 'elastic-blog-engine'
  });

  res.type('application/rss+xml');
  recentPosts.forEach(post => rss.item({
    title: post.title,
    description: post.description,
    url: url.resolve(config.blog.url, post.url),
    categories: post.tags.map(t => t.key),
    date: new Date(post.published_at),
    custom_elements: [
      { 'image': post.metadata.header_image_url }
    ]
  }));
  res.send(rss.xml());
}));

const BLOGPOST_ROUTE = '/:year(\\d+)/:month(\\d+)/:slug-:id([^-]+$)';

router.use(BLOGPOST_ROUTE, (req, res, next) => {
  const { id, isJson } = parseBlogpostId(req.params.id);

  res.locals.logData = {
    read_item: {
      id,
      slug: req.params.slug,
      type: 'post',
      is_json: isJson
    }
  };
  next();
});

events.onChange('post', post => clearPageCache(blogpostUrl(post)));
router.get(BLOGPOST_ROUTE, cachePageHandler(asyncHandler(async (req, res) => {
  const { id, isJson } = parseBlogpostId(req.params.id);
  
  const post = await blogPosts.getItemById({
    id,
    withComments: true,
    moreLikeThis: true
  });

  if (post.slug !== req.params.slug) {
    res.redirect(blogpostUrl(post));
    return;
  }

  if (! _.isEmpty(post.private_viewing_key)) {
    if (post.private_viewing_key !== req.query.secret) {
      res.status(404).render('error', {
        message: 'Post not found',
        error: {
          status: 404
        }
      });
      return;
    }
  }

  if (isJson) {
    res.json(preparePostJson(post));
    return;
  }

  const preparedPost = preparePost(post);

  let canonicalUrl = _.get(post, 'metadata.canonical_url', '');
  if (! canonicalUrl.length) {
    canonicalUrl = url.resolve(config.blog.url, preparedPost.url);
  }

  res.render('post', {
    canonicalUrl,
    sidebarWidgetData: res.locals.sidebarWidgetData,
    headerImageUrl: post.metadata.header_image_url,
    recaptchaClientKey: recaptcha.clientKey(),
    title: post.title,
    description: post.description,
    metaKeywords: postMetaKeywords(preparedPost),
    post: preparedPost
  });
})));

router.post(BLOGPOST_ROUTE, asyncHandler(async (req, res) => {
  let commentError = null;
  let validity = null;
  let repliedToComment = null;
  let isSpam = null;

  const postId = blogPosts.BLOGPOST_ID_PREFIX + req.params.id;
  const post = preparePost(await blogPosts.getItemById({
    id: postId,
    withComments: true
  }));

  if (! post.allow_comments) {
    res.redirect(req.originalUrl);
    return;
  }

  try {
    if (recaptcha.isAvailable()) {
      const success = await recaptcha.verify(req.body['g-recaptcha-response']);
      if (! success) {
        const captchaErr = new Error();
        captchaErr.isRecaptcha = true;
        throw captchaErr;
      }
    }

    if (akismet.isAvailable()) {
      isSpam = await akismet.checkSpam({
        user_ip: req.connection.remoteAddress,
        user_agent: req.get('User-Agent'),
        referrer: req.get('Referrer'),
        comment_type: 'comment',
        comment_author: req.body.author,
        comment_author_email: req.body.email,
        comment_author_url: req.body.website,
        comment_content: req.body.content,
      });
    }

    const resp = await comments.createComment({
      recipient_path: _.isEmpty(req.body.recipient_path) ? null : req.body.recipient_path,
      post_id: blogPosts.BLOGPOST_ID_PREFIX + req.params.id,
      author: {
        name: req.body.author,
        email: req.body.email,
        website: req.body.website
      },
      content: req.body.content,
      user_host_address: req.connection.remoteAddress,
      user_agent: req.get('User-Agent'),
      spam: isSpam
    });

    repliedToComment = resp.repliedToComment;
  }
  catch (err) {
    if (err.isRecaptcha) {
      commentError = 'Invalid recaptcha';
    }
    else if (err.isJoi) {
      validity = {};
      err.details.forEach(err => {
        err.path.forEach(key => validity[key] = 'has-error');
      });
      commentError = 'Please fill all required fields';
    }
    else {
      throw err;
    }
  }

  if (isSpam !== true && ! commentError && config.blog['comments-noreply-email']) {
    const opAndComment = {
      opEmail: post.author.email,
      opTitle: post.title,
      opUrl: url.resolve(config.blog.url, blogpostUrl(post)),
      comment: {
        email: req.body.email,
        author: req.body.author,
        website: req.body.website,
        content: req.body.content
      }
    };

    if (repliedToComment) {
      emails.sendNewCommentNotification({
        ...opAndComment,
        opComment: {
          email: repliedToComment.author.email,
          author: repliedToComment.author.name,
          website: repliedToComment.author.website,
          content: repliedToComment.content
        }
      });
    }
    else {
      emails.sendNewCommentNotification(opAndComment);
    }
  }

  events.emitChange('post', post);

  if (! commentError) {
    res.redirect(303, req.originalUrl);
    return;
  }

  const preparedPost = preparePost(await blogPosts.getItemById({
    id: postId,
    withComments: true,
    moreLikeThis: true
  }));

  res.render('post', {
    sidebarWidgetData: res.locals.sidebarWidgetData,
    comments: {
      validity,
      error: commentError,
      values: commentError ? req.body : null
    },
    recaptchaClientKey: recaptcha.clientKey(),
    metaKeywords: postMetaKeywords(preparedPost),
    post: preparedPost
  });
}));


export default router;

function handlePostsRequest(template) {
  return async (req, res) => {
    const { pageNum, tag, series } = req.params;
    const pageIndex = _.isUndefined(pageNum) ? 0 : parseFloat(pageNum) - 1;
    const { items, total, totalPages } = await blogPosts.getItems({
      type: 'post',
      search: _.isEmpty(req.query.q) ? null : req.query.q,
      tag,
      series,
      pageIndex,
      pageSize: PAGE_SIZE
    });

    res.locals.logData = {
      list_items: {
        search_query: req.query.q,
        tag: tag,
        page_index: pageIndex,
        page_size: PAGE_SIZE
      }
    };

    let tagDescription = null;

    if (series) {
      try {
        const item = await blogPosts.getItemById({ id: blogPosts.CONTENT_DESCRIPTION_ID_PREFIX + '{' + series + '}' });
        tagDescription = preparePage(item);
      }
      catch (err) {
        if (err.status !== 404) {
          throw err;
        }
      }
    }
    else if (tag) {
      try {
        const item = await blogPosts.getItemById({ id: blogPosts.CONTENT_DESCRIPTION_ID_PREFIX + tag });
        tagDescription = preparePage(item);
      }
      catch (err) {
        if (err.status !== 404) {
          throw err;
        }
      }
    }

    res.render(template, {
      tag,
      total,
      series,
      template,
      totalPages,
      tagDescription,
      searchQuery: req.query.q,
      sidebarWidgetData: res.locals.sidebarWidgetData,
      pageSize: PAGE_SIZE,
      pageNum: pageIndex + 1,
      prevPage: pageIndex > 0 ? pageIndex : null,
      nextPage: pageIndex + 1 < totalPages ? pageIndex + 2 : null,
      posts: items.map(preparePost)
    });
  };
}


function parseBlogpostId(id) {
  if (id.endsWith('.json')) {
    return {
      id: blogPosts.BLOGPOST_ID_PREFIX + id.slice(0, -5),
      isJson: true
    };
  }

  return {
    id: blogPosts.BLOGPOST_ID_PREFIX + id,
    isJson: false
  };
}

function postMetaKeywords(preparedPost) {
  return preparedPost.tags.map(t => t.key).join(',')
}