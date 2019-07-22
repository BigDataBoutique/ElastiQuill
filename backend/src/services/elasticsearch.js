import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import { esClient, config } from '../app';

const BLOG_INDEX = _.get(config, 'elasticsearch.blog-index-name');
const BLOG_COMMENTS_INDEX = _.get(config, 'elasticsearch.blog-comments-index-name');
const BLOG_LOGS_INDEX_PREFIX = _.get(config, 'elasticsearch.blog-logs-index-name');
const BLOG_LOGS_INDEX_TEMPLATE_NAME = 'blog-logs';
const PIPELINE_NAME = 'request_log';

export async function isReady() {
  const status = await getStatus();
  return _.every(_.values(status));  
}

export async function getClusterHealth() {
  const resp = await esClient.cluster.health();
  return resp.status;
}

export async function setup() {
  const status = await getStatus();
  const setupDir = process.env.SETUP_DIR || './_setup';

  const clusterStats = await esClient.cluster.stats({
    nodeId: '_local'
  });
  const isES7 = clusterStats.nodes.versions[0].startsWith('7');
  const includeTypeName = isES7 ? true : undefined; 

  if (! status.blogIndex) {
    await esClient.indices.create({
      index: BLOG_INDEX,
      body: fs.readFileSync(path.join(setupDir, 'blog-index.json')).toString('utf-8'),
      includeTypeName
    });
  }

  if (! status.blogCommentsIndex) {
    await esClient.indices.create({
      index: BLOG_COMMENTS_INDEX,
      body: fs.readFileSync(path.join(setupDir, 'blog-comments-index.json')).toString('utf-8'),
      includeTypeName
    });
  }

  if (! status.blogLogsIndexTemplate || ! status.blogLogsIndexTemplateUpToDate) {
    const parsed = JSON.parse(fs.readFileSync(path.join(setupDir, 'blog-logs-index-template.json')).toString('utf-8'));

    try {
      const current = await esClient.indices.getTemplate({ name: BLOG_LOGS_INDEX_TEMPLATE_NAME });
      parsed.index_patterns = updateIndexPatterns(current[BLOG_LOGS_INDEX_TEMPLATE_NAME].index_patterns);      
    }
    catch (err) {
      if (err.status != 404) {
        throw err;
      }
      parsed.index_patterns = updateIndexPatterns(parsed.index_patterns);
    }

    await esClient.indices.putTemplate({
      name: BLOG_LOGS_INDEX_TEMPLATE_NAME,
      body: JSON.stringify(parsed),
      includeTypeName
    });
  }

  if (! status.ingestPipeline) {
    await esClient.ingest.putPipeline({
      id: PIPELINE_NAME,
      body: fs.readFileSync(path.join(setupDir, 'request-log-pipeline.json')).toString('utf-8')
    });
  }
}

export async function getStatus() {
  const status = {};

  status.blogIndex = await esClient.indices.exists({
    index: BLOG_INDEX
  });

  status.blogCommentsIndex = await esClient.indices.exists({
    index: BLOG_COMMENTS_INDEX
  });

  status.blogLogsIndexTemplate = await esClient.indices.existsTemplate({
    name: BLOG_LOGS_INDEX_TEMPLATE_NAME
  });

  if (status.blogLogsIndexTemplate) {
    const setupDir = process.env.SETUP_DIR || './_setup';
    const current = await esClient.indices.getTemplate({ name: BLOG_LOGS_INDEX_TEMPLATE_NAME });
    const file = JSON.parse(fs.readFileSync(path.join(setupDir, 'blog-logs-index-template.json')).toString('utf-8'));
    status.blogLogsIndexTemplateUpToDate = mappingsEqual(current[BLOG_LOGS_INDEX_TEMPLATE_NAME], file) &&
                                           validateIndexPatterns(current[BLOG_LOGS_INDEX_TEMPLATE_NAME])
  }

  try {
    await esClient.ingest.getPipeline({
      id: 'request_log'
    });
    status.ingestPipeline = true;
  }
  catch (err) {
    if (err.status === 404) {
      status.ingestPipeline = false;
    }
    else {
      throw err;
    }
  }

  return status;
}

function mappingsEqual(m1, m2) {
  return JSON.stringify(normalizeMapping(m1)) === JSON.stringify(normalizeMapping(m2));

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
  const p1 = updateIndexPatterns(template.index_patterns).join(',');
  const p2 = parseIndexPatterns(template.index_patterns).join(',');
  return p1 === p2;
}

function parseIndexPatterns(indexPatterns) {
  let res = [];
  if (_.isArray(indexPatterns)) {
    res = indexPatterns.slice();
  }
  else if (indexPatterns) {
    res = [indexPatterns];
  }
  return res;
}

function updateIndexPatterns(indexPatterns) {
  const p = BLOG_LOGS_INDEX_PREFIX + '*';
  const patterns = parseIndexPatterns(indexPatterns);

  if (! patterns.includes(p)) {
    patterns.push(p);
  }
  patterns.sort();
  return patterns;
}