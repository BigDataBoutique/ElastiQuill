import _ from 'lodash';
import md5 from 'md5';
import qs from 'query-string';
import { authFetchJson, getJwtToken } from './util';

export function logout() {
  window.location.href = '/api/auth/logout';
}

// Post

export async function createPost(values) {
  return await createItem('/api/content/post', _.pick(values, [
    'title',
    'content',
    'description',
    'tags',
    'series',
    'metadata',
    'allow_comments',
    'is_published',
    'draft'
  ]));
}

export async function deletePost(id) {
  return await deleteItem('/api/content/post/' + id);
}

export async function updatePost(id, post) {
  return await updateItem('/api/content/post/' + id, _.pick(post, [
    'title',
    'content',
    'description',
    'tags',
    'series',
    'metadata',
    'allow_comments',
    'is_published',
    'draft'
  ]));
}

export async function loadPostById(id) {
  return await authFetchJson(`/api/content/post/${id}`);
}

export async function loadPosts(pageIndex, searchQuery) {
  return await authFetchJson(`/api/content/post?page_index=${pageIndex}&query=${searchQuery}`);
}

// Content Page

export async function createContentPage(values) {
  return await createItem('/api/content/page', values);
}

export async function deleteContentPage(id) {
  return await deleteItem('/api/content/page/' + id);
}

export async function updateContentPage(id, page) {
  return await updateItem('/api/content/page/' + id, _.pick(page, [
    'title',
    'content',
    'description',
    'metadata'
  ]));
}

export async function loadContentPages(pageIndex, searchQuery) {
  return await authFetchJson(`/api/content/page?page_index=${pageIndex}&query=${searchQuery}`);
}

export async function loadContentPageById(id) {
  return await authFetchJson(`/api/content/page/${id}`);
}

export async function loadAllStats(startDate, interval) {
  return await authFetchJson('/api/stats/all?' + qs.stringify({
    start: startDate ? startDate.toISOString() : 0,
    interval
  }));
}

export async function loadItemStats(itemType, id, startDate, interval) {
  return await authFetchJson(`/api/stats/all?` + qs.stringify({
    type: itemType,
    item_id: id,
    start: startDate ? startDate.toISOString() : 0,
    interval
  }));
}

export async function loadCommentsStats(postId = null) {
  return await authFetchJson('/api/stats/comments?post_id='+(postId || ''));
}

export async function loadSocialAvailability() {
  return await authFetchJson('/api/social/availability');
}

export async function loadAllTags() {
  return await authFetchJson('/api/content/tags');
}

export async function loadAuthSources() {
  return await authFetchJson('/api/auth/auth-sources');
}

export async function loadSetupStatus() {
  return await authFetchJson('/api/setup/status');
}

export async function setupElasticsearch() {
  return await authFetchJson('/api/setup', {
    method: 'POST'
  });
}

export async function importPost(url) {
  return await authFetchJson(`/api/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url
    })
  });
}

export async function postItemToSocial(socialKey, itemId, opts) {
  return await authFetchJson(`/api/social/post/${socialKey}/${itemId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(opts)
  });
}

export function postToHackerNews(post) {
  const shareUrl = `https://news.ycombinator.com/submitlink?u=${encodeURIComponent(post.full_url)}&t=${encodeURIComponent(post.title)}`;
  const win = window.open(shareUrl, '_blank');
  win.focus();
}

export function redirectToSocialConnect(socialKey) {
  window.location.href = '/api/connect/' + socialKey + '?state=' + getJwtToken();
}

export async function downloadBackup() {
  const url = '/api/dump/content';  
  await authFetchJson(url, { method: 'OPTIONS' });
  window.location.href = url + '?state=' + getJwtToken();
}

export async function downloadLogs() {
  const url = '/api/dump/logs';
  await authFetchJson(url, { method: 'OPTIONS' });
  window.location.href = url + '?state=' + getJwtToken();
}

export async function loadStatus() {
  return await authFetchJson('/api/status');
}

export function uploadImageUrl() {
  return '/api/uploads/image';
}

export function userAvatarUrl(email) {
  return `https://www.gravatar.com/avatar/${md5(email.toLowerCase().trim())}?size=100&default=identicon`;
}

async function createItem(url, values) {
  return await authFetchJson(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(values)
  });
}

async function deleteItem(url) {
  return await authFetchJson(url, {
    method: 'DELETE'
  });
}

async function updateItem(url, values) {
  return await authFetchJson(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(values)
  });
}