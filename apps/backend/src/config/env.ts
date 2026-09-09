import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || "3001", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL || "",
  EXTENSION_API_KEY: process.env.EXTENSION_API_KEY || "hub1688_secret_extension_key_2026",
  
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
