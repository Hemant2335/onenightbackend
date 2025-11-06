"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
// Add this to parse JSON bodies
app.use(express_1.default.json());
app.get("/", (req, res) => {
    return res.send("Hello Backend");
});
app.listen(8000, () => {
    console.log("App is Running on Port 8000");
});
