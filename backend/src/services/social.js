import Twitter from "twitter";
import medium from "medium-sdk";
import request from "request-promise";

import { config } from "../app";

export function getAvailability(connected = {}) {
  const res = {
    "hacker-news": true,
    twitter: !!config.credentials.twitter,
    linkedin: !!config.credentials.linkedin,
    reddit: !!config.credentials.reddit,
    medium: !!config.credentials.medium,
  };

  for (const key in res) {
    if (res[key]) {
      if (connected[key] || ["twitter", "hacker-news"].indexOf(key) > -1) {
        res[key] = "ready";
      } else {
        res[key] = "not_connected";
      }
    } else {
      res[key] = "not_configured";
    }
  }

  return res;
}

export async function postToLinkedin(
  authorId,
  accessToken,
  title,
  url,
  imageUrl,
  tags
) {
  let imageAsset = undefined;

  if (imageUrl) {
    const imageBinary = await request({
      method: "GET",
      url: imageUrl,
      encoding: null,
    });

    const resp = await request({
      method: "POST",
      url:
        "https://api.linkedin.com/v2/assets?action=registerUpload&oauth2_access_token=" +
        accessToken,
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
          owner: "urn:li:person:" + authorId,
          serviceRelationships: [
            {
              relationshipType: "OWNER",
              identifier: "urn:li:userGeneratedContent",
            },
          ],
        },
      }),
    });

    const { value } = JSON.parse(resp);
    imageAsset = value.asset;

    const { uploadUrl } = value.uploadMechanism[
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
    ];

    await request({
      method: "POST",
      url: uploadUrl,
      headers: {
        Authorization: "Bearer " + accessToken,
      },
      body: imageBinary,
      encoding: null,
    });
  }

  const commentary = [title];
  if (imageAsset) {
    commentary.push(url);
  }
  if (tags && tags.length) {
    commentary.push(
      tags.map(s => "#" + s.replace(/\s/g, "").toLowerCase()).join(" ")
    );
  }

  await request({
    method: "POST",
    url:
      "https://api.linkedin.com/v2/ugcPosts?oauth2_access_token=" + accessToken,
    body: JSON.stringify({
      author: "urn:li:person:" + authorId,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: commentary.join("\n"),
          },
          shareMediaCategory: imageAsset ? "IMAGE" : "ARTICLE",
          media: [
            {
              status: "READY",
              originalUrl: url,
              media: imageAsset,
            },
          ],
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    }),
    headers: {
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
    },
  });

  return { url: null };
}

export function postToTwitter(text, imageUrl) {
  const twitterClient = new Twitter({
    consumer_key: config.credentials.twitter["consumer-key"],
    consumer_secret: config.credentials.twitter["consumer-secret"],
    access_token_key: config.credentials.twitter["access-token-key"],
    access_token_secret: config.credentials.twitter["access-token-secret"],
  });

  return new Promise(async (resolve, reject) => {
    let mediaId;

    if (imageUrl) {
      try {
        mediaId = await uploadImage(imageUrl);
      } catch (err) {
        reject(err);
        return;
      }
    }

    twitterClient.post(
      "statuses/update",
      {
        status: text,
        media_ids: mediaId,
      },
      (errors, tweet) => {
        if (errors) {
          reject(errors[0].message);
          return;
        }

        resolve({
          url: `https://twitter.com/${tweet.user.id_str}/status/${tweet.id_str}`,
        });
      }
    );
  });

  function uploadImage(imgUrl) {
    return new Promise(async (resolve, reject) => {
      let imageBinary = null;
      try {
        imageBinary = await request({
          method: "GET",
          url: imgUrl,
          encoding: null,
        });
      } catch (err) {
        reject(err);
        return;
      }

      twitterClient.post(
        "media/upload",
        { media: imageBinary },
        (error, media) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(media.media_id_string);
        }
      );
    });
  }
}

export async function postToMedium(authData, post) {
  const client = new medium.MediumClient({
    clientId: config.credentials.medium["client-id"],
    clientSecret: config.credentials.medium["client-secret"],
  });
  client.setAccessToken(authData.token);

  return new Promise((resolve, reject) => {
    client.getUser((err, user) => {
      if (err) {
        reject(err);
        return;
      }

      client.createPost(
        {
          userId: user.id,
          title: post.title,
          contentFormat: medium.PostContentFormat.HTML,
          content: post.content,
          tags: post.tags,
          canonicalUrl: config.blog.url + post.url,
          publishStatus: medium.PostPublishStatus.PUBLIC,
        },
        (err, post) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(post);
        }
      );
    });
  });
}

export async function postToReddit(authData, title, url, subreddit) {
  if (new Date().getTime() > authData.expiresAt - 10000) {
    authData = await fetchRedditAccessToken({
      refreshToken: authData.refreshToken,
    });
  }

  const submitResp = await request({
    method: "POST",
    url: "https://oauth.reddit.com/api/submit",
    auth: {
      bearer: authData.token,
    },
    headers: {
      "User-Agent": "elastiquill",
    },
    form: {
      api_type: "json",
      title: title,
      url: url,
      sr: subreddit,
      kind: "link",
    },
  });

  const parsed = JSON.parse(submitResp);
  if (!parsed.json.errors.length) {
    return {
      url: parsed.json.data.url,
    };
  }

  throw new Error(parsed.json.errors[0][1]);
}

export async function fetchRedditAccessToken({ code, callback, refreshToken }) {
  const form = refreshToken
    ? {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }
    : {
        grant_type: "authorization_code",
        code: code,
        redirect_uri: callback,
      };

  const resp = await request({
    form,
    method: "POST",
    url: "https://www.reddit.com/api/v1/access_token",
    auth: {
      user: config.credentials.reddit["client-id"],
      pass: config.credentials.reddit["client-secret"],
    },
  });

  const parsed = JSON.parse(resp);
  return {
    expiresAt: new Date().getTime() + parsed.expires_in * 1000,
    token: parsed.access_token,
    refreshToken: parsed.refresh_token ? parsed.refresh_token : refreshToken,
  };
}
