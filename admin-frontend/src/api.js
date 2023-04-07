import _ from "lodash";
import md5 from "md5";
import qs from "query-string";
import { authFetchJson, getJwtToken } from "./util";

let API_ROUTE_PREFIX = null;

export async function buildApiRoute(route) {
  if (!API_ROUTE_PREFIX) {
    API_ROUTE_PREFIX = await authFetchJson("/blog-api-route");
  }
  console.log(API_ROUTE_PREFIX + route);
  return API_ROUTE_PREFIX + route;
}

export async function logout() {
  window.location.href = await buildApiRoute("/auth/logout");
}

// Post

export async function createPost(values) {
  const apiRoute = await buildApiRoute("/content/post");
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
  const apiRoute = await buildApiRoute(`/content/post/${id}`);
  return await deleteItem(apiRoute);
}

export async function updatePost(id, post) {
  const apiRoute = await buildApiRoute(`/content/post/${id}`);
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

export async function loadPostById(id) {
  const apiRoute = await buildApiRoute(`/content/post/${id}`);
  return await authFetchJson(apiRoute);
}

export async function loadPosts(pageIndex, queryParams) {
  const apiRoute = await buildApiRoute(
    `/content/post?page_index=${pageIndex}&${qs.stringify(queryParams)}`
  );
  return await authFetchJson(apiRoute);
}

// Comments
export async function loadComments(postId) {
  const apiRoute = await buildApiRoute(`/content/post/${postId}/comment`);
  return await authFetchJson(apiRoute);
}

export async function deleteComment(path) {
  const apiRoute = await buildApiRoute(`/content/comment/${path.join(",")}`);
  return await deleteItem(apiRoute);
}

export async function updateCommentIsSpam(path, isSpam) {
  const apiRoute = await buildApiRoute(`/content/comment/${path.join(",")}`);
  return await updateItem(apiRoute, {
    spam: isSpam,
  });
}

// Content Page

export async function createContentPage(values) {
  const apiRoute = await buildApiRoute("/content/page");
  return await createItem(apiRoute, values);
}

export async function deleteContentPage(id) {
  const apiRoute = await buildApiRoute("/content/page/");
  return await deleteItem(apiRoute + id);
}

export async function updateContentPage(id, page) {
  const apiRoute = await buildApiRoute(`/content/page/${id}`);
  return await updateItem(
    apiRoute,
    _.pick(page, ["title", "content", "description", "metadata"])
  );
}

export async function loadContentPages(pageIndex, queryParams) {
  const apiRoute = await buildApiRoute(
    `/content/page?page_index=${pageIndex}&${qs.stringify(queryParams)}`
  );
  return await authFetchJson(apiRoute);
}

export async function loadContentPageById(id) {
  const apiRoute = await buildApiRoute(`/content/page/${id}`);
  return await authFetchJson(apiRoute);
}

export async function loadAllStats(startDate, interval) {
  const apiRoute = await buildApiRoute(
    `/stats/all?${qs.stringify({
      start: startDate ? startDate.toISOString() : 0,
      interval,
    })}`
  );
  return await authFetchJson(apiRoute);
}

export async function loadItemStats(itemType, id, startDate, interval) {
  const apiRoute = await buildApiRoute(
    `/stats/all?${qs.stringify({
      type: itemType,
      item_id: id,
      start: startDate ? startDate.toISOString() : 0,
      interval,
    })}`
  );
  return await authFetchJson(apiRoute);
}

export async function loadCommentsStats(postId = null) {
  const apiRoute = await buildApiRoute(
    `/stats/comments?post_id=${postId || ""}`
  );
  return await authFetchJson(apiRoute);
}

export async function loadSocialAvailability() {
  const apiRoute = await buildApiRoute("/social/availability");
  return await authFetchJson(apiRoute);
}

export async function loadAllTags() {
  const apiRoute = await buildApiRoute("/content/tags");
  return await authFetchJson(apiRoute);
}

export async function loadAuthSources() {
  const apiRoute = await buildApiRoute("/auth/auth-sources");
  return await authFetchJson(apiRoute);
}

export async function loadSetupStatus() {
  const apiRoute = await buildApiRoute("/setup/status");
  return await authFetchJson(apiRoute);
}

export async function setupElasticsearch() {
  const apiRoute = await buildApiRoute("/setup");
  return await authFetchJson(apiRoute, {
    method: "POST",
  });
}

export async function importPost(url, keepCanonicalUrl, publishNow) {
  const apiRoute = await buildApiRoute("/import");
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
  const apiRoute = await buildApiRoute(`/social/post/${socialKey}/${itemId}`);
  return await authFetchJson(apiRoute, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(opts),
  });
}

export async function downloadBackup() {
  const apiRoute = await buildApiRoute("/dump/content");
  await authFetchJson(apiRoute, { method: "OPTIONS" });
  window.location.href = apiRoute + "?state=" + getJwtToken();
}

export async function downloadLogs() {
  const apiRoute = await buildApiRoute("/dump/logs");
  await authFetchJson(apiRoute, { method: "OPTIONS" });
  window.location.href = apiRoute + "?state=" + getJwtToken();
}

export async function loadStatus() {
  const apiRoute = await buildApiRoute("/status");
  return await authFetchJson(apiRoute);
}

export async function loadLogs(level) {
  const apiRoute = await buildApiRoute("/logs");
  return await authFetchJson(`${apiRoute}?level=${level}`);
}

export async function uploadImageUrl() {
  return await buildApiRoute("/uploads/image");
}

export function userAvatarUrl(email) {
  return `https://www.gravatar.com/avatar/${md5(
    email.toLowerCase().trim()
  )}?size=100&default=identicon`;
}

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
