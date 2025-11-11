"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: [
        "https://onenightminimalist.vercel.app",
        "0.0.0.0:3000",
        "http://localhost:3000",
    ],
}));
app.use(express_1.default.json());
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const event_routes_1 = __importDefault(require("./routes/event.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const test_routes_1 = __importDefault(require("./routes/test.routes"));
app.use("/api/auth", auth_routes_1.default);
app.use("/api/events", event_routes_1.default);
app.use("/api/admin", admin_routes_1.default);
app.use("/api/test", test_routes_1.default);
app.get("/", (req, res) => {
    return res.send("Hello Backend");
});
app.listen(8000, () => {
    console.log("App is Running on Port 8000");
});
