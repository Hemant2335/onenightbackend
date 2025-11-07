import { Request, Response } from "express";
import admin from "../firebase";
import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

export const verifyToken = async (req: Request, res: Response) => {
  const { idToken } = req.body;

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const phone_number = decodedToken.phone_number;

    if (!phone_number) {
      return res.status(400).send({ error: "Phone number not found in token" });
    }

    let user = await prisma.user.findUnique({
      where: { phone_number },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: "New User",
          phone_number: phone_number,
        },
      });
    }

    res.status(200).send({ message: "User logged in", user });
  } catch (error) {
    res.status(401).send({ error: "Unauthorized" });
  }
};
