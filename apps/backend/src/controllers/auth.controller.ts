import type { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ENV } from "../config/env.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

const passwordResetRequestSchema = z.object({
  email: z.string().email()
});

const passwordResetConfirmSchema = z.object({
  password: z.string().min(8).max(128)
});

const bearerToken = (req: Request): string => {
  const value = req.header("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
};

const publicAppUrl = (req: Request): string => {
  const configured = ENV.PUBLIC_APP_URL.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const vercelProductionUrl = ENV.VERCEL_PROJECT_PRODUCTION_URL.trim();
  if (vercelProductionUrl) {
    return `https://${vercelProductionUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  }

  return `${req.protocol}://${req.get("host")}`;
};

export class AuthController {
  public async login(req: Request, res: Response): Promise<void> {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
      return;
    }
    if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) {
      res.status(503).json({ error: "AUTH_NOT_CONFIGURED", message: "Supabase Auth chưa được cấu hình" });
      return;
    }
    const client = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data, error } = await client.auth.signInWithPassword(parsed.data);
    if (error || !data.session || !data.user) {
      res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Email hoặc mật khẩu không đúng" });
      return;
    }
    const role = data.user.app_metadata?.role === "ADMIN" ? "ADMIN" : "SOURCING";
    res.json({
      accessToken: data.session.access_token,
      expiresAt: data.session.expires_at,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || data.user.email?.split("@")[0],
        role
      }
    });
  }

  public async requestPasswordReset(req: Request, res: Response): Promise<void> {
    const parsed = passwordResetRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_ERROR", message: "Email không hợp lệ" });
      return;
    }
    if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) {
      res.status(503).json({ error: "AUTH_NOT_CONFIGURED", message: "Supabase Auth chưa được cấu hình" });
      return;
    }

    const client = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const redirectTo = `${publicAppUrl(req)}/?auth=recovery`;
    const { error } = await client.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });
    if (error) {
      const rateLimited = error.status === 429 || /rate limit/i.test(error.message);
      res.status(rateLimited ? 429 : 502).json({
        error: rateLimited ? "PASSWORD_RESET_RATE_LIMITED" : "PASSWORD_RESET_FAILED",
        message: rateLimited
          ? "Đã gửi quá nhiều yêu cầu. Vui lòng chờ vài phút rồi thử lại."
          : "Chưa thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau."
      });
      return;
    }

    // Keep the response identical whether the account exists or not.
    res.json({
      success: true,
      message: "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi."
    });
  }

  public async confirmPasswordReset(req: Request, res: Response): Promise<void> {
    const parsed = passwordResetConfirmSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Mật khẩu mới phải có từ 8 đến 128 ký tự"
      });
      return;
    }

    const token = bearerToken(req);
    if (!token) {
      res.status(401).json({ error: "RECOVERY_TOKEN_REQUIRED", message: "Liên kết đặt lại mật khẩu không hợp lệ" });
      return;
    }
    if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY || !ENV.SUPABASE_SERVICE_ROLE_KEY) {
      res.status(503).json({ error: "AUTH_NOT_CONFIGURED", message: "Dịch vụ đặt lại mật khẩu chưa được cấu hình" });
      return;
    }

    const authClient = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data, error: tokenError } = await authClient.auth.getUser(token);
    if (tokenError || !data.user) {
      res.status(401).json({ error: "INVALID_RECOVERY_TOKEN", message: "Liên kết đã hết hạn hoặc không hợp lệ" });
      return;
    }

    const adminClient = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { error: updateError } = await adminClient.auth.admin.updateUserById(data.user.id, {
      password: parsed.data.password
    });
    if (updateError) {
      res.status(502).json({ error: "PASSWORD_UPDATE_FAILED", message: "Không thể cập nhật mật khẩu. Vui lòng yêu cầu liên kết mới." });
      return;
    }

    res.json({ success: true, message: "Đã cập nhật mật khẩu. Bạn có thể đăng nhập ngay." });
  }

  public me(req: Request, res: Response): void {
    res.json({ user: req.auth });
  }
}
