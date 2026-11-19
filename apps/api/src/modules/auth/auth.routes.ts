
import { Router } from "express";

import {
  loginRateLimit,
  registerRateLimit,
} from "../../common/middleware/auth-rate-limit.js";

import { authenticate } from "../../common/middleware/authenticate.js";
import { csrfProtection } from "../../common/middleware/csrf.js";

import {
  adminLoginController,
  loginController,
  logoutAllController,
  logoutController,
  meController,
  refreshController,
  registerController,
} from "./auth.controller.js";

const router = Router();

router.post("/register", registerRateLimit, registerController);
router.post("/login", loginRateLimit, loginController);
router.post("/admin/login", loginRateLimit, adminLoginController);

router.post("/refresh", csrfProtection, refreshController);
router.post("/logout", csrfProtection, logoutController);
router.post("/logout-all", authenticate, logoutAllController);

router.get("/me", authenticate, meController);

export default router;
