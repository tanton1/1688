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
  // Chrome extension IDs are immutable 32-character base16-like values (a-p).
  // The extension authenticates API calls with its bearer token, so allowing
  // this well-formed origin does not make the API publicly writable.
  const isChromeExtensionOrigin = !!origin && /^chrome-extension:\/\/[a-p]{32}$/.test(origin);

  // Content scripts execute fetch() in the source page's isolated world, so
  // their Origin is the merchant page (not chrome-extension://...). Keep a
  // narrow allowlist for the supported catalogue domains; write operations
  // remain protected by bearer authentication and role checks below.
  const isSupportedSourceOrigin = (() => {
    if (!origin) return false;
    try {
      const parsed = new URL(origin);
      if (parsed.protocol !== "https:") return false;
      const host = parsed.hostname.toLowerCase();
      return host === "1688.com" || host.endsWith(".1688.com") ||
        host === "taobao.com" || host.endsWith(".taobao.com") ||
        host === "tmall.com" || host.endsWith(".tmall.com") ||
        host === "shopee.vn" || host.endsWith(".shopee.vn") ||
        host === "tiktok.com" || host.endsWith(".tiktok.com") ||
        host === "aliexpress.com" || host.endsWith(".aliexpress.com") ||
        host === "etsy.com" || host.endsWith(".etsy.com") ||
        /^amazon\.(com|ca|com\.mx|com\.br|co\.uk|de|fr|it|es|nl|se|pl|com\.be|co\.jp|in|com\.au|sg|ae|sa|com\.tr)$/.test(host.replace(/^www\./, "")) ||
        host === "macorner.co" || host.endsWith(".macorner.co") ||
        host === "fangearsport.com" || host.endsWith(".fangearsport.com");
    } catch {
      return false;
    }
  })();
  const isAllowed = !origin ||
    origin === requestOrigin ||
    ENV.CORS_ALLOWED_ORIGINS.includes(origin) ||
    isChromeExtensionOrigin ||
    isSupportedSourceOrigin;

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
