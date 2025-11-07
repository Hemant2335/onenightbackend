"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.profile = exports.login = exports.register = exports.checkUser = void 0;
const firebase_1 = __importDefault(require("../firebase"));
const checkUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { phone } = req.body;
        // Check if user exists in Firebase Auth
        try {
            const userRecord = yield firebase_1.default.auth().getUserByPhoneNumber(phone);
            res.json({
                exists: true,
                uid: userRecord.uid,
                name: userRecord.displayName || "",
            });
        }
        catch (error) {
            res.json({ success: false, message: "Internal Server Error" });
        }
    }
    catch (error) {
        console.error("Error checking user:", error);
        res.status(500).json({ error: "Failed to check user" });
    }
});
exports.checkUser = checkUser;
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { uid, phone, name } = req.body;
        // Verify the request is from authenticated user
        if (req.user.uid !== uid) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        // Update user profile in Firebase Auth
        yield firebase_1.default.auth().updateUser(uid, {
            displayName: name,
            phoneNumber: phone
        });
        // Store additional user data in Firestore or your database
        yield firebase_1.default.firestore().collection('users').doc(uid).set({
            uid,
            phone,
            name,
            createdAt: firebase_1.default.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase_1.default.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        res.json({
            success: true,
            message: 'User registered successfully',
            user: { uid, phone, name }
        });
    }
    catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const uid = req.user.uid;
        // Update last login timestamp
        yield firebase_1.default.firestore().collection('users').doc(uid).update({
            lastLogin: firebase_1.default.firestore.FieldValue.serverTimestamp()
        });
        res.json({
            success: true,
            message: 'Login successful',
            user: { uid }
        });
    }
    catch (error) {
        console.error('Error handling login:', error);
        res.status(500).json({ error: 'Failed to process login' });
    }
});
exports.login = login;
const profile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const uid = req.user.uid;
        const userDoc = yield firebase_1.default.firestore().collection('users').doc(uid).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            user: userDoc.data()
        });
    }
    catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});
exports.profile = profile;
