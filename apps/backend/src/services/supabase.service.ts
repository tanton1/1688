import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  WebProduct,
  WebProductVariant,
  Normalized1688Product,
  Raw1688Shop,
  ExistingProductCheckResult,
  CustomerOrder,
  PricingRuleConfig,
  ProductTemplate,
  ImportJobStatus,
  ProductDiffSummary,
  Raw1688Product
} from "@hub1688/shared-types";
import { ENV } from "../config/env.js";

export class SupabaseDataService {
  private client: SupabaseClient | null = null;
  private configured: boolean = false;
  /**
   * Production projects can lag behind the repository schema during a rolling
   * deploy. Keep the service usable while the optional inventory_tracked
   * column is being migrated, and remember the capability after the first
   * write so subsequent saves do not repeat a failing request.
   */
  private inventoryTrackedColumnAvailable: boolean | null = null;
  private sourceAvailableColumnAvailable: boolean | null = null;
  private customizerCanvasColumnAvailable: boolean | null = null;

  constructor() {
    const key = ENV.SUPABASE_SERVICE_ROLE_KEY;
    if (ENV.SUPABASE_URL && key) {
      this.client = createClient(ENV.SUPABASE_URL, key, {
        auth: { persistSession: false }
      });
      this.configured = true;
      console.log(`[Supabase] Đã kết nối với Supabase Cloud: ${ENV.SUPABASE_URL}`);
    } else {
      console.warn("[Supabase] Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY. Persistence bị vô hiệu hóa.");
    }
  }

  public isConfigured(): boolean {
    return this.configured && this.client !== null;
  }

  public async listOrders(): Promise<CustomerOrder[] | null> {
    if (!this.client) return null;
    const { data, error } = await this.client.from("customer_orders").select("*").order("created_at", { ascending: false });
    if (error || !data) return null;
    return data.map(row => ({
      id: row.id, orderNumber: row.order_number, platform: row.platform,
      customerName: row.customer_name, customerPhone: row.customer_phone,
      customerAddress: row.customer_address, items: row.items_json || [],
      totalAmountVND: Number(row.total_amount_vnd) || 0, totalCostVND: Number(row.total_cost_vnd) || 0,
      estimatedProfitVND: Number(row.estimated_profit_vnd) || 0, status: row.status,
      paymentMethod: row.payment_method, paymentStatus: row.payment_status,
      note: row.note, giftAddonsSelected: row.gift_addons_json || [], discountCode: row.discount_code,
      discountAmountVND: Number(row.discount_amount_vnd) || 0, shippingFeeVND: Number(row.shipping_fee_vnd) || 0,
      createdAt: row.created_at, updatedAt: row.updated_at
    })) as CustomerOrder[];
  }

  public async getOrderForTracking(orderNumber: string, customerPhone: string): Promise<CustomerOrder | null> {
    if (!this.client) return null;
    const { data, error } = await this.client.from("customer_orders")
      .select("*").ilike("order_number", orderNumber).maybeSingle();
    if (error || !data) return null;
    if ((data.customer_phone || "").replace(/\D/g, "") !== customerPhone) return null;
    return {
      id: data.id, orderNumber: data.order_number, platform: data.platform,
      customerName: data.customer_name, customerPhone: data.customer_phone, customerAddress: data.customer_address,
      items: data.items_json || [], totalAmountVND: Number(data.total_amount_vnd) || 0,
      totalCostVND: Number(data.total_cost_vnd) || 0, estimatedProfitVND: Number(data.estimated_profit_vnd) || 0,
      status: data.status, paymentMethod: data.payment_method, paymentStatus: data.payment_status,
      note: data.note, giftAddonsSelected: data.gift_addons_json || [], discountCode: data.discount_code,
      discountAmountVND: Number(data.discount_amount_vnd) || 0, shippingFeeVND: Number(data.shipping_fee_vnd) || 0,
      createdAt: data.created_at, updatedAt: data.updated_at
    } as CustomerOrder;
  }

  public async saveOrder(order: CustomerOrder): Promise<boolean> {
    if (!this.client) return false;
    const { error } = await this.client.from("customer_orders").upsert({
      id: order.id, order_number: order.orderNumber, platform: order.platform,
      customer_name: order.customerName, customer_phone: order.customerPhone || null,
      customer_address: order.customerAddress || null, items_json: order.items,
      total_amount_vnd: order.totalAmountVND, total_cost_vnd: order.totalCostVND,
      estimated_profit_vnd: order.estimatedProfitVND, status: order.status,
      payment_method: order.paymentMethod || null, payment_status: order.paymentStatus || null,
      note: order.note || null, gift_addons_json: order.giftAddonsSelected || [],
      discount_code: order.discountCode || null, discount_amount_vnd: order.discountAmountVND || 0,
      shipping_fee_vnd: order.shippingFeeVND || 0,
      created_at: order.createdAt, updated_at: order.updatedAt
    }, { onConflict: "id" });
    return !error;
  }

  public async createStorefrontOrderAtomic(order: CustomerOrder, reservations: Array<{ productId: string; sourceSkuId: string; quantity: number; expectedBasePriceVND: number }>): Promise<boolean> {
    if (!this.client) return false;
    const { error } = await this.client.rpc("create_storefront_order_atomic", {
      p_order: order,
      p_reservations: reservations
    });
    if (error) {
      console.error("[Supabase atomic checkout]", error);
      if (error.message.includes("STOCK_OR_PRICE_CHANGED")) throw new Error("STOCK_OR_PRICE_CHANGED");
      return false;
    }
    return true;
  }

  public async deleteOrder(id: string): Promise<boolean> {
    if (!this.client) return false;
    const { data, error } = await this.client.from("customer_orders").delete().eq("id", id).select("id");
    return !error && Boolean(data?.length);
  }

  public async getGlossary(): Promise<Record<string, string> | null> {
    if (!this.client) return null;
    const { data, error } = await this.client.from("translation_glossaries").select("source_text,target_text");
    if (error || !data) return null;
    return Object.fromEntries(data.map(row => [row.source_text, row.target_text]));
  }

  public async saveGlossaryTerm(sourceText: string, targetText: string): Promise<boolean> {
    if (!this.client) return false;
    const { error } = await this.client.from("translation_glossaries").upsert({ source_text: sourceText, target_text: targetText, updated_at: new Date().toISOString() }, { onConflict: "source_text" });
    return !error;
  }

  public async getPricingRules(): Promise<PricingRuleConfig[] | null> {
    if (!this.client) return null;
    const { data, error } = await this.client.from("pricing_rules").select("*").order("name");
    if (error || !data) return null;
    return data.map(row => ({ id: row.id, name: row.name, categoryKeyword: row.category_keyword,
      exchangeRate: Number(row.exchange_rate), domesticChinaShipVND: Number(row.domestic_china_ship_vnd),
      intlShipPerKgVND: Number(row.intl_ship_per_kg_vnd), estimatedWeightKg: Number(row.estimated_weight_kg),
      multiplier: Number(row.multiplier), platformFeeRate: Number(row.platform_fee_rate), minProfitVND: Number(row.min_profit_vnd),
      minMarginPercent: Number(row.min_margin_percent), roundToThousand: Boolean(row.round_to_thousand) }));
  }

  public async savePricingRule(rule: PricingRuleConfig): Promise<boolean> {
    if (!this.client) return false;
    const { error } = await this.client.from("pricing_rules").upsert({ id: rule.id, name: rule.name,
      category_keyword: rule.categoryKeyword || null, exchange_rate: rule.exchangeRate,
      domestic_china_ship_vnd: rule.domesticChinaShipVND, intl_ship_per_kg_vnd: rule.intlShipPerKgVND,
      estimated_weight_kg: rule.estimatedWeightKg, multiplier: rule.multiplier, platform_fee_rate: rule.platformFeeRate,
      min_profit_vnd: rule.minProfitVND, min_margin_percent: rule.minMarginPercent,
      round_to_thousand: rule.roundToThousand, updated_at: new Date().toISOString() }, { onConflict: "id" });
    return !error;
  }

  public async deletePricingRule(id: string): Promise<boolean> {
    if (!this.client) return false;
    const { data, error } = await this.client.from("pricing_rules").delete().eq("id", id).select("id");
    return !error && Boolean(data?.length);
  }

  public async getTemplates(): Promise<ProductTemplate[] | null> {
    if (!this.client) return null;
    const { data, error } = await this.client.from("product_templates").select("*").order("updated_at", { ascending: false });
    if (error || !data) return null;
    return data.map(row => ({ id: row.id, name: row.name, description: row.description,
      categoryName: row.category_name, targetPlatform: row.target_platform, isDefault: row.is_default,
      content: row.content_json || {}, variation: row.variation_json || { options: [] },
      createdAt: row.created_at, updatedAt: row.updated_at })) as ProductTemplate[];
  }

  public async saveTemplate(template: ProductTemplate): Promise<boolean> {
    if (!this.client) return false;
    const { error } = await this.client.from("product_templates").upsert({ id: template.id, name: template.name,
      description: template.description || null, category_name: template.categoryName,
      target_platform: template.targetPlatform || "ALL", is_default: Boolean(template.isDefault),
      content_json: template.content, variation_json: template.variation,
      created_at: template.createdAt, updated_at: template.updatedAt }, { onConflict: "id" });
    return !error;
  }

  public async deleteTemplate(id: string): Promise<boolean> {
    if (!this.client) return false;
    const { data, error } = await this.client.from("product_templates").delete().eq("id", id).select("id");
    return !error && Boolean(data?.length);
  }

  public async replaceTemplates(templates: ProductTemplate[]): Promise<boolean> {
    if (!this.client) return false;
    const { error: deleteError } = await this.client.from("product_templates").delete().not("id", "is", null);
    if (deleteError) return false;
    for (const template of templates) {
      if (!(await this.saveTemplate(template))) return false;
    }
    return true;
  }

  public async getStorefrontSettings<T>(): Promise<T | null> {
    if (!this.client) return null;
    const { data, error } = await this.client.from("storefront_settings").select("config_json").eq("id", true).maybeSingle();
    if (error || !data) return null;
    return data.config_json as T;
  }

  public async saveStorefrontSettings(config: unknown): Promise<boolean> {
    if (!this.client) return false;
    const { error } = await this.client.from("storefront_settings").upsert({ id: true, config_json: config, updated_at: new Date().toISOString() }, { onConflict: "id" });
    return !error;
  }

  public async saveImportJob(job: ImportJobStatus): Promise<boolean> {
    if (!this.client) return false;
    const { error } = await this.client.from("import_jobs").upsert({
      id: job.jobId,
      status: job.status,
      total_items: job.totalItems,
      completed_items: job.completedItems,
      failed_items: job.failedItems,
      results_json: job.results,
      updated_at: new Date().toISOString()
    }, { onConflict: "id" });
    return !error;
  }

  public async getImportJob(jobId: string): Promise<ImportJobStatus | null> {
    if (!this.client) return null;
    const { data, error } = await this.client.from("import_jobs").select("*").eq("id", jobId).maybeSingle();
    if (error || !data) return null;
    return {
      jobId: data.id,
      status: data.status,
      totalItems: data.total_items,
      completedItems: data.completed_items,
      failedItems: data.failed_items,
      results: data.results_json || []
    } as ImportJobStatus;
  }

  public async saveDiffLog(summary: ProductDiffSummary, snapshot: Raw1688Product): Promise<boolean> {
    if (!this.client) return false;
    const { error } = await this.client.from("sync_logs").insert({
      product_id: summary.webProductId,
      event_type: summary.hasUnavailableSku ? "SKU_REMOVED" : summary.hasPriceChange ? "PRICE_CHANGED" : "REVIEW_REQUIRED",
      old_value_json: summary,
      new_value_json: snapshot,
      diff_summary: summary.changes.map(change => change.fieldName).join(", "),
      status: "PENDING_REVIEW",
      created_at: summary.detectedAt
    });
    return !error;
  }

  public async listPendingDiffLogs(): Promise<Array<{ summary: ProductDiffSummary; snapshot: Raw1688Product }> | null> {
    if (!this.client) return null;
    const { data, error } = await this.client.from("sync_logs")
      .select("old_value_json,new_value_json").eq("status", "PENDING_REVIEW").order("created_at", { ascending: false });
    if (error || !data) return null;
    return data.map(row => ({ summary: row.old_value_json as ProductDiffSummary, snapshot: row.new_value_json as Raw1688Product }));
  }

  public async resolveDiffLog(webProductId: string, status: "APPLIED" | "IGNORED"): Promise<boolean> {
    if (!this.client) return false;
    const { data, error } = await this.client.from("sync_logs").update({ status })
      .eq("product_id", webProductId).eq("status", "PENDING_REVIEW").select("id");
    return !error && Boolean(data?.length);
  }

  /**
   * Lấy danh sách sản phẩm từ Supabase kèm bộ lọc
   */
  public async getProducts(params?: {
    status?: string;
    category?: string;
    collection?: string;
    search?: string;
    occasion?: string;
    recipient?: string;
    personalized?: boolean;
    minPrice?: number;
    maxPrice?: number;
    minQuality?: number;
    maxQuality?: number;
    media?: string;
    sort?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ total: number; items: WebProduct[] } | null> {
    if (!this.client) return null;

    try {
      let query = this.client
        .from("products")
        .select("*, product_variants(*)", { count: "exact" });

      if (params?.status && params.status !== "ALL") {
        query = query.eq("status", params.status);
      }
      if (params?.category && params.category !== "ALL") {
        query = query.eq("category_name", params.category);
      }
      if (params?.collection && params.collection !== "ALL") {
        const collectionLabel = params.collection.trim().replace(/[-_]+/g, " ");
        if (collectionLabel && collectionLabel.toLowerCase() !== "all") {
          query = query.ilike("category_name", `%${collectionLabel}%`);
        }
      }
      if (params?.occasion) query = query.contains("occasion_tags", [params.occasion]);
      if (params?.recipient) query = query.contains("recipient_tags", [params.recipient]);
      if (params?.personalized) query = query.eq("is_personalized", true);
      if (params?.minPrice !== undefined) query = query.gte("max_price_vnd", params.minPrice);
      if (params?.maxPrice !== undefined) query = query.lte("min_price_vnd", params.maxPrice);
      if (params?.minQuality) {
        query = query.gte("quality_score", params.minQuality);
      }
      if (params?.maxQuality !== undefined) {
        query = query.lte("quality_score", params.maxQuality);
      }
      if (params?.media === "VIDEO_ONLY") query = query.not("video_url", "is", null);
      if (params?.media === "NO_VIDEO") query = query.is("video_url", null);
      if (params?.search?.trim()) {
        const escaped = params.search.trim().replace(/[,%()]/g, "");
        query = query.or(`title_vi.ilike.%${escaped}%,title_en.ilike.%${escaped}%,sku_code.ilike.%${escaped}%,source_product_id.ilike.%${escaped}%,supplier_name.ilike.%${escaped}%`);
      }

      if (params?.sort === "PRICE_ASC") {
        query = query.order("min_price_vnd", { ascending: true });
      } else if (params?.sort === "PRICE_DESC") {
        query = query.order("min_price_vnd", { ascending: false });
      } else if (params?.sort === "QUALITY_DESC") {
        query = query.order("quality_score", { ascending: false });
      } else if (params?.sort === "UPDATED_ASC") {
        query = query.order("updated_at", { ascending: true });
      } else {
        query = query.order("updated_at", { ascending: false });
      }

      const page = Math.max(1, params?.page || 1);
      const pageSize = Math.min(100, Math.max(1, params?.pageSize || 50));
      query = query.range((page - 1) * pageSize, page * pageSize - 1);
      const { data, error, count } = await query;

      if (error || !data) {
        console.error("[Supabase getProducts error]", error);
        return null;
      }

      const items: WebProduct[] = data.map(this.mapDbRowToWebProduct);
      return { total: count || 0, items };
    } catch (err) {
      console.error("[Supabase getProducts exception]", err);
      return null;
    }
  }

  /** Lightweight category list for storefront facets; filtering remains in DB. */
  public async getPublishedCategories(): Promise<string[]> {
    if (!this.client) return [];
    try {
      const { data, error } = await this.client
        .from("products")
        .select("category_name")
        .eq("status", "PUBLISHED");
      if (error || !data) return [];
      return Array.from(new Set(data.map(row => String(row.category_name || "").trim()).filter(Boolean)));
    } catch (error) {
      console.error("[Supabase getPublishedCategories exception]", error);
      return [];
    }
  }

  public async getPublishedCategoryDetails(): Promise<Array<{ name: string; count: number }>> {
    if (!this.client) return [];
    try {
      const { data, error } = await this.client
        .from("products")
        .select("category_name")
        .eq("status", "PUBLISHED");
      if (error || !data) return [];
      const counts = new Map<string, number>();
      data.forEach(row => {
        const name = String(row.category_name || "").trim();
        if (name) counts.set(name, (counts.get(name) || 0) + 1);
      });
      return Array.from(counts, ([name, count]) => ({ name, count }));
    } catch (error) {
      console.error("[Supabase getPublishedCategoryDetails exception]", error);
      return [];
    }
  }

  private isMissingVariantColumn(error: any, column: "inventory_tracked" | "source_available"): boolean {
    const code = String(error?.code || "");
    const message = String(error?.message || error?.details || "").toLowerCase();
    if (!message.includes(column)) return false;
    // PostgREST commonly reports an unknown write column as PGRST204 while
    // SQL-backed requests can surface PostgreSQL's 42703 code.
    return code === "42703" || code === "PGRST204" || message.includes("column") || message.includes("schema cache");
  }

  private isMissingProductColumn(error: any, column: string): boolean {
    const code = String(error?.code || "");
    const message = String(error?.message || error?.details || "").toLowerCase();
    return message.includes(column) && (code === "42703" || code === "PGRST204" || message.includes("column") || message.includes("schema cache"));
  }

  /** Insert variants with a one-time compatibility retry for old schemas. */
  private async insertVariantRows(rows: Array<Record<string, any>>): Promise<any> {
    if (!this.client || rows.length === 0) return null;

    let result: any;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const writeRows = rows.map(row => {
        const next = { ...row };
        if (this.inventoryTrackedColumnAvailable === false) delete next.inventory_tracked;
        if (this.sourceAvailableColumnAvailable === false) delete next.source_available;
        return next;
      });
      result = await this.client.from("product_variants").insert(writeRows);
      if (!result.error) {
        if (this.inventoryTrackedColumnAvailable === null) this.inventoryTrackedColumnAvailable = true;
        if (this.sourceAvailableColumnAvailable === null) this.sourceAvailableColumnAvailable = true;
        return result;
      }

      let retried = false;
      if (this.inventoryTrackedColumnAvailable !== false && this.isMissingVariantColumn(result.error, "inventory_tracked")) {
        this.inventoryTrackedColumnAvailable = false;
        retried = true;
      }
      if (this.sourceAvailableColumnAvailable !== false && this.isMissingVariantColumn(result.error, "source_available")) {
        this.sourceAvailableColumnAvailable = false;
        retried = true;
      }
      if (!retried) return result;
    }
    return result;
  }

  /**
   * Lấy chi tiết 1 sản phẩm theo ID từ Supabase
   */
  public async getProductById(id: string): Promise<WebProduct | null> {
    if (!this.client) return null;

    try {
      const { data, error } = await this.client
        .from("products")
        .select("*, product_variants(*)")
        .eq("id", id)
        .single();

      if (error || !data) return null;
      return this.mapDbRowToWebProduct(data);
    } catch (err) {
      console.error("[Supabase getProductById exception]", err);
      return null;
    }
  }

  public async getProductBySourceId(sourceProductId: string): Promise<WebProduct | null> {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client.from("products")
        .select("*, product_variants(*)")
        .eq("source_product_id", sourceProductId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !data) return null;
      return this.mapDbRowToWebProduct(data);
    } catch (error) {
      console.error("[Supabase getProductBySourceId exception]", error);
      return null;
    }
  }

  /**
   * Kiểm tra danh sách sản phẩm nguồn 1688 đã tồn tại trên Supabase chưa
   */
  public async checkExistingProducts(sourceProductIds: string[]): Promise<ExistingProductCheckResult[]> {
    if (!this.client) return [];

    try {
      const { data, error } = await this.client
        .from("products")
        .select("id, slug, source_product_id, min_price_vnd, updated_at, product_variants(stock_quantity)")
        .in("source_product_id", sourceProductIds);

      if (error) {
        console.error("[Supabase checkExisting error]", error);
        return [];
      }

      const existingMap = new Map((data || []).map((p: any) => [p.source_product_id, p]));

      return sourceProductIds.map(id => {
        const item = existingMap.get(id);
        if (item) {
          const totalStock = (item.product_variants || []).reduce((sum: number, v: any) => sum + (v.stock_quantity || 0), 0);
          return {
            exists: true,
            sourceProductId: id,
            webProductId: item.id,
            webProductSlug: item.slug,
            currentMinSellingPriceVND: item.min_price_vnd,
            currentStock: totalStock,
            lastSyncedAt: item.updated_at,
            marginPercent: 58.5
          };
        }
        return {
          exists: false,
          sourceProductId: id
        };
      });
    } catch (err) {
      console.error("[Supabase checkExisting exception]", err);
      return [];
    }
  }

  /**
   * Lưu Nhà cung cấp / Shop 1688 vào Supabase
   */
  public async upsertSupplier(shop: Raw1688Shop, sourcePlatform: Normalized1688Product["sourcePlatform"] = "1688"): Promise<string | null> {
    if (!this.client) return null;

    const { data, error } = await this.client
      .from("suppliers")
      .upsert(
        {
          source_platform: sourcePlatform,
          shop_id: shop.shopId,
          shop_name: shop.shopName,
          company_name: shop.companyName,
          shop_url: shop.shopUrl,
          rating_score: shop.ratingScore ?? null,
          updated_at: new Date().toISOString()
        },
        { onConflict: "source_platform, shop_id" }
      )
      .select("id")
      .single();

    if (error) {
      console.error("[Supabase upsertSupplier error]", error);
      return null;
    }
    return data?.id || null;
  }

  /**
   * Lưu Source Product và Variants vào Supabase
   */
  public async saveSourceProduct(
    normalized: Normalized1688Product,
    supplierId: string
  ): Promise<string | null> {
    if (!this.client) return null;

    const raw = normalized.rawSnapshot;
    const { data: sourceProd, error: prodErr } = await this.client
      .from("source_products")
      .upsert(
        {
          source_platform: normalized.sourcePlatform || "1688",
          source_product_id: normalized.sourceProductId,
          source_url: normalized.sourceUrl,
          title_cn: normalized.titleCN,
          moq: normalized.moq,
          min_price_cny: normalized.price.min,
          max_price_cny: normalized.price.max,
          raw_media_json: {
            ...normalized.media,
            optionGroups: normalized.optionGroups || raw.optionGroups || [],
            customOptionGroups: normalized.customOptionGroups || raw.customOptionGroups || [],
            customizationEvidence: normalized.customizationEvidence || raw.customizationEvidence || null,
            customizerMockupTemplateUrl: normalized.customizerMockupTemplateUrl || raw.customizerMockupTemplateUrl || null
          },
          raw_attributes_json: normalized.attributes,
          supplier_id: supplierId,
          last_checked_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        { onConflict: "source_platform, source_product_id" }
      )
      .select("id")
      .single();

    if (prodErr || !sourceProd) {
      console.error("[Supabase saveSourceProduct error]", prodErr);
      return null;
    }

    const uniqueSourceVariants = [...new Map(Object.values(raw.skuMap || {}).map(item => [item.skuId, item])).values()];
    const variantRows = uniqueSourceVariants.map(item => ({
      source_product_id: sourceProd.id,
      source_sku_id: item.skuId,
      attributes_json: item.attributes,
      source_price_cny: item.priceCNY,
      source_stock: item.stock,
      image_url: item.imageUrl,
      updated_at: new Date().toISOString()
    }));

    if (variantRows.length > 0) {
      const { error: variantsError } = await this.client
        .from("source_variants")
        .upsert(variantRows, { onConflict: "source_product_id, source_sku_id" });
      if (variantsError) {
        console.error("[Supabase saveSourceVariants error]", variantsError);
        return null;
      }
    }

    return sourceProd.id;
  }

  /**
   * Lưu Web Product và Variants vào Supabase (Toàn diện trường mới)
   */
  public async saveWebProduct(product: WebProduct): Promise<boolean> {
    if (!this.client) return false;

    try {
      const { data: previousProduct } = await this.client
        .from("products")
        .select("id")
        .eq("id", product.id)
        .maybeSingle();
      const dbRow: Record<string, any> = {
        id: product.id,
        version: product.version || 1,
        slug: product.slug,
        sku_code: product.skuCode,
        title_vi: product.titleVI,
        title_en: product.titleEN || null,
        short_desc_vi: product.shortDescVI || null,
        short_desc_en: product.shortDescEN || null,
        full_desc_vi: product.fullDescVI || null,
        full_desc_en: product.fullDescEN || null,
        display_language: product.displayLanguage || "VI",
        category_name: product.categoryName,
        primary_image: product.primaryImage,
        gallery_images: product.galleryImages || [],
        detail_images: product.detailImages || [],
        video_url: product.videoUrl || null,
        video_poster_url: product.videoPosterUrl || null,
        attributes_json: product.attributes || [],
        price_tiers_json: product.priceTiers || [],
        seo_metadata: product.seo || {},
        meta_title: product.metaTitle || null,
        meta_description: product.metaDescription || null,
        focus_keywords: product.focusKeywords || [],
        images_seo: product.imagesSEO || [],
        faqs_json: product.faqs || [],
        store_sync_history: product.storeSyncHistory || [],
        is_personalized: Boolean(product.isPersonalized),
        personalization_fields: product.personalizationFields || [],
        customizer_template_url: product.customizerMockupTemplateUrl || null,
        customizer_canvas: product.customizerCanvas || { printAreas: [] },
        volume_discount_tiers: product.volumeDiscountTiers || [],
        gift_addons: product.giftAddons || [],
        occasion_tags: product.occasionTags || [],
        recipient_tags: product.recipientTags || [],
        rating: product.rating ?? null,
        review_count: product.reviewCount ?? 0,
        warranty_policy: product.warrantyPolicy || null,
        shipping_policy: product.shippingPolicy || null,
        source_platform: product.sourcePlatform || "1688",
        source_currency: product.sourceCurrency || "CNY",
        is_media_mirrored: Boolean(product.isMediaMirrored),
        mirrored_at: product.mirroredAt || null,
        status: product.status,
        quality_score: product.qualityScore,
        min_price_vnd: product.minPriceVND,
        max_price_vnd: product.maxPriceVND,
        is_title_locked: product.isTitleLocked,
        is_desc_locked: product.isDescLocked,
        is_images_locked: product.isImagesLocked,
        is_price_auto_sync: product.isPriceAutoSync,
        is_stock_auto_sync: product.isStockAutoSync,
        source_product_id: product.sourceProductId,
        source_url: product.sourceUrl,
        supplier_name: product.supplierName,
        created_at: product.createdAt || new Date().toISOString(),
        updated_at: product.updatedAt || new Date().toISOString()
      };
      if (this.customizerCanvasColumnAvailable === false) delete dbRow.customizer_canvas;

      let { data: createdProd, error: prodErr } = await this.client
        .from("products")
        .upsert(dbRow, { onConflict: "id" })
        .select("id")
        .single();

      if (prodErr && this.isMissingProductColumn(prodErr, "customizer_canvas")) {
        this.customizerCanvasColumnAvailable = false;
        delete dbRow.customizer_canvas;
        ({ data: createdProd, error: prodErr } = await this.client
          .from("products")
          .upsert(dbRow, { onConflict: "id" })
          .select("id")
          .single());
      } else if (!prodErr) {
        this.customizerCanvasColumnAvailable = true;
      }

      if (prodErr || !createdProd) {
        console.error("[Supabase saveWebProduct error]", prodErr);
        return false;
      }

      const { data: previousVariants } = await this.client.from("product_variants").select("*").eq("product_id", createdProd.id);
      const { error: deleteVariantsError } = await this.client
        .from("product_variants")
        .delete()
        .eq("product_id", createdProd.id);
      if (deleteVariantsError) {
        if (!previousProduct) await this.client.from("products").delete().eq("id", createdProd.id);
        return false;
      }

      const variantRows = product.variants.map(v => ({
        product_id: createdProd.id,
        source_sku_id: v.sourceSkuId,
        color_name: v.colorName || "",
        color_name_en: v.colorNameEN || null,
        size_name: v.sizeName || "",
        size_name_en: v.sizeNameEN || null,
        cost_price_vnd: v.costPriceVND,
        source_price: v.sourcePrice || null,
        selling_price_vnd: v.sellingPriceVND,
        stock_quantity: v.stockQuantity,
        image_url: v.imageUrl || null,
        inventory_tracked: v.inventoryTracked ?? true,
        source_available: v.sourceAvailable,
        selected_for_sale: v.selectedForSale
      }));

      if (variantRows.length > 0) {
        const { error: varErr } = await this.insertVariantRows(variantRows);
        if (varErr) {
          console.error("[Supabase saveVariants error]", varErr);
          if (previousVariants?.length) await this.client.from("product_variants").insert(previousVariants);
          else if (!previousProduct) await this.client.from("products").delete().eq("id", createdProd.id);
          return false;
        }
      }

      return true;
    } catch (err) {
      console.error("[Supabase saveWebProduct exception]", err);
      return false;
    }
  }

  /**
   * Cập nhật thông tin sản phẩm trên Supabase
   */
  public async updateWebProduct(id: string, updates: Partial<WebProduct>, expectedVersion?: number): Promise<boolean> {
    if (!this.client) return false;

    try {
      const dbUpdates: Record<string, any> = {
        updated_at: new Date().toISOString()
      };
      if (updates.version !== undefined) dbUpdates.version = updates.version;
      if (updates.slug !== undefined) dbUpdates.slug = updates.slug;

      if (updates.titleVI !== undefined) dbUpdates.title_vi = updates.titleVI;
      if (updates.titleEN !== undefined) dbUpdates.title_en = updates.titleEN;
      if (updates.shortDescVI !== undefined) dbUpdates.short_desc_vi = updates.shortDescVI;
      if (updates.shortDescEN !== undefined) dbUpdates.short_desc_en = updates.shortDescEN;
      if (updates.fullDescVI !== undefined) dbUpdates.full_desc_vi = updates.fullDescVI;
      if (updates.fullDescEN !== undefined) dbUpdates.full_desc_en = updates.fullDescEN;
      if (updates.displayLanguage !== undefined) dbUpdates.display_language = updates.displayLanguage;
      if (updates.categoryName !== undefined) dbUpdates.category_name = updates.categoryName;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.primaryImage !== undefined) dbUpdates.primary_image = updates.primaryImage;
      if (updates.galleryImages !== undefined) dbUpdates.gallery_images = updates.galleryImages;
      if (updates.detailImages !== undefined) dbUpdates.detail_images = updates.detailImages;
      if (updates.videoUrl !== undefined) dbUpdates.video_url = updates.videoUrl;
      if (updates.videoPosterUrl !== undefined) dbUpdates.video_poster_url = updates.videoPosterUrl;
      if (updates.attributes !== undefined) dbUpdates.attributes_json = updates.attributes;
      if (updates.priceTiers !== undefined) dbUpdates.price_tiers_json = updates.priceTiers;
      if (updates.seo !== undefined) dbUpdates.seo_metadata = updates.seo;
      if (updates.metaTitle !== undefined) dbUpdates.meta_title = updates.metaTitle;
      if (updates.metaDescription !== undefined) dbUpdates.meta_description = updates.metaDescription;
      if (updates.focusKeywords !== undefined) dbUpdates.focus_keywords = updates.focusKeywords;
      if (updates.imagesSEO !== undefined) dbUpdates.images_seo = updates.imagesSEO;
      if (updates.faqs !== undefined) dbUpdates.faqs_json = updates.faqs;
      if (updates.storeSyncHistory !== undefined) dbUpdates.store_sync_history = updates.storeSyncHistory;
      if (updates.isPersonalized !== undefined) dbUpdates.is_personalized = updates.isPersonalized;
      if (updates.personalizationFields !== undefined) dbUpdates.personalization_fields = updates.personalizationFields;
      if (updates.customizerMockupTemplateUrl !== undefined) dbUpdates.customizer_template_url = updates.customizerMockupTemplateUrl;
      if (updates.customizerCanvas !== undefined && this.customizerCanvasColumnAvailable !== false) dbUpdates.customizer_canvas = updates.customizerCanvas;
      if (updates.volumeDiscountTiers !== undefined) dbUpdates.volume_discount_tiers = updates.volumeDiscountTiers;
      if (updates.giftAddons !== undefined) dbUpdates.gift_addons = updates.giftAddons;
      if (updates.occasionTags !== undefined) dbUpdates.occasion_tags = updates.occasionTags;
      if (updates.recipientTags !== undefined) dbUpdates.recipient_tags = updates.recipientTags;
      if (updates.rating !== undefined) dbUpdates.rating = updates.rating;
      if (updates.reviewCount !== undefined) dbUpdates.review_count = updates.reviewCount;
      if (updates.warrantyPolicy !== undefined) dbUpdates.warranty_policy = updates.warrantyPolicy;
      if (updates.shippingPolicy !== undefined) dbUpdates.shipping_policy = updates.shippingPolicy;
      if (updates.sourcePlatform !== undefined) dbUpdates.source_platform = updates.sourcePlatform;
      if (updates.sourceCurrency !== undefined) dbUpdates.source_currency = updates.sourceCurrency;
      if (updates.isMediaMirrored !== undefined) dbUpdates.is_media_mirrored = updates.isMediaMirrored;
      if (updates.mirroredAt !== undefined) dbUpdates.mirrored_at = updates.mirroredAt;
      if (updates.qualityScore !== undefined) dbUpdates.quality_score = updates.qualityScore;
      if (updates.minPriceVND !== undefined) dbUpdates.min_price_vnd = updates.minPriceVND;
      if (updates.maxPriceVND !== undefined) dbUpdates.max_price_vnd = updates.maxPriceVND;
      if (updates.isTitleLocked !== undefined) dbUpdates.is_title_locked = updates.isTitleLocked;
      if (updates.isDescLocked !== undefined) dbUpdates.is_desc_locked = updates.isDescLocked;
      if (updates.isImagesLocked !== undefined) dbUpdates.is_images_locked = updates.isImagesLocked;
      if (updates.isPriceAutoSync !== undefined) dbUpdates.is_price_auto_sync = updates.isPriceAutoSync;
      if (updates.isStockAutoSync !== undefined) dbUpdates.is_stock_auto_sync = updates.isStockAutoSync;

      let updateQuery = this.client
        .from("products")
        .update(dbUpdates)
        .eq("id", id);
      if (expectedVersion !== undefined) updateQuery = updateQuery.eq("version", expectedVersion);
      let { data: updatedRows, error } = await updateQuery.select("id");

      if (error && this.isMissingProductColumn(error, "customizer_canvas")) {
        this.customizerCanvasColumnAvailable = false;
        delete dbUpdates.customizer_canvas;
        updateQuery = this.client.from("products").update(dbUpdates).eq("id", id);
        if (expectedVersion !== undefined) updateQuery = updateQuery.eq("version", expectedVersion);
        ({ data: updatedRows, error } = await updateQuery.select("id"));
      }

      if (error || !updatedRows?.length) {
        console.error("[Supabase updateWebProduct error]", error);
        return false;
      }

      if (Array.isArray(updates.variants)) {
        const { data: previousVariants } = await this.client.from("product_variants").select("*").eq("product_id", id);
        const { error: deleteVariantsError } = await this.client
          .from("product_variants")
          .delete()
          .eq("product_id", id);
        if (deleteVariantsError) return false;

        const variantRows = updates.variants.map(v => ({
          product_id: id,
          source_sku_id: v.sourceSkuId,
          color_name: v.colorName || "",
          color_name_en: v.colorNameEN || null,
          size_name: v.sizeName || "",
          size_name_en: v.sizeNameEN || null,
          cost_price_vnd: v.costPriceVND,
          source_price: v.sourcePrice || null,
          selling_price_vnd: v.sellingPriceVND,
          stock_quantity: v.stockQuantity,
          image_url: v.imageUrl || null,
          inventory_tracked: v.inventoryTracked ?? true,
          source_available: v.sourceAvailable,
          selected_for_sale: v.selectedForSale
        }));

        if (variantRows.length > 0) {
          const { error: insertVariantsError } = await this.insertVariantRows(variantRows);
          if (insertVariantsError) {
            if (previousVariants?.length) await this.client.from("product_variants").insert(previousVariants);
            return false;
          }
        }
      }

      return true;
    } catch (err) {
      console.error("[Supabase updateWebProduct exception]", err);
      return false;
    }
  }

  /**
   * Xóa sản phẩm khỏi Supabase
   */
  public async deleteWebProduct(id: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const { error } = await this.client
        .from("products")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("[Supabase deleteWebProduct error]", error);
        return false;
      }
      return true;
    } catch (err) {
      console.error("[Supabase deleteWebProduct exception]", err);
      return false;
    }
  }

  private mapDbRowToWebProduct(row: any): WebProduct {
    const sourcePlatform = String(row.source_platform || "1688").toUpperCase();
    const legacyUntrackedSource = sourcePlatform === "SHOPIFY" || sourcePlatform === "MACORNER";
    const variants: WebProductVariant[] = (row.product_variants || []).map((v: any) => ({
      id: v.id,
      sourceSkuId: v.source_sku_id,
      colorName: v.color_name,
      colorNameEN: v.color_name_en,
      sizeName: v.size_name,
      sizeNameEN: v.size_name_en,
      costPriceVND: Number(v.cost_price_vnd) || 0,
      sourcePrice: v.source_price == null ? undefined : Number(v.source_price),
      sellingPriceVND: Number(v.selling_price_vnd) || 0,
      stockQuantity: Number(v.stock_quantity) || 0,
      imageUrl: v.image_url,
      // Before the inventory_tracked migration, Shopify/Macorner rows had
      // source_available=true with inventory_quantity represented as 0/null.
      // Preserve that explicit availability instead of showing a false sold
      // out state while the old schema is still in use.
      inventoryTracked: v.inventory_tracked ?? !(legacyUntrackedSource && v.source_available === true && Number(v.stock_quantity || 0) <= 0),
      // Older production schemas did not persist source_available. Stock is
      // the authoritative fallback until that optional column is migrated.
      sourceAvailable: v.source_available ?? Number(v.stock_quantity || 0) > 0,
      selectedForSale: v.selected_for_sale ?? true
    }));

    return {
      id: row.id,
      version: Number(row.version) || 1,
      slug: row.slug,
      skuCode: row.sku_code,
      titleVI: row.title_vi,
      titleEN: row.title_en,
      shortDescVI: row.short_desc_vi,
      shortDescEN: row.short_desc_en,
      fullDescVI: row.full_desc_vi,
      fullDescEN: row.full_desc_en,
      displayLanguage: row.display_language || "VI",
      categoryName: row.category_name,
      primaryImage: row.primary_image,
      galleryImages: row.gallery_images || [],
      detailImages: row.detail_images || [],
      videoUrl: row.video_url,
      videoPosterUrl: row.video_poster_url,
      attributes: row.attributes_json || [],
      priceTiers: row.price_tiers_json || [],
      seo: row.seo_metadata || {},
      metaTitle: row.meta_title,
      metaDescription: row.meta_description,
      focusKeywords: row.focus_keywords || [],
      imagesSEO: row.images_seo || [],
      faqs: row.faqs_json || [],
      storeSyncHistory: row.store_sync_history || [],
      isPersonalized: Boolean(row.is_personalized),
      personalizationFields: row.personalization_fields || [],
      customizerMockupTemplateUrl: row.customizer_template_url,
      customizerCanvas: row.customizer_canvas || undefined,
      volumeDiscountTiers: row.volume_discount_tiers || [],
      giftAddons: row.gift_addons || [],
      occasionTags: row.occasion_tags || [],
      recipientTags: row.recipient_tags || [],
      rating: row.rating == null ? undefined : Number(row.rating),
      reviewCount: Number(row.review_count) || 0,
      warrantyPolicy: row.warranty_policy,
      shippingPolicy: row.shipping_policy,
      status: row.status,
      qualityScore: row.quality_score || 0,
      minPriceVND: Number(row.min_price_vnd) || 0,
      maxPriceVND: Number(row.max_price_vnd) || 0,
      isTitleLocked: Boolean(row.is_title_locked),
      isDescLocked: Boolean(row.is_desc_locked),
      isImagesLocked: Boolean(row.is_images_locked),
      isPriceAutoSync: Boolean(row.is_price_auto_sync),
      isStockAutoSync: Boolean(row.is_stock_auto_sync),
      isMediaMirrored: Boolean(row.is_media_mirrored),
      mirroredAt: row.mirrored_at,
      variants,
      sourcePlatform: row.source_platform || "1688",
      sourceCurrency: row.source_currency || "CNY",
      sourceProductId: row.source_product_id,
      sourceUrl: row.source_url,
      supplierName: row.supplier_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export const supabaseService = new SupabaseDataService();
