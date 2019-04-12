import _ from 'lodash';
import $ from 'jquery';
import ls from 'local-storage';
import cookie from 'cookie';

const JWT_TOKEN_KEY = 'jwt-token';

export const jsonFetch = async (url, opts = {}) => {
  if (!opts.headers) {
    opts.headers = {};
  }
  opts.headers['Content-Type'] = 'application/json; charset=utf-8';

  return await authFetch(url, opts);
};

export const authFetch = async (url, opts = {}) => {
  opts.credentials = 'include';

  if (! opts.headers) {
    opts.headers = {}
  }

  if (getJwtToken()) {
    opts.headers['Authorization'] = 'Bearer ' + getJwtToken();
  }

  return await fetch(url, opts);
};

export function getJwtToken() {
  const jwt = extractJwtFromCookies();
  if (jwt) {
    ls.set(JWT_TOKEN_KEY, jwt);
    return jwt;
  }
  else {
    return ls.get(JWT_TOKEN_KEY);
  }
}

export function cleanJwtToken() {
  ls.set(JWT_TOKEN_KEY, '');
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
