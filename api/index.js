import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

// ✅ updated paths (now pointing back to server/routes)
import chatRoutes from "../server/routes/chat.js";
import authRoutes from "../server/routes/auth.js";
import uploadRoute from "../server/routes/upload.js";
import notesRoutes from "../server/routes/notes.js";
import ragRoutes from "../server/routes/rag.js";
import mindmapRoutes from "../server/routes/mindmap.js";
import askaiRoutes from "../server/routes/askai.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// ✅ API routes
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoute);
app.use("/api/notes", notesRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/rag", ragRoutes);
app.use("/api/mindmap", mindmapRoutes);
app.use("/api/askai", askaiRoutes);

// ✅ Mongo connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");

    // 🚨 Only start server locally
    if (process.env.NODE_ENV !== "production") {
      app.listen(process.env.PORT || 5000, () =>
        console.log(`Local server running on port ${process.env.PORT || 5000}`)
      );
    }
  })
  .catch((err) => console.error("Mongo error", err));

// ✅ Export app for Vercel
export default app;
