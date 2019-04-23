import express from 'express';
import reddit from './reddit';
import linkedin from './linkedin';

const router = express.Router();

router.use('/linkedin', linkedin);
router.use('/reddit', reddit);

export default router;
