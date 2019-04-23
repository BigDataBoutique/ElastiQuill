import _ from 'lodash';
import fs from 'fs';
import express from 'express';
import asyncHandler from 'express-async-handler';

import { config } from '../app';

import * as emails from '../services/emails';
import * as social from '../services/social';
import * as storage from '../services/storage';
import * as akismet from '../services/akismet';
import * as recaptcha from '../services/recaptcha';
import * as elasticsearch from '../services/elasticsearch';

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const googleAuth = _.get(config, 'credentials.google.oauth-client-id') &&
                     _.get(config, 'credentials.google.oauth-client-secret');
  const githubAuth = _.get(config, 'credentials.github.oauth-client-id') &&
                     _.get(config, 'credentials.github.oauth-client-secret');

  res.json({
    elasticsearch: await elasticsearch.getStatus(),
    upload: await storage.getStatus(),
    admin: {
      rules: config.blog['admin-emails'].getRules(),
      google: googleAuth,
      github: githubAuth
    },
    emails: emails.getStatus(),
    spam: {
      recaptcha: recaptcha.isAvailable(),
      akismet: akismet.isAvailable()
    },
    social: social.getAvailability(),
    theme: {
      path: config.blog['theme-path'] ? config.blog['theme-path'] : null,
      error: fs.existsSync(config.blog['theme-path']) ? null : 'Failed to load'
    }
  });
}));

export default router;