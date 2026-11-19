
import { Router } from "express";

import { UserRole } from "../../generated/prisma/client.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { authorize } from "../../common/middleware/authorize.js";

import {
    archiveRouteController,
    createRouteController,
    getRouteController,
    listRoutesController,
    updateRouteController,
    updateRouteStatusController,
} from "./routes.controller.js";

const router = Router();

router.use(authenticate, authorize(UserRole.ADMIN));

router.post("/", createRouteController);
router.get("/", listRoutesController);
router.get("/:id", getRouteController);
router.patch("/:id", updateRouteController);
router.patch("/:id/status", updateRouteStatusController);
router.delete("/:id", archiveRouteController);

export default router;
