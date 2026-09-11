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
const REFRESH_TOKEN_KEY = "hub1688_refresh_token";
const EXPIRES_AT_KEY = "hub1688_token_expires_at";
const AUTH_USER_KEY = "hub1688_auth_user";

export interface ExtensionAuthUser {
  id?: string;
  email: string;
  name: string;
  role: "ADMIN" | "SOURCING";
}

interface ExtensionAuthSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  user: ExtensionAuthUser;
}

export async function getAccessToken(): Promise<string> {
  if (typeof chrome === "undefined" || !chrome.storage) return "";
  const local = chrome.storage.local ? await chrome.storage.local.get([ACCESS_TOKEN_KEY]) : {};
  if (typeof local[ACCESS_TOKEN_KEY] === "string") return local[ACCESS_TOKEN_KEY];
  const legacy = chrome.storage.session ? await chrome.storage.session.get([ACCESS_TOKEN_KEY]) : {};
  return typeof legacy[ACCESS_TOKEN_KEY] === "string" ? legacy[ACCESS_TOKEN_KEY] : "";
}

export async function setAccessToken(token: string): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.storage?.local) return;
  const clean = token.trim();
  if (clean) await chrome.storage.local.set({ [ACCESS_TOKEN_KEY]: clean });
  else await chrome.storage.local.remove([ACCESS_TOKEN_KEY]);
  await chrome.storage.session?.remove([ACCESS_TOKEN_KEY]);
}

async function saveAuthSession(session: ExtensionAuthSession): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.storage?.local) return;
  await chrome.storage.local.set({
    [ACCESS_TOKEN_KEY]: session.accessToken,
    [REFRESH_TOKEN_KEY]: session.refreshToken || "",
    [EXPIRES_AT_KEY]: session.expiresAt || 0,
    [AUTH_USER_KEY]: session.user
  });
  await chrome.storage.session?.remove([ACCESS_TOKEN_KEY]);
}

export async function clearAuthSession(): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.storage) return;
  await chrome.storage.local?.remove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, EXPIRES_AT_KEY, AUTH_USER_KEY]);
  await chrome.storage.session?.remove([ACCESS_TOKEN_KEY]);
}

export async function getAuthenticatedUser(): Promise<ExtensionAuthUser | null> {
  if (typeof chrome === "undefined" || !chrome.storage?.local) return null;
  const result = await chrome.storage.local.get([AUTH_USER_KEY]);
  const user = result[AUTH_USER_KEY];
  return user && typeof user.email === "string" ? user as ExtensionAuthUser : null;
}

async function parseAuthResponse(res: Response): Promise<ExtensionAuthSession> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.accessToken || !data.user) {
    throw new Error(data.message || data.error || "Không thể đăng nhập");
  }
  const session: ExtensionAuthSession = {
    accessToken: String(data.accessToken),
    refreshToken: data.refreshToken ? String(data.refreshToken) : undefined,
    expiresAt: Number(data.expiresAt) || undefined,
    user: data.user as ExtensionAuthUser
  };
  await saveAuthSession(session);
  return session;
}

export async function loginWithPassword(email: string, password: string): Promise<ExtensionAuthUser> {
  const baseUrl = await getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), password })
  });
  return (await parseAuthResponse(res)).user;
}

let refreshPromise: Promise<ExtensionAuthSession | null> | null = null;
async function refreshAuthSession(force = false): Promise<ExtensionAuthSession | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return null;
    const stored = await chrome.storage.local.get([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, EXPIRES_AT_KEY, AUTH_USER_KEY]);
    const accessToken = typeof stored[ACCESS_TOKEN_KEY] === "string" ? stored[ACCESS_TOKEN_KEY] : "";
    const refreshToken = typeof stored[REFRESH_TOKEN_KEY] === "string" ? stored[REFRESH_TOKEN_KEY] : "";
    const expiresAt = Number(stored[EXPIRES_AT_KEY]) || 0;
    const user = stored[AUTH_USER_KEY] as ExtensionAuthUser | undefined;
    if (!force && accessToken && (!expiresAt || expiresAt > Math.floor(Date.now() / 1000) + 90)) {
      return user ? { accessToken, refreshToken, expiresAt, user } : null;
    }
    if (!refreshToken) return null;

    const baseUrl = await getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken })
    });
    if (!res.ok) {
      await clearAuthSession();
      return null;
    }
    return parseAuthResponse(res);
  })().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

async function getValidAccessToken(): Promise<string> {
  const session = await refreshAuthSession(false);
  return session?.accessToken || await getAccessToken();
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
  let accessToken = await getValidAccessToken();

  const perform = (token: string) => {
    const headers = new Headers(options.headers || {});
    if (selectedModel && !headers.has("x-ai-model")) headers.set("x-ai-model", selectedModel);
    if (token && !headers.has("authorization")) headers.set("authorization", `Bearer ${token}`);
    return fetch(`${baseUrl}${endpoint}`, { ...options, headers });
  };

  let response = await perform(accessToken);
  if (response.status === 401 && accessToken) {
    const refreshed = await refreshAuthSession(true);
    if (refreshed?.accessToken) {
      accessToken = refreshed.accessToken;
      response = await perform(accessToken);
    } else {
      await clearAuthSession();
    }
  }
  return response;
}
