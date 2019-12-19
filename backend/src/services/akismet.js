import _ from "lodash";
import akismet from "akismet-api";
import { config } from "../app";

const AKISMET_APIKEY = _.get(config, "credentials.akismet.api-key"),
  AKISMET_DOMAIN = _.get(config, "credentials.akismet.domain");

let client = null;
let isAkismetAvailable = false;

if (AKISMET_APIKEY && AKISMET_DOMAIN) {
  client = akismet.client({
    key: AKISMET_APIKEY,
    blog: AKISMET_DOMAIN,
  });

  client
    .verifyKey()
    .then(valid => {
      if (valid) {
        console.log("Akismet is set up correctly");
        isAkismetAvailable = true;
      } else {
        console.log("Invalid akismet keys!");
      }
    })
    .catch(err => {
      console.error("Failed to check akismet keys validity", err);
    });
}

export function isAvailable() {
  return isAkismetAvailable;
}

export function checkSpam(params) {
  return client.checkSpam(params);
}
