import _ from "lodash";
import fs from "fs";
import path from "path";
import semver from "semver";
import stringifyDeterministic from "json-stringify-deterministic";
import { sha256 } from "js-sha256";

import { config } from "../config";
import { esClient } from "../lib/elasticsearch";
import * as loggingService from "../services/logging";

const BLOG_INDEX = _.get(config, "elasticsearch.blog-index-name");
export const BLOG_INDEX_ALIAS = BLOG_INDEX + "-active";
const BLOG_COMMENTS_INDEX = _.get(
  config,
  "elasticsearch.blog-comments-index-name"
);
export const BLOG_COMMENTS_INDEX_ALIAS = BLOG_COMMENTS_INDEX + "-active";
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
  return resp.body.status;
}

export async function getVersionString() {
  if (!esVersion) {
    const clusterStats = await esClient.cluster.stats({
      nodeId: "_local",
    });
    esVersion = clusterStats.body.nodes.versions[0];
  }

  return esVersion;
}

export async function setup() {
  try {
    const status = await getStatus();
    const esVersion = await getVersionString();
    const includeTypeName = semver.gte(esVersion, "7.0.0") ? true : undefined;

    await setupRollableIndex({
      indexPrefix: BLOG_INDEX,
      indexAliasName: BLOG_INDEX_ALIAS,
      mappingsFilename: "blog-index.json",
      indexExists: status.blogIndex,
      indexUpToDate: status.blogIndexUpToDate,
      includeTypeName,
    });

    await setupRollableIndex({
      indexPrefix: BLOG_COMMENTS_INDEX,
      indexAliasName: BLOG_COMMENTS_INDEX_ALIAS,
      mappingsFilename: "blog-comments-index.json",
      indexExists: status.blogCommentsIndex,
      indexUpToDate: status.blogCommentsIndexUpToDate,
      includeTypeName,
    });

    if (
      !status.blogLogsIndexTemplate ||
      !status.blogLogsIndexTemplateUpToDate
    ) {
      const parsed = readIndexFile("blog-logs-index-template.json", {
        json: true,
      });

      try {
        const current = await esClient.indices.getTemplate({
          name: BLOG_LOGS_INDEX_TEMPLATE_NAME,
        });
        parsed.index_patterns = updateIndexPatterns(
          current.body[BLOG_LOGS_INDEX_TEMPLATE_NAME].index_patterns
        );
      } catch (err) {
        if (err.meta.statusCode !== 404) {
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

    // success
    return true;
  } catch (err) {
    loggingService.logError(loggingService.ES_SETUP_LOGGING_TAG, err);
    return false;
  }
}

async function setupRollableIndex({
  indexPrefix,
  indexAliasName,
  mappingsFilename,
  indexExists,
  indexUpToDate,
  includeTypeName,
}) {
  const blogIndexName = getIndexName(indexPrefix, mappingsFilename);
  if (!indexExists) {
    const parsed = readIndexFile(mappingsFilename, { json: true });
    parsed.aliases = {
      [indexAliasName]: {},
    };
    await esClient.indices.create({
      index: blogIndexName,
      body: JSON.stringify(parsed),
      includeTypeName,
    });
  } else if (!indexUpToDate) {
    await reindex(indexAliasName, blogIndexName, mappingsFilename, {
      includeTypeName,
    });
  }
}

export async function getStatus() {
  const status = { error: {} };

  status.blogIndex = await isIndexAliasExist(BLOG_INDEX_ALIAS);
  if (status.blogIndex) {
    status.blogIndexUpToDate = await isIndexUpToDate(
      BLOG_INDEX,
      "blog-index.json"
    );
    if (!status.blogIndexUpToDate) {
      status.error.blogIndexUpToDate = "Blog index template is out of date";
    }
  } else {
    status.error.blogIndex = "Blog index is misconfigured";
  }

  status.blogCommentsIndex = await isIndexAliasExist(BLOG_COMMENTS_INDEX_ALIAS);
  if (status.blogCommentsIndex) {
    status.blogCommentsIndexUpToDate = await isIndexUpToDate(
      BLOG_COMMENTS_INDEX,
      "blog-comments-index.json"
    );
    if (!status.blogCommentsIndexUpToDate) {
      status.error.blogCommentsIndexUpToDate =
        "Blog comments index template is out of date";
    }
  } else {
    status.error.blogCommentsIndex = "Blog comments index is misconfigured";
  }

  status.blogLogsIndexTemplate = (
    await esClient.indices.existsTemplate({
      name: BLOG_LOGS_INDEX_TEMPLATE_NAME,
    })
  ).body;
  if (status.blogLogsIndexTemplate) {
    const current = await esClient.indices.getTemplate({
      name: BLOG_LOGS_INDEX_TEMPLATE_NAME,
    });
    const file = JSON.parse(
      fs
        .readFileSync(path.join(setupDir, "blog-logs-index-template.json"))
        .toString("utf-8")
    );
    validateIndexPatterns(current.body[BLOG_LOGS_INDEX_TEMPLATE_NAME]);
    status.blogLogsIndexTemplateUpToDate =
      mappingsEqual(current.body[BLOG_LOGS_INDEX_TEMPLATE_NAME], file) &&
      validateIndexPatterns(current.body[BLOG_LOGS_INDEX_TEMPLATE_NAME]);
    if (!status.blogLogsIndexTemplateUpToDate) {
      status.error.blogLogsIndexTemplateUpToDate =
        "Blog logs index is out of date";
    }
  } else {
    status.error.blogLogsIndexTemplate = "Blog logs index is misconfigured";
  }

  try {
    const pipelines = await esClient.ingest.getPipeline({
      id: PIPELINE_NAME,
    });

    const currentPipeline = stringifyDeterministic(
      pipelines.body[PIPELINE_NAME]
    );
    const targetPipeline = stringifyDeterministic(
      await getRequestLogPipelineBody()
    );
    status.ingestPipeline = currentPipeline === targetPipeline;
    if (!status.ingestPipeline) {
      status.error.ingestPipeline = "Ingest pipeline is misconfigured";
    }
  } catch (err) {
    if (err.meta.statusCode === 404) {
      status.ingestPipeline = false;
      status.error.ingestPipeline = "Ingest pipeline is misconfigured";
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

export function mappingsEqual(m1, m2) {
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

export function readIndexFile(filename, opts = {}) {
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

export function getIndexName(prefix, filename) {
  let mapping = readIndexFile(filename, { json: true }).mappings;
  if (mapping._doc) {
    mapping = mapping._doc;
  }
  const mappingId = getMappingId(stringifyDeterministic(mapping));
  return prefix + "-" + mappingId;
}

async function isIndexAliasExist(alias) {
  const resp = await esClient.indices.existsAlias({
    index: "*",
    name: alias,
  });

  return resp.body;
}

async function isIndexUpToDate(index, filename) {
  // check whether index correctly pointing to the latest mapping
  const indexName = getIndexName(index, filename);
  const indexExistForLatestMapping = await esClient.indices.exists({
    index: indexName,
  });
  if (indexExistForLatestMapping.body) {
    // index for latest mapping exist,
    // but this might be caused by hash collision,
    // compare its mapping properties
    const resp = await esClient.indices.getMapping({
      index: indexName,
    });
    const currentMapping = resp.body[indexName];
    const latestMapping = readIndexFile(filename, { json: true });
    delete latestMapping.settings;

    return mappingsEqual(currentMapping, latestMapping);
  } else {
    return false;
  }
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

  const deleteIndices = async indices => {
    for (let index of indices) {
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
  const indices = [tempIndexName].concat(oldIndex);
  await deleteIndices(indices);

  await esClient.indices.updateAliases({
    body: {
      actions: [{ add: { index: targetIndex, alias: sourceIndex } }],
    },
  });
}
