import Joi from "joi";
import _ from "lodash";
import moment from "moment";
import slugify from "slugify";
import { uid } from "uid";
import { esClient } from "../lib/elasticsearch";
import * as commentsService from "./comments";
import { BLOG_INDEX_ALIAS as ES_INDEX } from "./elasticsearch";
import * as events from "./events";
import * as logging from "./logging";

export const BLOGPOST_ID_PREFIX = "blogpost-";
export const CONTENT_DESCRIPTION_ID_PREFIX = "content:description:";

const SERIES_REGEXP_STR = "{.*}";
const SLUG_MAX_LENGTH = 100;

// Posts
export const CreatePostArgSchema = Joi.object().keys({
  title: Joi.string().when("is_published", {
    is: false,
    then: Joi.allow(""),
    otherwise: Joi.required(),
  }),
  content: Joi.string().when("is_published", {
    is: false,
    then: Joi.allow(""),
    otherwise: Joi.required(),
  }),
  description: Joi.string().allow(""),
  tags: Joi.array().items(Joi.string()),
  series: Joi.string().allow(null),
  metadata: Joi.object()
    .keys({
      content_type: Joi.string()
        .optional()
        .allow("", null),
      header_image_url: Joi.string()
        .optional()
        .allow("", null),
      canonical_url: Joi.string()
        .optional()
        .allow("", null),
      medium_crosspost_url: Joi.string()
        .optional()
        .allow("", null),
      private_viewing_key: Joi.string()
        .optional()
        .allow(null),
    })
    .required(),
  author: Joi.object()
    .keys({
      name: Joi.string().required(),
      email: Joi.string()
        .email()
        .required(),
      website: Joi.string().allow("", null),
    })
    .required(),
  allow_comments: Joi.boolean().required(),
  draft: Joi.object()
    .keys({
      title: Joi.string().allow(""),
      content: Joi.string().allow(""),
      description: Joi.string().allow(""),
      tags: Joi.array().items(Joi.string()),
      series: Joi.string().allow(null),
      allow_comments: Joi.boolean().required(),
      metadata: Joi.object()
        .keys({
          header_image_url: Joi.string()
            .optional()
            .allow("", null),
        })
        .optional(),
    })
    .optional()
    .allow(null),
  is_published: Joi.boolean().required(),
});

const UpdatePostArgSchema = Joi.object().keys({
  title: Joi.string().when("is_published", {
    is: false,
    then: Joi.allow(""),
    otherwise: Joi.required(),
  }),
  content: Joi.string().when("is_published", {
    is: false,
    then: Joi.allow(""),
    otherwise: Joi.required(),
  }),
  description: Joi.string().allow(""),
  tags: Joi.array().items(Joi.string()),
  series: Joi.string().allow(null),
  metadata: Joi.object()
    .keys({
      content_type: Joi.string()
        .optional()
        .allow("", null),
      header_image_url: Joi.string()
        .optional()
        .allow("", null),
      canonical_url: Joi.string()
        .optional()
        .allow("", null),
      medium_crosspost_url: Joi.string()
        .optional()
        .allow("", null),
      private_viewing_key: Joi.string()
        .optional()
        .allow(null),
    })
    .required(),
  allow_comments: Joi.boolean().required(),
  draft: Joi.object()
    .keys({
      title: Joi.string().allow(""),
      content: Joi.string().allow(""),
      description: Joi.string().allow(""),
      tags: Joi.array().items(Joi.string()),
      series: Joi.string().allow(null),
      allow_comments: Joi.boolean().required(),
      metadata: Joi.object()
        .keys({
          header_image_url: Joi.string()
            .optional()
            .allow("", null),
        })
        .optional(),
    })
    .optional()
    .allow(null),
  is_published: Joi.boolean().required(),
});

// Content pages
const CreateContentPageArgSchema = Joi.object().keys({
  title: Joi.string().required(),
  content: Joi.string().allow(""),
  description: Joi.string().allow(""),
  metadata: Joi.object()
    .keys({
      is_embed: Joi.boolean().optional(),
      is_tag_description: Joi.boolean().optional(),
      content_type: Joi.string()
        .optional()
        .allow("", null),
      header_image_url: Joi.string()
        .optional()
        .allow("", null),
      tag_description: Joi.object()
        .keys({
          tag: Joi.string(),
          is_series: Joi.boolean(),
        })
        .optional(),
    })
    .required(),
  author: Joi.object()
    .keys({
      name: Joi.string().required(),
      email: Joi.string()
        .email()
        .required(),
      website: Joi.string().allow(""),
    })
    .required(),
});

const UpdateContentPageArgSchema = Joi.object().keys({
  title: Joi.string(),
  content: Joi.string().allow(""),
  description: Joi.string().allow(""),
  metadata: Joi.object()
    .keys({
      is_embed: Joi.boolean().optional(),
      is_tag_description: Joi.boolean().optional(),
      content_type: Joi.string()
        .optional()
        .allow("", null),
      header_image_url: Joi.string()
        .optional()
        .allow("", null),
      tag_description: Joi.object()
        .keys({
          tag: Joi.string(),
          is_series: Joi.boolean(),
        })
        .optional(),
    })
    .required(),
});

export async function getItemById({
  id,
  withComments = false,
  moreLikeThis = false,
}) {
  try {
    const resp = await esClient.get({
      index: ES_INDEX,
      type: "_doc",
      id,
    });

    const item = prepareHit(resp.body);

    if (withComments) {
      item.comments = await commentsService.getComments({
        postIds: [id],
      });
    }

    if (moreLikeThis) {
      item.more_like_this = await getMoreLikeThis(id);
    }

    return item;
  } catch (e) {
    await logging.logError("read_post", e);
    throw e;
  }
}

export async function getItemsByIds(ids, withComments = false) {
  if (!ids.length) {
    return [];
  }

  const resp = await esClient.mget({
    index: ES_INDEX,
    body: {
      ids,
    },
  });

  const docs = resp.body.docs.filter(d => d.found).map(prepareHit);

  if (withComments) {
    const comments = await commentsService.getComments({
      postIds: docs.map(d => d.id),
    });
    return docs.map(d => ({
      ...d,
      comments: comments.filter(c => c.post_id === d.id),
    }));
  }

  return docs;
}

export async function createItem(type, post) {
  let schema;
  switch (type) {
    case "post":
      schema = CreatePostArgSchema;
      break;
    case "page":
      schema = CreateContentPageArgSchema;
      break;
  }

  const result = Joi.validate(post, schema);
  if (result.error) {
    throw result.error;
  }

  const { tagDescription } = convertToDatastoreFormat(post);

  const query = {
    index: ES_INDEX,
    type: "_doc",
    op_type: "create",
    refresh: "wait_for",
    body: {
      ...post,
      type,
      slug: makeSlug(post.title),
      published_at: new Date().toISOString(),
      last_edited_at: new Date().toISOString(),
      metadata: {
        ...post.metadata,
      },
    },
  };

  let resp = null;
  if (type === "post") {
    resp = await indexWithUniqueId(query);
  } else {
    let id = query.body.slug;
    if (post.metadata.is_tag_description && tagDescription) {
      const { tag, is_series } = tagDescription;
      id = CONTENT_DESCRIPTION_ID_PREFIX;
      id += is_series ? `{${tag.toLowerCase()}}` : tag.toLowerCase();
    }

    resp = await esClient.index({
      ...query,
      id,
    });
  }

  events.emitCreate(type, query.body);

  return resp.body._id;
}

export async function deleteItem(id) {
  const item = await getItemById({ id });
  await esClient.delete({
    id,
    index: ES_INDEX,
    type: "_doc",
    refresh: "wait_for",
  });

  if (item.type === "post") {
    await commentsService.deletePostComments(id);
  }

  events.emitChange(item.type, item);
}

export async function updateItem(id, type, post) {
  let schema;
  switch (type) {
    case "post":
      schema = UpdatePostArgSchema;
      break;
    case "page":
      schema = UpdateContentPageArgSchema;
      break;
  }

  const result = Joi.validate(post, schema);
  if (result.error) {
    throw result.error;
  }

  convertToDatastoreFormat(post);

  const doc = {
    ...post,
    last_edited_at: new Date().toISOString(),
  };

  if (doc.title) {
    doc.slug = makeSlug(doc.title);
  }

  const item = await getItemById({ id });
  if (!item.is_published && post.is_published) {
    doc.published_at = new Date().toISOString();
  }

  await esClient.update({
    id,
    index: ES_INDEX,
    type: "_doc",
    refresh: "wait_for",
    body: {
      doc,
    },
  });
  const updatedItem = await getItemById({ id });

  events.emitChange(updatedItem.type, updatedItem);

  return updatedItem;
}

export async function updateItemPartial(id, update) {
  await esClient.update({
    id,
    index: ES_INDEX,
    type: "_doc",
    refresh: "wait_for",
    body: {
      doc: update,
    },
  });
}

export async function getMoreLikeThis(itemId) {
  const resp = await esClient.search({
    index: ES_INDEX,
    ignore_unavailable: true,
    size: 3,
    body: {
      query: {
        bool: {
          must: [
            {
              more_like_this: {
                fields: ["title", "content"],
                like: [
                  {
                    _index: ES_INDEX,
                    _id: itemId,
                  },
                ],
                min_term_freq: 1,
                max_query_terms: 12,
              },
            },
          ],
          filter: [{ term: { is_published: true } }],
        },
      },
    },
  });

  return resp.body.hits.hits.map(prepareHit);
}

export async function getAllItems({ type }) {
  let resp = await esClient.search({
    index: ES_INDEX,
    scroll: "10s",
    ignore_unavailable: true,
    body: {
      query: {
        bool: {
          filter: [{ term: { type } }],
        },
      },
    },
  });

  const items = [];
  while (resp.body.hits.hits.length) {
    resp.body.hits.hits.forEach(hit => items.push(hit));
    resp = await esClient.scroll({
      scroll: "10s",
      scrollId: resp.body._scroll_id,
    });
  }

  return items.map(prepareHit);
}

export async function getItems({
  type,
  tag,
  series,
  search,
  pageIndex,
  pageSize,
  includePrivatePosts,
  year,
  month,
}) {
  const query = {
    index: ES_INDEX,
    from: pageIndex * pageSize,
    size: pageSize,
    ignore_unavailable: true,
    body: {
      query: {
        bool: {
          filter: [
            { term: { type } },
            { range: { published_at: { lte: "now/d" } } },
          ],
        },
      },
      sort: [
        {
          published_at: { order: series ? "asc" : "desc" },
        },
      ],
      aggs: {
        tags: {
          terms: {
            field: "tags.keyword",
            exclude: SERIES_REGEXP_STR,
            size: 50,
          },
        },
        series: {
          terms: {
            field: "tags.keyword",
            include: SERIES_REGEXP_STR,
            size: 50,
          },
        },
      },
      highlight: {
        pre_tags: ["<em class='search-highlight'>"],
        post_tags: ["</em>"],

        fields: {
          title: {},
          description: {},
          content: {},
        },
      },
    },
  };

  if (year) {
    let startDate = moment(year, "YYYY");
    let endDate = moment(year + 1, "YYYY");
    if (!_.isUndefined(month)) {
      startDate.month(month);
      endDate
        .subtract(1, "year")
        .month(month)
        .add(1, "month");
    }

    query.body.query.bool.filter.push({
      range: {
        published_at: {
          gte: startDate,
          lt: endDate,
        },
      },
    });
  }

  if (!includePrivatePosts) {
    query.body.query.bool.must_not = {
      term: {
        is_published: false,
      },
    };
  }

  if (search) {
    query.body.query.bool.must = {
      multi_match: {
        query: search,
        fields: ["title", "description", "content", "tags"],
      },
    };
  }

  const filterByTags = [];

  if (tag) {
    filterByTags.push(tag);
  }

  if (series) {
    filterByTags.push("{" + series + "}");
  }

  if (filterByTags.length) {
    query.body.query.bool.filter.push({
      terms: { "tags.keyword-lowercase": filterByTags },
    });
  }

  try {
    const resp = await esClient.search(query);
    const items = resp.body.hits.hits.map(prepareHit);

    let allSeries = [];
    if (resp.body.aggregations) {
      allSeries = resp.body.aggregations.series.buckets.map(b => ({
        ...b,
        key: stripSeriesTag(b.key),
      }));
    }

    const total =
      typeof resp.body.hits.total === "object"
        ? resp.body.hits.total.value
        : resp.body.hits.total;

    return {
      items,
      allSeries,
      allTags: resp.body.aggregations
        ? resp.body.aggregations.tags.buckets
        : [],
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (e) {
    await logging.logError("search_posts", e);
    throw e;
  }
}

export async function getStats({
  startDate = null,
  endDate = null,
  type = null,
  interval = "1d",
}) {
  const filters = [];
  if (startDate || endDate) {
    filters.push(
      {
        range: {
          published_at: {
            lte: endDate || null,
            gte: startDate || null,
          },
        },
      },
      {
        term: {
          is_published: true,
        },
      }
    );
  }

  if (type) {
    filters.push({
      term: { type },
    });
  }

  const query = {
    index: ES_INDEX,
    body: {
      query: {
        bool: {
          filter: filters,
        },
      },
      aggs: {
        posts_histogram: {
          date_histogram: {
            field: "published_at",
            interval,
          },
        },
      },
    },
  };

  const resp = await esClient.search(query);
  let postsByDate = [],
    postsCount = 0;

  if (resp.body.aggregations) {
    postsByDate = resp.body.aggregations.posts_histogram.buckets;
    postsCount = _.sumBy(postsByDate, "doc_count");
  }

  return { postsByDate, postsCount };
}

export async function getAllTags() {
  const resp = await esClient.search({
    index: ES_INDEX,
    ignore_unavailable: true,
    body: {
      query: {
        bool: {
          must_not: {
            term: {
              is_published: false,
            },
          },
        },
      },
      aggs: {
        tags: {
          terms: {
            field: "tags.keyword",
            exclude: SERIES_REGEXP_STR,
            size: 50,
          },
        },
        series: {
          terms: {
            field: "tags.keyword",
            include: SERIES_REGEXP_STR,
            size: 50,
          },
        },
      },
    },
  });

  if (!resp.body.aggregations) {
    return {
      tags: [],
      series: [],
    };
  }

  return {
    tags: resp.body.aggregations.tags.buckets.map(b => b.key),
    series: resp.body.aggregations.series.buckets.map(b =>
      stripSeriesTag(b.key)
    ),
  };
}

async function indexWithUniqueId(indexProps) {
  const MAX_TRIES = 100;

  for (let i = 0; i < MAX_TRIES; ++i) {
    try {
      const id = BLOGPOST_ID_PREFIX + uid(6).toLowerCase();
      return await esClient.index({
        ...indexProps,
        id,
      });
    } catch (err) {
      if (err.displayName === "Conflict") {
        continue;
      }

      throw err;
    }
  }

  throw new Error("Failed to generate a unique id");
}

function makeSlug(title) {
  if (!title || !title.length) {
    return "untitled";
  }

  return slugify(title, {
    remove: /[*+~./,()'"!:@^#?]/g,
    lower: true,
  }).substring(0, SLUG_MAX_LENGTH);
}

function prepareHit(hit) {
  const res = {
    id: hit._id,
    highlight: hit.highlight,
    ...hit._source,
  };

  if (res.type === "post" && res.tags) {
    const series = res.tags.filter(t => t.match(SERIES_REGEXP_STR));
    res.tags = res.tags.filter(t => !series.includes(t));

    res.series = null;
    if (series.length) {
      res.series = stripSeriesTag(series[0]);
    }
  } else if (res.type === "page" && res.metadata.is_tag_description) {
    const tag = res.id.substring(CONTENT_DESCRIPTION_ID_PREFIX.length);
    const isSeries =
      tag.length && tag[0] === "{" && tag[tag.length - 1] === "}";

    res.metadata.tag_description = {
      tag: isSeries ? stripSeriesTag(tag) : tag,
      is_series: isSeries,
    };
  }

  return res;
}

function convertToDatastoreFormat(item) {
  let series = null;
  let tagDescription = null;

  if (item.series) {
    series = item.series;
    item.tags = item.tags || [];
    item.tags = _.uniq(item.tags.concat("{" + item.series + "}"));
    delete item.series;
  }

  if (item.metadata && item.metadata.tag_description) {
    tagDescription = item.metadata.tag_description;
    delete item.metadata.tag_description;
  }

  return {
    series,
    tagDescription,
  };
}

export function stripSeriesTag(series) {
  if (series && series[0] === "{" && series[series.length - 1] === "}") {
    series = series.substr(1, series.length - 2);
  }
  return series;
}
