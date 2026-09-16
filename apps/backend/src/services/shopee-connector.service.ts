import crypto from "node:crypto";
import {
  ChannelAccountSummary,
  ChannelListingSummary,
  ChannelPublishResult,
  ChannelReadinessIssue,
  ChannelReadinessResult,
  ShopeeAppConfigInput,
  ShopeeAppConfigSummary,
  ShopeeAttributeOption,
  ShopeeCategoryOption,
  ShopeeListingDraft,
  ShopeeLogisticsOption,
  WebProduct,
  WebProductVariant
} from "@hub1688/shared-types";
import { ENV } from "../config/env.js";
import { safeFetch } from "../utils/safe-network.js";
import { channelCryptoService } from "./channel-crypto.service.js";
import { mediaMirrorService } from "./media-mirror.service.js";
import { supabaseService } from "./supabase.service.js";

interface StoredChannelAccount {
  id: string;
  channel_app_config_id?: string;
  platform: "SHOPEE";
  shop_id: string;
  shop_name?: string;
  region: string;
  access_token_ciphertext: string;
  refresh_token_ciphertext: string;
  token_expires_at?: string;
  refresh_token_expires_at?: string;
  granted_scopes?: string[];
  status: string;
  last_health_check_at?: string;
  updated_at?: string;
}

interface StoredShopeeAppConfig {
  id: string;
  platform: "SHOPEE";
  name: string;
  region: string;
  partner_id: string;
  partner_key_ciphertext: string;
  redirect_url: string;
  is_active: boolean;
  created_by?: string;
  updated_by?: string;
  updated_at?: string;
}

interface ShopeeRuntimeConfig {
  id?: string;
  name: string;
  region: string;
  partnerId: string;
  partnerKey: string;
  redirectUrl: string;
  source: "DATABASE" | "ENVIRONMENT";
}

interface ShopeeApiAccount extends StoredChannelAccount {
  accessToken: string;
  refreshToken: string;
  appConfig: ShopeeRuntimeConfig;
}

interface ShopeeApiResult<T = any> {
  error?: string;
  message?: string;
  request_id?: string;
  response?: T;
  warning?: string;
  access_token?: string;
  refresh_token?: string;
  expire_in?: number;
  refresh_token_expire_in?: number;
  shop_id_list?: number[];
}

export class ShopeeConnectorError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message);
  }
}

const apiId = (value: string): string | number => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : value;
};

const stripHtml = (value: string): string => value
  .replace(/<br\s*\/?>/gi, "\n")
  .replace(/<\/p>/gi, "\n")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/\n{3,}/g, "\n\n")
  .replace(/[ \t]{2,}/g, " ")
  .trim();

const unique = <T>(values: T[]): T[] => Array.from(new Set(values));

export function selectShopeeVariants(product: WebProduct, draft: ShopeeListingDraft): WebProductVariant[] {
  const selectedIds = new Set(draft.selectedVariantIds || []);
  return (product.variants || []).filter(variant => {
    if (!variant.selectedForSale) return false;
    if (!selectedIds.size) return true;
    return selectedIds.has(variant.id || "") || selectedIds.has(variant.sourceSkuId);
  });
}

export function validateShopeeListing(product: WebProduct, draft: ShopeeListingDraft): ChannelReadinessResult {
  const issues: ChannelReadinessIssue[] = [];
  const variants = selectShopeeVariants(product, draft);
  const title = draft.title.trim();
  const description = stripHtml(draft.description);
  const images = unique([product.primaryImage, ...(product.galleryImages || [])].filter(Boolean));
  const variantsWithImages = variants.filter(variant => Boolean(variant.imageUrl)).length;
  const add = (code: string, severity: ChannelReadinessIssue["severity"], field: string, message: string, sku?: string) => {
    issues.push({ code, severity, field, message, sku });
  };

  if (product.status !== "PUBLISHED") add("PRODUCT_NOT_PUBLISHED", "BLOCKER", "product", "Sản phẩm phải được duyệt và xuất bản nội bộ trước khi đăng Shopee.");
  if (title.length < 10) add("TITLE_TOO_SHORT", "BLOCKER", "title", "Tiêu đề cần ít nhất 10 ký tự.");
  if (title.length > 120) add("TITLE_TOO_LONG", "BLOCKER", "title", "Tiêu đề Shopee không được vượt quá 120 ký tự.");
  if (description.length < 20) add("DESCRIPTION_TOO_SHORT", "BLOCKER", "description", "Mô tả cần ít nhất 20 ký tự sau khi loại bỏ HTML.");
  if (!draft.categoryId.trim()) add("CATEGORY_REQUIRED", "BLOCKER", "categoryId", "Chưa chọn ngành hàng Shopee.");
  if (!Number.isFinite(draft.weightKg) || draft.weightKg <= 0) add("WEIGHT_REQUIRED", "BLOCKER", "weightKg", "Cần nhập cân nặng sau đóng gói lớn hơn 0 kg.");
  if (!product.primaryImage) add("PRIMARY_IMAGE_REQUIRED", "BLOCKER", "images", "Sản phẩm chưa có ảnh bìa.");
  if (images.length < 3) add("MORE_IMAGES_RECOMMENDED", "WARNING", "images", "Nên có tối thiểu 3 ảnh để listing thuyết phục hơn.");
  if (!variants.length) add("VARIANTS_REQUIRED", "BLOCKER", "variants", "Chưa chọn biến thể để bán trên Shopee.");
  if (!(draft.logistics || []).some(item => item.enabled)) add("LOGISTICS_REQUIRED", "BLOCKER", "logistics", "Cần bật ít nhất một đơn vị vận chuyển Shopee.");

  const required = new Set(draft.requiredAttributeIds || []);
  const completed = new Set((draft.attributes || []).filter(item => item.valueId || item.valueName?.trim()).map(item => item.attributeId));
  required.forEach(attributeId => {
    if (!completed.has(attributeId)) add("ATTRIBUTE_REQUIRED", "BLOCKER", `attribute:${attributeId}`, `Thuộc tính bắt buộc ${attributeId} chưa có giá trị.`);
  });

  const seenSkus = new Set<string>();
  variants.forEach(variant => {
    const sku = variant.sourceSkuId.trim();
    if (!sku) add("SKU_REQUIRED", "BLOCKER", "variants", "Biến thể chưa có Seller SKU.");
    else if (seenSkus.has(sku)) add("SKU_DUPLICATED", "BLOCKER", "variants", `Seller SKU ${sku} bị trùng.`, sku);
    seenSkus.add(sku);
    if (!Number.isFinite(variant.sellingPriceVND) || variant.sellingPriceVND <= 0) add("PRICE_REQUIRED", "BLOCKER", "variants", `SKU ${sku} chưa có giá bán hợp lệ.`, sku);
    if (!Number.isInteger(variant.stockQuantity) || variant.stockQuantity < 0) add("STOCK_INVALID", "BLOCKER", "variants", `SKU ${sku} có tồn kho không hợp lệ.`, sku);
  });

  const primaryOptions = unique(variants.map(variant => variant.colorName || "Mặc định"));
  if (primaryOptions.length > 1) {
    primaryOptions.forEach(option => {
      if (!variants.some(variant => (variant.colorName || "Mặc định") === option && variant.imageUrl)) {
        add("VARIANT_IMAGE_MISSING", "WARNING", "variants", `Phân loại ${option} chưa có ảnh riêng.`);
      }
    });
  }

  const blockerCount = issues.filter(issue => issue.severity === "BLOCKER").length;
  const warningCount = issues.filter(issue => issue.severity === "WARNING").length;
  const score = Math.max(0, 100 - blockerCount * 18 - warningCount * 4);
  return {
    platform: "SHOPEE",
    score,
    isReady: blockerCount === 0,
    issues,
    stats: {
      selectedVariants: variants.length,
      variantsWithImages,
      galleryImages: images.length,
      totalStock: variants.reduce((sum, variant) => sum + Math.max(0, variant.stockQuantity || 0), 0)
    }
  };
}

export function buildShopeeItemPayload(
  product: WebProduct,
  draft: ShopeeListingDraft,
  mainImageIds: string[],
  variantImageIds: Map<string, string>
): Record<string, unknown> {
  const variants = selectShopeeVariants(product, draft);
  const stockBuffer = Math.max(0, Math.floor(draft.stockBuffer || 0));
  const priceFactor = 1 + (draft.priceAdjustmentPercent || 0) / 100;
  const priceOf = (variant: WebProductVariant): number => Math.max(1_000, Math.round(variant.sellingPriceVND * priceFactor));
  const stockOf = (variant: WebProductVariant): number => Math.max(0, Math.floor(variant.stockQuantity || 0) - stockBuffer);
  const dimensions = draft.dimensions || {};
  const payload: Record<string, any> = {
    item_name: draft.title.trim(),
    description: stripHtml(draft.description),
    category_id: apiId(draft.categoryId),
    item_status: "NORMAL",
    condition: "NEW",
    weight: Number(draft.weightKg.toFixed(3)),
    image: { image_id_list: mainImageIds },
    logistic_info: (draft.logistics || []).filter(item => item.enabled).map(item => ({
      logistic_id: apiId(item.logisticId),
      enabled: true,
      ...(item.shippingFeeVND !== undefined ? { shipping_fee: item.shippingFeeVND } : {}),
      ...(item.freeShipping !== undefined ? { is_free: item.freeShipping } : {})
    })),
    attribute_list: (draft.attributes || []).filter(item => item.valueId || item.valueName?.trim()).map(item => ({
      attribute_id: apiId(item.attributeId),
      attribute_value_list: [{
        ...(item.valueId ? { value_id: apiId(item.valueId) } : { value_id: 0 }),
        ...(item.valueName?.trim() ? { original_value_name: item.valueName.trim() } : {})
      }]
    }))
  };
  if (dimensions.lengthCm && dimensions.widthCm && dimensions.heightCm) {
    payload.dimension = {
      package_length: Math.round(dimensions.lengthCm),
      package_width: Math.round(dimensions.widthCm),
      package_height: Math.round(dimensions.heightCm)
    };
  }
  if (draft.brandId || draft.brandName) {
    payload.brand = {
      ...(draft.brandId ? { brand_id: apiId(draft.brandId) } : {}),
      ...(draft.brandName ? { original_brand_name: draft.brandName } : {})
    };
  }

  if (variants.length === 1) {
    payload.original_price = priceOf(variants[0]);
    payload.seller_stock = [{ stock: stockOf(variants[0]) }];
    payload.item_sku = variants[0].sourceSkuId;
    return payload;
  }

  const primaryValues = unique(variants.map(variant => variant.colorName || "Mặc định"));
  const secondaryValues = unique(variants.map(variant => variant.sizeName || "Tiêu chuẩn"));
  const hasPrimaryTier = primaryValues.length > 1;
  const hasSecondaryTier = secondaryValues.length > 1;
  const tierVariation: any[] = [];
  if (hasPrimaryTier || !hasSecondaryTier) {
    tierVariation.push({
      name: draft.primaryVariationName?.trim() || "Mẫu thiết kế",
      option_list: primaryValues.map(option => ({
        option,
        ...(variantImageIds.get(option) ? { image: { image_id: variantImageIds.get(option) } } : {})
      }))
    });
  }
  if (hasSecondaryTier) {
    tierVariation.push({
      name: draft.secondaryVariationName?.trim() || "Kích thước",
      option_list: secondaryValues.map(option => ({ option }))
    });
  }
  payload.tier_variation = tierVariation;
  payload.model = variants.map(variant => {
    const indexes: number[] = [];
    if (hasPrimaryTier || !hasSecondaryTier) indexes.push(Math.max(0, primaryValues.indexOf(variant.colorName || "Mặc định")));
    if (hasSecondaryTier) indexes.push(Math.max(0, secondaryValues.indexOf(variant.sizeName || "Tiêu chuẩn")));
    return {
      tier_index: indexes,
      original_price: priceOf(variant),
      model_sku: variant.sourceSkuId,
      seller_stock: [{ stock: stockOf(variant) }]
    };
  });
  return payload;
}

export class ShopeeConnectorService {
  private readonly inMemoryAccounts = new Map<string, StoredChannelAccount>();
  private readonly inMemoryAppConfigs = new Map<string, StoredShopeeAppConfig>();

  private defaultRedirectUrl(): string {
    return ENV.SHOPEE_REDIRECT_URL || (ENV.PUBLIC_APP_URL ? `${ENV.PUBLIC_APP_URL.replace(/\/+$/, "")}/api/v1/connectors/shopee/callback` : "");
  }

  private baseUrl(): string {
    const base = ENV.SHOPEE_API_BASE_URL.replace(/\/+$/, "");
    if (!/^https:\/\/(partner|partner\.uat)\.shopeemobile\.com$/i.test(base)) {
      throw new ShopeeConnectorError("SHOPEE_API_HOST_INVALID", "SHOPEE_API_BASE_URL không thuộc Shopee Open Platform", 503);
    }
    return base;
  }

  private sign(config: ShopeeRuntimeConfig, path: string, timestamp: number, accessToken?: string, shopId?: string): string {
    const base = `${config.partnerId}${path}${timestamp}${accessToken || ""}${shopId || ""}`;
    return crypto.createHmac("sha256", config.partnerKey).update(base).digest("hex");
  }

  public async getStatus(): Promise<ChannelAccountSummary> {
    const config = await this.getAppConfig();
    if (!config.keyConfigured || !config.partnerId || !config.redirectUrl) {
      return { platform: "SHOPEE", region: config.region, status: "NOT_CONFIGURED", message: config.message || "Chưa lưu cấu hình Shopee Open Platform." };
    }
    const account = await this.getStoredAccount();
    if (!account) return { platform: "SHOPEE", region: config.region, status: "DISCONNECTED", message: "Ứng dụng đã cấu hình; hãy kết nối tài khoản Shopee Seller." };
    return this.mapAccount(account);
  }

  public async getAppConfig(): Promise<ShopeeAppConfigSummary> {
    const stored = await this.getStoredAppConfig();
    if (stored) return this.mapAppConfig(stored);
    const redirectUrl = this.defaultRedirectUrl();
    if (ENV.SHOPEE_PARTNER_ID && ENV.SHOPEE_PARTNER_KEY && redirectUrl && channelCryptoService.isConfigured()) {
      return {
        platform: "SHOPEE",
        name: "Shopee Open Platform",
        region: ENV.SHOPEE_REGION,
        partnerId: ENV.SHOPEE_PARTNER_ID,
        partnerKeyMasked: "••••••••",
        keyConfigured: true,
        redirectUrl,
        isActive: true,
        source: "ENVIRONMENT"
      };
    }
    const missing = [
      !channelCryptoService.isConfigured() && "CHANNEL_TOKEN_ENCRYPTION_KEY",
      !redirectUrl && "SHOPEE_REDIRECT_URL/PUBLIC_APP_URL"
    ].filter(Boolean).join(", ");
    return {
      platform: "SHOPEE",
      name: "Shopee Open Platform",
      region: ENV.SHOPEE_REGION,
      keyConfigured: false,
      redirectUrl,
      isActive: false,
      source: "NONE",
      message: missing ? `Máy chủ còn thiếu: ${missing}` : "Nhập Partner ID và Partner Key để bắt đầu."
    };
  }

  public async saveAppConfig(input: ShopeeAppConfigInput, userId: string): Promise<ShopeeAppConfigSummary> {
    if (!channelCryptoService.isConfigured()) {
      throw new ShopeeConnectorError("CHANNEL_ENCRYPTION_NOT_CONFIGURED", "Máy chủ chưa có khóa mã hóa CHANNEL_TOKEN_ENCRYPTION_KEY", 503);
    }
    const redirectUrl = this.defaultRedirectUrl();
    if (!redirectUrl) throw new ShopeeConnectorError("SHOPEE_REDIRECT_NOT_CONFIGURED", "Máy chủ chưa có Redirect URL", 503);
    const existing = await this.getStoredAppConfig(input.id);
    const partnerKeyCiphertext = input.partnerKey
      ? channelCryptoService.encrypt(input.partnerKey)
      : existing?.partner_key_ciphertext;
    if (!partnerKeyCiphertext) {
      throw new ShopeeConnectorError("SHOPEE_PARTNER_KEY_REQUIRED", "Partner Key là bắt buộc khi cấu hình lần đầu", 400);
    }
    const row: Record<string, unknown> = {
      ...(existing?.id ? { id: existing.id } : {}),
      platform: "SHOPEE",
      name: input.name?.trim() || existing?.name || "Shopee Open Platform",
      region: (input.region || existing?.region || ENV.SHOPEE_REGION).toUpperCase(),
      partner_id: input.partnerId.trim(),
      partner_key_ciphertext: partnerKeyCiphertext,
      redirect_url: redirectUrl,
      is_active: true,
      created_by: existing?.created_by || userId,
      updated_by: userId,
      updated_at: new Date().toISOString()
    };
    const saved = await supabaseService.upsertChannelAppConfig(row);
    let stored: StoredShopeeAppConfig;
    if (saved) stored = saved as StoredShopeeAppConfig;
    else if (ENV.NODE_ENV !== "production") {
      const id = existing?.id || crypto.randomUUID();
      stored = { id, ...(row as Omit<StoredShopeeAppConfig, "id">) };
      this.inMemoryAppConfigs.set(id, stored);
    } else {
      throw new ShopeeConnectorError("SHOPEE_CONFIG_SAVE_FAILED", "Không thể lưu cấu hình Shopee. Hãy chạy migration mới trên Supabase.", 500);
    }
    this.inMemoryAppConfigs.set(stored.id, stored);
    return this.mapAppConfig(stored);
  }

  public async listAccounts(appConfigId?: string): Promise<ChannelAccountSummary[]> {
    const fromDb = await supabaseService.listChannelAccounts("SHOPEE", appConfigId);
    const rows = fromDb.length
      ? fromDb as StoredChannelAccount[]
      : Array.from(this.inMemoryAccounts.values()).filter(account => !appConfigId || account.channel_app_config_id === appConfigId);
    return rows.map(account => this.mapAccount(account));
  }

  public async getAuthorizationUrl(userId: string, appConfigId?: string): Promise<string> {
    const config = await this.getRuntimeConfig(appConfigId);
    const path = "/api/v2/shop/auth_partner";
    const timestamp = Math.floor(Date.now() / 1000);
    const state = channelCryptoService.createOAuthState(userId, config.id);
    const callback = new URL(config.redirectUrl);
    callback.searchParams.set("state", state);
    const url = new URL(path, this.baseUrl());
    url.searchParams.set("partner_id", config.partnerId);
    url.searchParams.set("timestamp", String(timestamp));
    url.searchParams.set("sign", this.sign(config, path, timestamp));
    url.searchParams.set("redirect", callback.toString());
    return url.toString();
  }

  public async handleCallback(code: string, shopId: string, state: string): Promise<void> {
    const statePayload = channelCryptoService.verifyOAuthState(state);
    const config = await this.getRuntimeConfig(statePayload.appConfigId);
    if (!supabaseService.isConfigured() && ENV.NODE_ENV === "production") {
      throw new ShopeeConnectorError("PERSISTENCE_NOT_CONFIGURED", "Supabase phải được cấu hình trước khi kết nối Shopee", 503);
    }
    const token = await this.tokenRequest("/api/v2/auth/token/get", { code, shop_id: apiId(shopId), partner_id: apiId(config.partnerId) }, config);
    if (!token.access_token || !token.refresh_token) throw new ShopeeConnectorError("SHOPEE_TOKEN_FAILED", "Shopee không trả về access token", 502);
    const now = Date.now();
    const row: Record<string, unknown> = {
      platform: "SHOPEE",
      channel_app_config_id: config.id || null,
      shop_id: shopId,
      shop_name: `Shopee Shop ${shopId}`,
      region: config.region,
      access_token_ciphertext: channelCryptoService.encrypt(token.access_token),
      refresh_token_ciphertext: channelCryptoService.encrypt(token.refresh_token),
      token_expires_at: new Date(now + Math.max(60, token.expire_in || 14_400) * 1000).toISOString(),
      refresh_token_expires_at: token.refresh_token_expire_in ? new Date(now + token.refresh_token_expire_in * 1000).toISOString() : null,
      status: "CONNECTED",
      created_by: statePayload.userId,
      last_health_check_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const saved = await supabaseService.upsertChannelAccount(row);
    if (saved) this.inMemoryAccounts.set(saved.id, saved as StoredChannelAccount);
    else if (ENV.NODE_ENV !== "production") {
      const id = crypto.randomUUID();
      this.inMemoryAccounts.set(id, { id, ...(row as Omit<StoredChannelAccount, "id">) });
    } else {
      throw new ShopeeConnectorError("SHOPEE_ACCOUNT_SAVE_FAILED", "Không thể lưu kết nối Shopee vào Supabase", 500);
    }
  }

  public async getCategories(accountId?: string): Promise<ShopeeCategoryOption[]> {
    const account = await this.getApiAccount(accountId);
    const data = await this.apiRequest<any>("/api/v2/product/get_category", "GET", account, undefined, { language: "vi" });
    const list = data.response?.category_list || data.response?.category || [];
    return list.map((item: any) => ({
      id: String(item.category_id),
      name: item.original_category_name || item.display_category_name || item.category_name || String(item.category_id),
      parentId: item.parent_category_id ? String(item.parent_category_id) : undefined,
      hasChildren: Boolean(item.has_children)
    }));
  }

  public async getAttributes(categoryId: string, accountId?: string): Promise<ShopeeAttributeOption[]> {
    const account = await this.getApiAccount(accountId);
    let data: ShopeeApiResult<any>;
    try {
      data = await this.apiRequest<any>("/api/v2/product/get_attribute_tree", "GET", account, undefined, { category_id: categoryId, language: "vi" });
    } catch (error) {
      if (!(error instanceof ShopeeConnectorError) || error.code !== "SHOPEE_API_ERROR") throw error;
      // Some seller markets still expose the earlier v2 endpoint. Keeping the
      // fallback makes the connector market-aware without silently accepting
      // an empty attribute set.
      data = await this.apiRequest<any>("/api/v2/product/get_attributes", "GET", account, undefined, { category_id: categoryId, language: "vi" });
    }
    const root = data.response?.attribute_list || data.response?.attribute_tree || [];
    const list: any[] = [];
    const visit = (items: any[]) => items.forEach(item => {
      if (item?.attribute_id !== undefined) list.push(item);
      const children = item?.children || item?.attribute_list || item?.child_attribute_list;
      if (Array.isArray(children)) visit(children);
    });
    visit(Array.isArray(root) ? root : []);
    return list.map((item: any) => ({
      id: String(item.attribute_id),
      name: item.original_attribute_name || item.display_attribute_name || item.attribute_name || String(item.attribute_id),
      isMandatory: Boolean(item.is_mandatory),
      inputType: item.input_type === undefined ? undefined : String(item.input_type),
      values: (item.attribute_value_list || []).map((value: any) => ({
        id: String(value.value_id),
        name: value.original_value_name || value.display_value_name || value.value_name || String(value.value_id)
      }))
    }));
  }

  public async getLogistics(accountId?: string): Promise<ShopeeLogisticsOption[]> {
    const account = await this.getApiAccount(accountId);
    const data = await this.apiRequest<any>("/api/v2/logistics/get_channel_list", "GET", account);
    const list = data.response?.logistics_channel_list || [];
    return list.map((item: any) => ({
      id: String(item.logistics_channel_id),
      name: item.logistics_channel_name || String(item.logistics_channel_id),
      enabled: Boolean(item.enabled),
      feeType: item.fee_type
    }));
  }

  public async publish(product: WebProduct, draft: ShopeeListingDraft): Promise<ChannelPublishResult> {
    if (!supabaseService.isConfigured() && ENV.NODE_ENV === "production") {
      throw new ShopeeConnectorError("PERSISTENCE_NOT_CONFIGURED", "Cần triển khai migration và cấu hình Supabase trước khi đăng Shopee", 503);
    }
    const readiness = validateShopeeListing(product, draft);
    if (!readiness.isReady) throw new ShopeeConnectorError("CHANNEL_VALIDATION_FAILED", "Listing chưa đủ điều kiện đăng Shopee", 422);
    const account = await this.getApiAccount(draft.accountId);
    const existing = product.id ? await supabaseService.getChannelListing(account.id, product.id) : null;
    if (existing?.external_product_id) throw new ShopeeConnectorError("LISTING_ALREADY_EXISTS", "Sản phẩm đã được đăng lên shop này; hãy dùng chức năng cập nhật listing", 409);
    if (existing?.status === "SUBMITTING") throw new ShopeeConnectorError("LISTING_SUBMISSION_IN_PROGRESS", "Listing đang được gửi; hệ thống chặn gửi lại để tránh tạo sản phẩm trùng", 409);

    const listingSeed = {
      ...(existing?.id ? { id: existing.id } : {}),
      product_id: product.id,
      channel_account_id: account.id,
      platform: "SHOPEE",
      title: draft.title.trim(),
      description: stripHtml(draft.description),
      category_id: draft.categoryId,
      category_path: draft.categoryPath || null,
      brand_id: draft.brandId || null,
      attributes: draft.attributes || [],
      logistics: draft.logistics || [],
      package_info: { weightKg: draft.weightKg, dimensions: draft.dimensions || {} },
      pricing_config: { stockBuffer: draft.stockBuffer || 0, priceAdjustmentPercent: draft.priceAdjustmentPercent || 0 },
      status: "SUBMITTING",
      last_error: null,
      submit_attempts: Number(existing?.submit_attempts || 0) + 1,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    let listing = await supabaseService.upsertChannelListing(listingSeed);
    if (!listing && ENV.NODE_ENV === "production") throw new ShopeeConnectorError("LISTING_SAVE_FAILED", "Không thể tạo bản ghi listing trước khi gửi", 500);
    listing ||= { id: existing?.id || crypto.randomUUID(), ...listingSeed };

    try {
      const mainUrls = unique([product.primaryImage, ...(product.galleryImages || [])].filter(Boolean)).slice(0, 9);
      const mainImageIds: string[] = [];
      const uploadedByUrl = new Map<string, string>();
      for (const [index, url] of mainUrls.entries()) {
        const imageId = await this.uploadImage(url, account, `main-${index + 1}`);
        mainImageIds.push(imageId);
        uploadedByUrl.set(url, imageId);
      }
      const variantImageIds = new Map<string, string>();
      for (const variant of selectShopeeVariants(product, draft)) {
        const option = variant.colorName || "Mặc định";
        if (!variant.imageUrl || variantImageIds.has(option)) continue;
        let imageId = uploadedByUrl.get(variant.imageUrl);
        if (!imageId) {
          imageId = await this.uploadImage(variant.imageUrl, account, `variant-${variant.sourceSkuId}`);
          uploadedByUrl.set(variant.imageUrl, imageId);
        }
        variantImageIds.set(option, imageId);
      }
      const payload = buildShopeeItemPayload(product, draft, mainImageIds, variantImageIds);
      await supabaseService.upsertChannelListing({ ...listingSeed, id: listing.id, latest_payload: payload });
      const result = await this.apiRequest<any>("/api/v2/product/add_item", "POST", account, payload);
      const itemId = result.response?.item_id;
      if (!itemId) throw new ShopeeConnectorError("SHOPEE_ITEM_ID_MISSING", "Shopee đã nhận yêu cầu nhưng không trả về item_id; cần đối soát trước khi thử lại", 502);
      const externalProductId = String(itemId);
      const now = new Date().toISOString();
      const finalRow = await supabaseService.upsertChannelListing({
        ...listingSeed,
        id: listing.id,
        status: "UNDER_REVIEW",
        external_product_id: externalProductId,
        external_url: `https://shopee.vn/product/${account.shop_id}/${externalProductId}`,
        audit_status: "SUBMITTED",
        latest_payload: payload,
        published_snapshot: result.response || {},
        last_synced_at: now,
        updated_at: now
      }) || listing;
      const selectedVariants = selectShopeeVariants(product, draft);
      await supabaseService.replaceChannelSkus(listing.id, selectedVariants.map(variant => ({
        channel_listing_id: listing.id,
        product_variant_id: variant.id || null,
        source_sku_id: variant.sourceSkuId,
        seller_sku: variant.sourceSkuId,
        channel_price: Math.max(1_000, Math.round(variant.sellingPriceVND * (1 + (draft.priceAdjustmentPercent || 0) / 100))),
        channel_stock: Math.max(0, variant.stockQuantity - Math.max(0, draft.stockBuffer || 0)),
        remote_image_id: variantImageIds.get(variant.colorName || "Mặc định") || null
      })));
      await supabaseService.recordChannelEvent({
        channel_listing_id: listing.id,
        channel_account_id: account.id,
        platform: "SHOPEE",
        event_type: "LISTING_SUBMITTED",
        level: "INFO",
        request_id: result.request_id || null,
        message: `Đã gửi listing ${externalProductId} lên Shopee`,
        details: { externalProductId, warning: result.warning || null }
      });
      const summary = this.mapListing(finalRow, product.id || "", account.id, externalProductId);
      return { success: true, listing: summary, readiness, remoteRequestId: result.request_id };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lỗi không xác định khi đăng Shopee";
      await supabaseService.upsertChannelListing({ ...listingSeed, id: listing.id, status: "SYNC_ERROR", last_error: message, updated_at: new Date().toISOString() });
      await supabaseService.recordChannelEvent({
        channel_listing_id: listing.id,
        channel_account_id: account.id,
        platform: "SHOPEE",
        event_type: "LISTING_SUBMIT_FAILED",
        level: "ERROR",
        message,
        details: {}
      });
      throw error;
    }
  }

  public async listListings(): Promise<ChannelListingSummary[]> {
    const rows = await supabaseService.listChannelListings("SHOPEE");
    return rows.map(row => this.mapListing(row, row.product_id, row.channel_account_id, row.external_product_id));
  }

  private mapListing(row: any, productId: string, accountId: string, externalProductId?: string): ChannelListingSummary {
    return {
      id: row.id,
      productId,
      platform: "SHOPEE",
      accountId,
      title: row.title,
      status: row.status,
      externalProductId: externalProductId || undefined,
      externalUrl: row.external_url || undefined,
      auditStatus: row.audit_status || undefined,
      lastError: row.last_error || undefined,
      updatedAt: row.updated_at || new Date().toISOString()
    };
  }

  private async getStoredAccount(accountId?: string): Promise<StoredChannelAccount | null> {
    const fromDb = await supabaseService.getChannelAccount("SHOPEE", accountId);
    if (fromDb) return fromDb as StoredChannelAccount;
    if (accountId) return this.inMemoryAccounts.get(accountId) || null;
    return Array.from(this.inMemoryAccounts.values()).sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")))[0] || null;
  }

  private async getStoredAppConfig(configId?: string): Promise<StoredShopeeAppConfig | null> {
    const fromDb = await supabaseService.getChannelAppConfig("SHOPEE", configId);
    if (fromDb) return fromDb as StoredShopeeAppConfig;
    if (configId) return this.inMemoryAppConfigs.get(configId) || null;
    return Array.from(this.inMemoryAppConfigs.values())
      .filter(config => config.is_active)
      .sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")))[0] || null;
  }

  private async getRuntimeConfig(configId?: string): Promise<ShopeeRuntimeConfig> {
    const stored = await this.getStoredAppConfig(configId);
    if (stored) {
      try {
        return {
          id: stored.id,
          name: stored.name,
          region: stored.region,
          partnerId: stored.partner_id,
          partnerKey: channelCryptoService.decrypt(stored.partner_key_ciphertext),
          redirectUrl: stored.redirect_url,
          source: "DATABASE"
        };
      } catch {
        throw new ShopeeConnectorError("SHOPEE_CONFIG_DECRYPT_FAILED", "Không thể giải mã Partner Key; kiểm tra khóa mã hóa máy chủ", 503);
      }
    }
    if (configId) {
      throw new ShopeeConnectorError("SHOPEE_APP_CONFIG_NOT_FOUND", "Không tìm thấy cấu hình Shopee đã dùng để cấp quyền", 404);
    }
    const redirectUrl = this.defaultRedirectUrl();
    if (ENV.SHOPEE_PARTNER_ID && ENV.SHOPEE_PARTNER_KEY && redirectUrl && channelCryptoService.isConfigured()) {
      return {
        name: "Shopee Open Platform",
        region: ENV.SHOPEE_REGION,
        partnerId: ENV.SHOPEE_PARTNER_ID,
        partnerKey: ENV.SHOPEE_PARTNER_KEY,
        redirectUrl,
        source: "ENVIRONMENT"
      };
    }
    throw new ShopeeConnectorError("SHOPEE_NOT_CONFIGURED", "Chưa lưu Partner ID và Partner Key cho Shopee Open Platform", 503);
  }

  private mapAppConfig(config: StoredShopeeAppConfig): ShopeeAppConfigSummary {
    return {
      id: config.id,
      platform: "SHOPEE",
      name: config.name,
      region: config.region,
      partnerId: config.partner_id,
      partnerKeyMasked: "••••••••",
      keyConfigured: Boolean(config.partner_key_ciphertext),
      redirectUrl: config.redirect_url,
      isActive: config.is_active,
      source: "DATABASE"
    };
  }

  private mapAccount(account: StoredChannelAccount): ChannelAccountSummary {
    const expired = Boolean(account.token_expires_at && new Date(account.token_expires_at).getTime() <= Date.now());
    return {
      id: account.id,
      appConfigId: account.channel_app_config_id,
      platform: "SHOPEE",
      shopId: account.shop_id,
      shopName: account.shop_name || `Shopee Shop ${account.shop_id}`,
      region: account.region,
      status: expired ? "TOKEN_EXPIRED" : account.status === "CONNECTED" ? "CONNECTED" : "ERROR",
      tokenExpiresAt: account.token_expires_at,
      grantedScopes: account.granted_scopes || [],
      lastHealthCheckAt: account.last_health_check_at
    };
  }

  private async getApiAccount(accountId?: string): Promise<ShopeeApiAccount> {
    if (!accountId) {
      const available = await this.listAccounts();
      if (available.length > 1) {
        throw new ShopeeConnectorError("SHOPEE_SELLER_REQUIRED", "Có nhiều Seller; hãy chọn shop nhận listing", 400);
      }
    }
    let account = await this.getStoredAccount(accountId);
    if (!account) throw new ShopeeConnectorError("SHOPEE_NOT_CONNECTED", "Chưa kết nối tài khoản Shopee Seller", 409);
    const appConfig = await this.getRuntimeConfig(account.channel_app_config_id);
    let accessToken = channelCryptoService.decrypt(account.access_token_ciphertext);
    let refreshToken = channelCryptoService.decrypt(account.refresh_token_ciphertext);
    if (account.token_expires_at && new Date(account.token_expires_at).getTime() <= Date.now() + 5 * 60_000) {
      const refreshed = await this.tokenRequest("/api/v2/auth/access_token/get", {
        partner_id: apiId(appConfig.partnerId),
        shop_id: apiId(account.shop_id),
        refresh_token: refreshToken
      }, appConfig);
      if (!refreshed.access_token || !refreshed.refresh_token) throw new ShopeeConnectorError("SHOPEE_REFRESH_FAILED", "Không thể làm mới phiên Shopee", 401);
      accessToken = refreshed.access_token;
      refreshToken = refreshed.refresh_token;
      const updated = await supabaseService.upsertChannelAccount({
        ...account,
        access_token_ciphertext: channelCryptoService.encrypt(accessToken),
        refresh_token_ciphertext: channelCryptoService.encrypt(refreshToken),
        token_expires_at: new Date(Date.now() + Math.max(60, refreshed.expire_in || 14_400) * 1000).toISOString(),
        status: "CONNECTED",
        updated_at: new Date().toISOString()
      });
      if (updated) account = updated as StoredChannelAccount;
    }
    return { ...account, accessToken, refreshToken, appConfig };
  }

  private async tokenRequest(path: string, body: Record<string, unknown>, config: ShopeeRuntimeConfig): Promise<ShopeeApiResult> {
    const timestamp = Math.floor(Date.now() / 1000);
    const url = new URL(path, this.baseUrl());
    url.searchParams.set("partner_id", config.partnerId);
    url.searchParams.set("timestamp", String(timestamp));
    url.searchParams.set("sign", this.sign(config, path, timestamp));
    const response = await safeFetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      allowedContentTypes: ["application/json"],
      maxBytes: 2 * 1024 * 1024
    });
    const data = await response.json() as ShopeeApiResult;
    if (!response.ok || data.error) throw new ShopeeConnectorError("SHOPEE_TOKEN_FAILED", data.message || data.error || `HTTP ${response.status}`, 502);
    return data;
  }

  private async apiRequest<T>(
    path: string,
    method: "GET" | "POST",
    account: ShopeeApiAccount,
    body?: unknown,
    query?: Record<string, string>
  ): Promise<ShopeeApiResult<T>> {
    const timestamp = Math.floor(Date.now() / 1000);
    const url = new URL(path, this.baseUrl());
    url.searchParams.set("partner_id", account.appConfig.partnerId);
    url.searchParams.set("timestamp", String(timestamp));
    url.searchParams.set("access_token", account.accessToken);
    url.searchParams.set("shop_id", account.shop_id);
    url.searchParams.set("sign", this.sign(account.appConfig, path, timestamp, account.accessToken, account.shop_id));
    Object.entries(query || {}).forEach(([key, value]) => url.searchParams.set(key, value));
    const response = await safeFetch(url.toString(), {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      allowedContentTypes: ["application/json"],
      maxBytes: 4 * 1024 * 1024
    });
    const data = await response.json() as ShopeeApiResult<T>;
    if (!response.ok || data.error) throw new ShopeeConnectorError("SHOPEE_API_ERROR", data.message || data.error || `HTTP ${response.status}`, 502);
    return data;
  }

  private async uploadImage(imageUrl: string, account: ShopeeApiAccount, filename: string): Promise<string> {
    const downloaded = await mediaMirrorService.downloadImage(imageUrl);
    if (!downloaded) throw new ShopeeConnectorError("IMAGE_DOWNLOAD_FAILED", `Không thể tải ảnh ${filename}`, 422);
    const path = "/api/v2/media_space/upload_image";
    const timestamp = Math.floor(Date.now() / 1000);
    const url = new URL(path, this.baseUrl());
    url.searchParams.set("partner_id", account.appConfig.partnerId);
    url.searchParams.set("timestamp", String(timestamp));
    url.searchParams.set("access_token", account.accessToken);
    url.searchParams.set("shop_id", account.shop_id);
    url.searchParams.set("sign", this.sign(account.appConfig, path, timestamp, account.accessToken, account.shop_id));
    const extension = downloaded.contentType.includes("png") ? "png" : downloaded.contentType.includes("webp") ? "webp" : "jpg";
    const form = new FormData();
    const imageBytes = Uint8Array.from(downloaded.buffer);
    form.append("image", new Blob([imageBytes.buffer], { type: downloaded.contentType }), `${filename}.${extension}`);
    const response = await safeFetch(url.toString(), {
      method: "POST",
      body: form,
      allowedContentTypes: ["application/json"],
      maxBytes: 2 * 1024 * 1024
    });
    const data = await response.json() as ShopeeApiResult<{ image_info?: { image_id?: string }; image_id?: string }>;
    const imageId = data.response?.image_info?.image_id || data.response?.image_id;
    if (!response.ok || data.error || !imageId) throw new ShopeeConnectorError("SHOPEE_IMAGE_UPLOAD_FAILED", data.message || data.error || `Không thể upload ảnh ${filename}`, 502);
    return String(imageId);
  }
}

export const shopeeConnectorService = new ShopeeConnectorService();
