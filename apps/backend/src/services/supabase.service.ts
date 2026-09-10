import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  WebProduct,
  WebProductVariant,
  Normalized1688Product,
  Raw1688Shop,
  ExistingProductCheckResult
} from "@hub1688/shared-types";
import { ENV } from "../config/env.js";

export class SupabaseDataService {
  private client: SupabaseClient | null = null;
  private configured: boolean = false;

  constructor() {
    const key = ENV.SUPABASE_SERVICE_ROLE_KEY || ENV.SUPABASE_ANON_KEY;
    if (ENV.SUPABASE_URL && key) {
      this.client = createClient(ENV.SUPABASE_URL, key, {
        auth: { persistSession: false }
      });
      this.configured = true;
      console.log(`[Supabase] Đã kết nối với Supabase Cloud: ${ENV.SUPABASE_URL}`);
    } else {
      console.warn("[Supabase] Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY hoặc SUPABASE_ANON_KEY. Chạy ở chế độ fallback memory.");
    }
  }

  public isConfigured(): boolean {
    return this.configured && this.client !== null;
  }

  /**
   * Lấy danh sách sản phẩm từ Supabase kèm bộ lọc
   */
  public async getProducts(params?: {
    status?: string;
    category?: string;
    search?: string;
    minQuality?: number;
    sort?: string;
  }): Promise<{ total: number; items: WebProduct[] } | null> {
    if (!this.client) return null;

    try {
      let query = this.client
        .from("products")
        .select("*, product_variants(*)");

      if (params?.status && params.status !== "ALL") {
        query = query.eq("status", params.status);
      }
      if (params?.category && params.category !== "ALL") {
        query = query.eq("category_name", params.category);
      }
      if (params?.minQuality) {
        query = query.gte("quality_score", params.minQuality);
      }

      if (params?.sort === "PRICE_ASC") {
        query = query.order("min_price_vnd", { ascending: true });
      } else if (params?.sort === "PRICE_DESC") {
        query = query.order("min_price_vnd", { ascending: false });
      } else if (params?.sort === "QUALITY_DESC") {
        query = query.order("quality_score", { ascending: false });
      } else {
        query = query.order("updated_at", { ascending: false });
      }

      const { data, error } = await query;

      if (error || !data) {
        console.error("[Supabase getProducts error]", error);
        return null;
      }

      let items: WebProduct[] = data.map(this.mapDbRowToWebProduct);

      if (params?.search && params.search.trim()) {
        const q = params.search.trim().toLowerCase();
        items = items.filter(p =>
          p.titleVI.toLowerCase().includes(q) ||
          (p.titleEN && p.titleEN.toLowerCase().includes(q)) ||
          p.skuCode.toLowerCase().includes(q) ||
          p.sourceProductId.toLowerCase().includes(q) ||
          (p.supplierName && p.supplierName.toLowerCase().includes(q))
        );
      }

      return { total: items.length, items };
    } catch (err) {
      console.error("[Supabase getProducts exception]", err);
      return null;
    }
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
  public async upsertSupplier(shop: Raw1688Shop): Promise<string | null> {
    if (!this.client) return null;

    const { data, error } = await this.client
      .from("suppliers")
      .upsert(
        {
          source_platform: "1688",
          shop_id: shop.shopId,
          shop_name: shop.shopName,
          company_name: shop.companyName,
          shop_url: shop.shopUrl,
          rating_score: shop.ratingScore || 4.8,
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
          source_platform: "1688",
          source_product_id: normalized.sourceProductId,
          source_url: normalized.sourceUrl,
          title_cn: normalized.titleCN,
          moq: normalized.moq,
          min_price_cny: normalized.price.min,
          max_price_cny: normalized.price.max,
          raw_media_json: normalized.media,
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

    const variantRows = Object.values(raw.skuMap || {}).map(item => ({
      source_product_id: sourceProd.id,
      source_sku_id: item.skuId,
      attributes_json: item.attributes,
      source_price_cny: item.priceCNY,
      source_stock: item.stock,
      image_url: item.imageUrl,
      updated_at: new Date().toISOString()
    }));

    if (variantRows.length > 0) {
      await this.client
        .from("source_variants")
        .upsert(variantRows, { onConflict: "source_product_id, source_sku_id" });
    }

    return sourceProd.id;
  }

  /**
   * Lưu Web Product và Variants vào Supabase (Toàn diện trường mới)
   */
  public async saveWebProduct(product: WebProduct): Promise<boolean> {
    if (!this.client) return false;

    try {
      const dbRow = {
        id: product.id,
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

      const { data: createdProd, error: prodErr } = await this.client
        .from("products")
        .upsert(dbRow, { onConflict: "id" })
        .select("id")
        .single();

      if (prodErr || !createdProd) {
        console.error("[Supabase saveWebProduct error]", prodErr);
        return false;
      }

      // Xóa các variant cũ và lưu biến thể mới
      await this.client
        .from("product_variants")
        .delete()
        .eq("product_id", createdProd.id);

      const variantRows = product.variants.map(v => ({
        product_id: createdProd.id,
        source_sku_id: v.sourceSkuId,
        color_name: v.colorName || null,
        color_name_en: v.colorNameEN || null,
        size_name: v.sizeName || null,
        size_name_en: v.sizeNameEN || null,
        cost_price_vnd: v.costPriceVND,
        selling_price_vnd: v.sellingPriceVND,
        stock_quantity: v.stockQuantity,
        image_url: v.imageUrl || null,
        source_available: v.sourceAvailable,
        selected_for_sale: v.selectedForSale
      }));

      if (variantRows.length > 0) {
        const { error: varErr } = await this.client
          .from("product_variants")
          .insert(variantRows);
        if (varErr) console.error("[Supabase saveVariants error]", varErr);
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
  public async updateWebProduct(id: string, updates: Partial<WebProduct>): Promise<boolean> {
    if (!this.client) return false;

    try {
      const dbUpdates: Record<string, any> = {
        updated_at: new Date().toISOString()
      };

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
      if (updates.qualityScore !== undefined) dbUpdates.quality_score = updates.qualityScore;
      if (updates.minPriceVND !== undefined) dbUpdates.min_price_vnd = updates.minPriceVND;
      if (updates.maxPriceVND !== undefined) dbUpdates.max_price_vnd = updates.maxPriceVND;
      if (updates.isTitleLocked !== undefined) dbUpdates.is_title_locked = updates.isTitleLocked;
      if (updates.isDescLocked !== undefined) dbUpdates.is_desc_locked = updates.isDescLocked;
      if (updates.isImagesLocked !== undefined) dbUpdates.is_images_locked = updates.isImagesLocked;
      if (updates.isPriceAutoSync !== undefined) dbUpdates.is_price_auto_sync = updates.isPriceAutoSync;
      if (updates.isStockAutoSync !== undefined) dbUpdates.is_stock_auto_sync = updates.isStockAutoSync;

      const { error } = await this.client
        .from("products")
        .update(dbUpdates)
        .eq("id", id);

      if (error) {
        console.error("[Supabase updateWebProduct error]", error);
        return false;
      }

      if (Array.isArray(updates.variants)) {
        await this.client
          .from("product_variants")
          .delete()
          .eq("product_id", id);

        const variantRows = updates.variants.map(v => ({
          product_id: id,
          source_sku_id: v.sourceSkuId,
          color_name: v.colorName || null,
          color_name_en: v.colorNameEN || null,
          size_name: v.sizeName || null,
          size_name_en: v.sizeNameEN || null,
          cost_price_vnd: v.costPriceVND,
          selling_price_vnd: v.sellingPriceVND,
          stock_quantity: v.stockQuantity,
          image_url: v.imageUrl || null,
          source_available: v.sourceAvailable,
          selected_for_sale: v.selectedForSale
        }));

        if (variantRows.length > 0) {
          await this.client.from("product_variants").insert(variantRows);
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
    const variants: WebProductVariant[] = (row.product_variants || []).map((v: any) => ({
      id: v.id,
      sourceSkuId: v.source_sku_id,
      colorName: v.color_name,
      colorNameEN: v.color_name_en,
      sizeName: v.size_name,
      sizeNameEN: v.size_name_en,
      costPriceVND: Number(v.cost_price_vnd) || 0,
      sellingPriceVND: Number(v.selling_price_vnd) || 0,
      stockQuantity: Number(v.stock_quantity) || 0,
      imageUrl: v.image_url,
      sourceAvailable: Boolean(v.source_available),
      selectedForSale: Boolean(v.selected_for_sale)
    }));

    return {
      id: row.id,
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
      status: row.status,
      qualityScore: row.quality_score || 0,
      minPriceVND: Number(row.min_price_vnd) || 0,
      maxPriceVND: Number(row.max_price_vnd) || 0,
      isTitleLocked: Boolean(row.is_title_locked),
      isDescLocked: Boolean(row.is_desc_locked),
      isImagesLocked: Boolean(row.is_images_locked),
      isPriceAutoSync: Boolean(row.is_price_auto_sync),
      isStockAutoSync: Boolean(row.is_stock_auto_sync),
      variants,
      sourceProductId: row.source_product_id,
      sourceUrl: row.source_url,
      supplierName: row.supplier_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export const supabaseService = new SupabaseDataService();
