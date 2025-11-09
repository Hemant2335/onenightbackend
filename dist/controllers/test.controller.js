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
exports.testLogin = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
// Test login endpoint - bypasses Firebase for test users
const testLogin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ error: 'Phone number is required' });
        }
        // Find user by phone number
        const user = yield prisma_1.default.user.findUnique({
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
    }
    catch (error) {
        console.error('Error in test login:', error);
        res.status(500).json({ error: 'Failed to process test login' });
    }
});
exports.testLogin = testLogin;
