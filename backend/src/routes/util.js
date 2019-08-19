import _ from 'lodash';
import url from 'url';
import md5 from 'md5';
import moment from 'moment';
import MarkdownIt from 'markdown-it';
import htmlToText from 'html-to-text';
import readingTime from 'reading-time';
import sanitizeHtml from 'sanitize-html';

import { config } from '../app';
import { stripSeriesTag, CONTENT_DESCRIPTION_ID_PREFIX } from '../services/blogPosts';

const BLOG_URL = config.blog['url'];
const BLOG_ROUTE_PREFIX = config.blog['blog-route-prefix'];
const COMMENTS_POST_PERIOD = config.blog['comments-post-period'];
const DEFAULT_HEADER_IMAGE = config.blog['default-header-image'];

const blogpostMarkdown = new MarkdownIt({
  html: true
});
const commentMarkdown = new MarkdownIt();

export function isItemEditable(item, user) {
  if (user.role === 'admin') {
    return true;
  }

  if (user.role === 'publisher') {
    return user.emails.includes(item.author.email);
  }

  return false;
}

export function preparePage(p) {
  if (! p) return null;
  
  const metadata = {
    ...p.metadata,
    header_image_url: p.metadata.header_image_url || DEFAULT_HEADER_IMAGE
  };

  return {
    ...p,
    metadata,
    published_at_str: prepareDate(p.published_at),
    content: p.metadata.content_type === 'markdown' ? blogpostMarkdown.render(p.content) : p.content,
    url: pageUrl(p)
  };
}

export function preparePostJson(p) {
  const post = preparePost(p);
  post.comments = stripConfidential(post.comments);
  return post;

  function stripConfidential(comments) {
    return comments.map(c => {
      return {
        id: c.id,
        author: c.author,
        published_at: new Date(c.published_at).toISOString(),
        content: c.content,
        replies: stripConfidential(c.replies)
      };
    });
  }
}

export function preparePost(p) {
  if (! p) return null;

  const highlight = p.highlight;

  for (const key in highlight) {
    if (p.metadata.content_type === 'markdown') {
      highlight[key] = highlight[key].join('\n\n');
      highlight[key] = blogpostMarkdown.render(highlight[key]);
    }
    else {
      highlight[key] = highlight[key].join('<br/>');
    }
    highlight[key] = sanitizeHtml(highlight[key], {
      allowedClasses: {
        em: ['search-highlight']
      }
    });
  }

  const readTime = readingTime(p.content);
  const daysPastPublishing = moment().diff(moment(p.published_at), 'days');

  let allowComments = p.allow_comments;
  if (allowComments && COMMENTS_POST_PERIOD >= 0) {
    allowComments = daysPastPublishing <= COMMENTS_POST_PERIOD;
  }

  const comments = prepareComments(p.comments || [], allowComments);

  if (p.more_like_this) {
    p.more_like_this = p.more_like_this.map(preparePost);
  }

  let tags = [];
  if (p.tags) {
    tags = p.tags.map(key => ({
      key,
      url: tagUrl(key)
    }));
  }

  const author = {
    ...p.author,
    avatar: avatarUrl(p.author.email)
  };

  const metadata = {
    ...p.metadata,
    header_image_url: p.metadata.header_image_url || DEFAULT_HEADER_IMAGE
  };  

  const content = p.metadata.content_type === 'markdown' ? blogpostMarkdown.render(p.content) : p.content; 
  const hasDescription = _.isString(p.description) && _.trim(p.description).length > 0;
  const excerpt = hasDescription ? p.description : htmlToText.fromString(content, {
    ignoreHref: true,
    ignoreImage: true
  }).substring(0, 200) + '...';

  const postUrl = blogpostUrl(p);

  return {
    ...p,
    tags,
    author,
    excerpt,
    content,
    metadata,
    comments,
    highlight,
    url: postUrl,
    full_url: url.resolve(BLOG_URL, postUrl),
    series_url: p.series ? seriesUrl(p.series) : undefined,
    allow_comments: allowComments,
    reading_time: readTime.minutes > 1 ? readTime.text : null,
    comments_count: p.comments_count ? p.comments_count : countComments(comments),
    published_at: new Date(p.published_at).toISOString(),
    published_at_str: prepareDate(p.published_at),
  };

  function countComments(comments) {
    return comments.reduce((acc, curr) => {
      return acc + countComments(curr.replies || [])
    }, comments.length);
  }
}

export function prepareComments(comments, allowComments, parentComment = null) {
  return comments.map(prepareComment).map((c, i) => {
    c.allow_comments = allowComments;
    c.replies = prepareComments(c.replies || [], allowComments, c);
    return c;
  });
}

function prepareComment(c) {
  const author = {
    ...c.author,
    avatar: avatarUrl(c.author.email),
  };
  
  return {
    ...c,
    author,
    website: _.isEmpty(c.website) ? '#' : c.website,
    content: commentMarkdown.render(c.content),
    published_at_str: prepareDate(c.published_at)
  };
}

export function prepareDate(d) {
  return moment(d).format('MMMM Do, YYYY');
}

export function blogpostUrl(post) {
  const id = post.id.split('-')[1];
  const url = `/${moment(post.published_at).format('YYYY/MM')}/${post.slug}-${id}`;

  if (BLOG_ROUTE_PREFIX.length && BLOG_ROUTE_PREFIX !== '/') {
    return BLOG_ROUTE_PREFIX + url;
  }
  return url;
}

export function pageUrl(page) {
  if (page.metadata.is_tag_description) {
    const tag = page.id.substring(CONTENT_DESCRIPTION_ID_PREFIX.length);
    if (tag.length && tag[0] === '{' && tag[tag.length - 1] === '}') {
      return seriesUrl(stripSeriesTag(tag));
    }
    else {
      return tagUrl(tag);
    }
  }
  
  return `/${page.id}`;
}

export function seriesUrl(series) {
  if (! _.isString(series)) {
    throw new Error('Invalid argument provided to seriesUrl');
  }

  const url = '/series/' + encodeURIComponent(series.toLowerCase());
  return BLOG_ROUTE_PREFIX === '/' ? url : BLOG_ROUTE_PREFIX + url;
}

export function tagUrl(tag) {
  if (! _.isString(tag)) {
    throw new Error('Invalid argument provided to tagUrl');
  }

  const url = '/tagged/' + encodeURIComponent(tag.toLowerCase());
  return BLOG_ROUTE_PREFIX === '/' ? url : BLOG_ROUTE_PREFIX + url;
}

function avatarUrl(email) {
  return `https://www.gravatar.com/avatar/${md5(email)}?size=100&default=identicon`;
}