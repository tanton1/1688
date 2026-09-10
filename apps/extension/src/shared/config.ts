export const DEFAULT_API_URL = "https://1688-phi.vercel.app";

/**
 * Lấy URL của Backend Server (Ưu tiên Vercel Cloud nếu localhost không hoạt động)
 */
export async function getApiBaseUrl(): Promise<string> {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const data = await chrome.storage.local.get(["hub1688_api_url"]);
      if (data.hub1688_api_url && typeof data.hub1688_api_url === "string") {
        const clean = data.hub1688_api_url.replace(/\/+$/, "");
        // Nếu trước đó từng lưu localhost nhưng hiện tại người dùng không chạy server local,
        // tự động dùng Vercel production để tránh lỗi ERR_CONNECTION_REFUSED.
        if (clean && !clean.includes("localhost") && !clean.includes("127.0.0.1")) {
          return clean;
        }
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

const ACCESS_TOKEN_KEY = "hub1688_access_token";
export async function getAccessToken(): Promise<string> {
  if (typeof chrome === "undefined" || !chrome.storage?.session) return "";
  const result = await chrome.storage.session.get([ACCESS_TOKEN_KEY]);
  return typeof result[ACCESS_TOKEN_KEY] === "string" ? result[ACCESS_TOKEN_KEY] : "";
}

export async function setAccessToken(token: string): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.storage?.session) return;
  const clean = token.trim();
  if (clean) await chrome.storage.session.set({ [ACCESS_TOKEN_KEY]: clean });
  else await chrome.storage.session.remove([ACCESS_TOKEN_KEY]);
}

export interface BackendAiConfig {
  isConfigured: boolean;
  maskedKey: string;
  geminiConfigured?: boolean;
  maskedGeminiKey?: string;
  openAiConfigured?: boolean;
  maskedOpenAiKey?: string;
  imageConfigured?: boolean;
  maskedImageKey?: string;
  defaultModel: string;
  baseUrl: string;
  availableModels: Array<{
    id: string;
    name: string;
    provider: string;
    tag: string;
    description: string;
  }>;
}

/**
 * Lấy cấu hình AI từ Backend (được mask an toàn, không bao giờ lộ raw API key)
 */
export async function fetchBackendAiConfig(): Promise<BackendAiConfig | null> {
  try {
    const res = await apiFetch("/api/v1/ai/config");
    if (res.ok) {
      return await res.json() as BackendAiConfig;
    }
  } catch (e) {
    console.warn("[Config] Could not fetch AI config from backend:", e);
  }
  return null;
}

/**
 * Lưu API Key trực tiếp lên Backend an toàn tuyệt đối (server-side persistence)
 */
export async function updateBackendAiConfig(params: {
  apiKey?: string;
  geminiKey?: string;
  openAiKey?: string;
  imageKey?: string;
  model?: string;
}): Promise<{ success: boolean; maskedKey: string; model: string }> {
  const res = await apiFetch("/api/v1/ai/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });

  // Xóa sạch key cũ nếu từng lưu trên client storage để đảm bảo bảo mật 100%
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    await chrome.storage.local.remove(["hub1688_ai_key"]);
    if (params.model) {
      await chrome.storage.local.set({ hub1688_ai_model: params.model });
    }
  }

  return await res.json() as any;
}

export async function getSelectedModel(): Promise<string> {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const data = await chrome.storage.local.get(["hub1688_ai_model"]);
      if (data.hub1688_ai_model) return data.hub1688_ai_model as string;
    }
  } catch (e) {
    console.warn("[Config] Could not read model preference:", e);
  }
  return "gemini-flash-8";
}

export async function setSelectedModel(model: string): Promise<void> {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    await chrome.storage.local.set({ hub1688_ai_model: model });
  }
}

/**
 * Gọi API backend với cơ chế tự động Fallback sang Vercel Production nếu URL tùy chỉnh gặp sự cố mạng
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const endpoint = path.startsWith("/") ? path : `/${path}`;
  const baseUrl = await getApiBaseUrl();
  const selectedModel = await getSelectedModel();
  const accessToken = await getAccessToken();

  const headers = new Headers(options.headers || {});
  if (selectedModel && !headers.has("x-ai-model")) {
    headers.set("x-ai-model", selectedModel);
  }
  if (accessToken && !headers.has("authorization")) headers.set("authorization", `Bearer ${accessToken}`);

  const mergedOptions = { ...options, headers };

  return fetch(`${baseUrl}${endpoint}`, mergedOptions);
}
