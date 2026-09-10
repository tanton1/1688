import express from "express";
import cors from "cors";
import path from "node:path";
import { apiRouter } from "./routes/api.router.js";

export const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Static uploads serving
app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "1688-listing-sync-hub-backend",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

// Main API routes
app.use("/api/v1", apiRouter);
