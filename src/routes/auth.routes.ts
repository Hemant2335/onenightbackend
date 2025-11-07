import { Router } from "express";
import {
  checkUser,
  login,
  profile,
  register,
} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/middleware";

const router = Router();

router.post("/check-user", checkUser);
router.post("/register", authenticate ,register);
router.post("/login", authenticate ,  login);
router.post("/profile", authenticate , profile);

export default router;
