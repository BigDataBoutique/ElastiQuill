import _ from "lodash";
import md5 from "md5";
import qs from "query-string";
import { authFetchJson, getJwtToken } from "./util";

export const API_ROUTE_PREFIX = window.API_ROUTE || "/api";

export async function logout() {
  window.location.href = `${API_ROUTE_PREFIX}/auth/logout`;
}

// Post

export async function createPost(values) {
  const apiRoute = `${API_ROUTE_PREFIX}/content/post`;
  return await createItem(
    apiRoute,
    _.pick(values, [
      "title",
      "content",
      "description",
      "tags",
      "series",
      "metadata",
      "allow_comments",
      "is_published",
      "draft",
    ])
  );
}

export async function deletePost(id) {
  const apiRoute = `${API_ROUTE_PREFIX}/content/post/${id}`;
  return await deleteItem(apiRoute);
}

export async function updatePost(id, post) {
  const apiRoute = `${API_ROUTE_PREFIX}/content/post/${id}`;
  return await updateItem(
    apiRoute,
    _.pick(post, [
      "title",
      "content",
      "description",
      "tags",
      "series",
      "metadata",
      "allow_comments",
      "is_published",
      "draft",
    ])
  );
}

export async function updateItemAuthor(id, type, name, email) {
  const apiRoute = `${API_ROUTE_PREFIX}/content/${type}/${id}/author`;
  return await updateItem(apiRoute, { name, email });
}

export async function loadPostById(id) {
  const apiRoute = `${API_ROUTE_PREFIX}/content/post/${id}`;
  return await authFetchJson(apiRoute);
}

export async function loadPosts(pageIndex, queryParams) {
  const apiRoute = `${API_ROUTE_PREFIX}/content/post?page_index=${pageIndex}&${qs.stringify(
    queryParams
  )}`;
  return await authFetchJson(apiRoute);
}

// Comments
export async function loadComments(postId) {
  const apiRoute = `${API_ROUTE_PREFIX}/content/post/${postId}/comment`;
  return await authFetchJson(apiRoute);
}

export async function deleteComment(path) {
  const apiRoute = `${API_ROUTE_PREFIX}/content/comment/${path.join(",")}`;
  return await deleteItem(apiRoute);
}

export async function updateCommentIsSpam(path, isSpam) {
  const apiRoute = `${API_ROUTE_PREFIX}/content/comment/${path.join(",")}`;
  return await updateItem(apiRoute, {
    spam: isSpam,
  });
}

// Content Page

export async function createContentPage(values) {
  const apiRoute = `${API_ROUTE_PREFIX}/content/page`;
  return await createItem(apiRoute, values);
}

export async function deleteContentPage(id) {
  const apiRoute = `${API_ROUTE_PREFIX}/content/page/`;
  return await deleteItem(apiRoute + id);
}

export async function updateContentPage(id, page) {
  const apiRoute = `${API_ROUTE_PREFIX}/content/page/${id}`;
  return await updateItem(
    apiRoute,
    _.pick(page, ["title", "content", "description", "metadata"])
  );
}

export async function loadContentPages(pageIndex, queryParams) {
  const apiRoute = `${API_ROUTE_PREFIX}/content/page?page_index=${pageIndex}&${qs.stringify(
    queryParams
  )}`;
  return await authFetchJson(apiRoute);
}

export async function loadContentPageById(id) {
  const apiRoute = `${API_ROUTE_PREFIX}/content/page/${id}`;
  return await authFetchJson(apiRoute);
}

export async function loadAllStats(startDate, interval) {
  const apiRoute = `${API_ROUTE_PREFIX}/stats/all?${qs.stringify({
    start: startDate ? startDate.toISOString() : 0,
    interval,
  })}`;
  return await authFetchJson(apiRoute);
}

export async function loadItemStats(itemType, id, startDate, interval) {
  const apiRoute = `${API_ROUTE_PREFIX}/stats/all?${qs.stringify({
    type: itemType,
    item_id: id,
    start: startDate ? startDate.toISOString() : 0,
    interval,
  })}`;
  return await authFetchJson(apiRoute);
}

export async function loadCommentsStats(postId = null) {
  const apiRoute = `${API_ROUTE_PREFIX}/stats/comments?post_id=${postId || ""}`;
  return await authFetchJson(apiRoute);
}

export async function loadSocialAvailability() {
  const apiRoute = `${API_ROUTE_PREFIX}/social/availability`;
  return await authFetchJson(apiRoute);
}

export async function loadAllTags() {
  const apiRoute = `${API_ROUTE_PREFIX}/content/tags`;
  return await authFetchJson(apiRoute);
}

export async function loadAuthSources() {
  const apiRoute = `${API_ROUTE_PREFIX}/auth/auth-sources`;
  return await authFetchJson(apiRoute);
}

export async function loadSetupStatus() {
  const apiRoute = `${API_ROUTE_PREFIX}/setup/status`;
  return await authFetchJson(apiRoute);
}

export async function setupElasticsearch() {
  const apiRoute = `${API_ROUTE_PREFIX}/setup`;
  return await authFetchJson(apiRoute, {
    method: "POST",
  });
}

export async function importPost(url, keepCanonicalUrl, publishNow) {
  const apiRoute = `${API_ROUTE_PREFIX}/import`;
  return await authFetchJson(apiRoute, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      keep_canonical_url: keepCanonicalUrl,
      publish_now: publishNow,
    }),
  });
}

export async function postItemToSocial(socialKey, itemId, opts) {
  const apiRoute = `${API_ROUTE_PREFIX}/social/post/${socialKey}/${itemId}`;
  return await authFetchJson(apiRoute, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(opts),
  });
}

export async function downloadBackup() {
  const apiRoute = `${API_ROUTE_PREFIX}/dump/content`;
  await authFetchJson(apiRoute, { method: "OPTIONS" });
  window.location.href = apiRoute + "?state=" + getJwtToken();
}

export async function downloadLogs() {
  const apiRoute = `${API_ROUTE_PREFIX}/dump/logs`;
  await authFetchJson(apiRoute, { method: "OPTIONS" });
  window.location.href = apiRoute + "?state=" + getJwtToken();
}

export async function loadStatus() {
  const apiRoute = `${API_ROUTE_PREFIX}/status`;
  return await authFetchJson(apiRoute);
}

export async function loadLogs(level, page) {
  const apiRoute = `${API_ROUTE_PREFIX}/logs`;
  return await authFetchJson(`${apiRoute}?level=${level}&page=${page}`);
}

export function uploadImageUrl() {
  return `${API_ROUTE_PREFIX}/uploads/image`;
}

export function userAvatarUrl(email) {
  return `https://www.gravatar.com/avatar/${md5(
    email.toLowerCase().trim()
  )}?size=100&default=identicon`;
}

export const postToHackerNews = async () => {
  return null;
};

export const redirectToSocialConnect = async () => {
  return null;
};

async function createItem(url, values) {
  return await authFetchJson(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(values),
  });
}

async function deleteItem(url) {
  return await authFetchJson(url, {
    method: "DELETE",
  });
}

async function updateItem(url, values) {
  return await authFetchJson(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(values),
  });
}
