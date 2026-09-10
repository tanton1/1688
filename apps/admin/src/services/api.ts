import {
  WebProduct,
  ProductDiffSummary,
  PricingRuleConfig,
  PricingBreakdown,
  SupportedPlatformInfo,
  ClonePreviewResponse,
  CloneExecuteRequest,
  SourcePlatform,
  BatchCloneRequest,
  BatchCloneResponse,
  VisualSourcingRequest,
  VisualSourcingResponse,
  ProductTemplate,
  StorefrontConfig,
  StorefrontCheckoutRequest,
  CustomerOrder
} from "@hub1688/shared-types";

// Lấy API URL từ localStorage hoặc fallback về window.location.origin hoặc localhost
export function getApiBaseUrl(): string {
  const customUrl = localStorage.getItem("hub1688_backend_url");
  if (customUrl) return customUrl.replace(/\/+$/, "");

  // Nếu đang chạy trên domain Vercel hoặc web server (cùng origin)
  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    return window.location.origin;
  }

  return "http://localhost:3001";
}

export function setApiBaseUrl(url: string) {
  localStorage.setItem("hub1688_backend_url", url.trim());
}

const TOKEN_KEY = "hub1688_access_token";
export const getAccessToken = (): string => sessionStorage.getItem(TOKEN_KEY) || "";
export const setAccessToken = (token: string): void => sessionStorage.setItem(TOKEN_KEY, token);
export const clearAccessToken = (): void => sessionStorage.removeItem(TOKEN_KEY);

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const base = getApiBaseUrl();
  const url = `${base}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;

  try {
    const token = getAccessToken();
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers
      }
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      if (res.status === 401 && endpoint !== "/api/v1/auth/login") {
        clearAccessToken();
        window.dispatchEvent(new Event("hub1688:auth-expired"));
      }
      throw new Error(errBody.error || errBody.message || `Lỗi HTTP ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } catch (err: any) {
    console.error(`[API Error] ${endpoint}:`, err);
    throw err;
  }
}

export const AdminApi = {
  async login(email: string, password: string): Promise<{ accessToken: string; expiresAt?: number; user: { id: string; email: string; name: string; role: "ADMIN" | "SOURCING" } }> {
    return request("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  },
  // 1. Thống kê Dashboard
  async getDashboardStats(): Promise<{
    totalProducts: number;
    publishedCount: number;
    draftCount: number;
    totalStock: number;
    avgQuality: number;
    categoryCount: Record<string, number>;
    supplierCount: number;
  }> {
    return request("/api/v1/dashboard/stats");
  },

  // 2. Danh sách sản phẩm
  async getProducts(params?: {
    status?: string;
    category?: string;
    search?: string;
    minQuality?: number;
    sort?: string;
  }): Promise<{ total: number; items: WebProduct[] }> {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.category) query.set("category", params.category);
    if (params?.search) query.set("search", params.search);
    if (params?.minQuality) query.set("minQuality", params.minQuality.toString());
    if (params?.sort) query.set("sort", params.sort);

    const qs = query.toString();
    return request(`/api/v1/products${qs ? "?" + qs : ""}`);
  },

  // 2b. Đồng bộ danh sách sản phẩm cục bộ lên RAM backend
  async syncBatchProducts(products: WebProduct[]): Promise<{ success: boolean; addedCount: number; totalCount: number }> {
    return request("/api/v1/products/sync-batch", {
      method: "POST",
      body: JSON.stringify({ products })
    });
  },

  // 3. Chi tiết 1 sản phẩm
  async getProductById(id: string): Promise<WebProduct> {
    return request(`/api/v1/products/${id}`);
  },

  // 4. Cập nhật sản phẩm
  async updateProduct(id: string, updates: Partial<WebProduct>): Promise<{ success: boolean; product: WebProduct }> {
    return request(`/api/v1/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates)
    });
  },

  // 5. Cập nhật cờ khóa trường
  async updateFieldLocks(id: string, locks: {
    isTitleLocked?: boolean;
    isDescLocked?: boolean;
    isImagesLocked?: boolean;
    isPriceAutoSync?: boolean;
    isStockAutoSync?: boolean;
  }): Promise<{ success: boolean; product: WebProduct }> {
    return request(`/api/v1/products/${id}/locks`, {
      method: "PATCH",
      body: JSON.stringify(locks)
    });
  },

  // 6. Đăng bán sản phẩm
  async publishProduct(id: string): Promise<{ success: boolean; product: WebProduct }> {
    return request(`/api/v1/products/${id}/publish`, {
      method: "POST"
    });
  },

  // 7. Đăng bán hàng loạt
  async bulkPublish(ids: string[]): Promise<{ success: boolean; count: number }> {
    return request("/api/v1/products/bulk-publish", {
      method: "POST",
      body: JSON.stringify({ ids })
    });
  },

  // 8. Xóa sản phẩm
  async deleteProduct(id: string): Promise<{ success: boolean }> {
    return request(`/api/v1/products/${id}`, {
      method: "DELETE"
    });
  },

  // 9. Xóa hàng loạt
  async bulkDelete(ids: string[]): Promise<{ success: boolean; count: number }> {
    return request("/api/v1/products/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids })
    });
  },

  // 10. Lấy danh sách chênh lệch Diff
  async getDiffLogs(): Promise<{ logs: ProductDiffSummary[] }> {
    return request("/api/v1/sync/diff-logs");
  },

  // 11. Xử lý chênh lệch Diff (Apply / Ignore)
  async resolveDiff(webProductId: string, action: "APPLY" | "IGNORE"): Promise<{ success: boolean; message: string }> {
    return request("/api/v1/sync/resolve-diff", {
      method: "POST",
      body: JSON.stringify({ webProductId, action })
    });
  },

  // 12. Danh sách quy tắc giá
  async getPricingRules(): Promise<{ rules: PricingRuleConfig[] }> {
    return request("/api/v1/pricing/rules");
  },

  // 13. Tính toán giá thử nghiệm
  async calculatePricing(priceCNY: number, ruleId?: string): Promise<{ breakdown: PricingBreakdown }> {
    return request("/api/v1/pricing/calculate", {
      method: "POST",
      body: JSON.stringify({ priceCNY, ruleId })
    });
  },

  // 14. Từ điển thuật ngữ
  async getGlossary(): Promise<{ glossary: Record<string, string> }> {
    return request("/api/v1/glossary");
  },

  // 15. Thêm/sửa từ điển
  async setGlossaryTerm(chineseTerm: string, vietnameseTerm: string): Promise<{ success: boolean }> {
    return request("/api/v1/glossary", {
      method: "POST",
      body: JSON.stringify({ chineseTerm, vietnameseTerm })
    });
  },

  // 16. Omnichannel Connectors - WooCommerce
  async syncWooCommerce(productId: string, config: any): Promise<{ success: boolean; result: any }> {
    return request("/api/v1/connectors/woocommerce/sync", {
      method: "POST",
      body: JSON.stringify({ productId, config })
    });
  },

  // 17. Omnichannel Connectors - Shopify
  async syncShopify(productId: string, config: any): Promise<{ success: boolean; result: any }> {
    return request("/api/v1/connectors/shopify/sync", {
      method: "POST",
      body: JSON.stringify({ productId, config })
    });
  },

  // 18. Omnichannel Connectors - Marketplace CSV Export
  async exportMarketplaceCSV(productIds: string[], platform: "SHOPEE" | "TIKTOK_SHOP"): Promise<Blob> {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/api/v1/connectors/export-csv`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAccessToken()}` },
      body: JSON.stringify({ productIds, platform })
    });
    if (!res.ok) {
      throw new Error(`Xuất CSV thất bại: HTTP ${res.status}`);
    }
    return res.blob();
  },

  // 19. Telegram Alerts
  async testTelegram(botToken: string, chatId: string): Promise<any> {
    return request("/api/v1/connectors/telegram/test", {
      method: "POST",
      body: JSON.stringify({ botToken, chatId })
    });
  },

  async sendTelegramAlert(botToken: string, chatId: string, type: string, data: any): Promise<any> {
    return request("/api/v1/connectors/telegram/send-alert", {
      method: "POST",
      body: JSON.stringify({ botToken, chatId, type, data })
    });
  },

  // 20. AI Marketing Copywriter
  async generateAICopy(productId: string, style?: string, language?: string): Promise<{
    success: boolean;
    style: string;
    language: string;
    copy: {
      headline: string;
      bodyHtml: string;
      bodyText: string;
      callToAction: string;
    };
  }> {
    return request("/api/v1/ai/generate-copy", {
      method: "POST",
      body: JSON.stringify({ productId, style, language })
    });
  },

  // 21. Customer Orders & Sourcing Assistant
  async getOrders(): Promise<{ orders: any[]; stats: any }> {
    return request("/api/v1/orders");
  },

  async updateOrderStatus(id: string, status: string, note?: string): Promise<{ success: boolean; order: any }> {
    return request(`/api/v1/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, note })
    });
  },

  async deleteOrder(id: string): Promise<{ success: boolean }> {
    return request(`/api/v1/orders/${id}`, {
      method: "DELETE"
    });
  },

  // 22. Multi-Platform Product Cloner (1688, Taobao, Tmall, Shopee, TikTok, AliExpress, Web)
  async getSupportedClonePlatforms(): Promise<{ success: boolean; platforms: SupportedPlatformInfo[] }> {
    return request("/api/v1/clone/supported-platforms");
  },

  async previewCloneProduct(url: string, platform?: SourcePlatform): Promise<{ success: boolean; preview: ClonePreviewResponse }> {
    return request("/api/v1/clone/preview", {
      method: "POST",
      body: JSON.stringify({ url, platform })
    });
  },

  async executeCloneProduct(data: CloneExecuteRequest): Promise<{ success: boolean; message: string; product: WebProduct }> {
    return request("/api/v1/clone/execute", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async batchCloneProducts(data: BatchCloneRequest): Promise<BatchCloneResponse & { success: boolean; message: string }> {
    return request("/api/v1/clone/batch", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async getVisualSourcingMatches(data: VisualSourcingRequest): Promise<VisualSourcingResponse> {
    return request("/api/v1/clone/visual-sourcing", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  // 23. Product Templates Management (Content & Variation Presets)
  async getTemplates(category?: string, search?: string): Promise<{ success: boolean; total: number; templates: ProductTemplate[] }> {
    const params = new URLSearchParams();
    if (category && category !== "ALL") params.append("category", category);
    if (search) params.append("search", search);
    const query = params.toString() ? `?${params.toString()}` : "";
    return request(`/api/v1/templates${query}`);
  },

  async createTemplate(tpl: Partial<ProductTemplate>): Promise<{ success: boolean; template: ProductTemplate }> {
    return request("/api/v1/templates", { method: "POST", body: JSON.stringify(tpl) });
  },

  async updateTemplate(id: string, tpl: Partial<ProductTemplate>): Promise<{ success: boolean; template: ProductTemplate }> {
    return request(`/api/v1/templates/${id}`, { method: "PUT", body: JSON.stringify(tpl) });
  },

  async deleteTemplate(id: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/v1/templates/${id}`, { method: "DELETE" });
  },

  async resetDefaultTemplates(): Promise<{ success: boolean; total: number; templates: ProductTemplate[] }> {
    return request("/api/v1/templates/reset-defaults", {
      method: "POST"
    });
  },

  // 24. Media Mirroring (Lưu trữ ảnh vĩnh viễn trên Supabase/CDN)
  async mirrorProductImages(productId: string): Promise<{ success: boolean; message: string; stats: any; product: WebProduct }> {
    return request(`/api/v1/products/${productId}/mirror-images`, {
      method: "POST"
    });
  },

  // 25. AI Inpainting (Xóa chữ tiếng Trung & tem mác trên ảnh)
  async inpaintImage(data: { imageUrl: string; maskDataUrl?: string; rectangles?: Array<{ x: number; y: number; width: number; height: number }> }): Promise<{ success: boolean; resultImageUrl: string; message?: string }> {
    return request("/api/v1/ai/inpaint-image", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  // 26. Cửa Hàng Trực Tiếp (Built-in Storefront E-Commerce)
  async getStoreInfo(): Promise<{ success: boolean; config: StorefrontConfig }> {
    return request("/api/v1/store/info");
  },

  async updateStoreSettings(settings: Partial<StorefrontConfig>): Promise<{ success: boolean; config: StorefrontConfig }> {
    return request("/api/v1/store/settings", {
      method: "POST",
      body: JSON.stringify(settings)
    });
  },

  async getStoreProducts(params?: {
    category?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    total: number;
    page: number;
    limit: number;
    categories: string[];
    products: WebProduct[];
  }> {
    const q = new URLSearchParams();
    if (params?.category) q.set("category", params.category);
    if (params?.search) q.set("search", params.search);
    if (params?.minPrice) q.set("minPrice", params.minPrice.toString());
    if (params?.maxPrice) q.set("maxPrice", params.maxPrice.toString());
    if (params?.sort) q.set("sort", params.sort);
    if (params?.page) q.set("page", params.page.toString());
    if (params?.limit) q.set("limit", params.limit.toString());
    const qs = q.toString();
    return request(`/api/v1/store/products${qs ? "?" + qs : ""}`);
  },

  async getStoreProductDetail(idOrSlug: string): Promise<{
    success: boolean;
    product: WebProduct;
    relatedProducts: WebProduct[];
  }> {
    return request(`/api/v1/store/products/${encodeURIComponent(idOrSlug)}`);
  },

  async checkoutStoreOrder(data: StorefrontCheckoutRequest): Promise<{
    success: boolean;
    order: CustomerOrder;
    qrCodeUrl?: string;
    message: string;
  }> {
    return request("/api/v1/store/orders", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async trackStoreOrder(query: string): Promise<{
    success: boolean;
    orders: CustomerOrder[];
  }> {
    return request(`/api/v1/store/orders/track/${encodeURIComponent(query)}`);
  }
};
