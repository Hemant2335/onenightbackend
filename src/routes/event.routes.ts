import { Router } from "express";
import {
  getAllPublicEvents,
  getUserEvents,
  getUserTickets,
  addTicket,
  bookTicket,
  getPublicEventDetails,
  getEventDetails,
  getUserCoupons,
  redeemCoupon,
  getWalletPass,
} from "../controllers/event.controller";
import { authenticate } from "../middlewares/middleware";

const router = Router();

// Public endpoints
router.get("/public", getAllPublicEvents);
router.get("/public/:eventId", getPublicEventDetails);

// Authenticated routes
router.get("/", authenticate, getUserEvents);
router.get("/tickets", authenticate, getUserTickets);
router.get("/coupons", authenticate, getUserCoupons);
router.get("/coupons/:couponId/wallet", authenticate, getWalletPass);
router.post("/add-ticket", authenticate, addTicket);
router.post("/book", authenticate, bookTicket);
router.post("/coupons/:couponId/redeem", authenticate, redeemCoupon);
router.get("/:eventId", authenticate, getEventDetails);

export default router;
