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
    hosts: config.elasticsearch.hosts.split(","),
    sniffOnStart: true,
    requestTimeout: 2500,
    log: "warning",
  });
}
