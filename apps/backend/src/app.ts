import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { apiRouter } from "./routes/api.router.js";
import { ENV } from "./config/env.js";

export const app = express();

app.disable("x-powered-by");
if (ENV.NODE_ENV === "production") app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use((req, res, next) => {
  req.requestId = req.header("x-request-id") || crypto.randomUUID();
  res.setHeader("x-request-id", req.requestId);
  const startedAt = Date.now();
  res.on("finish", () => {
    console.log(JSON.stringify({ level: "info", requestId: req.requestId, method: req.method, path: req.path, status: res.statusCode, durationMs: Date.now() - startedAt }));
  });
  next();
});
app.use(cors((req, callback) => {
  const origin = req.header("origin");
  const requestOrigin = `${req.protocol}://${req.get("host")}`;
  const isAllowed = !origin ||
    origin === requestOrigin ||
    ENV.CORS_ALLOWED_ORIGINS.includes(origin) ||
    (ENV.NODE_ENV !== "production" && /^chrome-extension:\/\/[a-z]{32}$/.test(origin));

  callback(isAllowed ? null : new Error("CORS_ORIGIN_DENIED"), {
    credentials: true,
    origin: isAllowed
  });
}));
app.use(express.json({ limit: ENV.JSON_BODY_LIMIT }));
app.use(express.urlencoded({ extended: false, limit: ENV.JSON_BODY_LIMIT }));
app.use("/api/v1", rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "RATE_LIMITED", message: "Quá nhiều yêu cầu, vui lòng thử lại sau" }
}));

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

app.use((req, res) => {
  res.status(404).json({ error: "NOT_FOUND", requestId: req.requestId });
});

app.use((error: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const isBodyTooLarge = (error as any).type === "entity.too.large";
  const isCors = error.message === "CORS_ORIGIN_DENIED";
  const status = isBodyTooLarge ? 413 : isCors ? 403 : 500;
  if (status === 500) console.error(JSON.stringify({ level: "error", requestId: req.requestId, message: error.message }));
  res.status(status).json({
    error: isBodyTooLarge ? "PAYLOAD_TOO_LARGE" : isCors ? "CORS_ORIGIN_DENIED" : "INTERNAL_ERROR",
    message: status === 500 ? "Đã xảy ra lỗi phía máy chủ" : error.message,
    requestId: req.requestId
  });
});
