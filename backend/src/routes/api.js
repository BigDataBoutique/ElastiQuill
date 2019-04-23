import express from 'express';
import passport from 'passport';

import content from './content';
import social from './social';
import stats from './stats';
import connect from './connect';
import uploads from './uploads';
import status from './status';
import setup from './setup';
import dump from './dump';
import auth from './auth';

import * as elasticsearch from '../services/elasticsearch';

const router = express.Router();


router.use('/auth', auth);
router.use((req, res, next) => {
  const auth = passport.authenticate('jwt', { session: false });
  auth(req, res, next);
});

router.use('/setup', setup);
router.use('/status', status);

let elasticsearchIsReady = false;
router.use(async (req, res, next) => {
  if (! elasticsearchIsReady) {
    elasticsearchIsReady = await elasticsearch.isReady();
  }

  if (! elasticsearchIsReady) {
    next(new Error('Elasticsearch is not configured'));    
    return;
  }
  
  next();
});

router.use('/uploads', uploads);
router.use('/connect', connect);
router.use('/content', content);
router.use('/social', social);
router.use('/stats', stats);
router.use('/dump', dump);

router.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: err.message ? err.message : err.toString()
  });
});

export default router;
