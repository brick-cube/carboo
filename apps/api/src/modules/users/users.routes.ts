
import { Router } from "express";
import { UserRole } from "../../generated/prisma/client.js";

import { authenticate } from "../../common/middleware/authenticate.js";
import { authorize } from "../../common/middleware/authorize.js";

import {
  changeMyPasswordController,
  getMyProfileController,
  getUserController,
  listUsersController,
  updateMyProfileController,
  updateUserStatusController,
} from "./users.controller.js";

const router = Router();

// Every route in this module requires authentication.
router.use(authenticate);

// Current user's profile
router.get("/me", getMyProfileController);
router.patch("/me", updateMyProfileController);
router.patch("/me/password", changeMyPasswordController);

// Admin-only user management
router.get("/", authorize(UserRole.ADMIN), listUsersController);
router.get("/:id", authorize(UserRole.ADMIN), getUserController);
router.patch(
  "/:id/status",
  authorize(UserRole.ADMIN),
  updateUserStatusController
);

export default router;
