import { Router } from "express";
import { verifyToken } from "../controllers/auth.controller";

const router = Router();

router.post("/verify-token", verifyToken);

export default router;
