import _ from "lodash";
import fs from "fs";
import path from "path";
import logger from "morgan";
import express from "express";
import passport from "passport";
import compression from "compression";
import createError from "http-errors";
import cookieParser from "cookie-parser";
import parseUrl from "parseurl";
import exphbs from "./lib/express-handlebars-multi";
import { config } from "./config";
import { getErrorStatus } from "./util";

export const routingTable = loadRoutingTable(config);

const ADMIN_ROUTE = config.blog["admin-route"];
const loggingService = require("./services/logging");

const app = express();
app.disable("x-powered-by");

const BLOG_THEME_PATH = config.blog["theme-path"],
  BLOG_URL = config.blog.url;

const STATICS_ROUTE_PREFIX = config.blog["statics-route-prefix"];

// view engine setup

const viewPaths = [path.join(__dirname, "views/base")];
if (BLOG_THEME_PATH) {
  if (fs.existsSync(BLOG_THEME_PATH)) {
    console.log("Theme path configured: " + BLOG_THEME_PATH);
    viewPaths.unshift(BLOG_THEME_PATH);
  } else {
    console.log("Invalid BLOG_THEME_PATH", BLOG_THEME_PATH, "does not exist");
  }
}

export const hbs = exphbs({
  helpers: {
    eq: (arg1, arg2) => arg1 === arg2,
    gt: (arg1, arg2) => arg1 > arg2,
    lt: (arg1, arg2) => arg1 < arg2,
    or: (...args) => _.some(args.slice(0, -1)),
    and: (...args) => _.every(args.slice(0, -1)),
    head: xs => xs[0],
    tail: xs => xs.slice(1),
    includes: (l, s) => _.includes(l, s),
    truncateHtml: require("truncate-html"),
    toLowerCase: s => s.toLowerCase(),
    encodeURI: encodeURIComponent,
    replace: function(find, replace, options) {
      const string = options.fn(this);
      return string.replace(find, replace);
    },
  },
  partialDirs: viewPaths
    .map(p => path.join(p, "partials"))
    .filter(p => fs.existsSync(p)),
  layoutDirs: viewPaths
    .map(p => path.join(p, "layouts"))
    .filter(p => fs.existsSync(p)),
  defaultLayout: "main",
  ext: ".hbs",
});
app.engine("hbs", hbs);
app.set("view engine", "hbs");
app.set("views", viewPaths);
app.set("view cache", !!config.blog["theme-caching"]);

if (config.blog.compression) {
  app.use(compression());
}

// Enable reverse proxy support in Express. This causes the
// the "X-Forwarded-Proto" header field to be trusted so its
// value can be used to determine the protocol. See
// http://expressjs.com/api#app-settings for more details.
app.enable("trust proxy");

app.use((req, res, next) => {
  if (
    config.blog["force-https"] &&
    !req.secure &&
    req.path !== "/healthz" &&
    !req.header("x-healthz-check") &&
    !req.headers.host.startsWith("10.")
  ) {
    res.redirect(301, "https://" + req.headers.host + req.url);
    return;
  }

  // Protect against Clickjacking attacks
  res.header("X-Frame-Options", "DENY");
  // Block pages from loading when they detect reflected XSS attacks
  res.header("X-XSS-Protection", "1; mode=block");
  // load scripts and stylesheets only if server indicates the correct MIME type
  res.header("X-Content-Type-Options", "nosniff");
  // notifies user agents to only connect to the site over HTTPS
  res.header(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  next();
});

app.use(
  "/favicon.ico",
  express.static(path.join(__dirname, "views/base/public/favicon/favicon.ico"))
);
app.use(
  STATICS_ROUTE_PREFIX + "/base",
  express.static(path.join(__dirname, "views/base/public"))
);
if (BLOG_THEME_PATH && fs.existsSync(path.join(BLOG_THEME_PATH, "public"))) {
  app.use(
    STATICS_ROUTE_PREFIX + "/theme",
    express.static(path.join(BLOG_THEME_PATH, "public"))
  );
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(passport.initialize());

if (process.env.NODE_ENV === "production") {
  console.log("Running production code");
  console.log("Admin path is set to " + ADMIN_ROUTE);
  const frontendBuildPath = path.join(
    __dirname,
    config.blog["admin-frontend-path"]
  );

  app.use(ADMIN_ROUTE, express.static(frontendBuildPath, { index: false }));
  app.get(ADMIN_ROUTE, function(req, res) {
    res.sendFile(path.join(frontendBuildPath, "index.html"));
  });
} else {
  app.use(logger("dev"));
}

const mainRouter = require("./routes");
app.use(mainRouter.default);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, _next) {
  const isDev = req.app.get("env") === "development";

  if (isDev) {
    console.error(err);
  }

  const errStatusCode = getErrorStatus(err);
  res.status(errStatusCode);

  // set locals, only providing error in development
  if (isDev || errStatusCode === 404) {
    res.locals.message = err.message;
    res.locals.error = err;

    res.set("X-Request-Path", req.path);
    res.set("X-Request-Url", req.url);
    res.set("X-Original-Url", req.originalUrl || "");
    res.set("X-Parsed-Url-Pathname", parseUrl(req).pathname);
    res.set("X-Parsed-Url-Original-Pathname", parseUrl.original(req).pathname);
  } else {
    res.locals.message = "Server Error";
    loggingService.logError(null, err, req, res);
  }

  // render the error page
  if (errStatusCode === 404) {
    res.render("404");
  } else {
    res.render("error");
  }
});

process.on("unhandledRejection", reason => {
  loggingService.logError("unhandled-rejection", new Error(reason));
});

process.on("uncaughtException", async err => {
  await loggingService.logError("uncaught-exception", err);
  process.exit(1);
});

export function frontendAddress() {
  if (process.env.NODE_ENV === "production") {
    return BLOG_URL;
  }
  return "http://localhost:4000";
}

export default app;

function loadRoutingTable(config) {
  const routingTablePath = config.blog["routing-table-path"];
  if (!routingTablePath) {
    return null;
  }

  if (!fs.existsSync(routingTablePath)) {
    console.error("Invalid routing table.", routingTablePath, "does not exist");
    return null;
  }

  try {
    console.log("Loading routing table from " + routingTablePath);
    return JSON.parse(fs.readFileSync(routingTablePath));
  } catch (err) {
    console.error("Failed reading routing table");
    console.error(err);
    return null;
  }
}
