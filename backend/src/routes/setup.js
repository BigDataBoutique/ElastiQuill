import express from "express";
import asyncHandler from "express-async-handler";

import * as elasticsearch from "../services/elasticsearch";

const router = express.Router();

router.post(
  "/",
  asyncHandler(async (req, res) => {
    await elasticsearch.setup();
    res.json({
      ok: 1,
    });
  })
);

router.get(
  "/status",
  asyncHandler(async (req, res) => {
    const isReady = await elasticsearch.isReady();
    res.json({
      status: isReady ? "ready" : "incomplete",
    });
  })
);

export default router;
