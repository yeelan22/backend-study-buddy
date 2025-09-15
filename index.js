// index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import chatRoutes from "./routes/chat.js";
import authRoutes from "./routes/auth.js";
import uploadRoute from "./routes/upload.js";
import notesRoutes from "./routes/notes.js";
import ragRoutes from "./routes/rag.js";
import mindmapRoutes from "./routes/mindmap.js";
import askaiRoutes from "./routes/askai.js";

dotenv.config();
const app = express();

app.use(
  cors({
    origin: ["https://study-buddy-bay.vercel.app/"],
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoute);
app.use("/api/notes", notesRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/rag", ragRoutes);
app.use("/api/mindmap", mindmapRoutes);
app.use("/api/askai", askaiRoutes);

// Connect to MongoDB and start server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");

    const PORT = process.env.PORT || 5000; // Railway provides process.env.PORT in production
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1); // Exit if DB connection fails
  });
