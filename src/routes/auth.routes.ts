import { Router } from "express";
import {
  checkUser,
  login,
  profile,
  register,
  checkAdmin,
} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/middleware";

const router = Router();

router.post("/check-user", checkUser);
router.post("/register", authenticate, register);
router.post("/login", authenticate, login);
router.post("/profile", authenticate, profile);
router.get("/check-admin", authenticate, checkAdmin);

export default router;
