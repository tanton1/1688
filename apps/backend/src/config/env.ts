import dotenv from "dotenv";
dotenv.config();

const asPositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const asBoolean = (value: string | undefined): boolean =>
  ["1", "true", "yes", "on"].includes((value || "").trim().toLowerCase());

export const ENV = {
  PORT: parseInt(process.env.PORT || "3001", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL || "",
  ADMIN_API_TOKEN: process.env.ADMIN_API_TOKEN || "",
  EXTENSION_API_KEY: process.env.EXTENSION_API_KEY || "",
  CRON_SECRET: process.env.CRON_SECRET || "",
  CORS_ALLOWED_ORIGINS: (process.env.CORS_ALLOWED_ORIGINS || "http://localhost:5173")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean),
  DEMO_MODE: asBoolean(process.env.DEMO_MODE),
  JSON_BODY_LIMIT: process.env.JSON_BODY_LIMIT || "5mb",
  OUTBOUND_TIMEOUT_MS: asPositiveInt(process.env.OUTBOUND_TIMEOUT_MS, 8_000),
  OUTBOUND_MAX_BYTES: asPositiveInt(process.env.OUTBOUND_MAX_BYTES, 5 * 1024 * 1024),
  
  // Supabase Configuration
  SUPABASE_URL: process.env.SUPABASE_URL || "https://jpbrwfctgrufbdkstufq.supabase.co",
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || "product-media",

  // AI & Pricing Defaults
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  DEFAULT_EXCHANGE_RATE: parseFloat(process.env.DEFAULT_EXCHANGE_RATE || "3800")
};
