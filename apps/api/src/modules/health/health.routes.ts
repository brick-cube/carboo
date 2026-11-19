
import { Router } from "express";
import {
  livenessCheck,
  readinessCheck,
} from "./health.controller.js";

const router = Router();

router.get("/health/live", livenessCheck);
router.get("/health/ready", readinessCheck);

export default router;
