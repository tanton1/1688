import crypto from "node:crypto";
import {
  CustomStoreConnectionInput,
  CustomStoreConnectionSummary,
  CustomStoreSyncResult,
  WebProduct
} from "@hub1688/shared-types";
import { ENV } from "../config/env.js";
import { assertSafePublicUrl, safeFetch } from "../utils/safe-network.js";
import { channelCryptoService } from "./channel-crypto.service.js";
import { supabaseService } from "./supabase.service.js";

interface StoredCustomConnection {
  id: string;
  name: string;
  base_url: string;
  protocol: "REST_JSON" | "GRAPHQL" | "WEBHOOK";
  auth_type: "NONE" | "BEARER" | "API_KEY_HEADER" | "BASIC";
  auth_header_name?: string | null;
  auth_secret_ciphertext?: string | null;
  publish_path: string;
  update_path?: string | null;
  inventory_path?: string | null;
  graphql_mutation?: string | null;
  is_active: boolean;
  last_tested_at?: string | null;
  last_error?: string | null;
  created_by?: string;
  updated_at: string;
}

interface StoredCustomListing {
  id: string;
  connection_id: string;
  product_id: string;
  external_product_id?: string | null;
  external_url?: string | null;
}

export class CustomConnectorError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message);
  }
}

const normalizePath = (value: string | undefined, required = false): string | undefined => {
  const path = String(value || "").trim();
  if (!path && !required) return undefined;
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    throw new CustomConnectorError("CUSTOM_CONNECTOR_PATH_INVALID", "Endpoint phải là đường dẫn tương đối bắt đầu bằng /", 400);
  }
  return path;
};

const normalizedBaseUrl = async (rawUrl: string): Promise<string> => {
  const url = await assertSafePublicUrl(rawUrl.trim());
  if (url.protocol !== "https:" && ENV.NODE_ENV === "production") {
    throw new CustomConnectorError("CUSTOM_CONNECTOR_HTTPS_REQUIRED", "Website production phải dùng HTTPS", 400);
  }
  url.hash = "";
  url.search = "";
  return url.toString().replace(/\/+$/, "");
};

export function buildCustomStorePayload(product: WebProduct): Record<string, unknown> {
  const variants = (product.variants || []).filter(variant => variant.selectedForSale);
  return {
    source: "1688_LISTING_SYNC_HUB",
    sourceProductId: product.id,
    sku: product.skuCode,
    slug: product.slug,
    title: product.titleVI,
    titleEn: product.titleEN || null,
    descriptionHtml: product.fullDescVI || product.shortDescVI || "",
    category: product.categoryName,
    status: product.status,
    currency: "VND",
    price: { min: product.minPriceVND, max: product.maxPriceVND },
    images: {
      primary: product.primaryImage,
      gallery: product.galleryImages || [],
      details: product.detailImages || []
    },
    variants: variants.map(variant => ({
      id: variant.id || variant.sourceSkuId,
      sku: variant.sourceSkuId,
      color: variant.colorName || null,
      size: variant.sizeName || null,
      options: variant.specDetails || {},
      price: variant.sellingPriceVND,
      stock: Math.max(0, variant.stockQuantity || 0),
      inventoryTracked: variant.inventoryTracked !== false,
      available: variant.sourceAvailable !== false,
      imageUrl: variant.imageUrl || null
    })),
    personalization: {
      enabled: Boolean(product.isPersonalized),
      fields: product.personalizationFields || [],
      mockupTemplateUrl: product.customizerMockupTemplateUrl || null,
      canvas: product.customizerCanvas || null
    },
    seo: product.seo || null,
    updatedAt: product.updatedAt || new Date().toISOString()
  };
}

export function buildCustomInventoryPayload(product: WebProduct, externalProductId?: string): Record<string, unknown> {
  return {
    sourceProductId: product.id,
    externalProductId: externalProductId || null,
    sku: product.skuCode,
    currency: "VND",
    variants: (product.variants || []).filter(variant => variant.selectedForSale).map(variant => ({
      sku: variant.sourceSkuId,
      price: variant.sellingPriceVND,
      stock: Math.max(0, variant.stockQuantity || 0),
      available: variant.sourceAvailable !== false
    })),
    syncedAt: new Date().toISOString()
  };
}

export class CustomStoreConnectorService {
  private readonly memoryConnections = new Map<string, StoredCustomConnection>();
  private readonly memoryListings = new Map<string, StoredCustomListing>();

  public async listConnections(): Promise<CustomStoreConnectionSummary[]> {
    const rows = await supabaseService.listCustomStoreConnections();
    const source = rows.length ? rows as StoredCustomConnection[] : Array.from(this.memoryConnections.values());
    return source.map(row => this.mapConnection(row));
  }

  public async saveConnection(input: CustomStoreConnectionInput, userId: string): Promise<CustomStoreConnectionSummary> {
    if (!channelCryptoService.isConfigured()) {
      throw new CustomConnectorError("CHANNEL_ENCRYPTION_NOT_CONFIGURED", "Máy chủ chưa có khóa mã hóa connector", 503);
    }
    const existing = input.id ? await this.getStoredConnection(input.id) : null;
    const authType = input.authType || "NONE";
    const secretCiphertext = input.secret?.trim()
      ? channelCryptoService.encrypt(input.secret.trim())
      : existing?.auth_secret_ciphertext || null;
    if (authType !== "NONE" && !secretCiphertext) {
      throw new CustomConnectorError("CUSTOM_CONNECTOR_SECRET_REQUIRED", "Cần nhập secret cho kiểu xác thực đã chọn", 400);
    }
    const headerName = (input.authHeaderName || existing?.auth_header_name || "X-API-Key").trim();
    if (authType === "API_KEY_HEADER" && !/^[A-Za-z0-9-]{1,64}$/.test(headerName)) {
      throw new CustomConnectorError("CUSTOM_CONNECTOR_HEADER_INVALID", "Tên API key header không hợp lệ", 400);
    }
    const now = new Date().toISOString();
    const row: Record<string, unknown> = {
      ...(existing?.id ? { id: existing.id } : {}),
      name: input.name.trim(),
      base_url: await normalizedBaseUrl(input.baseUrl),
      protocol: input.protocol || "REST_JSON",
      auth_type: authType,
      auth_header_name: authType === "API_KEY_HEADER" ? headerName : null,
      auth_secret_ciphertext: authType === "NONE" ? null : secretCiphertext,
      publish_path: normalizePath(input.publishPath, true),
      update_path: normalizePath(input.updatePath),
      inventory_path: normalizePath(input.inventoryPath),
      graphql_mutation: input.protocol === "GRAPHQL" ? input.graphqlMutation?.trim() || null : null,
      is_active: true,
      created_by: existing?.created_by || userId,
      updated_at: now
    };
    if (input.protocol === "GRAPHQL" && !row.graphql_mutation) {
      throw new CustomConnectorError("CUSTOM_CONNECTOR_GRAPHQL_MUTATION_REQUIRED", "Cần nhập GraphQL mutation", 400);
    }
    const saved = await supabaseService.upsertCustomStoreConnection(row);
    let stored: StoredCustomConnection;
    if (saved) stored = saved as StoredCustomConnection;
    else if (ENV.NODE_ENV !== "production") {
      stored = { id: existing?.id || crypto.randomUUID(), ...(row as Omit<StoredCustomConnection, "id">) };
    } else {
      throw new CustomConnectorError("CUSTOM_CONNECTOR_SAVE_FAILED", "Không thể lưu connector; hãy chạy migration Supabase mới", 500);
    }
    this.memoryConnections.set(stored.id, stored);
    return this.mapConnection(stored);
  }

  public async preview(connectionId: string, product: WebProduct): Promise<Record<string, unknown>> {
    const connection = await this.requireConnection(connectionId);
    const productPayload = buildCustomStorePayload(product);
    return connection.protocol === "GRAPHQL"
      ? { query: connection.graphql_mutation, variables: { product: productPayload } }
      : productPayload;
  }

  public async testConnection(connectionId: string): Promise<CustomStoreConnectionSummary> {
    const connection = await this.requireConnection(connectionId);
    const now = new Date().toISOString();
    try {
      const response = await safeFetch(connection.base_url, {
        method: "GET",
        headers: this.headers(connection),
        maxRedirects: 0,
        maxBytes: 512 * 1024
      });
      if (response.status === 401 || response.status === 403 || response.status >= 500) {
        throw new Error(`HTTP ${response.status}`);
      }
      const updated = await supabaseService.updateCustomStoreConnection(connection.id, { last_tested_at: now, last_error: null });
      const stored = { ...connection, ...(updated || {}), last_tested_at: now, last_error: null } as StoredCustomConnection;
      this.memoryConnections.set(stored.id, stored);
      return this.mapConnection(stored);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể kết nối website";
      await supabaseService.updateCustomStoreConnection(connection.id, { last_tested_at: now, last_error: message });
      throw new CustomConnectorError("CUSTOM_CONNECTOR_TEST_FAILED", message, 502);
    }
  }

  public async publish(connectionId: string, product: WebProduct): Promise<CustomStoreSyncResult> {
    if (product.status !== "PUBLISHED") {
      throw new CustomConnectorError("PRODUCT_NOT_PUBLISHED", "Sản phẩm phải được duyệt nội bộ trước khi đẩy ra website", 409);
    }
    const connection = await this.requireConnection(connectionId);
    const existing = await this.getStoredListing(connectionId, product.id || "");
    const isUpdate = Boolean(existing?.external_product_id && connection.update_path);
    const path = isUpdate ? connection.update_path! : connection.publish_path;
    const payload = await this.preview(connectionId, product);
    const startedAt = new Date().toISOString();
    await supabaseService.upsertCustomStoreListing({
      connection_id: connectionId,
      product_id: product.id,
      status: "SUBMITTING",
      latest_payload: payload,
      last_error: null,
      updated_at: startedAt
    });
    try {
      const response = await this.send(connection, path, payload, isUpdate ? "PUT" : "POST", existing?.external_product_id || undefined);
      const data = await this.readResponse(response);
      if (!response.ok || (connection.protocol === "GRAPHQL" && Array.isArray(data?.errors) && data.errors.length)) {
        throw new Error(this.remoteError(data) || `HTTP ${response.status}`);
      }
      const externalProductId = this.externalId(data) || existing?.external_product_id || (connection.protocol === "WEBHOOK" ? product.id : undefined);
      if (!externalProductId) throw new Error("Website đích không trả về ID sản phẩm");
      const externalUrl = this.externalUrl(data) || existing?.external_url || undefined;
      const listingRow = await supabaseService.upsertCustomStoreListing({
        connection_id: connectionId,
        product_id: product.id,
        external_product_id: externalProductId,
        external_url: externalUrl || null,
        status: "LIVE",
        latest_payload: payload,
        last_error: null,
        last_synced_at: startedAt,
        updated_at: startedAt
      });
      if (!listingRow && ENV.NODE_ENV !== "production") {
        this.memoryListings.set(`${connectionId}:${product.id}`, {
          id: existing?.id || crypto.randomUUID(), connection_id: connectionId, product_id: product.id || "",
          external_product_id: externalProductId, external_url: externalUrl
        });
      }
      return { success: true, connectionId, productId: product.id || "", externalProductId, externalUrl, statusCode: response.status, syncedAt: startedAt };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lỗi đẩy sản phẩm";
      await supabaseService.upsertCustomStoreListing({
        connection_id: connectionId, product_id: product.id, status: "SYNC_ERROR", latest_payload: payload,
        last_error: message, last_synced_at: startedAt, updated_at: startedAt
      });
      return { success: false, connectionId, productId: product.id || "", error: message, syncedAt: startedAt };
    }
  }

  public async syncInventory(connectionId: string, product: WebProduct): Promise<CustomStoreSyncResult> {
    const connection = await this.requireConnection(connectionId);
    if (!connection.inventory_path) {
      throw new CustomConnectorError("CUSTOM_CONNECTOR_INVENTORY_PATH_REQUIRED", "Connector chưa cấu hình endpoint tồn kho/giá", 400);
    }
    const listing = await this.getStoredListing(connectionId, product.id || "");
    if (!listing?.external_product_id) {
      throw new CustomConnectorError("CUSTOM_CONNECTOR_LISTING_REQUIRED", "Cần đẩy sản phẩm lần đầu trước khi đồng bộ tồn kho", 409);
    }
    const startedAt = new Date().toISOString();
    const payload = buildCustomInventoryPayload(product, listing.external_product_id);
    try {
      const response = await this.send(connection, connection.inventory_path, payload, "PUT", listing.external_product_id);
      const data = await this.readResponse(response);
      if (!response.ok || (connection.protocol === "GRAPHQL" && Array.isArray(data?.errors) && data.errors.length)) {
        throw new Error(this.remoteError(data) || `HTTP ${response.status}`);
      }
      await supabaseService.upsertCustomStoreListing({
        connection_id: connectionId, product_id: product.id, external_product_id: listing.external_product_id,
        external_url: listing.external_url || null, status: "LIVE", last_error: null,
        last_synced_at: startedAt, updated_at: startedAt
      });
      return { success: true, connectionId, productId: product.id || "", externalProductId: listing.external_product_id, externalUrl: listing.external_url || undefined, statusCode: response.status, syncedAt: startedAt };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lỗi đồng bộ giá/tồn kho";
      await supabaseService.upsertCustomStoreListing({
        connection_id: connectionId, product_id: product.id, external_product_id: listing.external_product_id,
        external_url: listing.external_url || null, status: "SYNC_ERROR", last_error: message,
        last_synced_at: startedAt, updated_at: startedAt
      });
      return { success: false, connectionId, productId: product.id || "", externalProductId: listing.external_product_id, error: message, syncedAt: startedAt };
    }
  }

  private async send(connection: StoredCustomConnection, path: string, payload: Record<string, unknown>, method: "POST" | "PUT", externalProductId?: string): Promise<Response> {
    const resolvedPath = path.replace(/\{externalProductId\}/g, encodeURIComponent(externalProductId || ""));
    const body = connection.protocol === "GRAPHQL"
      ? ("query" in payload
          ? payload
          : { query: connection.graphql_mutation, variables: { product: payload, externalProductId: externalProductId || null } })
      : payload;
    return safeFetch(`${connection.base_url}${resolvedPath}`, {
      method: connection.protocol === "GRAPHQL" ? "POST" : method,
      headers: { ...this.headers(connection), "Content-Type": "application/json" },
      body: JSON.stringify(body),
      maxRedirects: 0,
      maxBytes: 2 * 1024 * 1024
    });
  }

  private headers(connection: StoredCustomConnection): Record<string, string> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (connection.auth_type === "NONE") return headers;
    if (!connection.auth_secret_ciphertext) throw new CustomConnectorError("CUSTOM_CONNECTOR_SECRET_MISSING", "Connector thiếu secret", 503);
    let secret: string;
    try {
      secret = channelCryptoService.decrypt(connection.auth_secret_ciphertext);
    } catch {
      throw new CustomConnectorError("CUSTOM_CONNECTOR_SECRET_DECRYPT_FAILED", "Không thể giải mã secret connector", 503);
    }
    if (connection.auth_type === "BEARER") headers.Authorization = `Bearer ${secret}`;
    if (connection.auth_type === "BASIC") headers.Authorization = `Basic ${Buffer.from(secret).toString("base64")}`;
    if (connection.auth_type === "API_KEY_HEADER") headers[connection.auth_header_name || "X-API-Key"] = secret;
    return headers;
  }

  private async readResponse(response: Response): Promise<any> {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("json")) return response.json();
    const text = await response.text();
    return text ? { message: text.slice(0, 1_000) } : {};
  }

  private externalId(data: any): string | undefined {
    const candidate = data?.externalProductId || data?.external_product_id || data?.id || data?.product?.id || data?.data?.id || data?.data?.product?.id;
    return candidate === undefined || candidate === null ? undefined : String(candidate);
  }

  private externalUrl(data: any): string | undefined {
    const candidate = data?.externalUrl || data?.url || data?.permalink || data?.product?.url || data?.data?.url || data?.data?.product?.url;
    return typeof candidate === "string" ? candidate : undefined;
  }

  private remoteError(data: any): string | undefined {
    const candidate = data?.message || data?.error || data?.errors?.[0]?.message;
    return typeof candidate === "string" ? candidate.slice(0, 1_000) : undefined;
  }

  private async getStoredConnection(id: string): Promise<StoredCustomConnection | null> {
    const fromDb = await supabaseService.getCustomStoreConnection(id);
    return fromDb as StoredCustomConnection || this.memoryConnections.get(id) || null;
  }

  private async requireConnection(id: string): Promise<StoredCustomConnection> {
    const connection = await this.getStoredConnection(id);
    if (!connection || !connection.is_active) throw new CustomConnectorError("CUSTOM_CONNECTOR_NOT_FOUND", "Không tìm thấy connector website", 404);
    return connection;
  }

  private async getStoredListing(connectionId: string, productId: string): Promise<StoredCustomListing | null> {
    const fromDb = await supabaseService.getCustomStoreListing(connectionId, productId);
    return fromDb as StoredCustomListing || this.memoryListings.get(`${connectionId}:${productId}`) || null;
  }

  private mapConnection(row: StoredCustomConnection): CustomStoreConnectionSummary {
    return {
      id: row.id,
      name: row.name,
      baseUrl: row.base_url,
      protocol: row.protocol,
      authType: row.auth_type,
      authHeaderName: row.auth_header_name || undefined,
      publishPath: row.publish_path,
      updatePath: row.update_path || undefined,
      inventoryPath: row.inventory_path || undefined,
      graphqlMutation: row.graphql_mutation || undefined,
      isActive: row.is_active,
      secretConfigured: Boolean(row.auth_secret_ciphertext),
      lastTestedAt: row.last_tested_at || undefined,
      lastError: row.last_error || undefined,
      updatedAt: row.updated_at
    };
  }
}

export const customStoreConnectorService = new CustomStoreConnectorService();
