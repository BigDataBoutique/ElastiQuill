import _ from 'lodash';
import { Strategy as GitHubStrategy } from 'passport-github';

import { passportDefaultCallback } from "./index";
import { config } from '../../app';

export default function (passport, router, handleRequest) {
  router.get('/anonymous', (req, res, next) => {
    res.locals.authAttemptBackend = 'anonymous';
    passportDefaultCallback(null, req, res, {
      displayName: 'Admin',
      authorizedBy: '_all_',
      emails: [{
        value: 'admin@elastiquill'
      }]
    }, next);
  }, handleRequest);
};
