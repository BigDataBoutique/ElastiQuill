import _ from 'lodash';
import { authFetchJson, getJwtToken } from './util';

export function logout() {
  window.location.href = '/api/auth/logout';
}

export async function createPost(values) {
  return await createItem('/api/content/post', values);
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
    'metadata',
    'allow_comments'
  ]));
}

export async function loadPostById(id) {
  return await authFetchJson(`/api/content/post/${id}`);
}

export async function loadPosts(pageIndex) {
  return await authFetchJson(`/api/content/post?page_index=${pageIndex}`);
}

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

export async function loadContentPages(pageIndex) {
  return await authFetchJson(`/api/content/page?page_index=${pageIndex}`);
}

export async function loadContentPageById(id) {
  return await authFetchJson(`/api/content/page/${id}`);
}

export async function loadVisitsStats() {
  return await authFetchJson('/api/stats/visits');
}

export async function loadCommentsStats(postId = null) {
  return await authFetchJson('/api/stats/comments?post_id='+(postId || ''));
}

export async function loadItemStats(itemType, id) {
  return await authFetchJson(`/api/stats/${itemType}/${id}`);
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

export async function postItemToSocial(socialKey, itemId, opts) {
  return await authFetchJson(`/api/social/post/${socialKey}/${itemId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(opts)
  });
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