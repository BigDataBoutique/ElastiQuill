import _ from 'lodash';
import Joi from 'joi';
import uid from 'uid';
import * as blogPosts from './blogPosts';
import { esClient, config } from '../app';

const ES_INDEX = config.elasticsearch['blog-comments-index-name'];

const CreateCommentArgSchema = Joi.object().keys({
  "recipient_path": Joi.string().required().allow(null),
  "post_id": Joi.string().required(),
  "author": Joi.object().keys({
    "name": Joi.string().required(),
    "email": Joi.string().email().required(),
    "website": Joi.string().allow(''),
  }).required(),
  "content": Joi.string().required(),
  "user_host_address": Joi.string().required(),
  "user_agent": Joi.string().required(),
  "spam": Joi.boolean().required()
});

export async function createComment(comment) {
  const result = Joi.validate(comment, CreateCommentArgSchema);
  if (result.error) {
    throw result.error;
  }

  const recipientId = comment.recipient_path;
  delete comment.recipient_path;

  const body = {
    ...comment,
    comment_id: uid(12),
    approved: ! comment.spam,
    spam: comment.spam,
    published_at: new Date().toISOString()
  };

  if (recipientId) {
    var [documentId, ...repliesIndices] = JSON.parse(recipientId);
    const resp = await esClient.get({
      index: ES_INDEX,
      type: '_doc',
      id: documentId
    });

    let res = resp._source;
    for (var i of repliesIndices) {
      res = res.replies[i];
    }
    res.replies = res.replies || [];
    res.replies.push(body);

    await esClient.update({
      index: ES_INDEX,
      id: documentId,
      type: '_doc',
      refresh: 'wait_for',
      body: {
        doc: resp._source
      }
    });

    return {
      newComment: body,
      repliedToComment: res
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

export async function getComments(postIds) {
  const resp = await esClient.search({
    index: ES_INDEX,
    type: '_doc',
    ignore_unavailable: true,
    body: {
      query: {
        bool: {
          filter: [
            { terms: { post_id: postIds } },
            { term: { approved: true } },
            { term: { spam: false } },
          ]
        }
      },
      sort: [
        {
          published_at: { order: 'asc' }
        }
      ]
    }
  });

  return filterNotApproved(resp.hits.hits.map(h => ({
    ...h._source,
    id: h._id
  })));

  function filterNotApproved(comments) {
    return comments.filter(c => c.approved).map(c => ({
      ...c,
      replies: filterNotApproved(c.replies || [])
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

export async function deleteComment(id) {
  return await esClient.delete({
    id,
    index: ES_INDEX,
    type: '_doc',
    refresh: 'wait_for'
  });
}

export async function getCommentsStats({ postId }) {
  let query = {
    match_all: {}
  };

  if (postId) {
    query = {
      bool: {
        filter: {
          term: {
            post_id: postId
          }
        }
      }
    };
  }

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
        }
      }
    }
  });

  let mostCommentedPosts = [];
  if (resp.aggregations) {
    const postIdsBuckets = resp.aggregations.post_ids.buckets;
    const posts = await blogPosts.getItemsByIds(postIdsBuckets.map(b => b.key));
    mostCommentedPosts = posts.map(p => ({
       ...p,
       comments_count: _.find(postIdsBuckets, ['key', p.id]).doc_count
    }));
  }

  return {
    recentComments: resp.hits.hits.map(h => ({ ...h._source, id: h._id })),
    mostCommentedPosts
  };
}

export async function getAllComments() {
  let resp = await esClient.search({
    index: ES_INDEX,
    type: '_doc',
    scroll: '10s',
    ignore_unavailable: true,
    body: {
      query: {
        match_all: {}
      }
    }
  });

  const items = [];
  while (resp.hits.hits.length) {
    resp.hits.hits.forEach(hit => items.push(hit));
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
