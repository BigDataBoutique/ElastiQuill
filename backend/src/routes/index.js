import referrerParser from "@cgamesplay/referer-parser";
import express from "express";
import asyncHandler from "express-async-handler";
import _ from "lodash";
import axios from "axios";
import { uid } from "uid";
import url from "url";
import { SitemapStream, streamToPromise } from "sitemap";
import { Readable } from "stream";
import { frontendAddress } from "../app";
import { config } from "../config";
import { esClient } from "../lib/elasticsearch";
import * as blogPosts from "../services/blogPosts";
import * as cache from "../services/cache";
import * as logging from "../services/logging";
import * as recaptcha from "../services/recaptcha";
import apiRouter from "./api";
import {
  authInfoTokenMiddleware,
  AUTH_INFO_TOKEN_COOKIE,
  createAuthInfoToken,
} from "./auth";
import blogRouter from "./blog";
import contactRouter from "./contact";
import pageRouter from "./page";
import routingTableRouter from "./routingTable";
import { blogpostUrl, preparePost, seriesUrl, tagUrl } from "./util";
import { CACHE_KEYS } from "../services/cache";

const BLOG_ROUTE_PREFIX = config.blog["blog-route-prefix"];
const API_ROUTE = config.blog["api-route"];
const IS_LOCALHOST = config.blog.url.startsWith("http://localhost");

const router = express.Router();

let esConnected = false;
router.get("/healthz", async (req, res) => {
  if (process.env.NODE_ENV === "test") {
    return res.status(200).json({ status: "ok" });
  }

  if (!esConnected) {
    try {
      await esClient.ping();
      esConnected = true;
    } catch (e) {
      res.status(503).json({ status: "ES not accessible" });
      return;
    }
  }

  try {
    const baseUrl = `http://localhost:${req.app.get("port")}`;
    const token = createAuthInfoToken("healthz");

    const urls = [
      baseUrl + BLOG_ROUTE_PREFIX,
      `${baseUrl + BLOG_ROUTE_PREFIX}/rss`,
    ];
    const { items } = await cache.cacheAndReturn(
      CACHE_KEYS.HEALTHZ_TOP_POST,
      async () => {
        return await blogPosts.getItems({
          type: "post",
          pageIndex: 0,
          pageSize: 1,
        });
      }
    );
    if (items.length) {
      urls.push(baseUrl + blogpostUrl(items[0]));
    }

    const axiosConfig = {
      timeout: 5000,
      headers: {
        Cookie: `${AUTH_INFO_TOKEN_COOKIE}=${token}`,
        "x-healthz-check": true,
      },
      validateStatus: function(status) {
        return status >= 200 && status < 300;
      },
    };

    await Promise.all(
      urls.map(async url => {
        try {
          return await axios.get(url, axiosConfig);
        } catch (e) {
          await logging.logError("health", "Failed to fetch " + url);
          throw e;
        }
      })
    );
  } catch (err) {
    await logging.logError("health", err);
    res.status(408).json({ status: "request timeout" });
    return;
  }

  res.status(200).json({ status: "ok" });
});

router.get("/robots.txt", (req, res) => {
  res.end(
    `User-agent: *\nDisallow:\n\nSitemap: ${config.blog["url"]}/sitemap.xml\n`
  );
});

function getLatestPostDate(posts) {
  return new Date(Math.max(...posts.map(post => new Date(post.published_at))));
}

async function getSitemap() {
  return await cache.cacheAndReturn(CACHE_KEYS.SITEMAP, async () => {
    const posts = await blogPosts.getAllItems({ type: "post" });
    const contentPages = await blogPosts.getAllItems({ type: "page" });
    const { tags, series } = await blogPosts.getAllTags();

    const latestPostDate = getLatestPostDate(posts);

    let links = [
      {
        url: BLOG_ROUTE_PREFIX + "/",
        priority: 1.0,
        lastmod: latestPostDate,
      },
      {
        url: "/contact",
        priority: 0.4,
        lastmod: latestPostDate,
      },
      {
        url: `${BLOG_ROUTE_PREFIX}/rss`,
        priority: 0.0,
        lastmod: latestPostDate,
      },
    ];

    contentPages.forEach(page => {
      if (!page.metadata.is_embed && !page.metadata.is_tag_description) {
        links.push({
          url: `/${page.slug}`,
          priority: 0.4,
          lastmod: page.published_at,
        });
      }
    });

    tags.forEach(tag => {
      const latestTaggedPostDate = getLatestPostDate(
        posts.filter(post => post.tags && post.tags.includes(tag))
      );

      links.push({
        url: `${BLOG_ROUTE_PREFIX}/tagged/${tag}`.toLowerCase(),
        priority: 0.4,
        lastmod: latestTaggedPostDate,
      });
    });

    series.forEach(series => {
      const latestSeriesPostDate = getLatestPostDate(
        posts.filter(post => post.series && post.series === series)
      );

      links.push({
        url: `${BLOG_ROUTE_PREFIX}/series/${series}`.toLowerCase(),
        priority: 0.4,
        lastmod: latestSeriesPostDate,
      });
    });

    posts.forEach(post => {
      if (post.is_published) {
        const postAgeDifMs = new Date() - new Date(post.published_at);
        const postAgeDate = new Date(postAgeDifMs);
        const postAge = Math.abs(postAgeDate.getUTCFullYear() - 1970);

        const priority = 0.8 - Math.min(postAge * 0.1, 0.3);

        links.push({
          url: blogpostUrl(post),
          priority,
          lastmod: post.published_at,
        });
      }
    });

    const stream = new SitemapStream({
      hostname: frontendAddress(),
      xmlns: {
        custom: [
          'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
          'xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd"',
        ],
      },
    });

    const buffer = await streamToPromise(Readable.from(links).pipe(stream));
    return buffer.toString();
  });
}

router.get("/:prefix/sitemap.xml", async (req, res) => {
  try {
    if (`/${req.params.prefix}` === BLOG_ROUTE_PREFIX) {
      const sitemap = await getSitemap();
      return res
        .header("Content-Type", "application/xml")
        .status(200)
        .send(sitemap);
    } else {
      return res.sendStatus(404);
    }
  } catch (error) {
    logging.logError("sitemap", error);
    return res.status(500).end();
  }
});

router.get("/sitemap.xml", async (req, res) => {
  try {
    const sitemap = await getSitemap();
    return res
      .header("Content-Type", "application/xml")
      .status(200)
      .send(sitemap);
  } catch (error) {
    logging.logError("sitemap", error);
    return res.status(500).end();
  }
});

if (BLOG_ROUTE_PREFIX.length && BLOG_ROUTE_PREFIX !== "/") {
  router.get("/", (req, res) => res.redirect(302, config.blog.url));
}

// lowercase urls
router.use((req, res, next) => {
  if (req.method === "GET" && req.path.toLowerCase() !== req.path) {
    let parsedUrl = url.parse(req.originalUrl);
    parsedUrl.pathname = parsedUrl.pathname.toLowerCase();
    res.redirect(301, url.format(parsedUrl));
  } else {
    next();
  }
});

// parse referrer
router.use((req, res, next) => {
  const referrer = req.header("referrer");

  // skip self-referrals (inter-site browsing, resource loading, ...)
  if (
    referrer &&
    referrer.toLowerCase().indexOf(req.hostname.toLowerCase()) === -1
  ) {
    req.referrer = new referrerParser(referrer);
  }
  next();
});

router.use(routingTableRouter);
router.use(BLOG_ROUTE_PREFIX + API_ROUTE, apiRouter);
router.use(authInfoTokenMiddleware);

// add visitor cookies
router.use((req, res, next) => {
  let visitorId = req.cookies["elastiquill-uid"];
  if (!visitorId) {
    visitorId = uid(10);
    res.cookie("elastiquill-uid", visitorId, {
      secure: !IS_LOCALHOST,
      httpOnly: true,
    });
  }

  req.visitorId = visitorId;
  next();
});

// log visits
router.use(
  asyncHandler(async (req, res, next) => {
    const startTime = new Date().getTime();

    if (!req.isAuthorizedAdmin) {
      res.on("finish", () => {
        logging.logVisit(req, res, new Date().getTime() - startTime);
      });

      res.locals.gaTrackingId = _.get(
        config,
        "credentials.google.analytics-code",
        null
      );
    }

    res.locals.adminRoute = config.blog["admin-route"];
    res.locals.isLocalhost = IS_LOCALHOST;
    res.locals.blogRoutePrefix = BLOG_ROUTE_PREFIX;
    res.locals.blogTitle = config.blog["title"];
    res.locals.blogUrl = config.blog["url"];
    res.locals.blogDescription = config.blog["description"];
    res.locals.facebookAppId = _.get(config, "credentials.facebook.app-id");

    res.locals.sidebarWidgetData = await cache.cacheAndReturn(
      CACHE_KEYS.SIDEBAR_WIDGET_DATA,
      async () => {
        const { items, allTags, allSeries } = await blogPosts.getItems({
          type: "post",
          pageIndex: 0,
          pageSize: config.blog["posts-page-size"],
        });
        return {
          recentPosts: items.map(preparePost),
          allTags: allTags.map(t => ({
            ...t,
            url: tagUrl(t.key),
          })),
          allSeries: allSeries.map(t => ({
            ...t,
            url: seriesUrl(t.key),
          })),
        };
      }
    );

    next();
  })
);

// include required local vars
router.use((req, res, next) => {
  res.locals.recaptchaClientKey = recaptcha.clientKey();
  res.locals.contactFormPostUrl = config.blog["contact-form-post-url"];
  next();
});

router.use("/contact", contactRouter);
router.use(BLOG_ROUTE_PREFIX, blogRouter);
router.use(pageRouter);

export default router;
