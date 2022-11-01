import $ from "jquery";
import ls from "local-storage";
import cookie from "cookie";

const JWT_TOKEN_KEY = "jwt-token";

let unathorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unathorizedHandler = handler;
}

export const authFetch = async (url, opts = {}) => {
  opts.credentials = "include";

  if (!opts.headers) {
    opts.headers = {};
  }

  if (getJwtToken()) {
    opts.headers["Authorization"] = "Bearer " + getJwtToken();
  }

  const resp = await fetch(url, opts);
  if (resp.status === 401 && unathorizedHandler) {
    unathorizedHandler(resp);
  }

  return resp;
};

export const authFetchJson = async (url, opts = {}) => {
  const resp = await authFetch(url, opts);
  const data = await resp.json();
  if (data.error) {
    throw new Error(data.error);
  }

  return data;
};

export function getJwtToken() {
  const jwt = extractJwtFromCookies();
  if (jwt) {
    ls.set(JWT_TOKEN_KEY, jwt);
    return jwt;
  } else {
    return ls.get(JWT_TOKEN_KEY);
  }
}

export function cleanJwtToken() {
  ls.set(JWT_TOKEN_KEY, "");
}

$(() => {
  const jwt = extractJwtFromCookies();
  if (jwt) {
    ls.set(JWT_TOKEN_KEY, jwt);
  }
});

function extractJwtFromCookies() {
  const cookies = cookie.parse(document.cookie);
  if (cookies[JWT_TOKEN_KEY]) {
    return cookies[JWT_TOKEN_KEY];
  }
  return null;
}

export function formatNumbers(number) {
  if (!number) return 0;

  const locale =
    window.navigator.userLanguage || window.navigator.language || "en";

  return Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(number);
}
