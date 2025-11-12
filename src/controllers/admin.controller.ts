import { Request, Response } from "express";
import prisma from "../lib/prisma";

// Helper function to generate unique coupon code
const generateCouponCode = (): string => {
  // Generate a random 8-character alphanumeric code
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Create a new event
export const createEvent = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Event name is required" });
    }

    const event = await prisma.event.create({
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
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: "Failed to create event" });
  }
};

// Get all events (admin view)
export const getAllEvents = async (req: Request, res: Response) => {
  try {
    const events = await prisma.event.findMany({
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
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
};

// Add tickets to an event
export const addTicketsToEvent = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { ticket_numbers } = req.body;

    if (
      !ticket_numbers ||
      !Array.isArray(ticket_numbers) ||
      ticket_numbers.length === 0
    ) {
      return res
        .status(400)
        .json({ error: "Ticket numbers array is required" });
    }

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Create tickets
    const tickets = await Promise.all(
      ticket_numbers.map((ticket_number: string) =>
        prisma.ticket
          .create({
            data: {
              ticket_number,
              event_id: eventId,
            },
          })
          .catch((error: any) => {
            // If ticket already exists, skip it
            if (error.code === "P2002") {
              return null;
            }
            throw error;
          })
      )
    );

    const createdTickets = tickets.filter((ticket) => ticket !== null);

    res.json({
      success: true,
      message: `${createdTickets.length} tickets added successfully`,
      tickets: createdTickets,
    });
  } catch (error) {
    console.error("Error adding tickets:", error);
    res.status(500).json({ error: "Failed to add tickets" });
  }
};

// Auto-generate tickets for an event
export const autoGenerateTickets = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { count, prefix = "TICKET" } = req.body;

    if (!count || count < 1 || count > 1000) {
      return res
        .status(400)
        .json({ error: "Count must be between 1 and 1000" });
    }

    // Check if event exists
    const event = await prisma.event.findUnique({
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
      const ticketNumber: string = `${prefix}${String(
        createdTickets.length + 1
      ).padStart(6, "0")}`;

      try {
        const ticket = await prisma.ticket.create({
          data: {
            ticket_number: ticketNumber,
            event_id: eventId,
          },
        });
        createdTickets.push(ticket);
      } catch (error: any) {
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
  } catch (error) {
    console.error("Error auto-generating tickets:", error);
    res.status(500).json({ error: "Failed to auto-generate tickets" });
  }
};

// Create a coupon template for an event (admin defines coupon, but codes are generated when users book)
export const createCoupon = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const {
      title,
      description,
      discount,
      image_url,
      valid_from,
      valid_until,
      terms,
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Coupon title is required" });
    }

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const coupon = await prisma.coupon.create({
      data: {
        event_id: eventId,
        title,
        description: description || null,
        discount: discount ? parseFloat(discount) : null,
        image_url: image_url || null,
        valid_from: valid_from ? new Date(valid_from) : null,
        valid_until: valid_until ? new Date(valid_until) : null,
        terms: terms || null,
      },
    });

    // Get all existing user tickets for this event
    const existingUserTickets = await prisma.userTicket.findMany({
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
        const existing = await prisma.userCoupon.findUnique({
          where: { code },
        });
        if (!existing) {
          break;
        }
        code = generateCouponCode();
        attempts++;
      }

      if (attempts >= maxAttempts) {
        console.error(
          "Failed to generate unique coupon code after max attempts"
        );
        continue;
      }

      try {
        const userCoupon = await prisma.userCoupon.create({
          data: {
            user_id: userTicket.user_id,
            ticket_id: userTicket.ticket_id,
            coupon_template_id: coupon.id,
            code: code,
          },
        });
        userCoupons.push(userCoupon);
      } catch (error: any) {
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
  } catch (error) {
    console.error("Error creating coupon:", error);
    res.status(500).json({ error: "Failed to create coupon" });
  }
};

// Get all coupons for an event
export const getEventCoupons = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const coupons = await prisma.coupon.findMany({
      where: { event_id: eventId },
      orderBy: {
        created_at: "desc",
      },
    });

    res.json({
      success: true,
      coupons: coupons,
    });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    res.status(500).json({ error: "Failed to fetch coupons" });
  }
};

// Update event
export const updateEvent = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { name, description } = req.body;

    const event = await prisma.event.update({
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
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ error: "Failed to update event" });
  }
};

// Delete event
export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    await prisma.event.delete({
      where: { id: eventId },
    });

    res.json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ error: "Failed to delete event" });
  }
};

// Update coupon template
export const updateCoupon = async (req: Request, res: Response) => {
  try {
    const { couponId } = req.params;
    const {
      title,
      description,
      discount,
      image_url,
      valid_from,
      valid_until,
      terms,
    } = req.body;

    const coupon = await prisma.coupon.update({
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
  } catch (error) {
    console.error("Error updating coupon:", error);
    res.status(500).json({ error: "Failed to update coupon" });
  }
};

// Delete coupon
export const deleteCoupon = async (req: Request, res: Response) => {
  try {
    const { couponId } = req.params;

    await prisma.coupon.delete({
      where: { id: couponId },
    });

    res.json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    res.status(500).json({ error: "Failed to delete coupon" });
  }
};
