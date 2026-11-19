
import { Router } from "express";

import { authenticate } from "../../common/middleware/authenticate.js";
import { authorize } from "../../common/middleware/authorize.js";
import { UserRole } from "../../generated/prisma/client.js";

import {
  applySeatConfigurationController,
  checkVehicleAvailabilityController,
  createVehicleController,
  getVehicleController,
  getVehicleSeatsController,
  listVehiclesController,
  updateVehicleController,
  updateVehicleSeatsController,
  updateVehicleStatusController,
} from "./vehicles.controller.js";

const router = Router();

router.use(authenticate, authorize(UserRole.ADMIN));

router.post("/", createVehicleController);
router.get("/", listVehiclesController);

router.get("/:id/availability", checkVehicleAvailabilityController);
router.get("/:id/seats", getVehicleSeatsController);

router.put("/:id/seat-configuration", applySeatConfigurationController);
router.put("/:id/seats", updateVehicleSeatsController);

router.patch("/:id/status", updateVehicleStatusController);

router.get("/:id", getVehicleController);
router.patch("/:id", updateVehicleController);

export default router;