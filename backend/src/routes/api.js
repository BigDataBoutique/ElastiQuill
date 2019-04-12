import express from 'express';
import passport from 'passport';

import content from './content';
import social from './social';
import stats from './stats';
import connect from './connect';
import dump from './dump';
import auth from './auth';

const router = express.Router();


router.use('/auth', auth);
router.use((req, res, next) => {
  const auth = passport.authenticate('jwt', { session: false });
  auth(req, res, next);
});

router.use('/connect', connect);
router.use('/content', content);
router.use('/social', social);
router.use('/stats', stats);
router.use('/dump', dump);

export default router;
