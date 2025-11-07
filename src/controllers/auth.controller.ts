import { Request, Response } from "express";
import admin from "../firebase";

export const checkUser = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    // Check if user exists in Firebase Auth
    try {
      const userRecord = await admin.auth().getUserByPhoneNumber(phone);

      res.json({
        exists: true,
        uid: userRecord.uid,
        name: userRecord.displayName || "",
      });
    } catch (error) {
      res.json({success : false , message : "Internal Server Error"})
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
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update user profile in Firebase Auth
    await admin.auth().updateUser(uid, {
      displayName: name,
      phoneNumber: phone
    });

    // Store additional user data in Firestore or your database
    await admin.firestore().collection('users').doc(uid).set({
      uid,
      phone,
      name,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    res.json({ 
      success: true, 
      message: 'User registered successfully',
      user: { uid, phone, name }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const uid = req.user.uid;

    // Update last login timestamp
    await admin.firestore().collection('users').doc(uid).update({
      lastLogin: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ 
      success: true, 
      message: 'Login successful',
      user: { uid }
    });
  } catch (error) {
    console.error('Error handling login:', error);
    res.status(500).json({ error: 'Failed to process login' });
  }
};

export const profile = async (req: Request, res: Response) => {
  try {
    const uid = req.user.uid;

    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      user: userDoc.data()
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};
