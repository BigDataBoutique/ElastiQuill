import _ from "lodash";
import NodeCache from "node-cache";
import AsyncLock from "async-lock";
import MockExpressResponse from "mock-express-response";
import * as logging from "./logging";
import { config } from "../config";

const CACHE_TTL = _.get(config, "blog.cache-ttl");

export const pageCache = new NodeCache();
export const dataCache = new NodeCache();

const pageLock = new AsyncLock();

export function cachePageHandler(handler) {
  return async (req, res, next) => {
    await pageLock.acquire(req.originalUrl, async () => {
      const { data, timestamp } = await cacheGet(pageCache, req.originalUrl);
      let responseSent = false;
      if (data) {
        res.send(data);
        responseSent = true;
      }

      if (responseSent && !isExpired(timestamp)) {
        return;
      }

      try {
        const recordedRes = await recordResponse(handler, req, res);

        if (!responseSent) {
          res
            .status(recordedRes.statusCode)
            .set(recordedRes.getHeaders())
            .send(recordedRes.body);
        }

        if (recordedRes.statusCode.toString().startsWith("2")) {
          cacheSet(pageCache, req.originalUrl, recordedRes.body);
        }
      } catch (err) {
        if (responseSent) {
          logging.logError(null, err, req, res);
        } else {
          next(err);
        }
      }
    });
  };
}

export async function cacheAndReturn(key, cb) {
  const { data, timestamp } = await cacheGet(dataCache, key);

  if (data) {
    if (isExpired(timestamp)) {
      updateCache(data, key, cb);
    }
    return data;
  }

  return await updateCache(data, key, cb);
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

  cacheSet(dataCache, key, newData);
  return newData;
}

export function clearPageCache(url) {
  return new Promise((resolve, reject) => {
    pageCache.del(url, err => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

function recordResponse(handler, req, res) {
  const chunks = [];

  const resMock = new MockExpressResponse();
  resMock.locals = res.locals;

  resMock._oldWrite = resMock.write;
  resMock.write = (...args) => {
    chunks.push(args[0]);
    resMock._oldWrite(...args);
  };

  resMock._oldEnd = resMock.end;
  resMock.end = (...args) => {
    if (args[0]) {
      chunks.push(args[0]);
    }

    const bufferChunks = chunks.map(c => {
      if (_.isString(c)) return Buffer.from(c);
      return c;
    });
    resMock.body = Buffer.concat(bufferChunks).toString("utf8");
    resMock._oldEnd(...args);
  };

  resMock._oldRender = resMock.render;
  resMock.render = (...args) => {
    res.render(...args, (err, html) => resMock.send(html));
  };

  return new Promise((resolve, reject) => {
    resMock.on("finish", () => resolve(resMock));
    handler(req, resMock, err => {
      reject(err);
    });
  });
}

function cacheGet(cache, key) {
  return new Promise(resolve => {
    cache.get(key, (err, value) => {
      if (err) {
        logging.logError(null, err);
      }

      resolve({
        data: value ? value.data : null,
        timestamp: value ? value.timestamp : 0,
      });
    });
  });
}

function cacheSet(cache, key, val) {
  cache.set(key, {
    data: val,
    timestamp: new Date().getTime() / 1000,
  });
}

function isExpired(timestamp) {
  const now = new Date().getTime() / 1000;
  return now - timestamp > CACHE_TTL;
}
