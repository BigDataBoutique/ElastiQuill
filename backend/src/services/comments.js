import _ from 'lodash';
import Joi from 'joi';
import uid from 'uid';
import * as blogPosts from './blogPosts';
import { esClient, config } from '../app';

const ES_INDEX = config.elasticsearch['blog-comments-index-name'];

const CreateCommentArgSchema = Joi.object().keys({
  "recipient_comment_id": Joi.string().required().allow(null),
  "post_id": Joi.string().required(),
  "author": Joi.object().keys({
    "name": Joi.string().required(),
    "email": Joi.string().email().required(),
    "website": Joi.string().allow(''),
  }).required(),
  "content": Joi.string().required(),
  "user_host_address": Joi.string().required(),
  "user_agent": Joi.string().required(),
  "spam": Joi.boolean().allow(null).required()
});

const UpdateCommentArgSchema = Joi.object().keys({
  spam: Joi.boolean().required(),
  approved: Joi.boolean().required()
});

export async function createComment(comment) {
  const result = Joi.validate(comment, CreateCommentArgSchema);
  if (result.error) {
    throw result.error;
  }

  const recipientCommentId = comment.recipient_comment_id;
  delete comment.recipient_comment_id;

  const body = {
    ...comment,
    comment_id: uid(12),
    approved: ! comment.spam,
    spam: comment.spam,
    published_at: new Date().toISOString()
  };

  if (recipientCommentId) {
    const resp = await esClient.get({
      index: ES_INDEX,
      type: '_doc',
      id: recipientCommentId
    });

    resp._source.replies = resp._source.replies || [];
    resp._source.replies.push(body);

    await esClient.update({
      index: ES_INDEX,
      id: recipientCommentId,
      type: '_doc',
      refresh: 'wait_for',
      body: {
        doc: resp._source
      }
    });

    return {
      newComment: body,
      repliedToComment: resp._source
    };
  }
  else {
    const resp = await esClient.index({
      index: ES_INDEX,
      type: '_doc',
      refresh: 'wait_for',
      body
    });

    return {
      newComment: resp._source,
      repliedToComment: null
    };
  }
}

export async function getComments({ postIds, disableFiltering }) {
  let query = { match_all: {} };
  if (postIds || ! disableFiltering) {
    const filters = [];

    if (postIds) {
      filters.push({ terms: { post_id: postIds } });
    }
    if (! disableFiltering) {
      filters.push({ term: { approved: true } });
      filters.push({
        bool: {
          must_not: {
            term: { spam: true }
          }
        }
      });
    }

    query = { bool: { filter: filters } }
  }

  const resp = await esClient.search({
    index: ES_INDEX,
    ignore_unavailable: true,
    body: {
      size: 50,
      query,
      sort: [
        {
          published_at: { order: 'asc' }
        }
      ]
    }
  });

  return processComments(resp.hits.hits.map(h => ({
    ...h._source,
    id: h._id
  })));

  function processComments(comments) {
    if (! disableFiltering) {
      comments = comments.filter(c => c.approved);
    }

    return comments.map(c => ({
      ...c,
      replies: processComments(c.replies || [])
    }));
  }
}

export async function deletePostComments(id) {
  return await esClient.deleteByQuery({
    index: ES_INDEX,
    type: '_doc',
    refresh: 'wait_for',
    body: {
      query: {
        bool: {
          filter: [
            { term: { post_id: id } }
          ]
        }
      }
    }
  });
}

export async function updateComment(path, partial) {
  const result = Joi.validate(partial, UpdateCommentArgSchema);
  if (result.error) {
    throw result.error;
  }

  const rootComment = await esClient.get({
    index: ES_INDEX,
    id: path[0]
  });

  let comment = rootComment._source;
  path.slice(1).forEach(replyId => {
    comment = _.find(comment.replies, ['comment_id', replyId]);
  });

  _.assign(comment, partial);

  await esClient.update({
    index: ES_INDEX,
    id: path[0],
    refresh: 'wait_for',
    body: {
      doc: rootComment._source
    }
  });
}

export async function deleteComment(path) {
  if (path.length === 1) {
    await esClient.delete({
      index: ES_INDEX,
      refresh: 'wait_for',
      id: path[0]
    });
    return;
  }

  const rootComment = await esClient.get({
    index: ES_INDEX,
    id: path[0]
  });

  let comment = rootComment._source;
  for (let i = 1; i < path.length; ++i) {
    if (i === path.length - 1) {
      comment.replies = comment.replies.filter(c => c.comment_id !== path[i]);
      comment = _.find(comment.replies, ['comment_id', path[i]]);
    }
    else {
      comment = _.find(comment.replies, ['comment_id', path[i]]);
    }
  }

  await esClient.update({
    index: ES_INDEX,
    id: path[0],
    refresh: 'wait_for',
    body: {
      doc: rootComment._source
    }
  });
}

export async function getStats({ startDate, postId, interval = '1d' }) {
  let query = {
    match_all: {}
  };

  const filters = [];

  if (postId) {
    filters.push({
      term: {
        post_id: postId
      }
    });
  }

  if (startDate) {
    filters.push({
      range: {
        'published_at': {
          gte: startDate
        }
      }
    });
  }

  if (filters.length) {
    query = {
      bool: {
        filter: filters
      }
    };
  }  

  const countResp = await esClient.count({
    index: ES_INDEX,
    body: {
      query
    }
  });

  const resp = await esClient.search({
    index: ES_INDEX,
    body: {
      size: 10,
      query,
      sort: [
        {
          published_at: { order: 'desc' }
        }
      ],
      aggs: {
        post_ids: {
          terms: {
            field: 'post_id',
            size: 5
          }
        },
        comments_histogram: {
          date_histogram: {
            field: 'published_at',
            interval
          }
        }        
      }
    }
  });

  let mostCommentedPosts = [];
  let commentsByDate = [];

  if (resp.aggregations) {
    const postIdsBuckets = resp.aggregations.post_ids.buckets;
    const posts = await blogPosts.getItemsByIds(postIdsBuckets.map(b => b.key));
    mostCommentedPosts = posts.map(p => ({
       ...p,
       comments_count: _.find(postIdsBuckets, ['key', p.id]).doc_count
    }));

    commentsByDate = resp.aggregations.comments_histogram.buckets;
  }

  return {
    commentsByDate,
    mostCommentedPosts,
    recentComments: resp.hits.hits.map(h => ({ ...h._source, id: h._id })),
    commentsCount: countResp.count
  };
}

export async function getAllComments() {
  let resp = await esClient.search({
    index: ES_INDEX,
    scroll: '10s',
    ignore_unavailable: true,
    body: {
      size: 100,
      query: {
        match_all: {}
      },
      sort: [
        {
          'published_at': { order: 'desc' }
        }
      ]
    }
  });

  let items = [];
  while (resp.hits.hits.length) {
    items = items.concat(resp.hits.hits);
    resp = await esClient.scroll({
      scroll: '10s',
      scrollId: resp._scroll_id
    });
  }

  return items.map(hit => ({
    ...hit._source,
    id: hit._id
  }))
}