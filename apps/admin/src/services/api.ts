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
  AITemplateDraftRequest,
  AITemplateDraftResponse,
  StorefrontConfig,
  StorefrontCheckoutRequest,
  CustomerOrder,
  PersonalizationImageValue,
  CustomizerAsset,
  ChannelAccountSummary,
  ChannelListingSummary,
  ChannelPublishResult,
  ChannelReadinessResult,
  ShopeeAttributeOption,
  ShopeeAppConfigInput,
  ShopeeAppConfigSummary,
  ShopeeCategoryOption,
  ShopeeConnectorDashboard,
  ShopeeListingDraft,
  ShopeeLogisticsOption,
  ShopeeSyncRunResult
} from "@hub1688/shared-types";

export interface AISEOContentDraft {
  focusKeyword: string;
  secondaryKeywords: string[];
  title: string;
  shortDescription: string;
  fullDescriptionHtml: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  faqs: Array<{ question: string; answer: string }>;
}

export interface AIGeneratedProductCopy {
  style: string;
  headline: string;
  hook: string;
  body: string;
  bodyHtml: string;
  bodyText: string;
  callToAction: string;
  hashtags: string[];
  fullText: string;
  seo: AISEOContentDraft;
}

// Lấy API URL từ localStorage hoặc fallback về window.location.origin hoặc localhost
export function getApiBaseUrl(): string {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/+$/, "");

  if (import.meta.env.PROD && typeof window !== "undefined") return window.location.origin;

  const customUrl = localStorage.getItem("hub1688_backend_url");
  if (customUrl) return customUrl.replace(/\/+$/, "");

  // Nếu đang chạy trên domain Vercel hoặc web server (cùng origin)
  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    return window.location.origin;
  }

  return "http://localhost:3001";
}

export function setApiBaseUrl(url: string) {
  const parsed = new URL(url.trim());
  if (!/^https?:$/.test(parsed.protocol)) throw new Error("Backend URL phải dùng HTTP hoặc HTTPS");
  if (import.meta.env.PROD && parsed.origin !== window.location.origin) {
    throw new Error("Production chỉ cho phép API cùng origin hoặc VITE_API_BASE_URL cố định");
  }
  localStorage.setItem("hub1688_backend_url", parsed.origin);
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
      const blockerText = Array.isArray(errBody.blockers) && errBody.blockers.length > 0
        ? `: ${errBody.blockers.map((item: unknown) => typeof item === "string" ? item : JSON.stringify(item)).join("; ")}`
        : "";
      const issueText = Array.isArray(errBody.details?.issues) && errBody.details.issues.length > 0
        ? `: ${errBody.details.issues.slice(0, 5).map((issue: any) => `${Array.isArray(issue.path) && issue.path.length ? issue.path.join(".") : "dữ liệu"} — ${issue.message}`).join("; ")}`
        : "";
      throw new Error(`${errBody.message || errBody.error || `Lỗi HTTP ${res.status}: ${res.statusText}`}${blockerText || issueText}`);
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

  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    return request("/api/v1/auth/password-reset/request", {
      method: "POST",
      body: JSON.stringify({ email })
    });
  },

  async confirmPasswordReset(recoveryToken: string, password: string): Promise<{ success: boolean; message: string }> {
    return request("/api/v1/auth/password-reset/confirm", {
      method: "POST",
      headers: { Authorization: `Bearer ${recoveryToken}` },
      body: JSON.stringify({ password })
    });
  },
  // 1. Thống kê Dashboard
  async getDashboardStats(): Promise<{
    totalProducts: number;
    publishedCount: number;
    draftCount: number;
    totalStock: number;
    totalVariants: number;
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
    collection?: string;
    search?: string;
    minQuality?: number;
    maxQuality?: number;
    media?: string;
    sort?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ total: number; items: WebProduct[] }> {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.category) query.set("category", params.category);
    if (params?.search) query.set("search", params.search);
    if (params?.minQuality) query.set("minQuality", params.minQuality.toString());
    if (params?.maxQuality !== undefined) query.set("maxQuality", params.maxQuality.toString());
    if (params?.media) query.set("media", params.media);
    if (params?.sort) query.set("sort", params.sort);
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("pageSize", String(params.pageSize));

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

  async createPricingRule(rule: PricingRuleConfig): Promise<{ success: boolean; rule: PricingRuleConfig }> {
    return request("/api/v1/pricing/rules", { method: "POST", body: JSON.stringify(rule) });
  },

  async updatePricingRule(id: string, updates: Partial<PricingRuleConfig>): Promise<{ success: boolean; rule: PricingRuleConfig }> {
    return request(`/api/v1/pricing/rules/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(updates) });
  },

  async deletePricingRule(id: string): Promise<{ success: boolean }> {
    return request(`/api/v1/pricing/rules/${encodeURIComponent(id)}`, { method: "DELETE" });
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
  async syncWooCommerce(productId: string): Promise<{ success: boolean; result: any }> {
    return request("/api/v1/connectors/woocommerce/sync", {
      method: "POST",
      body: JSON.stringify({ productId })
    });
  },

  // 17. Omnichannel Connectors - Shopify
  async syncShopify(productId: string): Promise<{ success: boolean; result: any }> {
    return request("/api/v1/connectors/shopify/sync", {
      method: "POST",
      body: JSON.stringify({ productId })
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

  async getShopeeStatus(): Promise<{ success: boolean; account: ChannelAccountSummary }> {
    return request("/api/v1/connectors/shopee/status");
  },

  async getShopeeAppConfig(): Promise<{ success: boolean; config: ShopeeAppConfigSummary }> {
    return request("/api/v1/connectors/shopee/app-config");
  },

  async getShopeeAppConfigs(): Promise<{ success: boolean; configs: ShopeeAppConfigSummary[] }> {
    return request("/api/v1/connectors/shopee/app-configs");
  },

  async saveShopeeAppConfig(config: ShopeeAppConfigInput): Promise<{ success: boolean; config: ShopeeAppConfigSummary }> {
    return request("/api/v1/connectors/shopee/app-config", { method: "PUT", body: JSON.stringify(config) });
  },

  async getShopeeAccounts(appConfigId?: string): Promise<{ success: boolean; accounts: ChannelAccountSummary[] }> {
    const query = appConfigId ? `?appConfigId=${encodeURIComponent(appConfigId)}` : "";
    return request(`/api/v1/connectors/shopee/accounts${query}`);
  },

  async getShopeeDashboard(appConfigId?: string): Promise<{ success: boolean; dashboard: ShopeeConnectorDashboard }> {
    const query = appConfigId ? `?appConfigId=${encodeURIComponent(appConfigId)}` : "";
    return request(`/api/v1/connectors/shopee/dashboard${query}`);
  },

  async refreshShopeeAccount(accountId: string): Promise<{ success: boolean; account: ChannelAccountSummary }> {
    return request(`/api/v1/connectors/shopee/accounts/${encodeURIComponent(accountId)}/refresh`, { method: "POST" });
  },

  async disconnectShopeeAccount(accountId: string): Promise<{ success: boolean; account: ChannelAccountSummary }> {
    return request(`/api/v1/connectors/shopee/accounts/${encodeURIComponent(accountId)}`, { method: "DELETE" });
  },

  async syncShopeeInventory(accountId?: string, limit = 10): Promise<{ success: boolean; result: ShopeeSyncRunResult }> {
    return request("/api/v1/connectors/shopee/inventory-sync", {
      method: "POST",
      body: JSON.stringify({ ...(accountId ? { accountId } : {}), limit })
    });
  },

  async getShopeeAuthorizationUrl(appConfigId?: string): Promise<{ success: boolean; authorizationUrl: string }> {
    return request("/api/v1/connectors/shopee/authorization-url", { method: "POST", body: JSON.stringify({ appConfigId }) });
  },

  async getShopeeCategories(accountId?: string): Promise<{ success: boolean; categories: ShopeeCategoryOption[] }> {
    const query = accountId ? `?accountId=${encodeURIComponent(accountId)}` : "";
    return request(`/api/v1/connectors/shopee/categories${query}`);
  },

  async getShopeeAttributes(categoryId: string, accountId?: string): Promise<{ success: boolean; attributes: ShopeeAttributeOption[] }> {
    const query = accountId ? `?accountId=${encodeURIComponent(accountId)}` : "";
    return request(`/api/v1/connectors/shopee/categories/${encodeURIComponent(categoryId)}/attributes${query}`);
  },

  async getShopeeLogistics(accountId?: string): Promise<{ success: boolean; logistics: ShopeeLogisticsOption[] }> {
    const query = accountId ? `?accountId=${encodeURIComponent(accountId)}` : "";
    return request(`/api/v1/connectors/shopee/logistics${query}`);
  },

  async validateShopeeListing(draft: ShopeeListingDraft): Promise<{ success: boolean; readiness: ChannelReadinessResult }> {
    return request("/api/v1/connectors/shopee/listings/validate", { method: "POST", body: JSON.stringify(draft) });
  },

  async publishShopeeListing(draft: ShopeeListingDraft): Promise<ChannelPublishResult> {
    return request("/api/v1/connectors/shopee/listings/publish", { method: "POST", body: JSON.stringify(draft) });
  },

  async getShopeeListings(): Promise<{ success: boolean; listings: ChannelListingSummary[] }> {
    return request("/api/v1/connectors/shopee/listings");
  },

  // 19. Telegram Alerts
  async testTelegram(): Promise<any> {
    return request("/api/v1/connectors/telegram/test", {
      method: "POST",
      body: JSON.stringify({})
    });
  },

  async sendTelegramAlert(type: string, data: any): Promise<any> {
    return request("/api/v1/connectors/telegram/send-alert", {
      method: "POST",
      body: JSON.stringify({ type, data })
    });
  },

  // 20. AI Marketing Copywriter
  async generateAICopy(productId: string, options?: {
    style?: string;
    language?: "VI" | "EN";
    focusKeyword?: string;
    secondaryKeywords?: string[];
    tone?: "TRUSTWORTHY" | "CONVERSION" | "PREMIUM" | "FRIENDLY";
  }): Promise<{
    success: boolean;
    style: string;
    language: string;
    mode?: "DEMO" | "LIVE";
    copy: AIGeneratedProductCopy;
  }> {
    return request("/api/v1/ai/generate-copy", {
      method: "POST",
      body: JSON.stringify({ productId, ...options })
    });
  },

  async generateAITemplate(data: AITemplateDraftRequest): Promise<AITemplateDraftResponse> {
    return request("/api/v1/ai/generate-template", {
      method: "POST",
      body: JSON.stringify(data)
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

  async getCustomizerAssets(params?: { search?: string; assetType?: string }): Promise<{ total: number; items: CustomizerAsset[] }> {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.assetType) query.set("assetType", params.assetType);
    return request(`/api/v1/products/customizer-assets${query.toString() ? `?${query.toString()}` : ""}`);
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
    collection?: string;
    search?: string;
    occasion?: string;
    recipient?: string;
    personalized?: boolean;
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
    hasNextPage?: boolean;
    categories: string[];
    products: WebProduct[];
  }> {
    const q = new URLSearchParams();
    if (params?.category) q.set("category", params.category);
    if (params?.collection) q.set("collection", params.collection);
    if (params?.search) q.set("search", params.search);
    if (params?.occasion) q.set("occasion", params.occasion);
    if (params?.recipient) q.set("recipient", params.recipient);
    if (params?.personalized) q.set("personalized", "1");
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

  async uploadCustomizationImage(data: {
    dataUrl: string;
    fileName: string;
    guestSessionId: string;
    width: number;
    height: number;
  }): Promise<{ success: boolean; image: PersonalizationImageValue }> {
    return request("/api/v1/store/customizations/upload", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async trackStoreOrder(orderNumber: string, customerPhone: string): Promise<{
    success: boolean;
    orders: CustomerOrder[];
  }> {
    return request("/api/v1/store/orders/track", {
      method: "POST",
      body: JSON.stringify({ orderNumber, customerPhone })
    });
  }
};
