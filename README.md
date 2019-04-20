<img src="https://user-images.githubusercontent.com/212252/55680682-7a2de180-5925-11e9-848d-98ce55391921.png" width="450">

#### ElastiQuill is a modern blog engine built on top of Elasticsearch

Features:

* Fully featured blog engine - posts, comments and replies to comments
* Anti-spam with Akismet and Recaptcha
* Medium-like writing interface
* Blog analytics 100% powered by Elastic
* Fully customizable design and layout via handlebars templates
* Support for content pages and a contact form
* Password-less admin interface (social login / SSO)
* Cross-posting between other blogs and Medium
* Social posting integration (Twitter, LinkedIn, Reddit)
* Built-in backup and full database dump
* Content caching

Demo: https://elastiquill.bigdataboutique.com

## Deploying

The easiest way to deploy ElastiQuill is to use the [official Docker image](https://hub.docker.com/r/bigdataboutique/elastiquill):

```bash
docker pull bigdataboutique/elastiquill
```

Instructions for running on Kubernetes are available under `_k8s/`. 

## Running locally

The easiest way is to run via docker-compose:

```
docker-compose up
```

You might need to run the following on your machine if Elasticsearch refuses to run: `sysctl -w vm.max_map_count=262144`.

To build and run the blog engine in Docker:

```
docker build . -t elastic-blog-engine
docker run -p 5000:5000 -v /path/to/config.yml:/etc/elastiquill/config.yml elastiquill
```
Configuration file will be looked up at `/etc/elastiquill/config.yml` unless you set the `CONFIG_PATH` environment variable.  

Blog themes are located under `/app/views` directory. You can define your own theme by mounting a folder in that directory and setting `blog.theme-path` configuration to `/app/views/yourtheme`.  

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

## Set up admin login

### Google

First, you will need to have a Google project and to enable Google+ APIs for it. Go to https://console.developers.google.com/apis/dashboard, click `Enable APIs and Services`. Search for `google plus` and enable the `Google+ API`.

Once that is done, go to https://console.developers.google.com/apis/credentials, click Credentials -> OAuth Client ID -> Web Application. Set:

* Authorized JavaScript origins to `hostname`
* Authorized redirect URIs to `https://hostname/api/auth/google/callback`

Where `hostname` is your blog DNS. Copy the Client ID and Client Secret and add them to your `config.yml` file.

### Github

Go to https://github.com/settings/applications/new to create a new application.

Set:
* Homepage URL to `hostname`
* Authorization callback URL to `hostname/api/auth/github/callback`

Where `hostname` is your blog DNS. Copy the Client ID and Client Secret and add them to your `config.yml` file.

## Integration with social networks

You can connect your Linkedin, Twitter and Reddit accounts to Elastiquill to repost your blogposts from the admin panel.

### Linkedin
* Go to https://www.linkedin.com/developers/apps/new and create an app with default settings
* Under OAuth 2.0 settings, add a redirect URL `http://localhost:5000/api/connect/linkedin/callback`. Change `http://localhost:5000` to your `blog.url` configuration.
* In the app page, select the `Auth` tab. Copy the Client ID and Client Secret and add them to your `config.yml` file.

### Twitter
* Go to https://developer.twitter.com/en/apps/create
* Set Callback URL to `http://localhost:5000/api/social/twitter/callback`. Change `http://localhost:5000` to your `blog.url` configuration.
* `Sign in with Twitter` can be left disabled.
* In the app page, select the `Keys and tokens` tab. Copy Consumer and Access token keys, and add them to your `config.yml` file.

### Reddit
* Go to https://www.reddit.com/prefs/apps/ and create a `script` app. You can write any value in `redirect uri`.
* Copy Client ID (code under `personal use script` line) and Client Secret and add them to your `config.yml` file.
* Add account's username and password to `config.yml` file.

## Configuration

All values in `config.yml` file can be overrided by ENV variables when they are set.  
See [config.yml](config.yml) for a sample configuration file.

| Variable | Description | ENV variable | Default value |
| ------ | ------ | ------ | ------ |
| blog.admin-emails | Comma-separated list of admin emails, domains or `_all_`. Emails will be checked to match with Google/Github account email when using SSO on `/admin` | `BLOG_ADMIN_EMAILS` | None. Required.
| blog.jwt-secret | A unique string used for encrypting authentication data. | `BLOG_JWT_SECRET` | None. Required.
| blog.url | Blog URL | `BLOG_URL` | `http://localhost:5000` |
| blog.title | Blog title. Used in `/blog/rss` xml | `BLOG_TITLE` | `Sample blog` |
| blog.description | Blog description. Used in `/blog/rss` xml | `BLOG_DESCRIPTION` | `Sample description` |
| blog.cache-ttl | Page cache TTL in seconds. If `0` will disable caching. | `BLOG_CACHE_TTL` |  `60` |
| blog.compression | Whether to compress HTTP responses | `BLOG_COMPRESSION` |  `false` |
| blog.port | Port to run on | `PORT` | `5000` |
| blog.comments-noreply-email | When set, blogpost authors and commenters will receive email notifications about on new discussion from this email. Should be a single email string e.g. `noreply@blog.com` | `BLOG_COMMENTS_NOREPLY_EMAIL` | |
| blog.contact-email | Email to send contacts form submits to | `CONTACT_FORM_SEND_TO` | |
| blog.theme-path | Path to a directory with custom handlebars views. Templates are first searched in this directory, and only then in `views/base` | `BLOG_THEME_PATH` | |
| blog.theme-caching | View template compilation caching. Set `false` for hot-reloading. | `BLOG_THEME_CACHING` | `true` |
| blog.blog-route-prefix | Url prefix for all blog posts urls. Does not apply to content page urls | `BLOG_ROUTE_PREFIX` | `/blog` |
| blog.admin-route | Url under which admin dashboard can be accessed | `ADMIN_ROUTE` | `/admin` |
| blog.uploads-bucket-prefix | Bucket prefix used for uploads | `UPLOADS_BUCKET_PREFIX` | |
| elasticsearch.hosts | Comma-separated list of Elasticsearch hosts | `ELASTICSEARCH_HOSTS` | `http://localhost:9200` |
| elasticsearch.blog-index-name | Elasticsearch index name to store blog posts | `BLOG_POSTS_INDEX` | `blog-posts` |
| elasticsearch.blog-comments-index-name | Elasticsearch index name to store blog comments | `BLOG_COMMENTS_INDEX` | `blog-comments` |
| elasticsearch.blog-logs-index-name | Elasticsearch index name to store error logs and metrics | `BLOG_LOGS_INDEX` | `blog-logs` |
| credentials.sendgrid | Sendgrid API key | `SENDGRID_API_KEY` |
| credentials.google.analytics-code | GA tracking ID | `GOOGLE_ANALYTICS_CODE` |
| credentials.google.oauth-client-id | Google OAuth 2 client ID | `GOOGLE_OAUTH_CLIENT_ID` |
| credentials.google.oauth-client-secret | Google OAuth 2 client secret | `GOOGLE_OAUTH_CLIENT_SECRET` |
| credentials.github.oauth-client-id | Github OAuth client ID | `GITHUB_CLIENT_ID` |
| credentials.github.oauth-client-secret | Github OAuth client secret | `GITHUB_CLIENT_SECRET` |
| credentials.google.recaptcha-v2-key | Google Recaptcha v2 client key | `GOOGLE_RECAPTCHA_V2_CLIENT_KEY` |
| credentials.google.recaptcha-v2-secret | Google Recaptcha v2 client secret | `GOOGLE_RECAPTCHA_V2_SECRET_KEY` |
| credentials.akismet.api-key | Akismet API key | `AKISMET_APIKEY` |
| credentials.akismet.domain | Akismet domain | `AKISMET_DOMAIN` |
| credentials.google.gcs-bucket | GCS bucket | `GOOGLE_GCS_BUCKET` |
| credentials.google.gcloud-project-id | Google Cloud project ID for GCS | `GOOGLE_GCLOUD_PROJECT_ID` |
| credentials.google.gcs-keyfile | Path to the credentials file | `GOOGLE_GCS_KEYFILE` |
| credentials.aws.s3-bucket | S3 bucket | `AWS_S3_BUCKET` |
| credentials.aws.access-key-id | AWS access key ID | `AWS_ACCESS_KEY_ID` |
| credentials.aws.secret-access-key | AWS secret access key | `AWS_SECRET_ACCESS_KEY` |
| credentials.linkedin.client-id | Linkedin Client ID | `LINKEDIN_CLIENT_ID` |
| credentials.linkedin.client-secret | Linkedin Client Secret | `LINKEDIN_CLIENT_SECRET` |
| credentials.twitter.consumer-key | Twitter Consumer Key | `TWITTER_CONSUMER_KEY` |
| credentials.twitter.consumer-secret | Twitter Consumer Secret | `TWITTER_CONSUMER_SECRET` |
| credentials.twitter.access-token-key | Twitter access token key | `TWITTER_ACCESS_TOKEN_KEY` |
| credentials.twitter.access-token-secret | Twitter access token secret | `TWITTER_ACCESS_TOKEN_SECRET` |
| credentials.reddit.client-id | Reddit Client ID | `REDDIT_CLIENT_ID` |
| credentials.reddit.client-secret | Reddit Client Secret | `REDDIT_CLIENT_SECRET` |
| credentials.reddit.username | Reddit account username | `REDDIT_USERNAME` |
| credentials.reddit.password | Reddit account password | `REDDIT_PASSWORD` |