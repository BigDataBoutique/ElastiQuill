import _ from "lodash";
import fs from "fs";
import path from "path";
import semver from "semver";
import stringifyDeterministic from "json-stringify-deterministic";
import sha256 from "js-sha256";

import { esClient, config } from "../app";
import * as loggingService from "../services/logging";

const BLOG_INDEX = _.get(config, "elasticsearch.blog-index-name");
export const BLOG_INDEX_ALIAS = BLOG_INDEX + "-active";
const BLOG_COMMENTS_INDEX = _.get(
  config,
  "elasticsearch.blog-comments-index-name"
);
const BLOG_LOGS_INDEX_PREFIX = _.get(
  config,
  "elasticsearch.blog-logs-index-name"
);
const BLOG_LOGS_INDEX_TEMPLATE_NAME = "blog-logs";
const PIPELINE_NAME = "request_log";

const setupDir = process.env.SETUP_DIR || "./_setup";

let esVersion = null;

export async function isReady() {
  const status = await getStatus();
  return _.every(_.values(status));
}

export async function getClusterHealth() {
  const resp = await esClient.cluster.health();
  return resp.status;
}

export async function getVersionString() {
  if (!esVersion) {
    const clusterStats = await esClient.cluster.stats({
      nodeId: "_local",
    });
    esVersion = clusterStats.nodes.versions[0];
  }

  return esVersion;
}

export async function setup() {
  const status = await getStatus();
  const esVersion = await getVersionString();
  const includeTypeName = semver.gte(esVersion, "7.0.0") ? true : undefined;

  const blogIndexName = getBlogIndexName();
  if (!status.blogIndex) {
    const parsed = readIndexFile("blog-index.json", { json: true });
    parsed.aliases = {
      [BLOG_INDEX_ALIAS]: {},
    };
    await esClient.indices.create({
      index: blogIndexName,
      body: JSON.stringify(parsed),
      includeTypeName,
    });
  } else if (!status.blogIndexUpToDate) {
    try {
      await reindex(BLOG_INDEX_ALIAS, blogIndexName, "blog-index.json", {
        includeTypeName,
      });
    } catch (err) {
      loggingService.logError("elasticsearch setup", err);
    }
  }

  if (!status.blogCommentsIndex) {
    await esClient.indices.create({
      index: BLOG_COMMENTS_INDEX,
      body: readIndexFile("blog-comments-index.json"),
      includeTypeName,
    });
  }

  if (!status.blogLogsIndexTemplate || !status.blogLogsIndexTemplateUpToDate) {
    const parsed = readIndexFile("blog-logs-index-template.json", {
      json: true,
    });

    try {
      const current = await esClient.indices.getTemplate({
        name: BLOG_LOGS_INDEX_TEMPLATE_NAME,
      });
      parsed.index_patterns = updateIndexPatterns(
        current[BLOG_LOGS_INDEX_TEMPLATE_NAME].index_patterns
      );
    } catch (err) {
      if (err.status != 404) {
        throw err;
      }
      parsed.index_patterns = updateIndexPatterns(parsed.index_patterns);
    }

    await esClient.indices.putTemplate({
      name: BLOG_LOGS_INDEX_TEMPLATE_NAME,
      body: JSON.stringify(parsed),
      includeTypeName,
    });
  }

  if (!status.ingestPipeline) {
    await esClient.ingest.putPipeline({
      id: PIPELINE_NAME,
      body: await getRequestLogPipelineBody(),
    });
  }
}

export async function getStatus() {
  const status = {};

  const blogIndexExist = await esClient.indices.existsAlias({
    index: "*",
    name: BLOG_INDEX_ALIAS,
  });
  if (blogIndexExist) {
    status.blogIndex = true;
    // check whether blogs correctly pointing to the latest mapping
    const blogIndexName = getBlogIndexName();
    const blogIndexExistForLatestMapping = await esClient.indices.exists({
      index: blogIndexName,
    });
    if (blogIndexExistForLatestMapping) {
      // index for latest mapping exist,
      // but this might be caused by hash collision,
      // compare its mapping properties
      const currentMapping = (
        await esClient.indices.getMapping({
          index: blogIndexName,
        })
      )[blogIndexName];
      const latestMapping = readIndexFile("blog-index.json", { json: true });
      delete latestMapping.settings;

      status.blogIndexUpToDate = mappingsEqual(currentMapping, latestMapping);
    } else {
      status.blogIndexUpToDate = false;
    }
  } else {
    status.blogIndex = false;
  }

  status.blogCommentsIndex = await esClient.indices.exists({
    index: BLOG_COMMENTS_INDEX,
  });

  status.blogLogsIndexTemplate = await esClient.indices.existsTemplate({
    name: BLOG_LOGS_INDEX_TEMPLATE_NAME,
  });

  if (status.blogLogsIndexTemplate) {
    const current = await esClient.indices.getTemplate({
      name: BLOG_LOGS_INDEX_TEMPLATE_NAME,
    });
    const file = JSON.parse(
      fs
        .readFileSync(path.join(setupDir, "blog-logs-index-template.json"))
        .toString("utf-8")
    );
    validateIndexPatterns(current[BLOG_LOGS_INDEX_TEMPLATE_NAME]);
    status.blogLogsIndexTemplateUpToDate =
      mappingsEqual(current[BLOG_LOGS_INDEX_TEMPLATE_NAME], file) &&
      validateIndexPatterns(current[BLOG_LOGS_INDEX_TEMPLATE_NAME]);
  }

  try {
    const pipelines = await esClient.ingest.getPipeline({
      id: PIPELINE_NAME,
    });

    const currentPipeline = stringifyDeterministic(pipelines[PIPELINE_NAME]);
    const targetPipeline = stringifyDeterministic(
      await getRequestLogPipelineBody()
    );
    status.ingestPipeline = currentPipeline === targetPipeline;
  } catch (err) {
    if (err.status === 404) {
      status.ingestPipeline = false;
    } else {
      throw err;
    }
  }

  return status;
}

async function getRequestLogPipelineBody() {
  const esVersion = await getVersionString();
  const legacyLogsPipeline = semver.lt(esVersion, "6.7.0");
  const pipelineFilename =
    (legacyLogsPipeline ? "legacy-" : "") + "request-log-pipeline.json";
  return JSON.parse(
    fs.readFileSync(path.join(setupDir, pipelineFilename)).toString("utf-8")
  );
}

function mappingsEqual(m1, m2) {
  const s1 = stringifyDeterministic(normalizeMapping(m1)),
    s2 = stringifyDeterministic(normalizeMapping(m2));

  return s1 === s2;

  function normalizeMapping(m) {
    m = _.cloneDeep(m);
    if (m.mappings._doc) {
      m.mappings = m.mappings._doc;
    }

    m.aliases = m.aliases || {};
    delete m.order;
    delete m.index_patterns;
    return m;
  }
}

function validateIndexPatterns(template) {
  const p1 = updateIndexPatterns(template.index_patterns).join(",");
  const p2 = parseIndexPatterns(template.index_patterns).join(",");
  return p1 === p2;
}

function parseIndexPatterns(indexPatterns) {
  let res = [];
  if (_.isArray(indexPatterns)) {
    res = indexPatterns.slice();
  } else if (indexPatterns) {
    res = [indexPatterns];
  }
  return res;
}

function updateIndexPatterns(indexPatterns) {
  const p = BLOG_LOGS_INDEX_PREFIX + "*";
  const patterns = parseIndexPatterns(indexPatterns);

  if (!patterns.includes(p)) {
    patterns.push(p);
  }
  patterns.sort();
  return patterns;
}

function readIndexFile(filename, opts = {}) {
  const setupDir = process.env.SETUP_DIR || "./_setup";
  const string = fs
    .readFileSync(path.join(setupDir, filename))
    .toString("utf-8");

  if (opts.json) {
    return JSON.parse(string);
  }
  return string;
}

function getMappingId(mappingString) {
  return sha256(mappingString).substring(0, 8);
}

function getBlogIndexName() {
  let blogIndexMapping = readIndexFile("blog-index.json", { json: true })
    .mappings;
  if (blogIndexMapping._doc) {
    blogIndexMapping = blogIndexMapping._doc;
  }
  const blogIndexMappingId = getMappingId(JSON.stringify(blogIndexMapping));
  return BLOG_INDEX + "-" + blogIndexMappingId;
}

async function reindex(sourceIndex, targetIndex, filename, opts = {}) {
  const tempIndexName = sourceIndex + "-temp";

  await esClient.reindex({
    refresh: true,
    waitForCompletion: true,
    body: {
      source: {
        index: sourceIndex,
      },
      dest: {
        index: tempIndexName,
      },
    },
  });

  await esClient.indices.create({
    index: targetIndex,
    body: readIndexFile(filename),
    includeTypeName: opts.includeTypeName,
  });

  await esClient.reindex({
    refresh: true,
    waitForCompletion: true,
    body: {
      conflicts: "proceed",
      source: {
        index: tempIndexName,
      },
      dest: {
        index: targetIndex,
      },
    },
  });

  const deleteIndexes = async indexes => {
    for (let index of indexes) {
      await esClient.indices.delete({
        index,
      });
    }
  };
  const oldIndex = Object.keys(
    await esClient.indices.getAlias({
      name: sourceIndex,
    })
  );
  const indexes = [tempIndexName].concat(oldIndex);
  await deleteIndexes(indexes);

  await esClient.indices.updateAliases({
    body: {
      actions: [{ add: { index: targetIndex, alias: BLOG_INDEX_ALIAS } }],
    },
  });
}
