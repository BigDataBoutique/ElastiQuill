import _ from "lodash";
import url from "url";
import uid from "uid";
import express from "express";
import inbound from "inbound";
import asyncHandler from "express-async-handler";
import routingTableRouter from "./routingTable";
import blogRouter from "./blog";
import pageRouter from "./page";
import apiRouter from "./api";
import contactRouter from "./contact";
import { authInfoTokenMiddleware } from "./auth";
import * as blogPosts from "../services/blogPosts";
import * as logging from "../services/logging";
import * as cache from "../services/cache";
import { preparePost, tagUrl, seriesUrl } from "./util";
import { config } from "../config";

function ensureNoSlash(str) {
  if (str[str.length - 1] === "/") {
    return str.substr(0, -1);
  }
  return str;
}

const BLOG_ROUTE_PREFIX = ensureNoSlash(config.blog["blog-route-prefix"] || "");
const IS_LOCALHOST = config.blog.url.startsWith("http://localhost");

const router = express.Router();

router.get("/healthz", (req, res) => {
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
  const href = req.protocol + "://" + req.get("host") + req.originalUrl;

  inbound.referrer.parse(href, referrer, (err, desc) => {
    req.referrer = desc.referrer;
    if (referrer) {
      req.referrer.from_domain = url.parse(referrer).hostname;
    }
    next(err);
  });
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
          pageSize: 10,
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

router.use("/contact", contactRouter);
router.use(BLOG_ROUTE_PREFIX, blogRouter);
router.use(pageRouter);

export default router;
