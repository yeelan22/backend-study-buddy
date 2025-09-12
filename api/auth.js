

import express from "express";
import { dbConnect } from "../lib/dbConnect.js";   // ✅ connect to MongoDB
import authRoutes from "../routes/auth.js";        // ✅ import your existing router

// Create a mini express app just for this endpoint
const app = express();
app.use(express.json());

// Mount the existing routes
app.use("/", authRoutes);

// Export handler for Vercel
export default async function handler(req, res) {
  // Ensure MongoDB is connected
  await dbConnect();

  // Let Express handle the request
  return app(req, res);
}
