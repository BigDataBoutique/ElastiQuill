import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import logger from 'morgan';
import jsYaml from 'js-yaml';
import express from 'express';
import passport from 'passport';
import compression from 'compression';
import createError from 'http-errors';
import cookieParser from 'cookie-parser';
import elasticsearch from 'elasticsearch';
import exphbs from './lib/express-handlebars-multi';

require('dotenv').config();

export const config = initConfig();
export const routingTable = loadRoutingTable(config);

const ADMIN_ROUTE = config.blog['admin-route'];
const loggingService = require('./services/logging');

export const esClient = new elasticsearch.Client({
  host: config.elasticsearch.hosts.split(','),
  log: 'warning'
});

esClient.ping({
  requestTimeout: 5000
}, error => {
  if (error) {
    console.error('Elasticsearch cluster is down!', error.message);
  }
  else {
    console.error('Connected to elasticsearch cluster');
  }
});

const mainRouter = require('./routes');

const app = express();
app.disable('x-powered-by');


const BLOG_THEME_PATH = config.blog['theme-path'],
      BLOG_URL = config.blog.url;

// view engine setup

const viewPaths = [ path.join(__dirname, 'views/base') ];
if (BLOG_THEME_PATH) {
  if (fs.existsSync(BLOG_THEME_PATH)) {
    viewPaths.unshift(BLOG_THEME_PATH);
  }
  else {
    console.log('Invalid BLOG_THEME_PATH', BLOG_THEME_PATH, 'does not exist');
  }
}

const hbs = exphbs({
  helpers: {
    truncateHtml: require('truncate-html'),
    toLowerCase: s => s.toLowerCase()
  },
  partialDirs: viewPaths.map(p => path.join(p, 'partials')),
  layoutDirs: viewPaths.map(p => path.join(p, 'layouts')),
  defaultLayout: 'main',
  ext: '.hbs'
});
app.engine('hbs', hbs);
app.set('view engine', 'hbs');
app.set('views', viewPaths);

if (config.blog.compression) {
  app.use(compression());
}

app.use(function(req, res, next) {
  // Protect against Clickjacking attacks
  res.header("X-Frame-Options", "DENY");
  // Block pages from loading when they detect reflected XSS attacks
  res.header("X-XSS-Protection", "1; mode=block");
  // load scripts and stylesheets only if server indicates the correct MIME type
  res.header("X-Content-Type-Options", "nosniff");
  // notifies user agents to only connect to the site over HTTPS
  res.header("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  next();
});

// Enable reverse proxy support in Express. This causes the
// the "X-Forwarded-Proto" header field to be trusted so its
// value can be used to determine the protocol. See
// http://expressjs.com/api#app-settings for more details.
app.enable('trust proxy');

app.use('/static/base', express.static(path.join(__dirname, 'views/base/public')));
if (BLOG_THEME_PATH) {
  app.use('/static/theme', express.static(path.join(BLOG_THEME_PATH, 'public')));
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(passport.initialize());

if (process.env.NODE_ENV === 'production') {
  console.log('Running production code');
  const frontendBuildPath = path.join(__dirname, config.blog['admin-frontend-path']);

  app.use(ADMIN_ROUTE, express.static(frontendBuildPath, { index: false }));
  app.get(ADMIN_ROUTE, function (req, res) {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
} else {
  app.use(logger('dev'));
}

app.use(mainRouter.default);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  const isDev = req.app.get('env') === 'development';

  if (isDev) {
    console.error(err);
  }

  // set locals, only providing error in development
  if (isDev || err.status === 404) {
    res.locals.message = err.message;
    res.locals.error = err;
  }
  else {
    res.locals.message = 'Server Error';
    loggingService.logError(null, err, req, res);
  }

  // render the error page
  res.status(err.status || 500);
  if (err.status === 404) {
    res.render('404');
  }
  else {
    res.render('error');
  }
});

process.on('unhandledRejection', reason => {
  loggingService.logError('unhandled-rejection', new Error(reason));
});

process.on('uncaughtException', async (err) => {
  await loggingService.logError('uncaught-exception', err);
  process.exit(1);
});

export function frontendAddress() {
  if (process.env.NODE_ENV === 'production') {
    return BLOG_URL;
  }
  return 'http://localhost:4000';
}

export default app;

function initConfig() {
  let configPath = process.env.CONFIG_PATH || '/etc/elastiquill/config.yml';
  if (!!process.env.CONFIG_PATH) {
    if (!path.isAbsolute(configPath)) {
      configPath = path.join(__dirname, configPath);
    }
  }

  const configFile = fs.readFileSync(configPath, 'utf-8');
  console.log('Loading config from ' + configPath);
  let config = jsYaml.load(configFile);

  const envOverrides = [
    ['elasticsearch.hosts', 'ELASTICSEARCH_HOSTS', 'localhost:9200'],
    ['elasticsearch.blog-index-name', 'BLOG_POSTS_INDEX', 'blog-posts'],
    ['elasticsearch.blog-comments-index-name', 'BLOG_COMMENTS_INDEX', 'blog-comments'],
    ['elasticsearch.blog-logs-index-name', 'BLOG_LOGS_INDEX', 'blog-logs'],
    ['blog.comments-noreply-email', 'BLOG_COMMENTS_NOREPLY_EMAIL'],
    ['blog.title', 'BLOG_TITLE', 'Sample blog'],
    ['blog.description', 'BLOG_DESCRIPTION', 'Sample description'],
    ['blog.url', 'BLOG_URL', 'http://localhost:5000'],
    ['blog.compression', 'BLOG_COMPRESSION', false],
    ['blog.cache-ttl', 'BLOG_CACHE_TTL', 60],
    ['blog.port', 'PORT', '5000'],
    ['blog.admin-emails', 'BLOG_ADMIN_EMAILS'],
    ['blog.contact-email', 'CONTACT_FORM_SEND_TO'],
    ['blog.theme-path', 'BLOG_THEME_PATH'],
    ['blog.routing-table-path', 'BLOG_ROUTING_TABLE_PATH'],
    ['blog.jwt-secret', 'BLOG_JWT_SECRET'],
    ['blog.blog-route-prefix', 'BLOG_ROUTE_PREFIX', '/blog'],
    ['blog.admin-route', 'ADMIN_ROUTE', '/admin'],
    ['blog.admin-frontend-path', 'ADMIN_FRONTEND_PATH', './build'],
    ['credentials.google.analytics-code', 'GOOGLE_ANALYTICS_CODE'],
    ['credentials.google.oauth-client-id', 'GOOGLE_OAUTH_CLIENT_ID'],
    ['credentials.google.oauth-client-secret', 'GOOGLE_OAUTH_CLIENT_SECRET'],
    ['credentials.github.oauth-client-id', 'GITHUB_CLIENT_ID'],
    ['credentials.github.oauth-client-secret', 'GITHUB_CLIENT_SECRET'],
    ['credentials.google.recaptcha-v2-key', 'GOOGLE_RECAPTCHA_V2_CLIENT_KEY'],
    ['credentials.google.recaptcha-v2-secret', 'GOOGLE_RECAPTCHA_V2_SECRET_KEY'],
    ['credentials.akismet.api-key', 'AKISMET_APIKEY'],
    ['credentials.akismet.domain', 'AKISMET_DOMAIN'],
    ['credentials.sendgrid', 'SENDGRID_API_KEY'],
    ['credentials.medium', 'MEDIUM_API_KEY'],
    ['credentials.twitter.consumer-key', 'TWITTER_CONSUMER_KEY'],
    ['credentials.twitter.consumer-secret', 'TWITTER_CONSUMER_SECRET'],
    ['credentials.twitter.access-token-key', 'TWITTER_ACCESS_TOKEN_KEY'],
    ['credentials.twitter.access-token-secret', 'TWITTER_ACCESS_TOKEN_SECRET'],
    ['credentials.linkedin.client-id', 'LINKEDIN_CLIENT_ID'],
    ['credentials.linkedin.client-secret', 'LINKEDIN_CLIENT_SECRET'],
    ['credentials.reddit.client-id', 'REDDIT_CLIENT_ID'],
    ['credentials.reddit.client-secret', 'REDDIT_CLIENT_SECRET']
  ];

  envOverrides.forEach(override => {
    const [configPath, env, defaultValue] = override;
    if (env && !_.isUndefined(_.get(process.env, env))) {
      config = _.set(config, configPath, _.get(process.env, env));
    }

    if (defaultValue && _.isUndefined(_.get(config, configPath))) {
      config = _.set(config, configPath, defaultValue);
    }
  });

  return config;
}

function loadRoutingTable(config) {
  const routingTablePath = config.blog['routing-table-path'];
  if (! routingTablePath) {
    return null;
  }

  if (! fs.existsSync(routingTablePath)) {
    console.error('Invalid routing table.', routingTablePath, 'does not exist');
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(routingTablePath));
  }
  catch (err) {
    console.error('Failed reading routing table');
    console.error(err);
    return null;
  }
}
