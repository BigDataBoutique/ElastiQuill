import express from "express";
import reddit from "./reddit";
import linkedin from "./linkedin";
import medium from "./medium";

const router = express.Router();

router.use("/linkedin", linkedin);
router.use("/reddit", reddit);
router.use("/medium", medium);

export default router;
