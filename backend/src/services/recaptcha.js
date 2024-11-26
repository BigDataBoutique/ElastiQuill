import _ from "lodash";
import axios from "axios";
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
  const response = await axios.post(
    "https://www.google.com/recaptcha/api/siteverify",
    new URLSearchParams({
      secret: RECAPTCHA_SECRET,
      response: code,
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  return response.data.success;
}
