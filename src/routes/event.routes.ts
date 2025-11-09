import { Router } from "express";
import {
  getAllPublicEvents,
  getUserEvents,
  getUserTickets,
  addTicket,
  bookTicket,
  getPublicEventDetails,
  getEventDetails,
} from "../controllers/event.controller";
import { authenticate } from "../middlewares/middleware";

const router = Router();

// Public endpoints
router.get("/public", getAllPublicEvents);
router.get("/public/:eventId", getPublicEventDetails);

// Authenticated routes
router.get("/", authenticate, getUserEvents);
router.get("/tickets", authenticate, getUserTickets);
router.post("/add-ticket", authenticate, addTicket);
router.post("/book", authenticate, bookTicket);
router.get("/:eventId", authenticate, getEventDetails);

export default router;

