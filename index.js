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

// Explicit CORS setup
const allowedOrigins = [
  "https://study-buddy-yeelans-projects.vercel.app", // your frontend on vercel
  "http://localhost:5173" // for local dev
];

app.use(cors({
  origin: function (origin, callback) {
    console.log("🌍 Incoming request origin:", origin); // debug log
    if (!origin || allowedOrigins.includes(origin)) {
      console.log("✅ CORS allowed for:", origin);
      callback(null, true);
    } else {
      console.warn("❌ CORS rejected for:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

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
    console.log("✅ MongoDB connected");

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });
