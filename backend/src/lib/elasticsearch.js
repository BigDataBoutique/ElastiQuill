import elasticsearch from "elasticsearch";
import { config } from "../config";

export const esClient = initClient();
esClient.ping(
  {
    requestTimeout: 5000,
  },
  error => {
    if (error) {
      console.error("Elasticsearch cluster is down!", error.message);
    } else {
      console.error("Connected to elasticsearch cluster");
    }
  }
);

function initClient() {
  return new elasticsearch.Client({
    host: config.elasticsearch.hosts.split(","),
    log: "warning",
  });
}