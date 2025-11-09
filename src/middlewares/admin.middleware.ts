import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma.config';

export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.uid },
    });

    if (user && user.role === 'ADMIN') {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden: Admins only' });
    }
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
