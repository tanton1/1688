export const DEFAULT_API_URL = "http://localhost:3001";

/**
 * Lấy URL của Backend Server (Ưu tiên lấy từ chrome.storage nếu người dùng cấu hình Vercel)
 */
export async function getApiBaseUrl(): Promise<string> {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const data = await chrome.storage.local.get(["hub1688_api_url"]);
      if (data.hub1688_api_url && typeof data.hub1688_api_url === "string") {
        return data.hub1688_api_url.replace(/\/+$/, "");
      }
    }
  } catch (e) {
    console.warn("[Config] Could not read chrome.storage, using default URL:", e);
  }
  return DEFAULT_API_URL;
}

/**
 * Lưu URL Backend Server vào chrome.storage
 */
export async function setApiBaseUrl(url: string): Promise<void> {
  const cleanUrl = url.trim().replace(/\/+$/, "");
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    await chrome.storage.local.set({ hub1688_api_url: cleanUrl });
  }
}
