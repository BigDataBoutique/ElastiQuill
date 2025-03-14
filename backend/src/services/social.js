import _ from "lodash";
import { TwitterApi as Twitter } from "twitter-api-v2";
import medium from "medium-sdk";
import axios from "axios";
import { config } from "../config";

export function getAvailability(connected = {}) {
  const res = {
    "hacker-news": true,
    linkedin: _.every([
      !!_.get(config, "credentials.linkedin.client-id"),
      !!_.get(config, "credentials.linkedin.client-secret"),
    ]),
    reddit: _.every([
      !!_.get(config, "credentials.reddit.client-id"),
      !!_.get(config, "credentials.reddit.client-secret"),
    ]),
    medium: _.every([
      !!_.get(config, "credentials.medium.client-id"),
      !!_.get(config, "credentials.medium.client-secret"),
    ]),
    twitter: _.every([
      !!_.get(config, "credentials.twitter.consumer-key"),
      !!_.get(config, "credentials.twitter.consumer-secret"),
      !!_.get(config, "credentials.twitter.access-token-key"),
      !!_.get(config, "credentials.twitter.access-token-secret"),
    ]),
    facebook: !!_.get(config, "credentials.facebook.app-id"),
  };

  for (const key in res) {
    if (res[key]) {
      if (
        connected[key] ||
        ["twitter", "hacker-news", "facebook"].indexOf(key) > -1
      ) {
        res[key] = {
          status: "ready",
        };
      } else {
        res[key] = {
          status: "not_connected",
        };
      }
      if (key === "facebook") {
        res[key].appId = _.get(config, "credentials.facebook.app-id");
        res[key].blogUrl = config.blog.url;
      }
    } else {
      res[key] = {
        status: "not_configured",
      };
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
    const imageResponse = await axios.get(imageUrl, {
      responseType: "arraybuffer",
    });
    const imageBinary = imageResponse.data;

    const uploadRegisterResponse = await axios.post(
      `https://api.linkedin.com/v2/assets?action=registerUpload&oauth2_access_token=${accessToken}`,
      {
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
      }
    );

    const { value } = uploadRegisterResponse.data;
    imageAsset = value.asset;

    const { uploadUrl } = value.uploadMechanism[
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
    ];

    await axios.post(uploadUrl, imageBinary, {
      headers: {
        Authorization: "Bearer " + accessToken,
      },
    });
  }

  const commentary = [title];
  if (imageAsset) {
    commentary.push(url);
  }
  if (tags && tags.length) {
    commentary.push(
      tags
        .map(s => "#" + s.replace(/[^\d\w]/g, "").toLowerCase())
        .filter(s => s.length > 0)
        .join(" ")
    );
  }

  await axios.post(
    `https://api.linkedin.com/v2/ugcPosts?oauth2_access_token=${accessToken}`,
    {
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
    },
    {
      headers: {
        "X-Restli-Protocol-Version": "2.0.0",
        "Content-Type": "application/json",
      },
    }
  );

  return { url: null };
}

export function postToTwitter(title, url, imageUrl, tags) {
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

    let status = `${title} ${url}`;
    if (tags && tags.length) {
      status += ` ${tags
        .map(s => "#" + s.replace(/[^\d\w]/g, "").toLowerCase())
        .filter(s => s.length > 0)
        .join(" ")}`;
    }

    twitterClient.post(
      "statuses/update",
      {
        status,
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

  async function uploadImage(imgUrl) {
    const imageResponse = await axios.get(imgUrl, {
      responseType: "arraybuffer",
    });
    const imageBinary = imageResponse.data;

    return new Promise((resolve, reject) => {
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

  const submitResponse = await axios.post(
    "https://oauth.reddit.com/api/submit",
    new URLSearchParams({
      api_type: "json",
      title: title,
      url: url,
      sr: subreddit,
      kind: "link",
    }).toString(),
    {
      headers: {
        Authorization: `Bearer ${authData.token}`,
        "User-Agent": "elastiquill",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  const parsed = submitResponse.data;
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

  const response = await axios.post(
    "https://www.reddit.com/api/v1/access_token",
    new URLSearchParams(form).toString(),
    {
      auth: {
        username: config.credentials.reddit["client-id"],
        password: config.credentials.reddit["client-secret"],
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  const parsed = response.data;
  return {
    expiresAt: new Date().getTime() + parsed.expires_in * 1000,
    token: parsed.access_token,
    refreshToken: parsed.refresh_token ? parsed.refresh_token : refreshToken,
  };
}
