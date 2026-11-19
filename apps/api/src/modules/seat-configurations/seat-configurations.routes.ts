
import { Router } from "express";

import { authenticate } from "../../common/middleware/authenticate.js";
import { authorize } from "../../common/middleware/authorize.js";
import { UserRole } from "../../generated/prisma/client.js";

import {
  createSeatConfigurationController,
  deactivateSeatConfigurationController,
  getSeatConfigurationController,
  listSeatConfigurationsController,
  updateSeatConfigurationController,
} from "./seat-configurations.controller.js";

const router = Router();

router.use(authenticate, authorize(UserRole.ADMIN));

router.post("/", createSeatConfigurationController);
router.get("/", listSeatConfigurationsController);
router.get("/:id", getSeatConfigurationController);
router.patch("/:id", updateSeatConfigurationController);
router.delete("/:id", deactivateSeatConfigurationController);

export default router;
