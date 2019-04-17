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

export async function setup() {
  const status = await getStatus();
  const setupDir = process.env.SETUP_DIR || './_setup';

  if (! status.blogIndex) {
    await esClient.indices.create({
      index: BLOG_INDEX,
      body: fs.readFileSync(path.join(setupDir, 'blog-index.json')).toString('utf-8')
    });
  }

  if (! status.blogCommentsIndex) {
    await esClient.indices.create({
      index: BLOG_COMMENTS_INDEX,
      body: fs.readFileSync(path.join(setupDir, 'blog-comments-index.json')).toString('utf-8')
    });
  }

  if (! status.blogLogsIndexTemplate) {
    const parsed = JSON.parse(fs.readFileSync(path.join(setupDir, 'blog-logs-index-template.json')).toString('utf-8'));
    parsed.index_patterns = BLOG_LOGS_INDEX_PREFIX + '*';

    await esClient.indices.putTemplate({
      name: BLOG_LOGS_INDEX_TEMPLATE_NAME,
      body: JSON.stringify(parsed)
    });
  }

  if (! status.ingestPipeline) {
    await esClient.ingest.putPipeline({
      id: PIPELINE_NAME,
      body: fs.readFileSync(path.join(setupDir, 'request-log-pipeline.json')).toString('utf-8')
    });
  }
}

async function getStatus() {
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