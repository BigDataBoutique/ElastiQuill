import _ from "lodash";
import NodeCache from "node-cache";
import * as logging from "./logging";
import { config } from "../config";

const CACHE_TTL = _.get(config, "blog.cache-ttl");

export const pageCache = new NodeCache();
export const dataCache = new NodeCache();

export async function cacheAndReturn(key, cb) {
  const cacheValue = await dataCache.get(key);

  if (cacheValue && cacheValue.data) {
    if (isExpired(cacheValue.timestamp)) {
      updateCache(cacheValue.data, key, cb);
    }
    return cacheValue.data;
  }

  return await updateCache(null, key, cb);
}

async function updateCache(data, key, cb) {
  let newData = null;
  try {
    newData = await cb();
  } catch (err) {
    if (data) {
      logging.logError(null, err);
      return;
    }
    throw err;
  }

  await dataCache.set(key, {
    data: newData,
    timestamp: new Date().getTime() / 1000,
  });
  return newData;
}

function isExpired(timestamp) {
  const now = new Date().getTime() / 1000;
  return now - timestamp > CACHE_TTL;
}

export const CACHE_KEYS = {
  RSS_ITEMS: "recent-items",
  RSS_ITEMS_NO_ANNOUNCEMENTS: "recent-items-no-announcements",
  SIDEBAR_WIDGET_DATA: "sidebar-widget-data",
  HEALTHZ_TOP_POST: "healthz-top-post",
  SITEMAP: "sitemap",
};
