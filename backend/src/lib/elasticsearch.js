import elasticsearch from "@elastic/elasticsearch";
import { config } from "../config";

export const esClient = initClient();
esClient.ping(
  {},
  {
    requestTimeout: 5000,
  },
  (error, result) => {
    if (error) {
      console.error("Elasticsearch cluster is down!", error.message);
    } else {
      console.log("Connected to elasticsearch cluster");
      if (result.warnings) {
        console.error("Warnings:", result.warnings);
      }
    }
  }
);

function initClient() {
  return new elasticsearch.Client({
    nodes: config.elasticsearch.hosts.split(",").map(normalizeHost),
    requestTimeout: 2500,
  });
}

function normalizeHost(host) {
  const protocol = RegExp("^https?://");
  if (!protocol.test(host.toLowerCase())) {
    return "http://" + host;
  }
  return host;
}
