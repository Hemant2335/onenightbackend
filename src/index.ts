import express from "express";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: [
      "https://onenightminimalist.vercel.app",
      "0.0.0.0:3000",
      "http://localhost:3000",
    ],
  })
);
app.use(express.json());

import authRoutes from "./routes/auth.routes";
import eventRoutes from "./routes/event.routes";
import adminRoutes from "./routes/admin.routes";
import testRoutes from "./routes/test.routes";

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/test", testRoutes);

app.get("/", (req, res) => {
  return res.send("Hello Backend");
});

app.listen(8000, () => {
  console.log("App is Running on Port 8000");
});
