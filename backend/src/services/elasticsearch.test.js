import _ from "lodash";
import { sha256 } from "js-sha256";
import {
  BLOG_INDEX_ALIAS,
  BLOG_COMMENTS_INDEX_ALIAS,
  getStatus,
  setup,
  getIndexName,
  readIndexFile,
  mappingsEqual,
} from "./elasticsearch";
import { esClient } from "../lib/elasticsearch";
import { config } from "../config";
import * as loggingService from "../services/logging";

const BLOG_INDEX = _.get(config, "elasticsearch.blog-index-name");
const BLOG_COMMENTS_INDEX = _.get(
  config,
  "elasticsearch.blog-comments-index-name"
);

describe("Elasticsearch service", () => {
  const setupBlogIndexName = getIndexName(BLOG_INDEX, "blog-index.json");
  const setupBlogCommentsIndexName = getIndexName(
    BLOG_COMMENTS_INDEX,
    "blog-comments-index.json"
  );

  const setupBlogIndex = readIndexFile("blog-index.json", { json: true });
  const setupBlogCommentsIndex = readIndexFile("blog-comments-index.json", {
    json: true,
  });

  it("should setup blog index and comments from empty", async () => {
    esClient.__setupMock();
    let status = await getStatus();
    expect(status.blogIndex).toBe(false);
    expect(status.blogIndexUpToDate).toBe(undefined);
    expect(status.blogCommentsIndex).toBe(false);
    expect(status.blogCommentsIndexUpToDate).toBe(undefined);

    expect(await setup()).toBe(true);

    status = await getStatus();
    expect(status.blogIndex).toBe(true);
    expect(status.blogIndexUpToDate).toBe(true);
    expect(status.blogCommentsIndex).toBe(true);
    expect(status.blogCommentsIndexUpToDate).toBe(true);
    expect(
      mappingsEqual(
        esClient.indices.getMapping({
          index: setupBlogIndexName,
        })[setupBlogIndexName],
        { mappings: setupBlogIndex.mappings }
      )
    ).toBe(true);
    expect(
      mappingsEqual(
        esClient.indices.getMapping({
          index: setupBlogCommentsIndexName,
        })[setupBlogCommentsIndexName],
        { mappings: setupBlogCommentsIndex.mappings }
      )
    ).toBe(true);
  });

  it("should update blog posts and comments index if it's outdated", async () => {
    const blogIndex = `${BLOG_INDEX}-hash1234`;
    const blogCommentsIndex = `${BLOG_COMMENTS_INDEX}-hash1234`;
    esClient.__setupMock(
      {
        [blogIndex]: {
          mappings: {},
          settings: {},
          aliases: {
            [BLOG_INDEX_ALIAS]: {},
          },
        },
        [blogCommentsIndex]: {
          mappings: {},
          settings: {},
          aliases: {
            [BLOG_COMMENTS_INDEX_ALIAS]: {},
          },
        },
      },
      {
        [blogIndex]: [],
        [blogCommentsIndex]: [],
      }
    );

    let status = await getStatus();
    expect(status.blogIndex).toBe(true);
    expect(status.blogIndexUpToDate).toBe(false);
    expect(status.blogCommentsIndex).toBe(true);
    expect(status.blogCommentsIndexUpToDate).toBe(false);

    expect(await setup()).toBe(true);

    status = await getStatus();
    expect(status.blogIndex).toBe(true);
    expect(status.blogIndexUpToDate).toBe(true);
    expect(status.blogCommentsIndex).toBe(true);
    expect(status.blogCommentsIndexUpToDate).toBe(true);
    expect(
      mappingsEqual(
        esClient.indices.getMapping({
          index: setupBlogIndexName,
        })[setupBlogIndexName],
        { mappings: setupBlogIndex.mappings }
      )
    ).toBe(true);
    expect(
      mappingsEqual(
        esClient.indices.getMapping({
          index: setupBlogCommentsIndexName,
        })[setupBlogCommentsIndexName],
        { mappings: setupBlogCommentsIndex.mappings }
      )
    ).toBe(true);
  });

  it("should update blog posts and comments index if it's outdated (hash collision)", async () => {
    const mockSha256 = jest
      .spyOn(sha256, "sha256")
      .mockImplementation(() => "hash1234");

    const blogIndexName = `${BLOG_INDEX}-hash1234`;
    const blogCommentsIndexName = `${BLOG_COMMENTS_INDEX}-hash1234`;
    esClient.__setupMock(
      {
        [blogIndexName]: {
          mappings: {},
          settings: {},
          aliases: {
            [BLOG_INDEX_ALIAS]: {},
          },
        },
        [blogCommentsIndexName]: {
          mappings: {},
          settings: {},
          aliases: {
            [BLOG_COMMENTS_INDEX_ALIAS]: {},
          },
        },
      },
      {
        [blogIndexName]: [],
        [blogCommentsIndexName]: [],
      }
    );

    let status = await getStatus();
    expect(status.blogIndex).toBe(true);
    expect(status.blogIndexUpToDate).toBe(false);
    expect(status.blogCommentsIndex).toBe(true);
    expect(status.blogCommentsIndexUpToDate).toBe(false);

    expect(await setup()).toBe(true);
    expect(mockSha256).toHaveBeenCalled();

    status = await getStatus();
    expect(status.blogIndex).toBe(true);
    expect(status.blogIndexUpToDate).toBe(true);
    expect(status.blogCommentsIndex).toBe(true);
    expect(status.blogCommentsIndexUpToDate).toBe(true);
    expect(
      mappingsEqual(
        esClient.indices.getMapping({
          index: blogIndexName,
        })[blogIndexName],
        { mappings: setupBlogIndex.mappings }
      )
    ).toBe(true);
    expect(
      mappingsEqual(
        esClient.indices.getMapping({
          index: blogCommentsIndexName,
        })[blogCommentsIndexName],
        { mappings: setupBlogCommentsIndex.mappings }
      )
    ).toBe(true);

    mockSha256.mockRestore();
  });

  it("should not update anything if blog and comments index are up to date", async () => {
    const mockReindex = jest.spyOn(esClient, "reindex");

    esClient.__setupMock(
      {
        [setupBlogIndexName]: {
          ...setupBlogIndex,
          aliases: {
            [BLOG_INDEX_ALIAS]: {},
          },
        },
        [setupBlogCommentsIndexName]: {
          ...setupBlogCommentsIndex,
          aliases: {
            [BLOG_COMMENTS_INDEX_ALIAS]: {},
          },
        },
      },
      {
        [setupBlogIndexName]: [],
        [setupBlogCommentsIndexName]: [],
      }
    );

    let status = await getStatus();
    expect(status.blogIndex).toBe(true);
    expect(status.blogIndexUpToDate).toBe(true);
    expect(status.blogCommentsIndex).toBe(true);
    expect(status.blogCommentsIndexUpToDate).toBe(true);

    expect(await setup()).toBe(true);
    expect(mockReindex).not.toHaveBeenCalled();

    status = await getStatus();
    expect(status.blogIndex).toBe(true);
    expect(status.blogIndexUpToDate).toBe(true);
    expect(status.blogCommentsIndex).toBe(true);
    expect(status.blogCommentsIndexUpToDate).toBe(true);
    expect(
      mappingsEqual(
        esClient.indices.getMapping({
          index: setupBlogIndexName,
        })[setupBlogIndexName],
        { mappings: setupBlogIndex.mappings }
      )
    ).toBe(true);
    expect(
      mappingsEqual(
        esClient.indices.getMapping({
          index: setupBlogCommentsIndexName,
        })[setupBlogCommentsIndexName],
        { mappings: setupBlogCommentsIndex.mappings }
      )
    ).toBe(true);

    mockReindex.mockRestore();
  });

  it("should abort and log on error", async () => {
    const error = new Error("abort1234");
    const mockLogError = jest.spyOn(loggingService, "logError");
    const mockReindex = jest
      .spyOn(esClient, "reindex")
      .mockImplementation(() => {
        throw error;
      });

    const blogIndexName = `${BLOG_INDEX}-hash1234`;
    const blogCommentsIndexName = `${BLOG_COMMENTS_INDEX}-hash1234`;
    esClient.__setupMock(
      {
        [blogIndexName]: {
          mappings: {},
          settings: {},
          aliases: {
            [BLOG_INDEX_ALIAS]: {},
          },
        },
        [blogCommentsIndexName]: {
          mappings: {},
          settings: {},
          aliases: {
            [BLOG_COMMENTS_INDEX_ALIAS]: {},
          },
        },
      },
      {
        [blogIndexName]: [],
        [blogCommentsIndexName]: [],
      }
    );

    expect(await setup()).toBeFalsy();
    expect(mockReindex).toHaveBeenCalledTimes(1);
    expect(mockLogError).toHaveBeenCalledWith("elasticsearch setup", error);

    mockLogError.mockRestore();
    mockReindex.mockRestore();
  });
});
