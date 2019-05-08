import _ from 'lodash';
import md5 from 'md5';
import moment from 'moment';
import MarkdownIt from 'markdown-it';
import readingTime from 'reading-time';
import sanitizeHtml from 'sanitize-html';

import { config } from '../app';
import { stripSeriesTag, CONTENT_DESCRIPTION_ID_PREFIX } from '../services/blogPosts';

const BLOG_ROUTE_PREFIX = config.blog['blog-route-prefix'];
const COMMENTS_POST_PERIOD = config.blog['comments-post-period'];

const blogpostMarkdown = new MarkdownIt({
  html: true
});
const commentMarkdown = new MarkdownIt();

export function preparePage(p) {
  return {
    ...p,
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
        published_at: c.published_at,
        content: c.content,
        replies: stripConfidential(c.replies)
      };
    });
  }
}

export function preparePost(p) {
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

  return {
    ...p,
    comments,
    highlight,
    series_url: p.series ? seriesUrl(p.series) : undefined,
    allow_comments: allowComments,
    reading_time: readTime.minutes > 1 ? readTime.text : null,
    comments_count: p.comments_count ? p.comments_count : countComments(comments),
    published_at_str: prepareDate(p.published_at),
    content: p.metadata.content_type === 'markdown' ? blogpostMarkdown.render(p.content) : p.content,
    url: blogpostUrl(p)
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
  return {
    ...c,
    website: _.isEmpty(c.website) ? '#' : c.website,
    emailMD5: md5(c.author.email),
    content: commentMarkdown.render(c.content),
    published_at_str: prepareDate(c.published_at)
  };
}

export function prepareDate(d) {
  return moment(d).format('MMMM Do YYYY, h:mm');
}

export function blogpostUrl(post) {
  const id = post.id.split('-')[1];
  const url = `/${moment(post.published_at).format('YYYY/MM')}/${id}-${post.slug}`;

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
  const url = '/series/' + series;
  return BLOG_ROUTE_PREFIX === '/' ? url : BLOG_ROUTE_PREFIX + url;
}

export function tagUrl(tag) {
  const url = '/tagged/' + tag;
  return BLOG_ROUTE_PREFIX === '/' ? url : BLOG_ROUTE_PREFIX + url;
}