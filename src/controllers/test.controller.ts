import { Request, Response } from "express";
import prisma from "../lib/prisma";

// Test login endpoint - bypasses Firebase for test users
export const testLogin = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Find user by phone number
    const user = await prisma.user.findUnique({
      where: { phone_number: phone },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found. Please run seed script first.' });
    }

    // Check if this is a test user (starts with 'test-')
    if (!user.firebase_uid.startsWith('test-')) {
      return res.status(403).json({ 
        error: 'This endpoint is only for test users. Use regular authentication for production users.' 
      });
    }

    // Generate a mock token (in production, this would be a real Firebase token)
    // For testing, we'll return the user info and a special test token
    const testToken = `test-token-${user.firebase_uid}`;

    res.json({
      success: true,
      message: 'Test login successful',
      user: {
        id: user.id,
        firebase_uid: user.firebase_uid,
        phone: user.phone_number,
        name: user.name,
        is_admin: user.is_admin,
      },
      token: testToken,
    });
  } catch (error) {
    console.error('Error in test login:', error);
    res.status(500).json({ error: 'Failed to process test login' });
  }
};

