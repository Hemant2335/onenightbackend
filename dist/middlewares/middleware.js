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
exports.requireAdmin = exports.authenticate = void 0;
const firebase_1 = __importDefault(require("../firebase"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const authenticate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
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
            const user = yield prisma_1.default.user.findUnique({
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
        const decodedToken = yield firebase_1.default.auth().verifyIdToken(token);
        // Get user from database
        const user = yield prisma_1.default.user.findUnique({
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
    }
    catch (error) {
        console.error("Authentication error:", error);
        return res.status(401).json({ error: "Invalid or expired token" });
    }
});
exports.authenticate = authenticate;
const requireAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
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
            const user = yield prisma_1.default.user.findUnique({
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
        const decodedToken = yield firebase_1.default.auth().verifyIdToken(token);
        // Get user from database
        const user = yield prisma_1.default.user.findUnique({
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
    }
    catch (error) {
        console.error("Admin authentication error:", error);
        return res.status(401).json({ error: "Authentication failed" });
    }
});
exports.requireAdmin = requireAdmin;
