<img src="https://user-images.githubusercontent.com/212252/55680682-7a2de180-5925-11e9-848d-98ce55391921.png" width="450">

#### ElastiQuill is a modern blog engine built on top of Elasticsearch

[![Latest version](https://images.microbadger.com/badges/version/bigdataboutique/elastiquill.svg)](https://hub.docker.com/r/bigdataboutique/elastiquill "Latest version") [![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0) [![Known Vulnerabilities](https://snyk.io/test/github/BigDataBoutique/ElastiQuill/badge.svg?targetFile=backend/package.json)](https://snyk.io/test/github/BigDataBoutique/ElastiQuill) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

Features:

- Fully featured blog engine - posts, comments and replies to comments
- Anti-spam with Akismet and Recaptcha
- Medium-like writing interface
- Blog analytics 100% powered by Elastic
- Fully customizable design and layout via handlebars templates
- Support for content pages and a contact form
- Password-less admin interface (social login / SSO)
- Cross-posting between other blogs and Medium
- Social posting integration (Twitter, LinkedIn, Reddit)
- Built-in backup and full database dump
- Content caching
- Themes support

Demo: https://elastiquill.bigdataboutique.com

## Deploying

The easiest way to deploy ElastiQuill is to use the [official Docker image](https://hub.docker.com/r/bigdataboutique/elastiquill):

```bash
docker pull bigdataboutique/elastiquill
```

Instructions for running on Kubernetes are available under `_k8s/`.

## Set up admin login

### Google

First, you will need to have a Google project and to enable Google+ APIs for it. Go to https://console.developers.google.com/apis/dashboard, click `Enable APIs and Services`. Search for `google plus` and enable the `Google+ API`.

Once that is done, go to https://console.developers.google.com/apis/credentials, click Credentials -> OAuth Client ID -> Web Application. Set:

- Authorized JavaScript origins to `hostname`
- Authorized redirect URIs to `https://{hostname}{prefix}{api-route}/auth/google/callback`

Where `hostname` is your blog DNS, `prefix` is the value of the `blog.blog-route-prefix` configuration and `api-route` the `blog.api-route` configuration. Copy the Client ID and Client Secret and add them to your `config.yml` file.

### Github

Go to https://github.com/settings/applications/new to create a new application.

Set:

- Homepage URL to `hostname`
- Authorization callback URL to `hostname/api/auth/github/callback`

Where `hostname` is your blog DNS. Copy the Client ID and Client Secret and add them to your `config.yml` file.

## Themes

ElastiQuill supports loading custom themes to override the default provided theme or any part of it.

Themes are using the [Handlebars](https://handlebarsjs.com/) syntax, and all view files are expected to have the .hbs extension.

Theme structure:

```
theme-root/
|- layouts/    # contains the layout files, default layout name is "main"
|- partials/   # partias for the layout and pages, you can override existing or create new
|- public/     # public assets to serve (CSS, JS, images, etc)
| contact.hbs  # Handlebars views you can override as needed
```

You can use the default view as a base (under `backend/src/views/base`) or create your own from scratch. ElastiQuill will expect your theme to be under the path configured as `blog.theme-path` in your config.yml file.

Examples for custom ElastiQuill themes:

- https://github.com/BigDataBoutique/elastiquill-demo-theme
- https://github.com/synhershko/elastiquill-code972-theme

## Integration with social networks

You can connect your Linkedin, Twitter and Reddit accounts to Elastiquill to repost your blogposts from the admin panel.

### Linkedin

- Go to https://www.linkedin.com/developers/apps/new and create an app with default settings
- Under OAuth 2.0 settings, add a redirect URL `http://localhost:5000/api/connect/linkedin/callback`. Change `http://localhost:5000` to your `blog.url` configuration.
- In the app page, select the `Auth` tab. Copy the Client ID and Client Secret and add them to your `config.yml` file.

### Twitter

- Go to https://developer.twitter.com/en/apps/create
- Set Callback URL to `http://localhost:5000/api/social/twitter/callback`. Change `http://localhost:5000` to your `blog.url` configuration.
- `Sign in with Twitter` can be left disabled.
- In the app page, select the `Keys and tokens` tab. Generate both consumer API and access token keys and copy all four to your `config.yml` file (see configuration variables below).

### Reddit

- Go to https://www.reddit.com/prefs/apps/ and create a `web` app.
- Set `redirect uri` to `http://localhost:5000/api/connect/reddit/callback`. Change `http://localhost:5000` to your `blog.url` configuration.
- Copy Client ID (code under `web app` line) and Client Secret and add them to your `config.yml` file.

### Medium

- Request access to API and create an app as described [here](https://github.com/Medium/medium-api-docs#21-browser-based-authentication).
- Set callback URL to `http://localhost:5000/api/connect/medium/callback`. Change `http://localhost:5000` to your `blog.url` configuration.
- Copy Client ID and Client Secret and add them to your `config.yml` file.

### Facebook

- Go to https://developers.facebook.com/apps and create a new app.
- Under basic settings, add your `blog.url` configuration to `App Domains` input.
- Copy App ID and add them to your `config.yml` file.

## Configuration

All values in `config.yml` file can be overrided by ENV variables when they are set.  
See [config.yml](config.yml) for a sample configuration file.

| Variable                                | Description                                                                                                                                                                 | ENV variable                     | Default value           |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------------- |
| blog.admin-emails                       | Comma-separated list of admin emails, domains or `_all_`. Emails will be checked to match with Google/Github account email when using SSO on `/admin`                       | `BLOG_ADMIN_EMAILS`              | None. Required.         |
| blog.jwt-secret                         | A unique string used for encrypting authentication data.                                                                                                                    | `BLOG_JWT_SECRET`                | None. Required.         |
| blog.url                                | Blog URL including the prefix (if any). Should be equivalent to {blog.url.host}{blog-route-prefix}                                                                          | `BLOG_URL`                       | `http://localhost:5000` |
| blog.url-format                         | Blog URL Format. Default is <blog.url>/year/month/post-slug , can be set to `post-name` to make it <blog.url>/post-slug                                                     | `BLOG_URL_FORMAT`                | `month-and-name`        |
| blog.title                              | Blog title. Used in `/blog/rss` xml                                                                                                                                         | `BLOG_TITLE`                     | `Sample blog`           |
| blog.description                        | Blog description. Used in `/blog/rss` xml                                                                                                                                   | `BLOG_DESCRIPTION`               | `Sample description`    |
| blog.cache-ttl                          | Server-side page cache TTL in seconds. If `0` will disable caching (necessary for development).                                                                             | `BLOG_CACHE_TTL`                 | `60`                    |
| blog.compression                        | Whether to compress HTTP responses                                                                                                                                          | `BLOG_COMPRESSION`               | `false`                 |
| blog.port                               | Port to run on                                                                                                                                                              | `PORT`                           | `5000`                  |
| blog.posts-page-size                    | Number of posts to be shown per page on pages with post listing (home, posts, tags, search, etc)..                                                                          | `BLOG_POSTS_PAGE_SIZE`           | `10`                    |
| blog.comments-noreply-email             | When set, blogpost authors and commenters will receive email notifications about on new discussion from this email. Should be a single email string e.g. `noreply@blog.com` | `BLOG_COMMENTS_NOREPLY_EMAIL`    |                         |
| blog.comments-post-period               | Number of days to keep commenting enabled after publishing the blogpost. Set `-1` to never disable commenting                                                               | `BLOG_COMMENTS_POST_PERIOD`      | `60`                    |
| blog.contact-email                      | Email to send contacts form submits to                                                                                                                                      | `CONTACT_FORM_SEND_TO`           |                         |
| blog.contact-form-post-url              | Url to be submitted on contacts form (can be cross-origin)                                                                                                                  | `CONTACT_FORM_POST_URL`          | `/contact`              |
| blog.theme-path                         | Path to a directory with custom handlebars views. Templates are first searched in this directory, and only then in `views/base`                                             | `BLOG_THEME_PATH`                |                         |
| blog.theme-caching                      | View template compilation caching. Set this to `false` and `blog.cache-ttl` to 0 for hot-reloading.                                                                         | `BLOG_THEME_CACHING`             | `true`                  |
| blog.blog-route-prefix                  | Url prefix for all blog posts urls. Should be included in `blog.url`. Does not apply to content page urls.                                                                  | `BLOG_ROUTE_PREFIX`              |                         |
| blog.admin-route                        | Url under which admin dashboard can be accessed. Should be a subpath of `blog.url`.                                                                                         | `ADMIN_ROUTE`                    | `/admin`                |
| blog.api-route                          | Url under which the admin api can be accessed. Should be a subpath of `blog.url`.                                                                                           | `API_ROUTE`                      | `/api`                  |
| blog.uploads-bucket-prefix              | Bucket prefix used for uploads                                                                                                                                              | `UPLOADS_BUCKET_PREFIX`          |                         |
| elasticsearch.hosts                     | Comma-separated list of Elasticsearch hosts                                                                                                                                 | `ELASTICSEARCH_HOSTS`            | `http://localhost:9200` |
| elasticsearch.blog-index-name           | Elasticsearch index name to store blog posts                                                                                                                                | `BLOG_POSTS_INDEX`               | `blog-posts`            |
| elasticsearch.blog-comments-index-name  | Elasticsearch index name to store blog comments                                                                                                                             | `BLOG_COMMENTS_INDEX`            | `blog-comments`         |
| elasticsearch.blog-logs-index-name      | Elasticsearch index name to store error logs and metrics                                                                                                                    | `BLOG_LOGS_INDEX`                | `blog-logs`             |
| elasticsearch.blog-logs-period          | Set to `monthly` to index logs in separate indices per month instead of per day                                                                                             | `BLOG_LOGS_PERIOD`               | `daily`                 |
| credentials.sendgrid                    | Sendgrid API key                                                                                                                                                            | `SENDGRID_API_KEY`               |                         |
| credentials.google.analytics-code       | GA tracking ID                                                                                                                                                              | `GOOGLE_ANALYTICS_CODE`          |                         |
| credentials.google.oauth-client-id      | Google OAuth 2 client ID                                                                                                                                                    | `GOOGLE_OAUTH_CLIENT_ID`         |                         |
| credentials.google.oauth-client-secret  | Google OAuth 2 client secret                                                                                                                                                | `GOOGLE_OAUTH_CLIENT_SECRET`     |                         |
| credentials.github.oauth-client-id      | Github OAuth client ID                                                                                                                                                      | `GITHUB_CLIENT_ID`               |                         |
| credentials.github.oauth-client-secret  | Github OAuth client secret                                                                                                                                                  | `GITHUB_CLIENT_SECRET`           |                         |
| credentials.google.recaptcha-v2-key     | Google Recaptcha v2 client key                                                                                                                                              | `GOOGLE_RECAPTCHA_V2_CLIENT_KEY` |                         |
| credentials.google.recaptcha-v2-secret  | Google Recaptcha v2 client secret                                                                                                                                           | `GOOGLE_RECAPTCHA_V2_SECRET_KEY` |                         |
| credentials.akismet.api-key             | Akismet API key                                                                                                                                                             | `AKISMET_APIKEY`                 |                         |
| credentials.akismet.domain              | Akismet domain                                                                                                                                                              | `AKISMET_DOMAIN`                 |                         |
| credentials.google.gcs-bucket           | GCS bucket                                                                                                                                                                  | `GOOGLE_GCS_BUCKET`              |                         |
| credentials.google.gcs-keyfile          | Path to the credentials file                                                                                                                                                | `GOOGLE_APPLICATION_CREDENTIALS` |                         |
| credentials.aws.s3-bucket               | S3 bucket                                                                                                                                                                   | `AWS_S3_BUCKET`                  |                         |
| credentials.aws.region                  | AWS region                                                                                                                                                                  | `AWS_REGION`                     |                         |
| credentials.aws.access-key-id           | AWS access key ID                                                                                                                                                           | `AWS_ACCESS_KEY_ID`              |                         |
| credentials.aws.secret-access-key       | AWS secret access key                                                                                                                                                       | `AWS_SECRET_ACCESS_KEY`          |                         |
| credentials.linkedin.client-id          | Linkedin Client ID                                                                                                                                                          | `LINKEDIN_CLIENT_ID`             |                         |
| credentials.linkedin.client-secret      | Linkedin Client Secret                                                                                                                                                      | `LINKEDIN_CLIENT_SECRET`         |                         |
| credentials.twitter.consumer-key        | Twitter Consumer Key                                                                                                                                                        | `TWITTER_CONSUMER_KEY`           |                         |
| credentials.twitter.consumer-secret     | Twitter Consumer Secret                                                                                                                                                     | `TWITTER_CONSUMER_SECRET`        |                         |
| credentials.twitter.access-token-key    | Twitter access token key                                                                                                                                                    | `TWITTER_ACCESS_TOKEN_KEY`       |                         |
| credentials.twitter.access-token-secret | Twitter access token secret                                                                                                                                                 | `TWITTER_ACCESS_TOKEN_SECRET`    |                         |
| credentials.reddit.client-id            | Reddit Client ID                                                                                                                                                            | `REDDIT_CLIENT_ID`               |                         |
| credentials.reddit.client-secret        | Reddit Client Secret                                                                                                                                                        | `REDDIT_CLIENT_SECRET`           |                         |
| credentials.medium.client-id            | Medium Client ID                                                                                                                                                            | `MEDIUM_CLIENT_ID`               |                         |
| credentials.medium.client-secret        | Medium Client Secret                                                                                                                                                        | `MEDIUM_CLIENT_SECRET`           |                         |
| credentials.facebook.app-id             | Facebook App ID. Used to enable sharing selected text and post to facebook.                                                                                                 | `FACEBOOK_APP_ID`                |                         |

## Running locally

The easiest way is to run via docker-compose:

```
docker-compose up
```

- Please note that before you can create and start the containers for the first time, you might need to create a default docker network:
  `docker network create blog`

You might need to run the following on your machine if Elasticsearch refuses to run: `sysctl -w vm.max_map_count=262144`.

To build and run the blog engine in Docker:

```
docker build . -t elastiquill
docker run -p 5000:5000 -v /path/to/config.yml:/etc/elastiquill/config.yml elastiquill
```

Configuration file will be looked up at `/etc/elastiquill/config.yml` unless you set the `CONFIG_PATH` environment variable.

Alternatively, you can run the engine without Docker. Build the admin panel frontend

```
cd admin-frontend
npm install && npm run build
```

And run the backend

```
cd backend
npm install
npm run production
```
