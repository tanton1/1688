import type { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ENV } from "../config/env.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

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

  public me(req: Request, res: Response): void {
    res.json({ user: req.auth });
  }
}
