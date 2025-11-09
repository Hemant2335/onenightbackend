import express from "express";

const app = express();

app.use(express.json());

import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  return res.send("Hello Backend");
});

app.listen(8000, () => {
  console.log("App is Running on Port 8000");
});
