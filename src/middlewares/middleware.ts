// middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import admin from "../firebase";
import prisma from "../lib/prisma";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user: {
        uid: string;
        email?: string;
        phone_number?: string;
        user_id?: string;
        is_admin?: boolean;
      };
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split("Bearer ")[1];

    // Check if this is a test token
    if (token.startsWith("test-token-")) {
      // Handle test token
      const firebaseUid = token.replace("test-token-", "");

      // Get user from database
      const user = await prisma.user.findUnique({
        where: { firebase_uid: firebaseUid },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if this is a test user
      if (!user.firebase_uid.startsWith("test-")) {
        return res.status(403).json({
          error: "This token is only for test users",
        });
      }

      // Attach user info to request
      req.user = {
        uid: user.firebase_uid,
        user_id: user.id,
        is_admin: user.is_admin,
      };

      next();
      return;
    }

    // Handle Firebase token
    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { firebase_uid: decodedToken.uid },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      user_id: user.id,
      is_admin: user.is_admin,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split("Bearer ")[1];

    // Check if this is a test token
    if (token.startsWith("test-token-")) {
      // Handle test token
      const firebaseUid = token.replace("test-token-", "");

      // Get user from database
      const user = await prisma.user.findUnique({
        where: { firebase_uid: firebaseUid },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if this is a test user
      if (!user.firebase_uid.startsWith("test-")) {
        return res.status(403).json({
          error: "This token is only for test users",
        });
      }

      // Check if user is admin
      if (!user.is_admin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Attach user info to request
      req.user = {
        uid: user.firebase_uid,
        user_id: user.id,
        is_admin: user.is_admin,
      };

      next();
      return;
    }

    // Handle Firebase token
    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { firebase_uid: decodedToken.uid },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user is admin
    if (!user.is_admin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      user_id: user.id,
      is_admin: user.is_admin,
    };

    next();
  } catch (error) {
    console.error("Admin authentication error:", error);
    return res.status(401).json({ error: "Authentication failed" });
  }
};
