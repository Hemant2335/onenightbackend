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
exports.checkAdmin = exports.profile = exports.login = exports.register = exports.checkUser = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const checkUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { phone } = req.body;
        // Check if user exists in database
        const user = yield prisma_1.default.user.findUnique({
            where: { phone_number: phone },
        });
        if (user) {
            res.json({
                exists: true,
                firebase_uid: user.firebase_uid,
                name: user.name,
            });
        }
        else {
            res.json({
                exists: false,
            });
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
            return res.status(403).json({ error: "Unauthorized" });
        }
        // Check if user already exists
        const existingUser = yield prisma_1.default.user.findUnique({
            where: { firebase_uid: uid },
        });
        if (existingUser) {
            return res.json({
                success: true,
                message: "User already exists",
                user: existingUser,
            });
        }
        // Create user in database
        const user = yield prisma_1.default.user.create({
            data: {
                firebase_uid: uid,
                phone_number: phone,
                name: name,
            },
        });
        res.json({
            success: true,
            message: "User registered successfully",
            user: {
                id: user.id,
                firebase_uid: user.firebase_uid,
                phone: user.phone_number,
                name: user.name,
            },
        });
    }
    catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ error: "Failed to register user" });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const uid = req.user.uid;
        // Get user from database
        const user = yield prisma_1.default.user.findUnique({
            where: { firebase_uid: uid },
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
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json({
            success: true,
            message: "Login successful",
            user: {
                id: user.id,
                firebase_uid: user.firebase_uid,
                phone: user.phone_number,
                name: user.name,
            },
        });
    }
    catch (error) {
        console.error("Error handling login:", error);
        res.status(500).json({ error: "Failed to process login" });
    }
});
exports.login = login;
const profile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const uid = req.user.uid;
        const user = yield prisma_1.default.user.findUnique({
            where: { firebase_uid: uid },
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
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json({
            user: {
                id: user.id,
                firebase_uid: user.firebase_uid,
                phone: user.phone_number,
                name: user.name,
                is_admin: user.is_admin,
                user_tickets: user.user_tickets,
            },
        });
    }
    catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});
exports.profile = profile;
const checkAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const uid = req.user.uid;
        const user = yield prisma_1.default.user.findUnique({
            where: { firebase_uid: uid },
            select: {
                id: true,
                is_admin: true,
            },
        });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json({
            is_admin: user.is_admin,
        });
    }
    catch (error) {
        console.error("Error checking admin status:", error);
        res.status(500).json({ error: "Failed to check admin status" });
    }
});
exports.checkAdmin = checkAdmin;
