"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const middleware_1 = require("../middlewares/middleware");
const router = (0, express_1.Router)();
// Event routes
router.post("/events", middleware_1.requireAdmin, admin_controller_1.createEvent);
router.get("/events", middleware_1.requireAdmin, admin_controller_1.getAllEvents);
router.put("/events/:eventId", middleware_1.requireAdmin, admin_controller_1.updateEvent);
router.delete("/events/:eventId", middleware_1.requireAdmin, admin_controller_1.deleteEvent);
// Ticket routes
router.post("/events/:eventId/tickets", middleware_1.requireAdmin, admin_controller_1.addTicketsToEvent);
router.post("/events/:eventId/tickets/auto-generate", middleware_1.requireAdmin, admin_controller_1.autoGenerateTickets);
// Coupon routes
router.post("/events/:eventId/coupons", middleware_1.requireAdmin, admin_controller_1.createCoupon);
router.get("/events/:eventId/coupons", middleware_1.requireAdmin, admin_controller_1.getEventCoupons);
router.put("/coupons/:couponId", middleware_1.requireAdmin, admin_controller_1.updateCoupon);
router.delete("/coupons/:couponId", middleware_1.requireAdmin, admin_controller_1.deleteCoupon);
// Coupon template routes
router.post("/coupon-templates", middleware_1.requireAdmin, admin_controller_1.createCouponTemplate);
router.get("/coupon-templates", middleware_1.requireAdmin, admin_controller_1.getAllCouponTemplates);
router.put("/coupon-templates/:templateId", middleware_1.requireAdmin, admin_controller_1.updateCouponTemplate);
router.delete("/coupon-templates/:templateId", middleware_1.requireAdmin, admin_controller_1.deleteCouponTemplate);
exports.default = router;
