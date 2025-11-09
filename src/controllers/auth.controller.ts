import { Request, Response } from "express";
import admin from "../firebase";
import prisma from "../lib/prisma";

export const checkUser = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    // Check if user exists in database
    const user = await prisma.user.findUnique({
      where: { phone_number: phone },
    });

    if (user) {
      res.json({
        exists: true,
        firebase_uid: user.firebase_uid,
        name: user.name,
      });
    } else {
      res.json({
        exists: false,
      });
    }
  } catch (error) {
    console.error("Error checking user:", error);
    res.status(500).json({ error: "Failed to check user" });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { uid, phone, name } = req.body;

    // Verify the request is from authenticated user
    if (req.user.uid !== uid) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { firebase_uid: uid },
    });

    if (existingUser) {
      return res.json({
        success: true,
        message: "User already exists",
        user: existingUser,
      });
    }

    // Create user in database
    const user = await prisma.user.create({
      data: {
        firebase_uid: uid,
        phone_number: phone,
        name: name,
      },
    });

    res.json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user.id,
        firebase_uid: user.firebase_uid,
        phone: user.phone_number,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Failed to register user" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const uid = req.user.uid;

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { firebase_uid: uid },
      include: {
        user_tickets: {
          include: {
            ticket: {
              include: {
                event: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        firebase_uid: user.firebase_uid,
        phone: user.phone_number,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Error handling login:", error);
    res.status(500).json({ error: "Failed to process login" });
  }
};

export const profile = async (req: Request, res: Response) => {
  try {
    const uid = req.user.uid;

    const user = await prisma.user.findUnique({
      where: { firebase_uid: uid },
      include: {
        user_tickets: {
          include: {
            ticket: {
              include: {
                event: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      user: {
        id: user.id,
        firebase_uid: user.firebase_uid,
        phone: user.phone_number,
        name: user.name,
        is_admin: user.is_admin,
        user_tickets: user.user_tickets,
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

export const checkAdmin = async (req: Request, res: Response) => {
  try {
    const uid = req.user.uid;

    const user = await prisma.user.findUnique({
      where: { firebase_uid: uid },
      select: {
        id: true,
        is_admin: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      is_admin: user.is_admin,
    });
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ error: "Failed to check admin status" });
  }
};
