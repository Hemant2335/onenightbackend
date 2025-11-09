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
const express_1 = require("express");
const test_controller_1 = require("../controllers/test.controller");
const test_middleware_1 = require("../middlewares/test.middleware");
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = (0, express_1.Router)();
// Test login endpoint (bypasses Firebase)
router.post("/login", test_controller_1.testLogin);
// Test protected endpoint example
router.get("/profile", test_middleware_1.testAuthenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield prisma_1.default.user.findUnique({
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
                id: user === null || user === void 0 ? void 0 : user.id,
                firebase_uid: user === null || user === void 0 ? void 0 : user.firebase_uid,
                phone: user === null || user === void 0 ? void 0 : user.phone_number,
                name: user === null || user === void 0 ? void 0 : user.name,
                is_admin: user === null || user === void 0 ? void 0 : user.is_admin,
                user_tickets: user === null || user === void 0 ? void 0 : user.user_tickets,
            },
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
}));
exports.default = router;
