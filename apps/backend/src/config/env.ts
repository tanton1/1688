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
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || "product-media",
  SUPABASE_AUTH_URL: process.env.SUPABASE_AUTH_URL || process.env.SUPABASE_URL || "",
  SUPABASE_AUTH_ANON_KEY: process.env.SUPABASE_AUTH_ANON_KEY || process.env.SUPABASE_ANON_KEY || "",
  SUPABASE_AUTH_SERVICE_ROLE_KEY: process.env.SUPABASE_AUTH_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  PUBLIC_APP_URL: process.env.PUBLIC_APP_URL || "",
  VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL || "",

  // AI & Pricing Defaults
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  DEFAULT_EXCHANGE_RATE: parseFloat(process.env.DEFAULT_EXCHANGE_RATE || "3800"),
  WOOCOMMERCE_STORE_URL: process.env.WOOCOMMERCE_STORE_URL || "",
  WOOCOMMERCE_CONSUMER_KEY: process.env.WOOCOMMERCE_CONSUMER_KEY || "",
  WOOCOMMERCE_CONSUMER_SECRET: process.env.WOOCOMMERCE_CONSUMER_SECRET || "",
  SHOPIFY_SHOP_DOMAIN: process.env.SHOPIFY_SHOP_DOMAIN || "",
  SHOPIFY_ACCESS_TOKEN: process.env.SHOPIFY_ACCESS_TOKEN || "",
  SHOPIFY_API_VERSION: process.env.SHOPIFY_API_VERSION || "2025-01",
  SHOPIFY_STORE_CURRENCY: (process.env.SHOPIFY_STORE_CURRENCY || "VND").toUpperCase() === "USD" ? "USD" as const : "VND" as const,
  SHOPIFY_VND_PER_USD: Number.parseFloat(process.env.SHOPIFY_VND_PER_USD || "0"),
  CHANNEL_TOKEN_ENCRYPTION_KEY: process.env.CHANNEL_TOKEN_ENCRYPTION_KEY || "",
  SHOPEE_PARTNER_ID: process.env.SHOPEE_PARTNER_ID || "",
  SHOPEE_PARTNER_KEY: process.env.SHOPEE_PARTNER_KEY || "",
  SHOPEE_REDIRECT_URL: process.env.SHOPEE_REDIRECT_URL || "",
  SHOPEE_API_BASE_URL: process.env.SHOPEE_API_BASE_URL || "https://partner.shopeemobile.com",
  SHOPEE_REGION: (process.env.SHOPEE_REGION || "VN").toUpperCase(),
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || ""
};
