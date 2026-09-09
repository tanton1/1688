import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  WebProduct,
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

    // Lưu từng variant nguồn
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
   * Lưu Web Product và Variants vào Supabase
   */
  public async saveWebProduct(product: WebProduct): Promise<boolean> {
    if (!this.client) return false;

    try {
      const { data: createdProd, error: prodErr } = await this.client
        .from("products")
        .insert({
          id: product.id,
          slug: product.slug,
          sku_code: product.skuCode,
          title_vi: product.titleVI,
          ai_seo_title: product.titleVariants?.seo,
          short_desc_vi: product.shortDescVI,
          full_desc_vi: product.fullDescVI,
          category_name: product.categoryName,
          primary_image: product.primaryImage,
          gallery_images: product.galleryImages,
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
          created_at: product.createdAt,
          updated_at: product.updatedAt
        })
        .select("id")
        .single();

      if (prodErr || !createdProd) {
        console.error("[Supabase saveWebProduct error]", prodErr);
        return false;
      }

      // Lưu variants
      const variantRows = product.variants.map(v => ({
        product_id: createdProd.id,
        source_sku_id: v.sourceSkuId,
        color_name: v.colorName,
        size_name: v.sizeName,
        cost_price_vnd: v.costPriceVND,
        selling_price_vnd: v.sellingPriceVND,
        stock_quantity: v.stockQuantity,
        image_url: v.imageUrl,
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
   * Tải ảnh sản phẩm từ 1688 lên Supabase Storage Bucket để lưu vĩnh viễn
   */
  public async uploadImageToStorage(imageUrl: string, path: string): Promise<string | null> {
    if (!this.client) return imageUrl;

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) return imageUrl;
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const contentType = response.headers.get("content-type") || "image/jpeg";
      const { data, error } = await this.client.storage
        .from(ENV.SUPABASE_STORAGE_BUCKET)
        .upload(path, buffer, {
          contentType,
          upsert: true
        });

      if (error) {
        console.warn("[Supabase Storage upload warning]", error.message);
        return imageUrl;
      }

      const { data: publicUrl } = this.client.storage
        .from(ENV.SUPABASE_STORAGE_BUCKET)
        .getPublicUrl(path);

      return publicUrl.publicUrl || imageUrl;
    } catch (err) {
      console.warn("[Supabase Storage exception]", err);
      return imageUrl;
    }
  }
}

export const supabaseService = new SupabaseDataService();
