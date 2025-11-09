"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const event_controller_1 = require("../controllers/event.controller");
const middleware_1 = require("../middlewares/middleware");
const router = (0, express_1.Router)();
// Public endpoints
router.get("/public", event_controller_1.getAllPublicEvents);
router.get("/public/:eventId", event_controller_1.getPublicEventDetails);
// Authenticated routes
router.get("/", middleware_1.authenticate, event_controller_1.getUserEvents);
router.get("/tickets", middleware_1.authenticate, event_controller_1.getUserTickets);
router.post("/add-ticket", middleware_1.authenticate, event_controller_1.addTicket);
router.post("/book", middleware_1.authenticate, event_controller_1.bookTicket);
router.get("/:eventId", middleware_1.authenticate, event_controller_1.getEventDetails);
exports.default = router;
