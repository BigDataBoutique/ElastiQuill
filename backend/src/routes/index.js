import referrerParser from "@cgamesplay/referer-parser";
import express from "express";
import asyncHandler from "express-async-handler";
import _ from "lodash";
import request from "request";
import rp from "request-promise";
import { uid } from "uid";
import url from "url";
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

function ensureNoSlash(str) {
  if (str[str.length - 1] === "/") {
    return str.substr(0, -1);
  }
  return str;
}

const BLOG_ROUTE_PREFIX = ensureNoSlash(config.blog["blog-route-prefix"] || "");
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
    const cookie = request.cookie(
      `${AUTH_INFO_TOKEN_COOKIE}=${createAuthInfoToken("healthz")}`
    );

    const urls = [
      baseUrl + BLOG_ROUTE_PREFIX,
      `${baseUrl + BLOG_ROUTE_PREFIX}/rss`,
    ];
    const { items } = await cache.cacheAndReturn(
      "healthz-top-post",
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

    await Promise.all(
      urls.map(async url => {
        try {
          return await rp({
            url,
            timeout: 5000,
            resolveWithFullResponse: true,
            headers: {
              Cookie: cookie,
              // adds flag to skip https redirect incase config.blog.force-https is on
              "x-healthz-check": true,
            },
          });
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
  res.end("User-agent: *\n" + "Disallow:\n");
});

if (BLOG_ROUTE_PREFIX.length && BLOG_ROUTE_PREFIX !== "/") {
  router.get("/", (req, res) =>
    res.redirect(301, config.blog.url + BLOG_ROUTE_PREFIX)
  );
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
router.use("/api", apiRouter);
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
      "sidebar-widget-data",
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
