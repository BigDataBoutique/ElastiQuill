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

Demo: https://elastiquill.bigdataboutique.com

## Deploying

The easiest way to deploy ElastiQuill is to use the official Docker container:

```bash
docker pull bigdataboutique/elastiquill
```

Docker Hub: https://hub.docker.com/r/bigdataboutique/elastiquill

Kubernetes bits

## Running locally

To run the blog engine in Docker, build the image and run it on port 5000.
```
docker build . -t elastic-blog-engine
docker run -p 5000:5000 -v /path/to/config.yml:/etc/elastiquill/config.yml elastic-blog-engine
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

## Configure Elasticsearch
To configure Elasticsearch, run `_setup/setup.py` script and pass path to the `config.yml` file.
```
./setup.py --config /path/to/config.yml
```
Script will create indices for posts and comments and an index template for logs, based on ENV variables and values in config file.

## Set up admin login

### Google

First, you will need to have a Google project and to enable Google+ APIs for it. Go to https://console.developers.google.com/apis/dashboard, click `Enable APIs and Services`. Search for `google plus` and enable the `Google+ API`.

Once that is done, go to https://console.developers.google.com/apis/credentials, click Credentials -> OAuth Client ID -> Web Application. Set:

* Authorized JavaScript origins to `hostname`
* Authorized redirect URIs to `https://hostname/api/auth/google/callback`

Where `hostname` is your blog DNS. Copy the Client ID and Client Secret and add them to your config.yml file.

### Github

Go to https://github.com/settings/applications/new to create a new application.

Set:
* Homepage URL to `hostname`
* Authorization callback URL to `hostname/api/auth/github/callback`

Where `hostname` is your blog DNS. Copy the Client ID and Client Secret and add them to your config.yml file.

## Configuration

All values in `config.yml` file can be overrided by ENV variables when they are set.  
See [config.yml](config.yml) for a sample configuration file.

| Variable | Description | ENV variable | Default value | Is required |
| ------ | ------ | ------ | ------ | ------ |
| blog.title | Blog title. Used in `/blog/rss` xml | `BLOG_TITLE` | `Sample blog` | Optional
| blog.description | Blog description. Used in `/blog/rss` xml | `BLOG_DESCRIPTION` | `Sample description` | Optional
| blog.url | Blog URL | `BLOG_URL` | `http://localhost:5000` | Optional
| blog.compression | Whether to compress HTTP responses | `BLOG_COMPRESSION` |  `false` | Optional
| blog.port | Port to run on | `PORT` | `5000` | Optional
| blog.jwt-secret | JWT secret | `BLOG_JWT_SECRET` | | Required
| blog.comments-noreply-email | When set, blogpost authors and commenters will receive email notifications about on new discussion from this email. Should be a single email string e.g. `noreply@blog.com` | `BLOG_COMMENTS_NOREPLY_EMAIL` | | Optional
| blog.contact-email | Email to send contacts form submits to | `CONTACT_FORM_SEND_TO` | | Optional
| blog.admin-emails | Comma-separated list of admin emails, domains or `_all`. Emails will be checked to match with Google/Github account email when using SSO on `/admin` | `BLOG_ADMIN_EMAILS` | | Required
| blog.theme-path | Path to a directory with custom handlebars views. Templates are first searched in this directory, and only then in `views/base` | `BLOG_THEME_PATH` | | Optional
| blog.blog-route-prefix | Url prefix for all blog posts urls. Does not apply to content page urls | `BLOG_ROUTE_PREFIX` | `/blog` | Optional
| blog.admin-route | Url under which admin dashboard can be accessed | `ADMIN_ROUTE` | `/admin` | Optional
| elasticsearch.hosts | Comma-separated list of Elasticsearch hosts | `ELASTICSEARCH_HOSTS` | `http://localhost:9200` | Optional
| elasticsearch.blog-index-name | Elasticsearch index name to store blog posts | `BLOG_POSTS_INDEX` | `blog-posts` | Optional
| elasticsearch.blog-comments-index-name | Elasticsearch index name to store blog comments | `BLOG_COMMENTS_INDEX` | `blog-comments` | Optional
| elasticsearch.blog-logs-index-name | Elasticsearch index name to store error logs and metrics | `BLOG_LOGS_INDEX` | `blog-logs` | Optional
| credentials.sendgrid | Sendgrid API key | `SENDGRID_API_KEY` | | Optional
| credentials.google.analytics-code | GA tracking ID | `GOOGLE_ANALYTICS_CODE` | | Optional
| credentials.google.oauth-client-id | Google OAuth 2 client ID | `GOOGLE_OAUTH_CLIENT_ID` | | Optional
| credentials.google.oauth-client-secret | Google OAuth 2 client secret | `GOOGLE_OAUTH_CLIENT_SECRET` | | Optional
| credentials.github.oauth-client-id | Github OAuth client ID | `GITHUB_CLIENT_ID` | | Optional
| credentials.github.oauth-client-secret | Github OAuth client secret | `GITHUB_CLIENT_SECRET` | | Optional
| credentials.google.recaptcha-v2-key | Google Recaptcha v2 client key | `GOOGLE_RECAPTCHA_V2_CLIENT_KEY` | | Optional
| credentials.google.recaptcha-v2-secret | Google Recaptcha v2 client secret | `GOOGLE_RECAPTCHA_V2_SECRET_KEY` | | Optional
| credentials.akismet.api-key | Akismet API key | `AKISMET_APIKEY` | | Optional
| credentials.akismet.domain | Akismet domain | `AKISMET_DOMAIN` | | Optional
