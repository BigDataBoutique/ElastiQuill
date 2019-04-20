import _ from 'lodash';
import url from 'url';
import moment from 'moment';
import geohash from 'ngeohash';

import { esClient, config } from '../app';
import * as blogPosts from './blogPosts';
import * as elasticsearch from './elasticsearch';

let elasticsearchIsReady = false;

export async function getStats({ startDate, endDate, type = null, postId = null }) {
  const filters = [
    {
      term: { tags: 'visit' }
    }
  ];

  filters.push({
    terms: {
      tags: postId ? ['read_item'] : ['list_items', 'read_item']
    }
  });

  if (type) {
    filters.push({
      term: {
        'read_item.type': type
      }
    })
  }

  if (postId) {
    filters.push({
      term: {
        'read_item.id': postId
      }
    });
  }

  if (startDate || endDate) {
    filters.push({
      range: {
        '@timestamp': {
          lte: endDate || null,
          gte: startDate || null
        }
      }
    });
  }

  const query = {
    index: config.elasticsearch['blog-logs-index-name'] + '*',
    body: {
      query: {
        bool: {
          filter: filters
        }
      },
      aggs: {
        visits_by_location: {
          geohash_grid: {
            field : 'source.geo.location',
            precision : 3
          }
        },
        visits_histogram: {
          date_histogram: {
            field: '@timestamp',
            interval: '1d'
          }
        },
        referrer_type: {
          terms: {
            field: 'http.request.referrer_parsed.type',
            size: 5
          }
        },
        referrer_from_domain: {
          terms: {
            field: 'http.request.referrer_parsed.domain',
            size: 5
          }
        }
      }
    }
  };

  if (! postId) {
    query.body.aggs.posts_visits = {
      filter: {
        term: { 'read_item.type': 'post' }
      },
      aggs: {
        visits: {
          terms: {
            field: 'read_item.id',
            size: 5
          }
        }
      }
    };
  }

  const resp = await esClient.search(query);
  let visits_by_date = [],
      visits_by_location = [],
      popular_posts = [],
      referrer_type = [],
      referrer_from_domain = [];

  if (resp.aggregations) {
    referrer_type = resp.aggregations.referrer_type.buckets;
    referrer_from_domain = resp.aggregations.referrer_from_domain.buckets;
    visits_by_date = resp.aggregations.visits_histogram.buckets;
    visits_by_location = resp.aggregations.visits_by_location.buckets.map(bucket => ({
      location: geohash.decode_bbox(bucket.key),
      visits: bucket.doc_count
    }));

    if (resp.aggregations.posts_visits) {
      const postsVisitsBuckets = resp.aggregations.posts_visits.visits.buckets;
      popular_posts = await blogPosts.getItemsByIds(postsVisitsBuckets.map(bucket => bucket.key));
      for (let post of popular_posts) {
        post.visits_count = _.find(postsVisitsBuckets, ['key', post.id]).doc_count;
      }
    }
  }

  return {
    visits_by_date,
    visits_by_location,
    popular_posts,
    referrer_type,
    referrer_from_domain
  };
}

export async function* allLogsGenerator() {
  let resp = await esClient.search({
    index: config.elasticsearch['blog-logs-index-name'] + '*',
    type: '_doc',
    scroll: '10s',
    ignore_unavailable: true,
    body: {
      query: {
        match_all: {}
      },
      sort: [
        {
          '@timestamp': { order: 'desc' }
        }
      ]
    }
  });

  while (resp.hits.hits.length) {
    yield resp.hits.hits;
    resp = await esClient.scroll({
      scroll: '10s',
      scrollId: resp._scroll_id
    });
  }
}

function logIndexName() {
  return config.elasticsearch['blog-logs-index-name'] + '-' + moment().format('YYYY.MM.DD');
}

export async function logAuthAttempt(params, req, res) {
  const { email, success } = params;
  await log({
    req, res, email,
    tags: ['auth', success ? 'auth-success' : 'auth-failure']
  });
}

export async function logVisit(req, res, took) {
  // ignore redirects
  if (res.statusCode === 302) {
    return;
  }

  await log({ req, res, took, tags: ['visit'] });
}

export async function logError(errorScope, error, req, res) {
  console.error('logError', error);

  await log({
    req, res, error,
    tags: [ errorScope, 'error' ].filter(_.identity)
  });
}

async function log({ req, res, email, took, error = null, tags = [] }) {
  try {
    if (! elasticsearchIsReady) {
      elasticsearchIsReady = await elasticsearch.isReady();
      if (! elasticsearchIsReady) {
        // skip logs if elasticsearch is not configured
        return;
      }
    }

    const body = {
      // ECS base fields
      'ecs.version': '1.0.0',
      '@timestamp': new Date().toISOString(),
      tags: tags,
      log: {
        level: error ? 'error' : 'info',
      },
      ...ecsUrl(req.protocol + '://' + req.get('host') + req.originalUrl),
      ...ecsSource(req, res),
      ...ecsHttp(req, res),

      // Custom fields
      took,
      email,
      ...(res ? res.locals.logData : {}),      
    };

    if (error) {
      body.error = {
        message: error.stack
      };
    }

    if (res.locals.logData) {
      body.tags.push.apply(body.tags, _.keys(res.locals.logData));
    }

    await esClient.index({
      index: logIndexName(),
      type: '_doc',
      pipeline: (req && res) ? 'request_log' : null,
      body
    });
  }
  catch (error) {
    console.error(error);
  }
}

function ecsSource(req, res) {
  if (! req || ! res) return {};

  const ip = req.headers['x-forwarded-for'] ||
             req.connection.remoteAddress || 
             req.socket.remoteAddress ||
            (req.connection.socket ? req.connection.socket.remoteAddress : null);

  return {
    source: {
      address: ip,
      ip
    }
  }
}

function ecsHttp(req, res) {
  if (! req || ! res) return {};

  const body = {
    http: {
      request: {
        method: req.method.toLowerCase(),
        referrer: req.header('referrer'),
        user_agent: req.get('User-Agent')
      },
      response: {
        status_code: res.statusCode
      }
    }
  };

  if (req.referrer) {
    body.http.request.referrer_parsed = {
      type: req.referrer.type,
      ...ecsUrl(req.referrer.from).url
    };
  }  

  return body;
}

function ecsUrl(urlStr) {
  if (! urlStr) return {};

  const parsed = url.parse(urlStr);
  return {
    url: {
      full: parsed.href,
      original: parsed.href,
      domain: parsed.host,
      fragment: parsed.hash ? parsed.hash.substr(1) : null,
      path: parsed.path,
      query: parsed.query,
      scheme: parsed.protocol ? parsed.protocol.substr(0, parsed.protocol.length - 1) : null          
    }
  };
}
