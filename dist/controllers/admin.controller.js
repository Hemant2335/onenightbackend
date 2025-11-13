"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCouponTemplate = exports.updateCouponTemplate = exports.getAllCouponTemplates = exports.createCouponTemplate = exports.deleteCoupon = exports.updateCoupon = exports.deleteEvent = exports.updateEvent = exports.getEventCoupons = exports.createCoupon = exports.autoGenerateTickets = exports.addTicketsToEvent = exports.getAllEvents = exports.createEvent = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
// Helper function to generate unique coupon code
const generateCouponCode = () => {
    // Generate a random 8-character alphanumeric code
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};
// Create a new event
const createEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ error: "Event name is required" });
        }
        const event = yield prisma_1.default.event.create({
            data: {
                name,
                description: description || null,
            },
        });
        res.json({
            success: true,
            message: "Event created successfully",
            event: event,
        });
    }
    catch (error) {
        console.error("Error creating event:", error);
        res.status(500).json({ error: "Failed to create event" });
    }
});
exports.createEvent = createEvent;
// Get all events (admin view)
const getAllEvents = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const events = yield prisma_1.default.event.findMany({
            include: {
                tickets: {
                    include: {
                        user_ticket: {
                            include: {
                                user: true,
                            },
                        },
                    },
                },
                coupons: true,
            },
            orderBy: {
                created_at: "desc",
            },
        });
        res.json({
            success: true,
            events: events,
        });
    }
    catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).json({ error: "Failed to fetch events" });
    }
});
exports.getAllEvents = getAllEvents;
// Add tickets to an event
const addTicketsToEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { eventId } = req.params;
        const { ticket_numbers } = req.body;
        if (!ticket_numbers ||
            !Array.isArray(ticket_numbers) ||
            ticket_numbers.length === 0) {
            return res
                .status(400)
                .json({ error: "Ticket numbers array is required" });
        }
        // Check if event exists
        const event = yield prisma_1.default.event.findUnique({
            where: { id: eventId },
        });
        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }
        // Create tickets
        const tickets = yield Promise.all(ticket_numbers.map((ticket_number) => prisma_1.default.ticket
            .create({
            data: {
                ticket_number,
                event_id: eventId,
            },
        })
            .catch((error) => {
            // If ticket already exists, skip it
            if (error.code === "P2002") {
                return null;
            }
            throw error;
        })));
        const createdTickets = tickets.filter((ticket) => ticket !== null);
        res.json({
            success: true,
            message: `${createdTickets.length} tickets added successfully`,
            tickets: createdTickets,
        });
    }
    catch (error) {
        console.error("Error adding tickets:", error);
        res.status(500).json({ error: "Failed to add tickets" });
    }
});
exports.addTicketsToEvent = addTicketsToEvent;
// Auto-generate tickets for an event
const autoGenerateTickets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { eventId } = req.params;
        const { count, prefix = "TICKET" } = req.body;
        if (!count || count < 1 || count > 1000) {
            return res
                .status(400)
                .json({ error: "Count must be between 1 and 1000" });
        }
        // Check if event exists
        const event = yield prisma_1.default.event.findUnique({
            where: { id: eventId },
        });
        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }
        // Generate ticket numbers
        const tickets = [];
        const createdTickets = [];
        let attempt = 0;
        const maxAttempts = count * 2; // Safety limit
        while (createdTickets.length < count && attempt < maxAttempts) {
            attempt++;
            const ticketNumber = `${prefix}${String(createdTickets.length + 1).padStart(6, "0")}`;
            try {
                const ticket = yield prisma_1.default.ticket.create({
                    data: {
                        ticket_number: ticketNumber,
                        event_id: eventId,
                    },
                });
                createdTickets.push(ticket);
            }
            catch (error) {
                // If ticket already exists, try next number
                if (error.code === "P2002") {
                    continue;
                }
                throw error;
            }
        }
        res.json({
            success: true,
            message: `${createdTickets.length} tickets generated successfully`,
            tickets: createdTickets,
        });
    }
    catch (error) {
        console.error("Error auto-generating tickets:", error);
        res.status(500).json({ error: "Failed to auto-generate tickets" });
    }
});
exports.autoGenerateTickets = autoGenerateTickets;
// Create a coupon template for an event (admin defines coupon, but codes are generated when users book)
const createCoupon = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { eventId } = req.params;
        const { templateId, title, description, discount, image_url, valid_from, valid_until, terms, } = req.body;
        // Check if event exists
        const event = yield prisma_1.default.event.findUnique({
            where: { id: eventId },
        });
        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }
        let couponData = {
            event_id: eventId,
        };
        // If using a template, fetch template data
        if (templateId) {
            const template = yield prisma_1.default.couponTemplate.findUnique({
                where: { id: templateId },
            });
            if (!template) {
                return res.status(404).json({ error: "Coupon template not found" });
            }
            couponData = Object.assign(Object.assign({}, couponData), { coupon_template_id: templateId, title: template.title, description: template.description, discount: template.discount, image_url: template.image_url, valid_from: template.valid_from, valid_until: template.valid_until, terms: template.terms });
        }
        else {
            // Manual creation
            if (!title) {
                return res.status(400).json({ error: "Coupon title is required" });
            }
            couponData = Object.assign(Object.assign({}, couponData), { title, description: description || null, discount: discount ? parseFloat(discount) : null, image_url: image_url || null, valid_from: valid_from ? new Date(valid_from) : null, valid_until: valid_until ? new Date(valid_until) : null, terms: terms || null });
        }
        const coupon = yield prisma_1.default.coupon.create({
            data: couponData,
        });
        // Get all existing user tickets for this event
        const existingUserTickets = yield prisma_1.default.userTicket.findMany({
            where: {
                ticket: {
                    event_id: eventId,
                },
            },
            include: {
                ticket: true,
            },
        });
        // Generate UserCoupon for each existing user ticket
        const userCoupons = [];
        for (const userTicket of existingUserTickets) {
            let code = generateCouponCode();
            let attempts = 0;
            const maxAttempts = 10;
            // Ensure code is unique
            while (attempts < maxAttempts) {
                const existing = yield prisma_1.default.userCoupon.findUnique({
                    where: { code },
                });
                if (!existing) {
                    break;
                }
                code = generateCouponCode();
                attempts++;
            }
            if (attempts >= maxAttempts) {
                console.error("Failed to generate unique coupon code after max attempts");
                continue;
            }
            try {
                const userCoupon = yield prisma_1.default.userCoupon.create({
                    data: {
                        user_id: userTicket.user_id,
                        ticket_id: userTicket.ticket_id,
                        coupon_template_id: coupon.id,
                        code: code,
                    },
                });
                userCoupons.push(userCoupon);
            }
            catch (error) {
                console.error("Error creating user coupon:", error);
                // Continue with other coupons even if one fails
            }
        }
        res.json({
            success: true,
            message: "Coupon template created successfully",
            coupon: coupon,
            coupons_generated: userCoupons.length,
        });
    }
    catch (error) {
        console.error("Error creating coupon:", error);
        res.status(500).json({ error: "Failed to create coupon" });
    }
});
exports.createCoupon = createCoupon;
// Get all coupons for an event
const getEventCoupons = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { eventId } = req.params;
        const coupons = yield prisma_1.default.coupon.findMany({
            where: { event_id: eventId },
            orderBy: {
                created_at: "desc",
            },
        });
        res.json({
            success: true,
            coupons: coupons,
        });
    }
    catch (error) {
        console.error("Error fetching coupons:", error);
        res.status(500).json({ error: "Failed to fetch coupons" });
    }
});
exports.getEventCoupons = getEventCoupons;
// Update event
const updateEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { eventId } = req.params;
        const { name, description } = req.body;
        const event = yield prisma_1.default.event.update({
            where: { id: eventId },
            data: {
                name,
                description,
            },
        });
        res.json({
            success: true,
            message: "Event updated successfully",
            event: event,
        });
    }
    catch (error) {
        console.error("Error updating event:", error);
        res.status(500).json({ error: "Failed to update event" });
    }
});
exports.updateEvent = updateEvent;
// Delete event
const deleteEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { eventId } = req.params;
        yield prisma_1.default.event.delete({
            where: { id: eventId },
        });
        res.json({
            success: true,
            message: "Event deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting event:", error);
        res.status(500).json({ error: "Failed to delete event" });
    }
});
exports.deleteEvent = deleteEvent;
// Update coupon template
const updateCoupon = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { couponId } = req.params;
        const { title, description, discount, image_url, valid_from, valid_until, terms, } = req.body;
        const coupon = yield prisma_1.default.coupon.update({
            where: { id: couponId },
            data: {
                title,
                description,
                discount: discount ? parseFloat(discount) : null,
                image_url: image_url !== undefined ? image_url : undefined,
                valid_from: valid_from ? new Date(valid_from) : undefined,
                valid_until: valid_until ? new Date(valid_until) : undefined,
                terms: terms !== undefined ? terms : undefined,
            },
        });
        res.json({
            success: true,
            message: "Coupon template updated successfully",
            coupon: coupon,
        });
    }
    catch (error) {
        console.error("Error updating coupon:", error);
        res.status(500).json({ error: "Failed to update coupon" });
    }
});
exports.updateCoupon = updateCoupon;
// Delete coupon
const deleteCoupon = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { couponId } = req.params;
        yield prisma_1.default.coupon.delete({
            where: { id: couponId },
        });
        res.json({
            success: true,
            message: "Coupon deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting coupon:", error);
        res.status(500).json({ error: "Failed to delete coupon" });
    }
});
exports.deleteCoupon = deleteCoupon;
// Create a coupon template
const createCouponTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, description, discount, image_url, valid_from, valid_until, terms, } = req.body;
        if (!title) {
            return res.status(400).json({ error: "Coupon template title is required" });
        }
        const couponTemplate = yield prisma_1.default.couponTemplate.create({
            data: {
                title,
                description: description || null,
                discount: discount ? parseFloat(discount) : null,
                image_url: image_url || null,
                valid_from: valid_from ? new Date(valid_from) : null,
                valid_until: valid_until ? new Date(valid_until) : null,
                terms: terms || null,
            },
        });
        res.json({
            success: true,
            message: "Coupon template created successfully",
            couponTemplate: couponTemplate,
        });
    }
    catch (error) {
        console.error("Error creating coupon template:", error);
        res.status(500).json({ error: "Failed to create coupon template" });
    }
});
exports.createCouponTemplate = createCouponTemplate;
// Get all coupon templates
const getAllCouponTemplates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const couponTemplates = yield prisma_1.default.couponTemplate.findMany({
            include: {
                _count: {
                    select: { coupons: true }
                }
            },
            orderBy: {
                created_at: "desc",
            },
        });
        res.json({
            success: true,
            couponTemplates: couponTemplates,
        });
    }
    catch (error) {
        console.error("Error fetching coupon templates:", error);
        res.status(500).json({ error: "Failed to fetch coupon templates" });
    }
});
exports.getAllCouponTemplates = getAllCouponTemplates;
// Update coupon template
const updateCouponTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { templateId } = req.params;
        const { title, description, discount, image_url, valid_from, valid_until, terms, } = req.body;
        const couponTemplate = yield prisma_1.default.couponTemplate.update({
            where: { id: templateId },
            data: {
                title,
                description,
                discount: discount ? parseFloat(discount) : null,
                image_url: image_url !== undefined ? image_url : undefined,
                valid_from: valid_from ? new Date(valid_from) : undefined,
                valid_until: valid_until ? new Date(valid_until) : undefined,
                terms: terms !== undefined ? terms : undefined,
            },
        });
        res.json({
            success: true,
            message: "Coupon template updated successfully",
            couponTemplate: couponTemplate,
        });
    }
    catch (error) {
        console.error("Error updating coupon template:", error);
        res.status(500).json({ error: "Failed to update coupon template" });
    }
});
exports.updateCouponTemplate = updateCouponTemplate;
// Delete coupon template
const deleteCouponTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { templateId } = req.params;
        yield prisma_1.default.couponTemplate.delete({
            where: { id: templateId },
        });
        res.json({
            success: true,
            message: "Coupon template deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting coupon template:", error);
        res.status(500).json({ error: "Failed to delete coupon template" });
    }
});
exports.deleteCouponTemplate = deleteCouponTemplate;
