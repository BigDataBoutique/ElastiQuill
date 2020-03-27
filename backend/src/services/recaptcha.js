import _ from "lodash";
import request from "request-promise-native";

import { config } from "../config";

const RECAPTCHA_KEY = _.get(
  config,
  "credentials.google.recaptcha-v2-key",
  null
);
const RECAPTCHA_SECRET = _.get(
  config,
  "credentials.google.recaptcha-v2-secret",
  null
);

export function isAvailable() {
  return RECAPTCHA_KEY && RECAPTCHA_SECRET;
}

export function clientKey() {
  return RECAPTCHA_KEY;
}

export async function verify(code) {
  const recaptchaResp = JSON.parse(
    await request.post("https://www.google.com/recaptcha/api/siteverify", {
      form: {
        secret: RECAPTCHA_SECRET,
        response: code,
      },
    })
  );
  return recaptchaResp.success;
}
