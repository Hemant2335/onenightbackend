import { Router } from "express";
import { testLogin } from "../controllers/test.controller";
import { testAuthenticate } from "../middlewares/test.middleware";
import prisma from "../lib/prisma";

const router = Router();

// Test login endpoint (bypasses Firebase)
router.post("/login", testLogin);

// Test protected endpoint example
router.get("/profile", testAuthenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { firebase_uid: req.user.uid },
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

    res.json({
      success: true,
      user: {
        id: user?.id,
        firebase_uid: user?.firebase_uid,
        phone: user?.phone_number,
        name: user?.name,
        is_admin: user?.is_admin,
        user_tickets: user?.user_tickets,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;

