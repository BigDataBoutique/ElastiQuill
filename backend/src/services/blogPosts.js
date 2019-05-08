import Joi from 'joi';
import uid from 'uid';
import slugify from 'slugify';
import { esClient, config } from '../app';
import * as events from './events';
import * as commentsService from './comments';

export const BLOGPOST_ID_PREFIX = 'blogpost-';

const ES_INDEX = config.elasticsearch['blog-index-name'];

export const CreatePostArgSchema = Joi.object().keys({
  "title": Joi.string().required(),
  "content": Joi.string().allow(''),
  "description": Joi.string().allow(''),
  "tags": Joi.array().items(Joi.string()),
  "metadata": Joi.object().keys({
    "content_type": Joi.string().optional().allow('', null),
    "header_image_url": Joi.string().optional().allow('', null),
    "canonical_url": Joi.string().optional().allow('', null)
  }).required(),
  "author": Joi.object().keys({
    "name": Joi.string().required(),
    "email": Joi.string().email().required(),
    "website": Joi.string().allow('', null),
  }).required(),
  "allow_comments": Joi.boolean().required(),
});

const UpdatePostArgSchema = Joi.object().keys({
  "title": Joi.string(),
  "content": Joi.string().allow(''),
  "description": Joi.string().allow(''),
  "tags": Joi.array().items(Joi.string()),
  "metadata": Joi.object().keys({
    "content_type": Joi.string().optional().allow('', null),
    "header_image_url": Joi.string().optional().allow('', null),
    "canonical_url": Joi.string().optional().allow('', null)
  }).required(),
  "allow_comments": Joi.boolean().required(),
  "medium_crosspost_url": Joi.string().allow('')
});

const CreateContentPageArgSchema = Joi.object().keys({
  "title": Joi.string().required(),
  "content": Joi.string().allow(''),
  "description": Joi.string().allow(''),
  "metadata": Joi.object().keys({
    "is_embed": Joi.boolean().optional(),
    "content_type": Joi.string().optional().allow('', null),
    "header_image_url": Joi.string().optional().allow('', null),
  }).required(),
  "author": Joi.object().keys({
    "name": Joi.string().required(),
    "email": Joi.string().email().required(),
    "website": Joi.string().allow(''),
  }).required()
});

const UpdateContentPageArgSchema = Joi.object().keys({
  "title": Joi.string(),
  "content": Joi.string().allow(''),
  "description": Joi.string().allow(''),
  "metadata": Joi.object().keys({
    "is_embed": Joi.boolean().optional(),
    "content_type": Joi.string().optional().allow('', null),
    "header_image_url": Joi.string().optional().allow('', null),
  }).required(),
});

export async function getItemById(id, withComments = false) {
  const resp = await esClient.get({
    index: ES_INDEX,
    type: '_doc',
    id
  });

  if (withComments) {
    resp._source.comments = await commentsService.getComments([ id ]);
  }

  return {
    ...resp._source,
    id: resp._id
  };
}

export async function getItemsByIds(ids, withComments = false) {
  if (! ids.length) {
    return [];
  }

  const resp = await esClient.mget({
    index: ES_INDEX,
    body: {
      ids
    }
  });

  const docs = resp.docs.filter(d => d.found).map(d => ({
    ...d._source,
    id: d._id
  }));

  if (withComments) {
    const comments = await commentsService.getComments(docs.map(d => d.id));
    return docs.map(d => ({
      ...d,
      comments: comments.filter(c => c.post_id === d.id)
    }));
  }

  return docs;
}

export async function createItem(type, post) {
  const result = Joi.validate(post, type === 'post' ? CreatePostArgSchema : CreateContentPageArgSchema);
  if (result.error) {
    throw result.error;
  }

  const query = {
    index: ES_INDEX,
    type: '_doc',
    op_type: 'create',
    refresh: 'wait_for',
    body: {
      ...post,
      type,
      slug: makeSlug(post.title),
      published_at: new Date().toISOString(),
      last_edited_at: new Date().toISOString(),
      metadata: {
        ...post.metadata,
        content_type: 'markdown'
      }
    }
  };

  let resp = null;
  if (type === 'post') {
    resp = await indexWithUniqueId(query);    
  }
  else {
    resp = await esClient.index({
      ...query,
      id: query.body.slug
    });
  }

  events.emitCreate(type, query.body);

  return resp._id;
}

export async function deleteItem(id) {
  const item = await getItemById(id);
  await esClient.delete({
    id,
    index: ES_INDEX,
    type: '_doc',
    refresh: 'wait_for'
  });

  if (item.type === 'post') {
    await commentsService.deletePostComments(id);
  }

  events.emitChange(item.type, item);
}

export async function updateItem(id, type, post) {
  const result = Joi.validate(post, type === 'post' ? UpdatePostArgSchema : UpdateContentPageArgSchema);
  if (result.error) {
    throw result.error;
  }

  const doc = {
    ...post,
    last_edited_at: new Date().toISOString()
  };

  if (doc.title) {
    doc.slug = makeSlug(doc.title);
  }

  await esClient.update({
    id,
    index: ES_INDEX,
    type: '_doc',
    refresh: 'wait_for',
    body: {
      doc
    }
  });
  const updatedItem = await getItemById(id);

  events.emitChange(updatedItem.type, updatedItem);

  return updatedItem;
}

export async function getAllItems({ type }) {
  let resp = await esClient.search({
    index: ES_INDEX,
    scroll: '10s',
    ignore_unavailable: true,
    body: {
      query: {
        bool: {
          filter: [
            { term: { type } }
          ]
        }
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

export async function getItems({ type, tag, search, pageIndex, pageSize, includePrivatePosts }) {
  const query = {
    index: ES_INDEX,
    from: pageIndex * pageSize,
    size: pageSize,
    ignore_unavailable: true,
    body: {
      query: {
        bool: {
          filter: [
            { term: { type } }
          ]
        }
      },
      sort: [
        {
          published_at: { order: 'desc' }
        }
      ],
      aggs: {
        tags: {
          terms: { field: 'tags', size: 50 }
        }
      },
      highlight: {
        pre_tags: ["<em class='search-highlight'>"],
        post_tags: ["</em>"],

        fields: {
          title: {},
          description: {},
          content: {}
        }
      }
    }
  };

  if (! includePrivatePosts) {
    query.body.query.bool.must_not = {
      exists: { field: 'private_viewing_key' }
    };
  }

  if (search) {
    query.body.query.bool.must = {
      multi_match: {
        query: search,
        fields: ['title', 'description', 'content']
      }
    };
  }

  if (tag) {
    query.body.query.bool.filter.push({
      terms: { tags: [tag] }
    });
  }

  const resp = await esClient.search(query);
  const items = resp.hits.hits.map(hit => ({
    ...hit._source,
    highlight: hit.highlight,
    id: hit._id
  }));

  const comments = await commentsService.getComments(items.map(p => p.id));
  items.forEach(item => item.comments = comments.filter(c => c.post_id === item.id));

  return {
    items,
    allTags: resp.aggregations ? resp.aggregations.tags.buckets : [],
    total: resp.hits.total,
    totalPages: Math.ceil(resp.hits.total / pageSize)
  };
}

export async function getAllTags() {
  const resp = await esClient.search({
    index: ES_INDEX,
    ignore_unavailable: true,
    body: {
      aggs: {
        tags: {
          terms: { field: 'tags', size: 50 }
        }
      }
    }
  });

  if (! resp.aggregations) {
    return [];
  }

  return resp.aggregations.tags.buckets.map(b => b.key);
};

async function indexWithUniqueId(indexProps) {
  const MAX_TRIES = 100;

  for (let i = 0; i < MAX_TRIES; ++i) {
    try {
      const id = BLOGPOST_ID_PREFIX + uid(6).toLowerCase();
      return await esClient.index({
        ...indexProps,
        id
      });
    }
    catch (err) {
      if (err.displayName === 'Conflict') {
        continue;
      }

      throw err;
    }
  }

  throw new Error('Failed to generate a unique id');
}

function makeSlug(title) {
  return slugify(title, {
    remove: /[*+~.\/,()'"!:@^#?]/g,
    lower: true
  });
}
