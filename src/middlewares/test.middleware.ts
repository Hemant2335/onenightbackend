import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

// Test authentication middleware - bypasses Firebase for test users
export const testAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];

    // Check if this is a test token
    if (!token.startsWith('test-token-')) {
      return res.status(401).json({ error: 'Invalid test token format' });
    }

    // Extract firebase_uid from token
    const firebaseUid = token.replace('test-token-', '');

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { firebase_uid: firebaseUid },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if this is a test user
    if (!user.firebase_uid.startsWith('test-')) {
      return res.status(403).json({ 
        error: 'This endpoint is only for test users' 
      });
    }
    
    // Attach user info to request
    req.user = {
      uid: user.firebase_uid,
      user_id: user.id,
      is_admin: user.is_admin,
    };

    next();
  } catch (error) {
    console.error('Test authentication error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

