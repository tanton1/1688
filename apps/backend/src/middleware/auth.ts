import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { ENV } from "../config/env.js";
import { supabaseService } from "../services/supabase.service.js";

export type AuthRole = "ADMIN" | "SOURCING";

export interface AuthPrincipal {
  id: string;
  email?: string;
  name?: string;
  role: AuthRole;
  provider: "supabase" | "admin-token" | "extension-key";
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPrincipal;
      requestId?: string;
    }
  }
}

const safeEqual = (actual: string, expected: string): boolean => {
  if (!actual || !expected) return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

const bearerToken = (req: Request): string => {
  const value = req.header("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
};

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ error: "AUTH_REQUIRED", message: "Vui lòng đăng nhập để tiếp tục" });
    return;
  }

  if (safeEqual(token, ENV.ADMIN_API_TOKEN)) {
    req.auth = { id: "admin-token", role: "ADMIN", provider: "admin-token" };
    next();
    return;
  }

  if (safeEqual(token, ENV.EXTENSION_API_KEY)) {
    req.auth = { id: "extension", role: "SOURCING", provider: "extension-key" };
    next();
    return;
  }

  if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) {
    res.status(401).json({ error: "INVALID_TOKEN", message: "Token không hợp lệ" });
    return;
  }

  try {
    const authClient = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data.user) throw error || new Error("User not found");
    const metadataRole = data.user.app_metadata?.role;
    const role: AuthRole = metadataRole === "ADMIN" ? "ADMIN" : "SOURCING";
    req.auth = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.name || data.user.email?.split("@")[0],
      role,
      provider: "supabase"
    };
    next();
  } catch {
    res.status(401).json({ error: "INVALID_TOKEN", message: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ" });
  }
}

export const requireRole = (...roles: AuthRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: "AUTH_REQUIRED" });
      return;
    }
    if (!roles.includes(req.auth.role)) {
      res.status(403).json({ error: "FORBIDDEN", message: "Tài khoản không có quyền thực hiện thao tác này" });
      return;
    }
    next();
  };

export function requireCronSecret(req: Request, res: Response, next: NextFunction): void {
  if (!ENV.CRON_SECRET) {
    res.status(503).json({ error: "CRON_NOT_CONFIGURED", message: "CRON_SECRET chưa được cấu hình" });
    return;
  }
  const supplied = bearerToken(req) || req.header("x-cron-secret") || "";
  if (!safeEqual(supplied, ENV.CRON_SECRET)) {
    res.status(401).json({ error: "INVALID_CRON_SECRET" });
    return;
  }
  next();
}

export function requirePersistence(_req: Request, res: Response, next: NextFunction): void {
  if (ENV.NODE_ENV === "production" && !supabaseService.isConfigured()) {
    res.status(503).json({ error: "PERSISTENCE_NOT_CONFIGURED", message: "SUPABASE_SERVICE_ROLE_KEY là bắt buộc trong production" });
    return;
  }
  next();
}
