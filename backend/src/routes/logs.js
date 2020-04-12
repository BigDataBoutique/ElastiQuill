import express from "express";
import asyncHandler from "express-async-handler";

import { restrictRolesMiddleware } from "../routes/auth";
import * as loggingService from "../services/logging";

const router = express.Router();

router.use(restrictRolesMiddleware("admin"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const level = req.query.level;
    const allLogs = await loggingService.getLogsByLevel(level);
    res.json(allLogs);
  })
);

export default router;
