import { Router } from "express";
import {
  createEvent,
  getAllEvents,
  addTicketsToEvent,
  autoGenerateTickets,
  createCoupon,
  getEventCoupons,
  updateEvent,
  deleteEvent,
  updateCoupon,
  deleteCoupon,
  createCouponTemplate,
  getAllCouponTemplates,
  updateCouponTemplate,
  deleteCouponTemplate,
} from "../controllers/admin.controller";
import { requireAdmin } from "../middlewares/middleware";

const router = Router();

// Event routes
router.post("/events", requireAdmin, createEvent);
router.get("/events", requireAdmin, getAllEvents);
router.put("/events/:eventId", requireAdmin, updateEvent);
router.delete("/events/:eventId", requireAdmin, deleteEvent);

// Ticket routes
router.post("/events/:eventId/tickets", requireAdmin, addTicketsToEvent);
router.post("/events/:eventId/tickets/auto-generate", requireAdmin, autoGenerateTickets);

// Coupon routes
router.post("/events/:eventId/coupons", requireAdmin, createCoupon);
router.get("/events/:eventId/coupons", requireAdmin, getEventCoupons);
router.put("/coupons/:couponId", requireAdmin, updateCoupon);
router.delete("/coupons/:couponId", requireAdmin, deleteCoupon);

// Coupon template routes
router.post("/coupon-templates", requireAdmin, createCouponTemplate);
router.get("/coupon-templates", requireAdmin, getAllCouponTemplates);
router.put("/coupon-templates/:templateId", requireAdmin, updateCouponTemplate);
router.delete("/coupon-templates/:templateId", requireAdmin, deleteCouponTemplate);

export default router;
