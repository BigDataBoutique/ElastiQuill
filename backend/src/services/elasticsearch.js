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

const setupES8SubDir = "es8";
const setupLegacySubDir = "legacy";

const setupDir = process.env.SETUP_DIR || "./_setup";

let esVersion = null;
let esMajorVersion = null;

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
    esMajorVersion = parseInt(esVersion.split(".")[0], 10);
  }

  return esVersion;
}

function getSetupFilePath(filename) {
  const subDir = esMajorVersion >= 8 ? setupES8SubDir : setupLegacySubDir;
  return path.join(setupDir, subDir, filename);
}

export async function setup() {
  try {
    await getVersionString();
    const status = await getStatus();
    const esVersion = await getVersionString();
    const includeTypeName =
      semver.gte(esVersion, "7.0.0") && semver.lt(esVersion, "8.0.0")
        ? true
        : undefined;

    const mappingsFilename = "blog-index.json";
    const commentsMappingsFilename = "blog-comments-index.json";

    await setupRollableIndex({
      indexPrefix: BLOG_INDEX,
      indexAliasName: BLOG_INDEX_ALIAS,
      mappingsFilename,
      indexExists: status.blogIndex,
      indexUpToDate: status.blogIndexUpToDate,
      includeTypeName,
    });

    await setupRollableIndex({
      indexPrefix: BLOG_COMMENTS_INDEX,
      indexAliasName: BLOG_COMMENTS_INDEX_ALIAS,
      mappingsFilename: commentsMappingsFilename,
      indexExists: status.blogCommentsIndex,
      indexUpToDate: status.blogCommentsIndexUpToDate,
      includeTypeName,
    });

    if (
      !status.blogLogsIndexTemplate ||
      !status.blogLogsIndexTemplateUpToDate
    ) {
      const parsed = await readIndexFile(`blog-logs-index-template.json`, {
        json: true,
      });

      try {
        if (esMajorVersion >= 8) {
          try {
            const current = await esClient.indices.getIndexTemplate({
              name: BLOG_LOGS_INDEX_TEMPLATE_NAME,
            });
            parsed.index_patterns = updateIndexPatterns(
              current.body.index_templates[0].index_template.index_patterns
            );
          } catch (err) {
            if (err.meta.statusCode !== 404) {
              throw err;
            }
            parsed.index_patterns = updateIndexPatterns(parsed.index_patterns);
          }

          await esClient.indices.putIndexTemplate({
            name: BLOG_LOGS_INDEX_TEMPLATE_NAME,
            body: parsed,
          });
        } else {
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
            body: parsed,
            include_type_name: includeTypeName,
          });
        }
      } catch (err) {
        console.error(`Failed to update template: ${err.message}`);
        throw err;
      }

    }

    if (!status.ingestPipeline) {
      const pipelineFile =
        esMajorVersion >= 8
          ? `request-log-pipeline.json`
          : `legacy-request-log-pipeline.json`;

      await esClient.ingest.putPipeline({
        id: PIPELINE_NAME,
        body: readIndexFile(pipelineFile, { json: true }),
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

  try {
    if (!indexExists) {
      const parsed = readIndexFile(mappingsFilename, { json: true });
      parsed.aliases = {
        [indexAliasName]: {
          is_write_index: esMajorVersion >= 8,
        },
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
  } catch (error) {
    console.error("Error in setupRollableIndex:", error);
    throw error;
  }
}

export async function getStatus() {
  const status = { error: {} };

  if (!esVersion) {
    await getVersionString();
  }

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

  try {
    if (esMajorVersion >= 8) {
      const templateExists = await esClient.indices.existsIndexTemplate({
        name: BLOG_LOGS_INDEX_TEMPLATE_NAME,
      });

      status.blogLogsIndexTemplate = templateExists.body;

      if (status.blogLogsIndexTemplate) {
        const current = await esClient.indices.getIndexTemplate({
          name: BLOG_LOGS_INDEX_TEMPLATE_NAME,
        });

        const file = JSON.parse(
          fs
            .readFileSync(getSetupFilePath("blog-logs-index-template.json"))
            .toString("utf-8")
        );

        const template = current.body.index_templates[0].index_template;
        status.blogLogsIndexTemplateUpToDate =
          mappingsEqual(template, file) && validateIndexPatterns(template);
      }
    } else {
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
            .readFileSync(getSetupFilePath("blog-logs-index-template.json"))
            .toString("utf-8")
        );
        validateIndexPatterns(current.body[BLOG_LOGS_INDEX_TEMPLATE_NAME]);
        status.blogLogsIndexTemplateUpToDate =
          mappingsEqual(current.body[BLOG_LOGS_INDEX_TEMPLATE_NAME], file) &&
          validateIndexPatterns(current.body[BLOG_LOGS_INDEX_TEMPLATE_NAME]);
      }
    }

    if (!status.blogLogsIndexTemplate) {
      status.error.blogLogsIndexTemplate = "Blog logs index is misconfigured";
    } else if (!status.blogLogsIndexTemplateUpToDate) {
      status.error.blogLogsIndexTemplateUpToDate =
        "Blog logs index is out of date";
    }
  } catch (err) {
    console.error("Error checking template status:", err);
    status.error.blogLogsIndexTemplate = `Error checking template: ${err.message}`;
    status.blogLogsIndexTemplate = false;
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
  const legacyLogsPipeline = semver.lt(esVersion, "6.7.0");
  const pipelineFilename =
    (legacyLogsPipeline ? "legacy-" : "") + "request-log-pipeline.json";
  return JSON.parse(
    fs.readFileSync(await getSetupFilePath(pipelineFilename)).toString("utf-8")
  );
}

export function mappingsEqual(m1, m2) {
  const s1 = stringifyDeterministic(normalizeMapping(m1)),
    s2 = stringifyDeterministic(normalizeMapping(m2));

  return s1 === s2;

  function normalizeMapping(m) {
    m = _.cloneDeep(m);
    if (m.mappings && m.mappings._doc) {
      m.mappings = m.mappings._doc;
    }

    if (m.mappings && m.mappings.properties) {
      m.mappings = { properties: m.mappings.properties };
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

export function readIndexFile(fileName, opts = {}) {
  const filePath = getSetupFilePath(fileName);

  try {
    const string = fs.readFileSync(filePath).toString("utf-8");

    if (opts.json) {
      try {
        const parsed = JSON.parse(string);
        return parsed;
      } catch (jsonError) {
        throw jsonError;
      }
    }
    return string;
  } catch (err) {
    console.error(`Failed to read file ${filePath}:`, err);
    throw err;
  }
}

function getMappingId(mappingString) {
  return sha256(mappingString).substring(0, 8);
}

export function getIndexName(prefix, filename) {
  const fileContent = readIndexFile(filename, { json: true });

  let mapping = fileContent.mappings;

  if (esMajorVersion < 8) {
    if (mapping && mapping._doc) {
      mapping = mapping._doc;
    }
  }

  if (mapping && mapping.properties) {
    mapping = { properties: mapping.properties };
  }

  if (!mapping || !mapping.properties) {
    console.error("Invalid mapping structure:", {
      majorVersion: esMajorVersion,
      hasMapping: !!mapping,
      hasProperties: !!(mapping && mapping.properties),
      mappingKeys: mapping ? Object.keys(mapping) : null,
    });
    throw new Error(`Invalid mapping structure in ${filename}`);
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

export function addType(indexParams) {
  // const esVersion = getVersionString();
  // const majorVersion = parseInt(esVersion.split(".")[0], 10);

  if (esMajorVersion < 7) {
    indexParams.type = "_doc";
  }
  return indexParams;
}
