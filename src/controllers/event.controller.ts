import { Request, Response } from "express";
import prisma from "../lib/prisma";

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
        created_at: 'desc',
      },
    });

    // Transform events to include additional info
    const transformedEvents = events.map((event) => {
      const totalTickets = event.tickets.length;
      const availableTickets = event.tickets.filter((t) => !t.user_ticket).length;
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
        status: availableTickets > 0 ? 'Booking Open' : 'Sold Out',
      };
    });

    res.json({
      success: true,
      events: transformedEvents,
    });
  } catch (error) {
    console.error('Error fetching public events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

// Get all tickets for the authenticated user
export const getUserTickets = async (req: Request, res: Response) => {
  try {
    const userId = req.user.user_id;

    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
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
        created_at: 'desc',
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
    console.error('Error fetching user tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
};

// Get all events for the authenticated user
export const getUserEvents = async (req: Request, res: Response) => {
  try {
    const userId = req.user.user_id;

    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
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
          coupons: event.coupons,
        });
      }
      eventsMap.get(event.id).ticket_count += 1;
    });

    const events = Array.from(eventsMap.values());

    res.json({
      success: true,
      events: events,
    });
  } catch (error) {
    console.error('Error fetching user events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

// Add a ticket to user's account
export const addTicket = async (req: Request, res: Response) => {
  try {
    const { ticket_number } = req.body;
    const userId = req.user.user_id;

    if (!ticket_number) {
      return res.status(400).json({ error: 'Ticket number is required' });
    }

    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
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
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check if ticket is already linked to another user
    if (ticket.user_ticket) {
      if (ticket.user_ticket.user_id === userId) {
        return res.json({
          success: true,
          message: 'Ticket already linked to your account',
          event: ticket.event,
        });
      } else {
        return res.status(400).json({ error: 'Ticket is already linked to another account' });
      }
    }

    // Link ticket to user
    await prisma.userTicket.create({
      data: {
        user_id: userId,
        ticket_id: ticket.id,
      },
    });

    // Get event with coupons
    const event = await prisma.event.findUnique({
      where: { id: ticket.event_id },
      include: {
        coupons: true,
      },
    });

    res.json({
      success: true,
      message: 'Ticket added successfully',
      event: event,
    });
  } catch (error) {
    console.error('Error adding ticket:', error);
    res.status(500).json({ error: 'Failed to add ticket' });
  }
};

// Book a ticket (automatically assign an available ticket)
export const bookTicket = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.body;
    const userId = req.user.user_id;

    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }

    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
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
        error: 'You have already booked a ticket for this event. One ticket per user per event.' 
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
      return res.status(400).json({ error: 'No tickets available for this event' });
    }

    // Link ticket to user
    await prisma.userTicket.create({
      data: {
        user_id: userId,
        ticket_id: availableTicket.id,
      },
    });

    // Get event with coupons
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        coupons: true,
      },
    });

    res.json({
      success: true,
      message: 'Ticket booked successfully',
      ticket: {
        id: availableTicket.id,
        ticket_number: availableTicket.ticket_number,
      },
      event: event,
    });
  } catch (error) {
    console.error('Error booking ticket:', error);
    res.status(500).json({ error: 'Failed to book ticket' });
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
      return res.status(404).json({ error: 'Event not found' });
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
        status: availableTickets > 0 ? 'Booking Open' : 'Sold Out',
      },
    });
  } catch (error) {
    console.error('Error fetching public event details:', error);
    res.status(500).json({ error: 'Failed to fetch event details' });
  }
};

// Get event details with coupons (requires ticket)
export const getEventDetails = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.user_id;

    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
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
      return res.status(403).json({ error: 'You do not have access to this event' });
    }

    // Get event with coupons
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        coupons: true,
        tickets: {
          include: {
            user_ticket: {
              where: {
                user_id: userId,
              },
            },
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({
      success: true,
      event: event,
    });
  } catch (error) {
    console.error('Error fetching event details:', error);
    res.status(500).json({ error: 'Failed to fetch event details' });
  }
};

