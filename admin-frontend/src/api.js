import _ from 'lodash';
import { authFetch, getJwtToken } from './util';

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
  const resp = await authFetch(`/api/content/post/${id}`);
  return resp.json();
}

export async function loadPosts(pageIndex) {
  const resp = await authFetch(`/api/content/post?page_index=${pageIndex}`);
  return resp.json();
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
  const resp = await authFetch(`/api/content/page?page_index=${pageIndex}`);
  return resp.json();
}

export async function loadContentPageById(id) {
  const resp = await authFetch(`/api/content/page/${id}`);
  return resp.json();
}

export async function loadVisitsStats() {
  const resp = await authFetch('/api/stats/visits');
  return resp.json();
}

export async function loadCommentsStats(postId = null) {
  const resp = await authFetch('/api/stats/comments?post_id='+(postId || ''));
  return resp.json();
}

export async function loadItemStats(itemType, id) {
  const resp = await authFetch(`/api/stats/${itemType}/${id}`);
  return resp.json();
}

export async function loadSocialAvailability() {
  const resp = await authFetch('/api/social/availability');
  return resp.json();
}

export async function loadAllTags() {
  const resp = await authFetch('/api/content/tags');
  return resp.json();
}

export async function loadAuthSources() {
  const resp = await authFetch('/api/auth/auth-sources');
  return resp.json();
}

export async function loadSetupStatus() {
  const resp = await authFetch('/api/setup/status');
  return resp.json();
}

export async function setupElasticsearch() {
  const resp = await authFetch('/api/setup', {
    method: 'POST'
  });
  return resp.json();
}

export async function postItemToSocial(socialKey, itemId, opts) {
  const resp = await authFetch(`/api/social/post/${socialKey}/${itemId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(opts)
  });
  return resp.json();
}

export function redirectToSocialConnect(socialKey) {
  let url = '/api/connect/' + socialKey;
  if (socialKey === 'linkedin') {
    url += '?state=' + getJwtToken();
  }
  window.location.href = url;
}

export function downloadBackupUrl() {
  return '/api/dump/content';
}

export function downloadLogsUrl() {
  return '/api/dump/logs';
}

export function uploadImageUrl() {
  return '/api/uploads/image';
}

async function createItem(url, values) {
  const resp = await authFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(values)
  });
  return resp.json();
}

async function deleteItem(url) {
  const resp = await authFetch(url, {
    method: 'DELETE'
  });
  return resp.json();
}

async function updateItem(url, values) {
  const resp = await authFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(values)
  });
  return resp.json();
}
