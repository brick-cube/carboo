
import { Router } from "express";
import { UserRole } from "../../generated/prisma/client.js";

import { authenticate } from "../../common/middleware/authenticate.js";
import { authorize } from "../../common/middleware/authorize.js";

import {
  createTripTemplateController,
  generateTripsController,
  getTripTemplateController,
  listTripTemplatesController,
  updateTripTemplateController,
  updateTripTemplateStatusController,
} from "./trip-templates.controller.js";

const router = Router();

router.use(authenticate, authorize(UserRole.ADMIN));

router.post("/", createTripTemplateController);
router.get("/", listTripTemplatesController);
router.get("/:id", getTripTemplateController);
router.patch("/:id", updateTripTemplateController);
router.patch("/:id/status", updateTripTemplateStatusController);
router.post("/:id/generate", generateTripsController);

export default router;
