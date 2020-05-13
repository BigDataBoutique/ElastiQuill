import _ from "lodash";
import MockExpressRequest from "mock-express-request";
import MockExpressResponse from "mock-express-response";
import {
  cachePageHandler,
  cacheAndReturn,
  pageCache,
  dataCache,
} from "./cache";
import { config } from "../config";
const CACHE_TTL = _.get(config, "blog.cache-ttl");

describe("cache", () => {
  describe("cachePageHandler", () => {
    const mockReq = new MockExpressRequest({
      originalUrl: "localhost/testing",
    });
    const mockNext = jest.fn();
    let firstRes;
    let secondRes;
    let thirdRes;

    beforeEach(() => {
      firstRes = new MockExpressResponse({
        request: mockReq,
      });
      secondRes = new MockExpressResponse({
        request: mockReq,
      });
      thirdRes = new MockExpressResponse({
        request: mockReq,
      });
    });

    afterEach(() => {
      jest.resetAllMocks();
      jest.restoreAllMocks();
      const keys = pageCache.keys();
      pageCache.del(keys);
    });

    it("should return cached page", async () => {
      const mockHandler = jest
        .fn()
        .mockReturnValueOnce("first")
        .mockReturnValueOnce("second");

      // eslint-disable-next-line
      const middleware = cachePageHandler((req, res, next) => {
        res.json(mockHandler());
      });
      await middleware(mockReq, firstRes, mockNext); // initial caching
      await middleware(mockReq, secondRes, mockNext);

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(secondRes._getJSON()).toBe("first");
    });

    it("should return page if it's cached and asynchronously updates it if it's expired", async () => {
      const mockHandler = jest
        .fn()
        .mockReturnValueOnce("first")
        .mockReturnValueOnce("second");

      // eslint-disable-next-line
      const middleware = cachePageHandler((req, res, next) => {
        res.json(mockHandler());
      });
      await middleware(mockReq, firstRes, mockNext); // initial caching

      const expired = new Date().getTime() + CACHE_TTL * 1000 + 1;
      jest.spyOn(Date.prototype, "getTime").mockReturnValue(expired);
      await middleware(mockReq, secondRes, mockNext);

      await middleware(mockReq, thirdRes, mockNext);

      expect(mockHandler).toHaveBeenCalledTimes(2);
      expect(secondRes._getJSON()).toBe("first");
      expect(thirdRes._getJSON()).toBe("second");
    });
  });

  describe("cacheAndReturn", () => {
    afterEach(() => {
      jest.resetAllMocks();
      jest.restoreAllMocks();
      const keys = dataCache.keys();
      dataCache.del(keys);
    });

    it("should return cached item", async () => {
      const mockValue = jest
        .fn()
        .mockResolvedValueOnce("first")
        .mockResolvedValueOnce("second");
      const getCachedValue = async () => {
        return await cacheAndReturn("testing", mockValue);
      };
      await getCachedValue(); // initial caching
      const value = await getCachedValue();

      expect(mockValue).toHaveBeenCalledTimes(1);
      expect(value).toBe("first");
    });

    it("should return item if it's cached and asynchronously updates it if it's expired", async () => {
      const mockValue = jest
        .fn()
        .mockResolvedValueOnce("first")
        .mockResolvedValueOnce("second");
      const getCachedValue = async () => {
        return await cacheAndReturn("testing", mockValue);
      };
      await getCachedValue(); // initial caching

      const expired = new Date().getTime() + CACHE_TTL * 1000 + 1;
      jest.spyOn(Date.prototype, "getTime").mockReturnValue(expired);
      const oldValue = await getCachedValue();

      await sleepInMs(100);
      const newValue = await getCachedValue();

      expect(mockValue).toHaveBeenCalledTimes(2);
      expect(oldValue).toBe("first");
      expect(newValue).toBe("second");
    });
  });
});

async function sleepInMs(ms) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}
