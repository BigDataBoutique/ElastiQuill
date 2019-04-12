import Twitter from 'twitter';
import request from 'request-promise';

import { config } from '../app';

export function getAvailability(connected = {}) {
  const res = {
    twitter: !! config.credentials.twitter,
    linkedin: !! config.credentials.linkedin,
    reddit: !! config.credentials.reddit
  };

  for (const key in res ) {
    if (res[key]) {
      if (connected[key] || key === 'twitter' || key === 'reddit') {
        res[key] = 'ready';
      }
      else {
        res[key] = 'not_connected';
      }
    }
    else {
      res[key] = 'not_configured';
    }
  }

  return res;
}

export async function postToLinkedin(authorId, accessToken, title, url) {
  await request({
    method: 'POST',
    url: 'https://api.linkedin.com/v2/ugcPosts?oauth2_access_token=' + accessToken,
    body: JSON.stringify({
      author: 'urn:li:person:' + authorId,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          'shareCommentary': {
            'text': title
          },
          'shareMediaCategory': 'ARTICLE',
          'media': [
            {
              'status': 'READY',
              'originalUrl': url,
            }
          ]
        }
      },
      'visibility': {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
      }
    }),
    headers: {
      'X-Restli-Protocol-Version': '2.0.0',
      'Content-Type': 'application/json'
    }
  });
  return { url: null };
}

export function postToTwitter(text) {
  return new Promise((resolve, reject) => {
    const twitterClient = new Twitter({
      consumer_key: config.credentials.twitter['consumer-key'],
      consumer_secret: config.credentials.twitter['consumer-secret'],
      access_token_key: config.credentials.twitter['access-token-key'],
      access_token_secret: config.credentials.twitter['access-token-secret']
    });

    twitterClient.post('statuses/update', {
      status: text
    }, (errors, tweet) => {
      if (errors) {
        reject(errors[0].message);
        return;
      }

      resolve({
        url: `https://twitter.com/${tweet.user.id_str}/status/${tweet.id_str}`
      });
    });
  });
}

export async function postToReddit(title, url, subreddit) {
  const tokenResp = await request({
    method: 'POST',
    url: 'https://www.reddit.com/api/v1/access_token',
    auth: {
      user: config.credentials.reddit['client-id'],
      pass: config.credentials.reddit['client-secret']
    },
    form: {
      grant_type: 'password',
      username: config.credentials.reddit['username'],
      password: config.credentials.reddit['password']
    }
  });

  const token = JSON.parse(tokenResp).access_token;

  const submitResp = await request({
    method: 'POST',
    url: 'https://oauth.reddit.com/api/submit',
    auth: {
      bearer: token
    },
    headers: {
      'User-Agent': 'elastiquill'
    },
    form: {
      api_type: 'json',
      title: title,
      url: url,
      sr: subreddit,
      kind: 'link'
    }
  });

  const parsed = JSON.parse(submitResp);
  if (! parsed.json.errors.length) {
    return {
      url: parsed.json.data.url
    };
  }

  throw new Error(parsed.json.errors[0][1]);
}
