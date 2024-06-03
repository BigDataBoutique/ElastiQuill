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
    const page = req.query.page;
    if (!level || !page || typeof level !== "string" || isNaN(Number(page))) {
      return res.sendStatus(422);
    }
    const { logs, totalPages } = await loggingService.getLogsByLevel(
      level,
      page
    );
    res.json({ logs, totalPages });
  })
);

export default router;
