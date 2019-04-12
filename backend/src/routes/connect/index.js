import express from 'express';
import linkedin from './linkedin';

const router = express.Router();

router.use('/linkedin', linkedin);

export default router;
