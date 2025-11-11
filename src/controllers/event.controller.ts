import { Request, Response } from "express";
import prisma from "../lib/prisma";

// Silence TS about fetch in Node runtimes that provide it
declare const fetch: any;

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

// Get all public events (no authentication required)
export const getAllPublicEvents = async (req: Request, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      include: {
        coupons: true,
        tickets: {
          select: {
            id: true,
            ticket_number: true,
            user_ticket: {
              select: {
                id: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    // Transform events to include additional info
    const transformedEvents = events.map((event) => {
      const totalTickets = event.tickets.length;
      const availableTickets = event.tickets.filter(
        (t) => !t.user_ticket
      ).length;
      const bookedTickets = totalTickets - availableTickets;

      return {
        id: event.id,
        name: event.name,
        description: event.description,
        created_at: event.created_at,
        updated_at: event.updated_at,
        coupons: event.coupons,
        total_tickets: totalTickets,
        available_tickets: availableTickets,
        booked_tickets: bookedTickets,
        status: availableTickets > 0 ? "Booking Open" : "Sold Out",
      };
    });

    res.json({
      success: true,
      events: transformedEvents,
    });
  } catch (error) {
    console.error("Error fetching public events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
};

// Get all tickets for the authenticated user
export const getUserTickets = async (req: Request, res: Response) => {
  try {
    const userId = req.user.user_id;

    if (!userId) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get all user tickets with their events
    const userTickets = await prisma.userTicket.findMany({
      where: { user_id: userId },
      include: {
        ticket: {
          include: {
            event: {
              include: {
                coupons: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    const tickets = userTickets.map((userTicket: any) => ({
      id: userTicket.id,
      ticket_id: userTicket.ticket.id,
      ticket_number: userTicket.ticket.ticket_number,
      event: {
        id: userTicket.ticket.event.id,
        name: userTicket.ticket.event.name,
        description: userTicket.ticket.event.description,
        created_at: userTicket.ticket.event.created_at,
      },
      created_at: userTicket.created_at,
    }));

    res.json({
      success: true,
      tickets: tickets,
    });
  } catch (error) {
    console.error("Error fetching user tickets:", error);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
};

// Get all events for the authenticated user
export const getUserEvents = async (req: Request, res: Response) => {
  try {
    const userId = req.user.user_id;

    if (!userId) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get all user tickets with their events
    const userTickets = await prisma.userTicket.findMany({
      where: { user_id: userId },
      include: {
        ticket: {
          include: {
            event: true,
          },
        },
      },
    });

    // Get all user coupons grouped by event
    const userCoupons = await prisma.userCoupon.findMany({
      where: { user_id: userId },
      include: {
        coupon_template: {
          include: {
            event: true,
          },
        },
      },
    });

    // Group events by event_id to avoid duplicates
    const eventsMap = new Map();
    userTickets.forEach((userTicket: any) => {
      const event = userTicket.ticket.event;
      if (!eventsMap.has(event.id)) {
        eventsMap.set(event.id, {
          id: event.id,
          name: event.name,
          description: event.description,
          created_at: event.created_at,
          ticket_count: 0,
          coupons: [],
        });
      }
      eventsMap.get(event.id).ticket_count += 1;
    });

    // Add user coupons to events
    userCoupons.forEach((uc: any) => {
      const eventId = uc.coupon_template.event.id;
      if (eventsMap.has(eventId)) {
        const coupon = {
          id: uc.id,
          code: uc.code,
          is_redeemed: uc.is_redeemed,
          redeemed_at: uc.redeemed_at,
          created_at: uc.created_at,
          title: uc.coupon_template.title,
          description: uc.coupon_template.description,
          discount: uc.coupon_template.discount,
          image_url: uc.coupon_template.image_url,
          valid_from: uc.coupon_template.valid_from,
          valid_until: uc.coupon_template.valid_until,
          terms: uc.coupon_template.terms,
        };
        eventsMap.get(eventId).coupons.push(coupon);
      }
    });

    const events = Array.from(eventsMap.values());

    res.json({
      success: true,
      events: events,
    });
  } catch (error) {
    console.error("Error fetching user events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
};

// Add a ticket to user's account
export const addTicket = async (req: Request, res: Response) => {
  try {
    const { ticket_number } = req.body;
    const userId = req.user.user_id;

    if (!ticket_number) {
      return res.status(400).json({ error: "Ticket number is required" });
    }

    if (!userId) {
      return res.status(404).json({ error: "User not found" });
    }

    // Find ticket by ticket number
    const ticket = await prisma.ticket.findUnique({
      where: { ticket_number },
      include: {
        event: true,
        user_ticket: true,
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    // Check if ticket is already linked to another user
    if (ticket.user_ticket) {
      if (ticket.user_ticket.user_id === userId) {
        return res.json({
          success: true,
          message: "Ticket already linked to your account",
          event: ticket.event,
        });
      } else {
        return res
          .status(400)
          .json({ error: "Ticket is already linked to another account" });
      }
    }

    // Link ticket to user
    const userTicket = await prisma.userTicket.create({
      data: {
        user_id: userId,
        ticket_id: ticket.id,
      },
    });

    // Get all coupon templates for this event
    const couponTemplates = await prisma.coupon.findMany({
      where: { event_id: ticket.event_id },
    });

    // Generate UserCoupon for each coupon template
    const userCoupons = [];
    for (const template of couponTemplates) {
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
            user_id: userId,
            ticket_id: ticket.id,
            coupon_template_id: template.id,
            code: code,
          },
        });
        userCoupons.push(userCoupon);
      } catch (error: any) {
        console.error("Error creating user coupon:", error);
        // Continue with other coupons even if one fails
      }
    }

    // Get event
    const event = await prisma.event.findUnique({
      where: { id: ticket.event_id },
    });

    res.json({
      success: true,
      message: "Ticket added successfully",
      event: event,
      coupons_generated: userCoupons.length,
    });
  } catch (error) {
    console.error("Error adding ticket:", error);
    res.status(500).json({ error: "Failed to add ticket" });
  }
};

// Book a ticket (automatically assign an available ticket)
export const bookTicket = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.body;
    const userId = req.user.user_id;

    if (!eventId) {
      return res.status(400).json({ error: "Event ID is required" });
    }

    if (!userId) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user already has a ticket for this event (ONE TICKET PER USER PER EVENT)
    const existingUserTicket = await prisma.userTicket.findFirst({
      where: {
        user_id: userId,
        ticket: {
          event_id: eventId,
        },
      },
    });

    if (existingUserTicket) {
      return res.status(400).json({
        error:
          "You have already booked a ticket for this event. One ticket per user per event.",
      });
    }

    // Find an available ticket for this event
    const availableTicket = await prisma.ticket.findFirst({
      where: {
        event_id: eventId,
        user_ticket: null,
      },
      include: {
        event: true,
      },
    });

    if (!availableTicket) {
      return res
        .status(400)
        .json({ error: "No tickets available for this event" });
    }

    // Link ticket to user
    const userTicket = await prisma.userTicket.create({
      data: {
        user_id: userId,
        ticket_id: availableTicket.id,
      },
    });

    // Get all coupon templates for this event
    const couponTemplates = await prisma.coupon.findMany({
      where: { event_id: eventId },
    });

    // Generate UserCoupon for each coupon template
    const userCoupons = [];
    for (const template of couponTemplates) {
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
            user_id: userId,
            ticket_id: availableTicket.id,
            coupon_template_id: template.id,
            code: code,
          },
        });
        userCoupons.push(userCoupon);
      } catch (error: any) {
        console.error("Error creating user coupon:", error);
        // Continue with other coupons even if one fails
      }
    }

    // Get event with user coupons (not templates)
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        coupons: true,
      },
    });

    res.json({
      success: true,
      message: "Ticket booked successfully",
      ticket: {
        id: availableTicket.id,
        ticket_number: availableTicket.ticket_number,
      },
      event: event,
      coupons_generated: userCoupons.length,
    });
  } catch (error) {
    console.error("Error booking ticket:", error);
    res.status(500).json({ error: "Failed to book ticket" });
  }
};

// Get public event details (no ticket required)
export const getPublicEventDetails = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    // Get event with ticket info
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        coupons: true,
        tickets: {
          select: {
            id: true,
            ticket_number: true,
            user_ticket: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Calculate ticket availability
    const totalTickets = event.tickets.length;
    const availableTickets = event.tickets.filter((t) => !t.user_ticket).length;
    const bookedTickets = totalTickets - availableTickets;

    res.json({
      success: true,
      event: {
        id: event.id,
        name: event.name,
        description: event.description,
        created_at: event.created_at,
        updated_at: event.updated_at,
        coupons: event.coupons,
        total_tickets: totalTickets,
        available_tickets: availableTickets,
        booked_tickets: bookedTickets,
        status: availableTickets > 0 ? "Booking Open" : "Sold Out",
      },
    });
  } catch (error) {
    console.error("Error fetching public event details:", error);
    res.status(500).json({ error: "Failed to fetch event details" });
  }
};

// Get event details with user coupons (requires ticket)
export const getEventDetails = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.user_id;

    if (!userId) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user has access to this event
    const userTicket = await prisma.userTicket.findFirst({
      where: {
        user_id: userId,
        ticket: {
          event_id: eventId,
        },
      },
    });

    if (!userTicket) {
      return res
        .status(403)
        .json({ error: "You do not have access to this event" });
    }

    // Get event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Get user's coupons for this event (with template details)
    const userCoupons = await prisma.userCoupon.findMany({
      where: {
        user_id: userId,
        coupon_template: {
          event_id: eventId,
        },
      },
      include: {
        coupon_template: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    // Transform to include template data
    const coupons = userCoupons.map((uc) => ({
      id: uc.id,
      code: uc.code,
      is_redeemed: uc.is_redeemed,
      redeemed_at: uc.redeemed_at,
      created_at: uc.created_at,
      // Include template data
      title: uc.coupon_template.title,
      description: uc.coupon_template.description,
      discount: uc.coupon_template.discount,
      image_url: uc.coupon_template.image_url,
      valid_from: uc.coupon_template.valid_from,
      valid_until: uc.coupon_template.valid_until,
      terms: uc.coupon_template.terms,
    }));

    res.json({
      success: true,
      event: {
        ...event,
        coupons: coupons,
      },
    });
  } catch (error) {
    console.error("Error fetching event details:", error);
    res.status(500).json({ error: "Failed to fetch event details" });
  }
};

// Get all user coupons
export const getUserCoupons = async (req: Request, res: Response) => {
  try {
    const userId = req.user.user_id;

    if (!userId) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get all user coupons with template details
    const userCoupons = await prisma.userCoupon.findMany({
      where: { user_id: userId },
      include: {
        coupon_template: {
          include: {
            event: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    // Transform to include template data
    const coupons = userCoupons.map((uc) => ({
      id: uc.id,
      code: uc.code,
      is_redeemed: uc.is_redeemed,
      redeemed_at: uc.redeemed_at,
      created_at: uc.created_at,
      // Include template data
      title: uc.coupon_template.title,
      description: uc.coupon_template.description,
      discount: uc.coupon_template.discount,
      image_url: uc.coupon_template.image_url,
      valid_from: uc.coupon_template.valid_from,
      valid_until: uc.coupon_template.valid_until,
      terms: uc.coupon_template.terms,
      // Include event info
      event: {
        id: uc.coupon_template.event.id,
        name: uc.coupon_template.event.name,
      },
    }));

    res.json({
      success: true,
      coupons: coupons,
    });
  } catch (error) {
    console.error("Error fetching user coupons:", error);
    res.status(500).json({ error: "Failed to fetch user coupons" });
  }
};

// Redeem a coupon
export const redeemCoupon = async (req: Request, res: Response) => {
  try {
    const { couponId } = req.params;
    const userId = req.user.user_id;

    if (!userId) {
      return res.status(404).json({ error: "User not found" });
    }

    // Find the user coupon
    const userCoupon = await prisma.userCoupon.findUnique({
      where: { id: couponId },
      include: {
        coupon_template: true,
      },
    });

    if (!userCoupon) {
      return res.status(404).json({ error: "Coupon not found" });
    }

    // Check if coupon belongs to user
    if (userCoupon.user_id !== userId) {
      return res
        .status(403)
        .json({ error: "You do not have access to this coupon" });
    }

    // Check if already redeemed
    if (userCoupon.is_redeemed) {
      return res
        .status(400)
        .json({ error: "This coupon has already been redeemed" });
    }

    // Redeem the coupon
    const redeemedCoupon = await prisma.userCoupon.update({
      where: { id: couponId },
      data: {
        is_redeemed: true,
        redeemed_at: new Date(),
      },
      include: {
        coupon_template: true,
      },
    });

    res.json({
      success: true,
      message: "Coupon redeemed successfully",
      coupon: {
        id: redeemedCoupon.id,
        code: redeemedCoupon.code,
        is_redeemed: redeemedCoupon.is_redeemed,
        redeemed_at: redeemedCoupon.redeemed_at,
        title: redeemedCoupon.coupon_template.title,
        description: redeemedCoupon.coupon_template.description,
        discount: redeemedCoupon.coupon_template.discount,
      },
    });
  } catch (error) {
    console.error("Error redeeming coupon:", error);
    res.status(500).json({ error: "Failed to redeem coupon" });
  }
};

// Generate wallet pass data for a coupon
export const getWalletPass = async (req: Request, res: Response) => {
  try {
    const { couponId } = req.params;
    const userId = req.user.user_id;

    if (!userId) {
      return res.status(404).json({ error: "User not found" });
    }

    // Find the user coupon
    const userCoupon = await prisma.userCoupon.findUnique({
      where: { id: couponId },
      include: {
        coupon_template: {
          include: {
            event: true,
          },
        },
        user: true,
      },
    });

    if (!userCoupon) {
      return res.status(404).json({ error: "Coupon not found" });
    }

    // Check if coupon belongs to user
    if (userCoupon.user_id !== userId) {
      return res
        .status(403)
        .json({ error: "You do not have access to this coupon" });
    }

    const template = userCoupon.coupon_template;
    const event = template.event;

    // Generate wallet pass data
    // Using PassKit or similar service format
    // For production, integrate with PassKit.com or Google Wallet API

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    // Build coupon data for wallet passes
    const couponData = {
      id: userCoupon.id,
      code: userCoupon.code,
      title: template.title,
      description: template.description || "",
      discount: template.discount,
      imageUrl: template.image_url,
      eventName: event.name,
      validFrom: template.valid_from,
      validUntil: template.valid_until,
      terms: template.terms || "",
      isRedeemed: userCoupon.is_redeemed,
    };

    const walletPassData = {
      apple: {
        // Apple Wallet - Using PassKit service format
        // For production: Use PassKit.com API or generate .pkpass file
        // Deep link format for Apple Wallet
        url: `https://wallet.apple.com/passes?data=${encodeURIComponent(
          JSON.stringify({
            passTypeIdentifier:
              process.env.APPLE_PASS_TYPE_ID || "pass.com.onenight.coupon",
            serialNumber: userCoupon.id,
            description: template.title,
            organizationName: "One Night",
            teamIdentifier: process.env.APPLE_TEAM_ID || "TEAM_ID",
            logoText: "One Night",
            foregroundColor: "rgb(255, 255, 255)",
            backgroundColor: "rgb(30, 32, 34)",
            coupon: {
              primaryFields: [
                {
                  key: "title",
                  label: "Coupon",
                  value: template.title,
                },
              ],
              secondaryFields: template.discount
                ? [
                    {
                      key: "discount",
                      label: "Discount",
                      value: `${template.discount}%`,
                    },
                  ]
                : [],
              auxiliaryFields: [
                {
                  key: "code",
                  label: "Code",
                  value: userCoupon.code,
                },
              ],
              backFields: [
                {
                  key: "description",
                  label: "Description",
                  value: template.description || "",
                },
                {
                  key: "terms",
                  label: "Terms & Conditions",
                  value: template.terms || "",
                },
                {
                  key: "event",
                  label: "Event",
                  value: event.name,
                },
              ],
            },
          })
        )}`,
        // PassKit.com integration (if using their service)
        passkitUrl: process.env.PASSKIT_API_URL
          ? `${process.env.PASSKIT_API_URL}/coupons/${userCoupon.id}`
          : null,
        // Direct download link for .pkpass file (requires proper signing)
        downloadUrl: `${baseUrl}/api/events/coupons/${couponId}/wallet/apple/pass`,
      },
      google: {
        // Google Wallet API format
        // For production: Use Google Wallet API with proper JWT signing
        classId: `coupon_${template.id}`,
        objectId: `coupon_${userCoupon.id}`,
        // Google Wallet Save to Wallet URL
        // Format: https://pay.google.com/gp/v/save/{JWT}
        // Note: JWT needs to be properly signed with Google service account
        url: `https://pay.google.com/gp/v/save/${encodeURIComponent(
          JSON.stringify({
            iss: process.env.GOOGLE_WALLET_ISSUER_ID || "onenight",
            aud: "google",
            typ: "savetowallet",
            iat: Math.floor(Date.now() / 1000),
            payload: {
              couponObjects: [
                {
                  id: `${userCoupon.id}`,
                  classId: `coupon_${template.id}`,
                  state: userCoupon.is_redeemed ? "COMPLETED" : "ACTIVE",
                  barcode: {
                    type: "TEXT",
                    value: userCoupon.code,
                  },
                  heroImage: template.image_url
                    ? {
                        sourceUri: {
                          uri: template.image_url,
                        },
                      }
                    : undefined,
                  textModulesData: [
                    {
                      header: "Discount",
                      body: template.discount
                        ? `${template.discount}%`
                        : "Special Offer",
                    },
                    {
                      header: "Event",
                      body: event.name,
                    },
                  ],
                  validTimeInterval: {
                    start: {
                      date: template.valid_from || new Date().toISOString(),
                    },
                    end: {
                      date:
                        template.valid_until ||
                        new Date(
                          Date.now() + 365 * 24 * 60 * 60 * 1000
                        ).toISOString(),
                    },
                  },
                },
              ],
            },
          })
        )}`,
        // Google Wallet API endpoint (requires proper setup)
        apiUrl: `${baseUrl}/api/events/coupons/${couponId}/wallet/google/pass`,
        // PassKit.com integration for Google Wallet (if using their service)
        passkitUrl: process.env.PASSKIT_API_URL
          ? `${process.env.PASSKIT_API_URL}/coupons/${userCoupon.id}/google`
          : null,
      },
      // Raw data for custom implementations
      data: couponData,
    };

    // Try using addtowallet.co Create Pass API if API key is provided
    try {
      const addToWalletApiKey =
        process.env.ADD_TO_WALLET_API_KEY ||
        "010d3e53-35a0-3125-96dc-2995723a9caf";
      const addToWalletBase =
        process.env.ADD_TO_WALLET_BASE_URL || "https://app.addtowallet.co";

      if (addToWalletApiKey && typeof fetch === "function") {
        // Helper function to validate image URL
        const isValidImageUrl = (url: string | null): boolean => {
          if (!url) return false;
          // Check if it's a direct image URL (not a Google search URL)
          return (
            url.startsWith("http") &&
            !url.includes("google.com/url") &&
            (url.endsWith(".jpg") ||
              url.endsWith(".png") ||
              url.endsWith(".jpeg") ||
              url.endsWith(".webp") ||
              url.includes("placeholder") ||
              url.includes("imgur") ||
              url.includes("cloudinary"))
          );
        };

        // Use valid image URLs that meet minimum dimensions (200x100)
        const logoUrl = "https://s3.amazonaws.com/i.addtowallet.co/assets/coffeelogo-nobg.png"

        const heroImage = "https://s3.amazonaws.com/i.addtowallet.co/addtowallet-6dce018e-788f-4b16-9a65-b8edffd99cc8";

        // Validate that we have proper image URLs (not Google search URLs)
        if (
          logoUrl.includes("google.com/url") ||
          heroImage.includes("google.com/url")
        ) {
          console.warn(
            "Invalid image URLs detected, skipping addtowallet.co integration"
          );
          throw new Error("Invalid image URLs");
        }

        const payload = {
          logoUrl,
          cardTitle: "One Night",
          header: `${couponData.title} • Code: ${couponData.code}`,
          textModulesData: [
            {
              id: "discount",
              header: "Discount",
              body: couponData.discount
                ? `${couponData.discount}%`
                : "Special Offer",
            },
            {
              id: "event",
              header: "Event",
              body: couponData.eventName,
            },
          ],
          linksModuleData: [
            {
              id: "visit",
              description: "Visit our website",
              uri: "https://app.addtowallet.co",
            },
          ],
          barcodeType: "QR_CODE",
          barcodeValue: couponData.code,
          barcodeAltText: "Show this code at redemption",
          hexBackgroundColor: "#1E2022",
          appleFontColor: "#FFFFFF",
          heroImage,
          googleHeroImage: heroImage,
          appleHeroImage: heroImage,
          ...(couponData.validFrom && { startDate: couponData.validFrom }),
          ...(couponData.validUntil && { endDate: couponData.validUntil }),
        };

        const response = await fetch(`${addToWalletBase}/api/card/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: addToWalletApiKey,
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.cardId) {
            const shareUrl = `${addToWalletBase}/card/${data.cardId}`;
            // Use one shareable URL for both platforms
            walletPassData.apple.url = shareUrl;
            walletPassData.google.url = shareUrl;
          } else {
            console.warn("addtowallet.co response missing cardId");
          }
        } else {
          const errText = await response.text().catch(() => "Unknown error");
          console.warn("addtowallet.co API error:", errText);
        }
      }
    } catch (thirdPartyErr) {
      console.warn(
        "addtowallet.co integration failed, using fallback URLs:",
        thirdPartyErr
      );
    }

    res.json({
      success: true,
      walletPass: walletPassData,
    });
  } catch (error) {
    console.error("Error generating wallet pass:", error);
    res.status(500).json({ error: "Failed to generate wallet pass" });
  }
};