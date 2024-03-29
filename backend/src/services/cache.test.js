import _ from "lodash";
import { cacheAndReturn, dataCache } from "./cache";
import { config } from "../config";
const CACHE_TTL = _.get(config, "blog.cache-ttl");

describe("cache", () => {
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
