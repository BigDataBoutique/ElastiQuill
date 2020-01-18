import express from "express";
import passport from "passport";

import content from "./content";
import social from "./social";
import stats from "./stats";
import connect from "./connect";
import uploads from "./uploads";
import importRoute from "./import";
import status from "./status";
import setup from "./setup";
import dump from "./dump";
import auth, { updateAuthInfoToken, updateUserRole } from "./auth";

import * as loggingService from "../services/logging";
import * as elasticsearch from "../services/elasticsearch";

const router = express.Router();

router.use("/auth", auth);
router.use((req, res, next) => {
  const auth = passport.authenticate("jwt", { session: false });
  auth(req, res, next);
});

router.use((req, res, next) => {
  updateUserRole(req);
  updateAuthInfoToken(req, res);
  next();
});

router.use("/setup", setup);
router.use("/status", status);

router.use(async (req, res, next) => {
  await elasticsearch.isReady();

  next();
});

router.use("/import", importRoute);
router.use("/uploads", uploads);
router.use("/connect", connect);
router.use("/content", content);
router.use("/social", social);
router.use("/stats", stats);
router.use("/dump", dump);

router.use((err, req, res) => {
  res.status(err.status || 500).json({
    error: err.message ? err.message : err.toString(),
  });

  if (req.app.get("env") === "development") {
    console.error(err);
  } else {
    loggingService.logError("api", err, req, res);
  }
});

export default router;
