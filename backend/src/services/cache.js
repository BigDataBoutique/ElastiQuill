import _ from 'lodash';
import NodeCache from 'node-cache';
import MockExpressResponse from 'mock-express-response';
import * as logging from './logging';
import { config } from '../app';

const CACHE_TTL = _.get(config, 'blog.cache-ttl');
const BLOG_ROUTE_PREFIX = _.get(config, 'blog.blog-route-prefix');

const pageCache = new NodeCache();
const dataCache = new NodeCache();

export function cachePageHandler(handler) {
  if (! CACHE_TTL) {
    return handler;
  }

  return async (req, res, next) => {
    const { data, timestamp } = await cacheGet(pageCache, req.originalUrl);

    if (data) {
      res.send(data);
    }
    
    if (! data || isExpired(timestamp)) {
      const recordedRes = await recordResponse(handler, req, res, next);

      if (! data) {
        res.status(recordedRes.statusCode).send(recordedRes.body);
      }

      if (recordedRes.statusCode.toString().startsWith('2')) {
        cacheSet(pageCache, req.originalUrl, recordedRes.body);
      }
    }
  };
}

export function cacheAndReturn(key, cb) {
  return new Promise(async (resolve, reject) => {
    const { data, timestamp } = await cacheGet(dataCache, key);
    if (data) {
      resolve(data);
    }

    if (! data || isExpired(timestamp)) {
      let newData = null;
      try {
        newData = await cb();
      }
      catch (err) {
        if (data) {
          logging.logError(null, err);
          return;
        }
        reject(err);
        return;
      }

      cacheSet(dataCache, key, newData);
      if (! data) {
        resolve(newData);
      }
    }
  });
}

export function clearPageCache(url) {
  return new Promise((resolve, reject) => {
    pageCache.del(url, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

function recordResponse(handler, req, res, next) {
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

    resMock.body = Buffer.concat(chunks).toString('utf8');
    resMock._oldEnd(...args);
  };

  resMock._oldRender = resMock.render;
  resMock.render = (...args) => {
    res.render(...args, (err, html) => resMock.send(html));
  };

  return new Promise(resolve => {
    resMock.on('finish', () => resolve(resMock));
    handler(req, resMock, next);
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
        timestamp: value ? value.timestamp : 0
      });
    });
  });
}

function cacheSet(cache, key, val) {
  cache.set(key, {
    data: val,
    timestamp: new Date().getTime() / 1000
  });
}

function isExpired(timestamp) {
  const now = new Date().getTime() / 1000;
  return now - timestamp > CACHE_TTL;
}
