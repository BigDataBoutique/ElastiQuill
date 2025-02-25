import Joi from "joi";
import _ from "lodash";
import { uid } from "uid";
import { esClient } from "../lib/elasticsearch";
import * as blogPosts from "./blogPosts";
import {
  BLOG_COMMENTS_INDEX_ALIAS as ES_INDEX,
  addType,
} from "./elasticsearch";

const CreateCommentArgSchema = Joi.object().keys({
  recipient_comment_id: Joi.string()
    .required()
    .allow(null),
  post_id: Joi.string().required(),
  author: Joi.object()
    .keys({
      name: Joi.string().required(),
      email: Joi.string()
        .email()
        .required(),
      website: Joi.string().allow(""),
    })
    .required(),
  content: Joi.string().required(),
  user_host_address: Joi.string().required(),
  user_agent: Joi.string().required(),
  spam: Joi.boolean()
    .allow(null)
    .required(),
});

const UpdateCommentArgSchema = Joi.object().keys({
  spam: Joi.boolean().required(),
  approved: Joi.boolean().required(),
});

export async function createComment(comment) {
  const result = CreateCommentArgSchema.validate(comment);
  if (result.error) {
    throw result.error;
  }

  const recipientCommentId = comment.recipient_comment_id;
  delete comment.recipient_comment_id;

  const body = {
    ...comment,
    comment_id: uid(12),
    approved: !comment.spam,
    spam: comment.spam,
    published_at: new Date().toISOString(),
  };

  if (recipientCommentId) {
    const resp = await esClient.get(
      addType({
        index: ES_INDEX,
        id: recipientCommentId,
      })
    );

    resp.body._source.replies = resp.body._source.replies || [];
    resp.body._source.replies.push(body);

    await esClient.update(
      addType({
        index: ES_INDEX,
        id: recipientCommentId,
        refresh: "wait_for",
        body: {
          doc: resp.body._source,
        },
      })
    );

    return {
      newComment: body,
      repliedToComment: resp.body._source,
    };
  } else {
    const resp = await esClient.index(
      addType({
        index: ES_INDEX,
        refresh: "wait_for",
        body,
      })
    );

    return {
      newComment: resp.body._source,
      repliedToComment: null,
    };
  }
}

export async function getComments({ postIds, disableFiltering }) {
  let query = { match_all: {} };
  if (postIds || !disableFiltering) {
    const filters = [
      {
        bool: {
          must_not: {
            term: { spam: true },
          },
        },
      },
    ];

    if (postIds) {
      filters.push({ terms: { post_id: postIds } });
    }
    if (!disableFiltering) {
      filters.push({ term: { approved: true } });
    }

    query = { bool: { filter: filters } };
  }

  const resp = await esClient.search({
    index: ES_INDEX,
    ignore_unavailable: true,
    body: {
      size: 50,
      query,
      sort: [
        {
          published_at: { order: "asc" },
        },
      ],
    },
  });

  return processComments(
    resp.body.hits.hits.map(h => ({
      ...h._source,
      id: h._id,
    }))
  );

  function processComments(comments) {
    if (!disableFiltering) {
      comments = comments.filter(c => c.approved);
    }

    return comments.map(c => ({
      ...c,
      replies: processComments(c.replies || []),
    }));
  }
}

export async function deletePostComments(id) {
  return await esClient.deleteByQuery({
    index: ES_INDEX,
    body: {
      query: {
        bool: {
          filter: [{ term: { post_id: id } }],
        },
      },
    },
  });
}

export async function updateComment(path, partial) {
  const result = UpdateCommentArgSchema.validate(partial);
  if (result.error) {
    throw result.error;
  }

  const rootComment = await esClient.get({
    index: ES_INDEX,
    id: path[0],
  });

  let comment = rootComment.body._source;
  path.slice(1).forEach(replyId => {
    comment = _.find(comment.replies, ["comment_id", replyId]);
  });

  _.assign(comment, partial);

  await esClient.update({
    index: ES_INDEX,
    id: path[0],
    refresh: "wait_for",
    body: {
      doc: rootComment.body._source,
    },
  });
}

export async function deleteComment(path) {
  if (path.length === 1) {
    await esClient.delete({
      index: ES_INDEX,
      refresh: "wait_for",
      id: path[0],
    });
    return;
  }

  const rootComment = await esClient.get({
    index: ES_INDEX,
    id: path[0],
  });

  let comment = rootComment.body._source;
  for (let i = 1; i < path.length; ++i) {
    if (i === path.length - 1) {
      comment.replies = comment.replies.filter(c => c.comment_id !== path[i]);
      comment = _.find(comment.replies, ["comment_id", path[i]]);
    } else {
      comment = _.find(comment.replies, ["comment_id", path[i]]);
    }
  }

  await esClient.update({
    index: ES_INDEX,
    id: path[0],
    refresh: "wait_for",
    body: {
      doc: rootComment.body._source,
    },
  });
}

export async function getStats({ startDate, postId, interval = "1d" }) {
  const filters = [
    {
      bool: {
        must_not: {
          term: { spam: true },
        },
      },
    },
  ];

  if (postId) {
    filters.push({
      term: {
        post_id: postId,
      },
    });
  }

  if (startDate) {
    filters.push({
      range: {
        published_at: {
          gte: startDate,
        },
      },
    });
  }

  const query = {
    bool: {
      filter: filters,
    },
  };

  const countResp = await esClient.count({
    index: ES_INDEX,
    body: {
      query,
    },
  });

  const resp = await esClient.search({
    index: ES_INDEX,
    body: {
      size: 10,
      query,
      sort: [
        {
          published_at: { order: "desc" },
        },
      ],
      aggs: {
        post_ids: {
          terms: {
            field: "post_id",
            size: 5,
          },
        },
        comments_histogram: {
          date_histogram: {
            field: "published_at",
            fixed_interval: interval,
          },
        },
      },
    },
  });

  let mostCommentedPosts = [];
  let commentsByDate = [];

  if (resp.body.aggregations) {
    const postIdsBuckets = resp.body.aggregations.post_ids.buckets;
    const posts = await blogPosts.getItemsByIds(postIdsBuckets.map(b => b.key));
    mostCommentedPosts = posts.map(p => ({
      ...p,
      comments_count: _.find(postIdsBuckets, ["key", p.id]).doc_count,
    }));

    commentsByDate = resp.body.aggregations.comments_histogram.buckets;
  }

  return {
    commentsByDate,
    mostCommentedPosts,
    recentComments: resp.body.hits.hits.map(h => ({ ...h._source, id: h._id })),
    commentsCount: countResp.body.count,
  };
}

export async function getAllComments() {
  let resp = await esClient.search({
    index: ES_INDEX,
    scroll: "10s",
    ignore_unavailable: true,
    body: {
      size: 100,
      query: {
        match_all: {},
      },
      sort: [
        {
          published_at: { order: "desc" },
        },
      ],
    },
  });

  let items = [];
  while (resp.body.hits.hits.length) {
    items = items.concat(resp.body.hits.hits);
    resp = await esClient.scroll({
      scroll: "10s",
      scrollId: resp.body._scroll_id,
    });
  }

  return items.map(hit => ({
    ...hit._source,
    id: hit._id,
  }));
}
