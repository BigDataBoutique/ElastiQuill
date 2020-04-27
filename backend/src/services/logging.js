import _ from "lodash";
import url from "url";
import moment from "moment";
import geohash from "ngeohash";
import crawlers from "crawler-user-agents";

import { esClient } from "../lib/elasticsearch";
import { config } from "../config";
import * as blogPosts from "./blogPosts";
import * as elasticsearch from "./elasticsearch";

let elasticsearchIsReady = false;

const LOGS_DEFAULT_START_FROM = "now-24h";
const LOGS_INDICES_PREFIX = config.elasticsearch["blog-logs-index-name"];
const LOGS_PERIOD = config.elasticsearch["blog-logs-period"];
const CRAWLER_USER_AGENTS = new Set(
  _.flatMap(crawlers, _.property("instances"))
);

export async function getStatus() {
  const resp = await esClient.search({
    index: LOGS_INDICES_PREFIX + "*",
    body: {
      query: {
        bool: {
          filter: {
            range: {
              "@timestamp": {
                gte: LOGS_DEFAULT_START_FROM,
              },
            },
          },
        },
      },
      aggs: {
        log_levels: {
          terms: { field: "log.level" },
        },
      },
    },
  });

  let logLevel = {};

  if (resp.aggregations && resp.aggregations.log_levels) {
    logLevel = resp.aggregations.log_levels.buckets.reduce((result, b) => {
      return {
        ...result,
        [b.key]: b.doc_count,
      };
    }, {});
  }

  return logLevel;
}

export async function getStats({
  startDate,
  endDate,
  interval = "1d",
  type = null,
  postId = null,
}) {
  const filters = [];

  filters.push({
    bool: {
      must_not: {
        term: {
          "http.request.bot": true,
        },
      },
    },
  });

  filters.push({
    terms: {
      tags: postId ? ["read_item"] : ["list_items", "read_item", "visit"],
    },
  });

  if (type) {
    filters.push({
      term: {
        "read_item.type": type,
      },
    });
  }

  if (postId) {
    filters.push({
      term: {
        "read_item.id": postId,
      },
    });
  }

  if (startDate || endDate) {
    filters.push({
      range: {
        "@timestamp": {
          lte: endDate || null,
          gte: startDate || null,
        },
      },
    });
  }

  const visitsPerDayAgg =
    interval === "1d" ? "visits_histogram" : "visits_per_day";

  const query = {
    index: LOGS_INDICES_PREFIX + "*",
    body: {
      query: {
        bool: {
          filter: filters,
        },
      },
      aggs: {
        visits_by_location: {
          geohash_grid: {
            field: "source.geo.location",
            precision: 3,
          },
        },
        posts: {
          filter: {
            term: {
              "read_item.type": "post",
            },
          },
          aggs: {
            by_views: {
              terms: {
                field: "read_item.id",
                size: 1,
              },
              aggs: {
                visitors: {
                  cardinality: {
                    field: "visitor_id",
                  },
                },
              },
            },
          },
        },
        visits_by_country: {
          terms: {
            field: "source.geo.country_iso_code",
            size: 10,
          },
        },
        visits_histogram: {
          date_histogram: {
            field: "@timestamp",
            interval,
          },
          aggs: {
            visitors: {
              cardinality: {
                field: "visitor_id",
              },
            },
          },
        },
        views_histogram: {
          filter: {
            term: {
              "read_item.type": "post",
            },
          },
          aggs: {
            views: {
              date_histogram: {
                field: "@timestamp",
                interval,
              },
              aggs: {
                visitors: {
                  cardinality: {
                    field: "visitor_id",
                  },
                },
              },
            },
          },
        },
        avg_visits_per_day: {
          avg_bucket: {
            buckets_path: visitsPerDayAgg + ">_count",
          },
        },
        referrer_type: {
          terms: {
            field: "http.request.referrer_parsed.medium",
            size: 5,
          },
        },
        referrer_from_domain: {
          terms: {
            field: "http.request.referrer_parsed.domain",
            size: 5,
          },
        },
        user_agent_os: {
          terms: {
            field: "http.request.user_agent_parsed.os.name",
            size: 5,
          },
        },
        user_agent_name: {
          terms: {
            field: "http.request.user_agent_parsed.name",
            size: 5,
          },
        },
      },
    },
  };

  if (interval !== "1d") {
    query.body.aggs.visits_per_day = {
      date_histogram: {
        field: "@timestamp",
        interval: "1d",
      },
      aggs: {
        visitors: {
          cardinality: {
            field: "visitor_id",
          },
        },
      },
    };
  }

  if (!postId) {
    query.body.aggs.posts_visits = {
      filter: {
        term: { "read_item.type": "post" },
      },
      aggs: {
        visits: {
          terms: {
            field: "read_item.id",
            size: 5,
          },
          aggs: {
            unique: {
              cardinality: {
                field: "visitor_id",
              },
            },
          },
        },
      },
    };
  }

  const resp = await esClient.search(query);
  let avg_visits_per_day = 0,
    avg_visitors_per_day = 0,
    most_busy_day = null,
    most_viewed_post = null,
    visits_by_country = [],
    visits_by_date = [],
    views_by_date = [],
    visits_by_location = [],
    popular_posts = [],
    referrer_type = [],
    referrer_from_domain = [],
    user_agent_os = [],
    user_agent_name = [];

  if (resp.aggregations) {
    avg_visits_per_day = resp.aggregations.avg_visits_per_day.value;
    avg_visitors_per_day = _.meanBy(
      _.get(resp.aggregations, visitsPerDayAgg + ".buckets"),
      _.property("visitors.value")
    );
    referrer_type = resp.aggregations.referrer_type.buckets;
    referrer_from_domain = resp.aggregations.referrer_from_domain.buckets;
    user_agent_os = resp.aggregations.user_agent_os.buckets;
    user_agent_name = resp.aggregations.user_agent_name.buckets;
    visits_by_date = resp.aggregations.visits_histogram.buckets;
    views_by_date = resp.aggregations.views_histogram.views.buckets;
    visits_by_country = resp.aggregations.visits_by_country.buckets;
    visits_by_location = resp.aggregations.visits_by_location.buckets.map(
      bucket => ({
        location: geohash.decode_bbox(bucket.key),
        visits: bucket.doc_count,
      })
    );

    for (const mostViewedPost of resp.aggregations.posts.by_views.buckets) {
      try {
        most_viewed_post = await blogPosts.getItemById({
          id: mostViewedPost.key,
        });
        most_viewed_post.views_count = mostViewedPost.doc_count;
        most_viewed_post.visitors_count = mostViewedPost.visitors.value;
      } catch (err) {
        if (err.statusCode !== 404) {
          throw err;
        }
      }
    }

    const largestBucket = _.maxBy(
      _.get(resp.aggregations, visitsPerDayAgg + ".buckets"),
      b => b.doc_count
    );
    most_busy_day = largestBucket
      ? {
          date: new Date(largestBucket.key),
          count: largestBucket.doc_count,
          visitors: largestBucket.visitors,
        }
      : null;

    if (resp.aggregations.posts_visits) {
      const postsVisitsBuckets = resp.aggregations.posts_visits.visits.buckets;
      popular_posts = await blogPosts.getItemsByIds(
        postsVisitsBuckets.map(bucket => bucket.key)
      );
      for (let post of popular_posts) {
        const bucket = _.find(postsVisitsBuckets, ["key", post.id]);
        post.visits_count = bucket.doc_count;
        post.unique_visits_count = bucket.unique.value;
      }
    }
  }

  return {
    avg_visits_per_day,
    avg_visitors_per_day,
    most_viewed_post,
    most_busy_day,
    views_by_date,
    visits_by_date,
    visits_by_country,
    visits_by_location,
    popular_posts,
    referrer_type,
    referrer_from_domain,
    user_agent_os,
    user_agent_name,
  };
}

export async function getLogsByLevel(level) {
  const query = {
    bool: {
      filter: [
        {
          range: {
            "@timestamp": {
              gte: LOGS_DEFAULT_START_FROM,
            },
          },
        },
      ],
    },
  };

  if (level !== "info") {
    query.bool.filter.push({
      match: {
        "log.level": level,
      },
    });
  }

  let resp = await esClient.search({
    index: LOGS_INDICES_PREFIX + "*",
    size: 20,
    ignore_unavailable: true,
    body: {
      query,
      sort: [
        {
          "@timestamp": { order: "desc" },
        },
      ],
    },
  });

  return resp.hits.hits.map(hit => {
    const level = hit._source.log.level;
    let message = "";
    if (level === "error") {
      message = hit._source.error.message;
    } else {
      if (hit._source.tags.includes("auth")) {
        message = `${hit._source.email} - ${hit._source.status}`;
      } else if (hit._source.tags.includes("visit")) {
        message = hit._source.url.full;
      }
    }

    return {
      level,
      message,
      timestamp: hit._source["@timestamp"],
      tags: hit._source.tags,
    };
  });
}

export async function* allLogsGenerator() {
  let resp = await esClient.search({
    index: LOGS_INDICES_PREFIX + "*",
    scroll: "10s",
    ignore_unavailable: true,
    body: {
      query: {
        match_all: {},
      },
      sort: [
        {
          "@timestamp": { order: "desc" },
        },
      ],
    },
  });

  while (resp.hits.hits.length) {
    yield resp.hits.hits;
    resp = await esClient.scroll({
      scroll: "10s",
      scrollId: resp._scroll_id,
    });
  }
}

function logIndexName() {
  let formatStr = null;
  switch (LOGS_PERIOD) {
    case "daily":
      formatStr = "YYYY.MM.DD";
      break;
    case "monthly":
      formatStr = "YYYY.MM";
      break;
    default:
      throw new Error("Invalid configuration blog-logs-period: " + LOGS_PERIOD);
  }

  return LOGS_INDICES_PREFIX + "-" + moment().format(formatStr);
}

export async function logAuthAttempt(params, req, res) {
  const { email, success } = params;
  await log({
    req,
    res,
    email,
    authMethod: res.locals.authAttemptBackend,
    status: success ? "success" : "failure",
    excludeUrl: true,
    tags: ["auth"],
  });
}

export async function logVisit(req, res, took) {
  // ignore redirects
  if (res.statusCode === 302) {
    return;
  }

  await log({ req, res, took, tags: ["visit"] });
}

export async function logError(errorScope, error, req, res) {
  console.error("logError", error);

  await log({
    req,
    res,
    error,
    tags: [errorScope, "error"].filter(_.identity),
  });
}

async function log({
  req,
  res,
  email,
  status,
  took,
  authMethod,
  excludeUrl = false,
  error = null,
  tags = [],
}) {
  try {
    if (!elasticsearchIsReady) {
      elasticsearchIsReady = await elasticsearch.isReady();
      if (!elasticsearchIsReady) {
        // skip logs if elasticsearch is not configured
        return;
      }
    }

    // Avoid logging clouds load-balancer healthchecks
    if (
      req &&
      req.get("User-Agent") &&
      req.get("User-Agent").startsWith("GoogleHC/")
    ) {
      return;
    }

    const body = {
      "ecs.version": "1.0.0",
      "@timestamp": new Date().toISOString(),
      tags: tags,
      log: {
        level: error ? "error" : "info",
      },
      ...ecsSource(req, res),
      ...ecsHttp(req, res),

      took,
      email,
      status,
      auth_method: authMethod,
      ...(res ? res.locals.logData : {}),
    };

    if (req) {
      if (tags.includes("visit")) {
        body.visitor_id = req.visitorId;
      }

      if (!excludeUrl) {
        const url = ecsUrl(
          req.protocol + "://" + req.get("host") + req.originalUrl
        );
        for (const key in url) {
          body[key] = url[key];
        }
      }
    }

    if (error) {
      body.error = {
        message: error.stack,
      };
    }

    if (res && res.locals.logData) {
      body.tags.push.apply(body.tags, _.keys(res.locals.logData));
    }

    await esClient.index({
      index: logIndexName(),
      type: "_doc",
      pipeline: req && res ? "request_log" : null,
      body,
    });
  } catch (error) {
    console.error(error);
  }
}

function ecsSource(req, res) {
  if (!req || !res) return {};

  let ip = null;

  if (req.headers["x-forwarded-for"]) {
    ip = req.headers["x-forwarded-for"].split(",").map(s => s.trim())[0];
  }

  if (!ip || !ip.length) {
    ip =
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection.socket ? req.connection.socket.remoteAddress : null);
  }

  return {
    source: {
      ip,
    },
  };
}

function ecsHttp(req, res) {
  if (!req || !res) return {};

  const userAgent = req.get("User-Agent");

  const body = {
    http: {
      request: {
        method: req.method.toLowerCase(),
        user_agent: userAgent,
        bot: CRAWLER_USER_AGENTS.has(userAgent),
      },
      response: {
        status_code: res.statusCode,
      },
    },
  };

  if (req.referrer) {
    const referrerRaw = req.header("referrer") || "";
    const {
      uri,
      referer,
      medium,
      search_parameter,
      search_term,
    } = req.referrer;

    body.http.request.referrer = referrerRaw;
    body.http.request.referrer_parsed = {
      full: uri.href,
      domain: uri.hostname,
      path: uri.pathname,
      query: uri.query,
      referer,
      medium,
      search_parameter,
      search_term,
    };
  } else {
    body.http.request.referrer = "direct";
  }

  return body;
}

function ecsUrl(urlStr) {
  if (!urlStr) return {};

  const parsed = url.parse(urlStr);

  return {
    url: {
      full: parsed.href,
      path: parsed.pathname,
      query: parsed.query,
    },
  };
}
