import _ from "lodash";
import RSS from "rss";
import url from "url";
import express from "express";
import asyncHandler from "express-async-handler";
import * as recaptcha from "../services/recaptcha";
import * as blogPosts from "../services/blogPosts";
import * as comments from "../services/comments";
import * as akismet from "../services/akismet";
import * as emails from "../services/emails";
import * as events from "../services/events";
import {
  cachePageHandler,
  cacheAndReturn,
  clearPageCache,
} from "../services/cache";
import {
  preparePost,
  preparePage,
  preparePostJson,
  blogpostUrl,
  PageNotFoundError,
} from "./util";
import { config } from "../config";
import * as logging from "../services/logging";

const router = express.Router();

const BLOG_ROUTE_PREFIX = config.blog["blog-route-prefix"];
const PAGE_SIZE = config.blog["posts-page-size"];

events.onChange("post", () => clearPageCache(BLOG_ROUTE_PREFIX));
router.get("/", cachePageHandler(asyncHandler(handlePostsRequest("index"))));

router.get("/page/:pageNum", asyncHandler(handlePostsRequest("posts")));
router.get("/tagged/:tag", asyncHandler(handlePostsRequest("tagged")));
router.get(
  "/tagged/:tag/page/:pageNum",
  asyncHandler(handlePostsRequest("tagged"))
);
router.get("/series/:series", asyncHandler(handlePostsRequest("series")));
router.get(
  "/series/:series/page/:pageNum",
  asyncHandler(handlePostsRequest("series"))
);
router.get("/search", asyncHandler(handlePostsRequest("search")));
router.get("/search/page/:pageNum", asyncHandler(handlePostsRequest("search")));
router.get("/:year(2\\d{3,3})", asyncHandler(handlePostsRequest("posts")));
router.get(
  "/:year(2\\d{3,3})/page/:pageNum",
  asyncHandler(handlePostsRequest("posts"))
);
router.get(
  "/:year(2\\d{3,3})/:month(\\d{1,2})",
  normalizeMonth,
  asyncHandler(handlePostsRequest("posts"))
);
router.get(
  "/:year(2\\d{3,3})/:month(\\d{1,2})/page/:pageNum",
  normalizeMonth,
  asyncHandler(handlePostsRequest("posts"))
);

// redirect */2020/1/* to */2020/01/*
function normalizeMonth(req, res, next) {
  const { month } = req.params;
  if (month.length === 1) {
    const offset = BLOG_ROUTE_PREFIX.length;
    const url =
      req.originalUrl.substring(0, 6 + offset) +
      _.padStart(month, 2, "0") +
      req.originalUrl.substring(7 + offset, req.originalUrl.length);
    res.redirect(301, url);
  } else {
    next();
  }
}

router.get(
  "/rss",
  asyncHandler(async (req, res) => {
    try {
      const { items } = await cacheAndReturn("recent-items", async () => {
        return await blogPosts.getItems({
          type: "post",
          pageIndex: 0,
          pageSize: 10,
        });
      });

      const recentPosts = items.map(preparePost);

      const rss = new RSS({
        title: config.blog.title,
        description: config.blog.description,
        site_url: config.blog.url,
        generator: "elastiquill",
      });

      res.type("application/xml");
      recentPosts.forEach(post =>
        rss.item({
          title: post.title,
          description: post.description,
          url: url.resolve(config.blog.url, post.url),
          categories: post.tags.map(t => t.key),
          date: new Date(post.published_at),
          custom_elements: [{ image: post.metadata.header_image_url }],
        })
      );
      res.send(rss.xml());
    } catch (e) {
      await logging.logError("rss", e, req, res);
      throw e;
    }
  })
);

const BLOGPOST_ROUTE_DATE =
  "/:year(2\\d{3,3})/:month(\\d{1,2})/:slug-:id([^-]+$)";
const BLOGPOST_ROUTE_NAME = "/:slug-:id([^-]+$)";
const BLOGPOST_ROUTE = [BLOGPOST_ROUTE_DATE, BLOGPOST_ROUTE_NAME];

router.use(BLOGPOST_ROUTE, (req, res, next) => {
  const { id, isJson } = parseBlogpostId(req.params.id);

  res.locals.logData = {
    read_item: {
      id,
      slug: req.params.slug,
      type: "post",
      is_json: isJson,
    },
  };
  next();
});

events.onChange("post", post => clearPageCache(blogpostUrl(post)));
router.get(
  BLOGPOST_ROUTE,
  cachePageHandler(
    asyncHandler(async (req, res) => {
      const { id, isJson } = parseBlogpostId(req.params.id);

      let post = await blogPosts.getItemById({
        id,
        withComments: true,
        moreLikeThis: true,
      });

      if (post.slug !== req.params.slug) {
        res.redirect(301, blogpostUrl(post));
        return;
      }

      if (!_.isEmpty(req.query.secret)) {
        if (post.draft) {
          post = _.merge(post, post.draft);
        }

        if (post.metadata.private_viewing_key !== req.query.secret) {
          throw new PageNotFoundError();
        }
      } else if ("is_published" in post && !post.is_published) {
        throw new PageNotFoundError();
      }

      if (isJson) {
        res.json(preparePostJson(post));
        return;
      }

      const preparedPost = preparePost(post);

      let canonicalUrl = _.get(post, "metadata.canonical_url", "");
      if (!canonicalUrl || !canonicalUrl.length) {
        canonicalUrl = url.resolve(config.blog.url, preparedPost.url);
      }

      res.render("post", {
        canonicalUrl,
        sidebarWidgetData: res.locals.sidebarWidgetData,
        headerImageUrl: post.metadata.header_image_url,
        title: post.title,
        description: post.description,
        metaKeywords: postMetaKeywords(preparedPost),
        post: preparedPost,
        og: [
          {
            property: "og:title",
            content: post.title,
          },
          {
            property: "og:description",
            content: post.description,
          },
          {
            property: "og:url",
            content: canonicalUrl,
          },
          {
            property: "og:image",
            content: post.metadata.header_image_url,
          },
          {
            property: "og:type",
            content: "article",
          },
          {
            property: "article:author",
            content: post.author.name,
          },
          {
            property: "twitter:title",
            content: post.title,
          },
          {
            property: "twitter:description",
            content: post.description,
          },
          {
            property: "twitter:url",
            content: canonicalUrl,
          },
          {
            property: "twitter:image",
            content: post.metadata.header_image_url,
          },
          {
            property: "twitter:card",
            content: "summary_large_image",
          },
        ],
      });
    })
  )
);

router.post(
  BLOGPOST_ROUTE,
  asyncHandler(async (req, res) => {
    let commentError = null;
    let validity = null;
    let repliedToComment = null;
    let isSpam = null;

    const postId = blogPosts.BLOGPOST_ID_PREFIX + req.params.id;
    const post = preparePost(
      await blogPosts.getItemById({
        id: postId,
        withComments: true,
      })
    );

    if (!post.allow_comments) {
      res.redirect(303, req.originalUrl);
      return;
    }

    try {
      if (recaptcha.isAvailable()) {
        const success = await recaptcha.verify(
          req.body["g-recaptcha-response"]
        );
        if (!success) {
          const captchaErr = new Error();
          captchaErr.isRecaptcha = true;
          throw captchaErr;
        }
      }

      if (akismet.isAvailable()) {
        isSpam = await akismet.checkSpam({
          user_ip: req.connection.remoteAddress,
          user_agent: req.get("User-Agent"),
          referrer: req.get("Referrer"),
          comment_type: "comment",
          comment_author: req.body.author,
          comment_author_email: req.body.email,
          comment_author_url: req.body.website,
          comment_content: req.body.content,
        });
      }

      const resp = await comments.createComment({
        recipient_comment_id: _.isEmpty(req.body.recipient_comment_id)
          ? null
          : req.body.recipient_comment_id,
        post_id: blogPosts.BLOGPOST_ID_PREFIX + req.params.id,
        author: {
          name: req.body.author,
          email: req.body.email,
          website: req.body.website,
        },
        content: req.body.content,
        user_host_address: req.connection.remoteAddress,
        user_agent: req.get("User-Agent"),
        spam: isSpam,
      });

      repliedToComment = resp.repliedToComment;
    } catch (err) {
      if (err.isRecaptcha) {
        commentError = "Invalid recaptcha";
      } else if (err.isJoi) {
        validity = {};
        err.details.forEach(err => {
          err.path.forEach(key => (validity[key] = "has-error"));
        });
        commentError = "Please fill all required fields";
      } else {
        throw err;
      }
    }

    if (
      isSpam !== true &&
      !commentError &&
      config.blog["comments-noreply-email"]
    ) {
      const opAndComment = {
        opEmail: post.author.email,
        opTitle: post.title,
        opUrl: url.resolve(config.blog.url, blogpostUrl(post)),
        comment: {
          email: req.body.email,
          author: req.body.author,
          website: req.body.website,
          content: req.body.content,
        },
      };

      if (repliedToComment) {
        emails.sendNewCommentNotification({
          ...opAndComment,
          opComment: {
            email: repliedToComment.author.email,
            author: repliedToComment.author.name,
            website: repliedToComment.author.website,
            content: repliedToComment.content,
          },
        });
      } else {
        emails.sendNewCommentNotification(opAndComment);
      }
    }

    events.emitChange("post", post);

    if (!commentError) {
      res.redirect(303, req.originalUrl);
      return;
    }

    const preparedPost = preparePost(
      await blogPosts.getItemById({
        id: postId,
        withComments: true,
        moreLikeThis: true,
      })
    );

    res.render("post", {
      sidebarWidgetData: res.locals.sidebarWidgetData,
      comments: {
        validity,
        error: commentError,
        values: commentError ? req.body : null,
      },
      metaKeywords: postMetaKeywords(preparedPost),
      post: preparedPost,
    });
  })
);

export default router;

function handlePostsRequest(template) {
  return async (req, res) => {
    const { pageNum, tag, series, year, month } = req.params;
    const pageIndex = _.isUndefined(pageNum) ? 0 : parseFloat(pageNum) - 1;
    const search = _.isEmpty(req.query.q) ? null : req.query.q;
    const { items, total, totalPages } = await blogPosts.getItems({
      type: "post",
      search,
      tag,
      series,
      pageIndex,
      pageSize: PAGE_SIZE,
      year: year ? parseInt(year) : undefined,
      month: month ? parseInt(month) - 1 : undefined,
    });

    res.locals.logData = {
      list_items: {
        search_query: req.query.q,
        tag: tag,
        page_index: pageIndex,
        page_size: PAGE_SIZE,
      },
    };

    let tagDescription = null;

    // for posts by series/tags request, look for its content page (if any)
    if (series) {
      try {
        const item = await blogPosts.getItemById({
          id: blogPosts.CONTENT_DESCRIPTION_ID_PREFIX + "{" + series + "}",
        });
        tagDescription = preparePage(item);
      } catch (err) {
        // if it's not found (404) do nothing
        if (err.meta.statusCode !== 404) {
          throw err;
        }
      }
    } else if (tag) {
      try {
        const item = await blogPosts.getItemById({
          id: blogPosts.CONTENT_DESCRIPTION_ID_PREFIX + tag,
        });
        tagDescription = preparePage(item);
      } catch (err) {
        // if it's not found (404) do nothing
        if (err.meta.statusCode !== 404) {
          throw err;
        }
      }
    }

    let description = null;
    if (tagDescription) {
      description = tagDescription.content
        .replace(/(<([^>]+)>)/gi, " ")
        .replace(/\s\s+/g, " ")
        .trim();
    }

    let pathPrefix = "";
    let pathPostfix = "";

    // Prepend relevant prefix to path.

    if (tag) {
      pathPrefix = `/tagged/${tag}`;
    } else if (series) {
      pathPrefix = `/series/${series}`;
    } else if (search) {
      pathPrefix = "/search";
      pathPostfix = "?q=" + search;
    }

    if (year) {
      pathPrefix += `/${year}${month ? `/${month}` : ""}`;
    }

    if (!items.length && template !== "index") {
      res.status(404);
    }

    res.render(template, {
      tag,
      total,
      series,
      template,
      totalPages,
      tagDescription,
      month,
      year,
      searchQuery: search,
      sidebarWidgetData: res.locals.sidebarWidgetData,
      pageSize: PAGE_SIZE,
      pageNum: pageIndex + 1,
      prevPage: pageIndex > 0 ? pageIndex : null,
      nextPage: pageIndex + 1 < totalPages ? pageIndex + 2 : null,
      posts: items.map(preparePost),
      description,
      pathPrefix,
      pathPostfix,
    });
  };
}

function parseBlogpostId(id) {
  if (id.endsWith(".json")) {
    return {
      id: blogPosts.BLOGPOST_ID_PREFIX + id.slice(0, -5),
      isJson: true,
    };
  }

  if (id.endsWith("/")) {
    id = id.slice(0, -1);
  }
  return {
    id: blogPosts.BLOGPOST_ID_PREFIX + id,
    isJson: false,
  };
}

function postMetaKeywords(preparedPost) {
  return preparedPost.tags.map(t => t.key).join(",");
}
