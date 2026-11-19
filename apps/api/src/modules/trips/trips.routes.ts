
import { Router } from "express";
import { UserRole } from "../../generated/prisma/client.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { authorize } from "../../common/middleware/authorize.js";

import {
  createTripController,
  getTripController,
  listTripsController,
  updateTripStatusController,
} from "./trips.controller.js";

const router = Router();

router.use(authenticate, authorize(UserRole.ADMIN));

router.post("/", createTripController);
router.get("/", listTripsController);
router.get("/:id", getTripController);
router.patch("/:id/status", updateTripStatusController);

export default router;