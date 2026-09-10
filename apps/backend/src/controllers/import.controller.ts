import { Request, Response } from "express";
import crypto from "node:crypto";
import {
  ImportProductPayload,
  WebProduct,
  WebProductVariant,
  ExistingProductCheckResult,
  BulkImportRequest,
  ImportJobStatus
} from "@hub1688/shared-types";
import { evaluateProductQuality } from "@hub1688/shared-utils";
import { TranslationEngineService } from "../services/translation.service.js";
import { PricingEngineService } from "../services/pricing.service.js";
import { SkuMappingService } from "../services/sku-mapping.service.js";
import { supabaseService } from "../services/supabase.service.js";

import { SEED_PRODUCTS } from "../services/seed-data.js";
import { ENV } from "../config/env.js";

// Bộ nhớ in-memory giả lập Database Repository khi chưa kết nối Postgres thực tế
export const inMemoryProducts = new Map<string, WebProduct>(
  (ENV.DEMO_MODE ? SEED_PRODUCTS : []).map(p => [p.id!, { ...p }])
);
export const inMemoryJobs = new Map<string, ImportJobStatus>();

const translationService = new TranslationEngineService();
const pricingService = new PricingEngineService();
const skuMappingService = new SkuMappingService();

export class ImportController {
  /**
   * Kiểm tra sản phẩm đã từng được import hay chưa để tránh trùng lặp
   */
  public async checkExisting(req: Request, res: Response): Promise<void> {
    const { sourceProductIds } = req.body as { sourceProductIds: string[] };

    if (!Array.isArray(sourceProductIds)) {
      res.status(400).json({ error: "sourceProductIds must be an array" });
      return;
    }

    if (supabaseService.isConfigured()) {
      const supaResults = await supabaseService.checkExistingProducts(sourceProductIds);
      if (supaResults.length > 0) {
        res.json({ results: supaResults });
        return;
      }
    }

    const results: ExistingProductCheckResult[] = sourceProductIds.map(id => {
      const existing = Array.from(inMemoryProducts.values()).find(p => p.sourceProductId === id);
      if (existing) {
        return {
          exists: true,
          sourceProductId: id,
          webProductId: existing.id,
          webProductSlug: existing.slug,
          currentMinSellingPriceVND: existing.minPriceVND,
          currentStock: existing.variants.reduce((sum, v) => sum + v.stockQuantity, 0),
          lastSyncedAt: existing.updatedAt,
          marginPercent: existing.minPriceVND > 0
            ? Math.round(((existing.minPriceVND - Math.min(...existing.variants.map(v => v.costPriceVND))) / existing.minPriceVND) * 1000) / 10
            : undefined
        };
      }
      return {
        exists: false,
        sourceProductId: id
      };
    });

    res.json({ results });
  }

  /**
   * Import 1 sản phẩm từ Chrome Extension Sidepanel (1-Click hoặc Advanced)
   */
  public async importSingle(req: Request, res: Response): Promise<void> {
    const payload = req.body as ImportProductPayload;
    if (!payload?.normalized || !payload?.settings) {
      res.status(400).json({ error: "Invalid payload: missing normalized data or settings" });
      return;
    }

    const { normalized, settings } = payload;
    const raw = normalized.rawSnapshot;

    // 1. Kiểm tra trùng lặp
    const existing = Array.from(inMemoryProducts.values()).find(
      p => p.sourceProductId === normalized.sourceProductId
    );
    if (existing) {
      res.status(409).json({
        message: "Sản phẩm này đã tồn tại trên hệ thống",
        existingProduct: existing
      });
      return;
    }

    // 2. Tìm hoặc chọn công thức định giá
    const pricingRule = pricingService.getRuleById(settings.pricingRuleId);

    // 3. Xử lý Dịch thuật Song ngữ (Tiếng Việt & Tiếng Anh)
    const titleVariants = translationService.generateTitleVariants(
      normalized.titleCN,
      settings.categoryName || "Thời trang"
    );
    const titleVariantsEN = translationService.generateTitleVariantsEN(
      normalized.titleCN,
      settings.categoryName || "Fashion"
    );

    let finalTitle = titleVariants.clean;
    if (settings.translationMode === "ACCURATE") finalTitle = titleVariants.literal;
    if (settings.translationMode === "SEO") finalTitle = titleVariants.seo;
    if (settings.translationMode === "REWRITE") finalTitle = titleVariants.display;

    let finalTitleEN = titleVariantsEN.clean;
    if (settings.translationMode === "SEO") finalTitleEN = titleVariantsEN.seo;

    const translatedAttrs = translationService.translateAttributes(raw.attributes || []);
    const structuredDesc = translationService.generateStructuredDescription(
      finalTitle,
      translatedAttrs,
      normalized.description.rawHtml || ""
    );
    const structuredDescEN = translationService.generateStructuredDescriptionEN(
      finalTitleEN,
      translatedAttrs,
      normalized.description.rawHtml || ""
    );

    // 4. Xử lý Ma Trận Biến Thể SKU
    let variants: WebProductVariant[] = [];
    let minPriceVND = 0;
    let maxPriceVND = 0;

    if (Array.isArray(normalized.variants) && normalized.variants.length > 0) {
      // Ưu tiên sử dụng danh sách biến thể được chuẩn hóa từ Extension (đã bóc tách đủ hình ảnh mẫu & SKU)
      const mappedVariants: WebProductVariant[] = normalized.variants.map((nv, idx) => {
        const pricing = pricingService.calculate(nv.priceCNY || raw.prices?.minPriceCNY || 30, pricingRule.id);
        const costVND = pricing.totalCostVND;
        const sellVND = pricing.finalSellingPriceVND;
        const isSelected = settings.selectedSkuIds && settings.selectedSkuIds.length > 0
          ? settings.selectedSkuIds.includes(nv.sourceSkuId)
          : true;

        return {
          id: `v_${Date.now()}_${idx}`,
          sourceSkuId: nv.sourceSkuId,
          colorName: nv.colorVI || nv.colorCN || "Mặc định",
          sizeName: nv.sizeVI || nv.sizeCN || "",
          colorNameEN: nv.colorVI || nv.colorCN,
          sizeNameEN: nv.sizeVI || nv.sizeCN,
          costPriceVND: costVND,
          sourcePrice: nv.priceCNY ?? raw.prices?.minPriceCNY,
          sellingPriceVND: sellVND,
          stockQuantity: nv.stock ?? 0,
          imageUrl: nv.imageUrl || normalized.media.images[0] || "",
          sourceAvailable: (nv.stock ?? 0) > 0,
          selectedForSale: isSelected
        };
      });

      variants = mappedVariants;
      minPriceVND = Math.min(...variants.map(v => v.sellingPriceVND));
      maxPriceVND = Math.max(...variants.map(v => v.sellingPriceVND));
    } else {
      // Fallback: Tự động sinh tổ hợp từ rawSnapshot
      const rawVariants = skuMappingService.generateVariantsFromRaw(raw, pricingRule);
      const selectedVariants = settings.selectedSkuIds && settings.selectedSkuIds.length > 0
        ? rawVariants.map(v => ({
            ...v,
            selectedForSale: settings.selectedSkuIds!.includes(v.sourceSkuId)
          }))
        : rawVariants;

      const applied = pricingService.applyPricingToVariants(
        selectedVariants,
        pricingRule.id
      );
      variants = applied.variants;
      minPriceVND = applied.minPriceVND;
      maxPriceVND = applied.maxPriceVND;
    }

    // Tính toán bảng giá sỉ bậc thang sang VNĐ
    const priceTiers = (raw.prices?.priceTiers || []).map(tier => {
      const tierCalc = pricingService.calculate(tier.price, pricingRule.id);
      return {
        minQuantity: tier.minQuantity,
        priceCNY: tier.price,
        priceVND: tierCalc.finalSellingPriceVND,
        priceUSD: parseFloat((tierCalc.finalSellingPriceVND / 24500).toFixed(2))
      };
    });

    const productId = crypto.randomUUID();
    const skuCode = `SP-${Date.now().toString().slice(-6)}`;

    const detailImagesList = (normalized.description?.images && normalized.description.images.length > 0)
      ? normalized.description.images
      : (raw?.descriptionImages || []);

    const galleryImagesList = [...normalized.media.images.slice(1)];
    variants.forEach(v => {
      if (v.imageUrl && !normalized.media.images.includes(v.imageUrl) && !galleryImagesList.includes(v.imageUrl)) {
        galleryImagesList.push(v.imageUrl);
      }
    });

    // 5. Tự động sinh trọn gói SEO Metadata (Meta Title, Description, Image Alt, FAQs, JSON-LD)
    const seoPackage = translationService.generateCompleteSEOPackage({
      titleVI: finalTitle,
      titleEN: finalTitleEN,
      categoryName: settings.categoryName || "Thời trang nữ",
      attributes: translatedAttrs,
      primaryImage: normalized.media.images[0] || "",
      galleryImages: galleryImagesList,
      detailImages: detailImagesList,
      variants,
      skuCode,
      minPriceVND,
      maxPriceVND,
      supplierName: normalized.supplier.shopName
    });

    const newProduct: WebProduct = {
      id: productId,
      slug: `${seoPackage.slug}-${Date.now().toString().slice(-4)}`,
      skuCode,
      
      // Tiếng Việt
      titleVI: finalTitle,
      titleVariants,
      shortDescVI: `Sản phẩm ${finalTitle} nhập chính hãng nguồn 1688`,
      fullDescVI: structuredDesc,

      // Tiếng Anh
      titleEN: finalTitleEN,
      titleVariantsEN,
      shortDescEN: `High-quality ${finalTitleEN} imported directly from verified 1688 manufacturer`,
      fullDescEN: structuredDescEN,
      displayLanguage: settings.targetLanguage === "en" ? "EN" : "VI",

      categoryName: settings.categoryName || "Thời trang nữ",
      
      // Media & Video
      primaryImage: normalized.media.images[0] || "",
      galleryImages: galleryImagesList,
      detailImages: detailImagesList,
      videoUrl: normalized.media.videoUrl || null,
      videoPosterUrl: normalized.media.images[0] || null,

      // Thuộc tính chi tiết & Bảng giá sỉ
      attributes: translatedAttrs,
      priceTiers: priceTiers.length > 0 ? priceTiers : undefined,

      // SEO & Rich Snippets Google
      seo: seoPackage.seo,
      metaTitle: seoPackage.metaTitle,
      metaDescription: seoPackage.metaDescription,
      focusKeywords: seoPackage.focusKeywords,
      imagesSEO: seoPackage.imagesSEO,
      faqs: seoPackage.faqs,

      status: "DRAFT",
      qualityScore: 0,
      minPriceVND,
      maxPriceVND,
      isTitleLocked: false,
      isDescLocked: false,
      isImagesLocked: false,
      isPriceAutoSync: true,
      isStockAutoSync: true,
      variants,
      sourceProductId: normalized.sourceProductId,
      sourceUrl: normalized.sourceUrl,
      supplierName: normalized.supplier.shopName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 5. Chấm điểm Quality Score
    const qualityResult = evaluateProductQuality(newProduct);
    newProduct.qualityScore = qualityResult.totalScore;

    if (settings.autoPublish) {
      if (!qualityResult.canPublish) {
        res.status(422).json({
          error: "QUALITY_GATE_FAILED",
          message: "Sản phẩm chưa đạt điều kiện đăng bán",
          blockers: qualityResult.blockers,
          qualityScore: qualityResult
        });
        return;
      }
      newProduct.status = "PUBLISHED";
    }

    // Lưu vào database (in-memory cache)
    inMemoryProducts.set(productId, newProduct);

    // Lưu vào Supabase Cloud nếu đã cấu hình
    if (supabaseService.isConfigured()) {
      try {
        const supplierId = await supabaseService.upsertSupplier(normalized.supplier);
        if (supplierId) {
          await supabaseService.saveSourceProduct(normalized, supplierId);
        }
        await supabaseService.saveWebProduct(newProduct);
      } catch (dbErr) {
        inMemoryProducts.delete(productId);
        console.error("[Supabase save error]", dbErr);
        res.status(503).json({ error: "PERSISTENCE_FAILED", message: "Không thể lưu sản phẩm vào cơ sở dữ liệu" });
        return;
      }
    }

    res.status(201).json({
      success: true,
      product: newProduct,
      qualityScore: qualityResult
    });
  }

  /**
   * Import hàng loạt (Bulk Import từ Search Result / Shop Page)
   */
  public async importBulk(req: Request, res: Response): Promise<void> {
    const { offerIds, settings } = req.body as BulkImportRequest;
    if (!offerIds || !Array.isArray(offerIds) || offerIds.length === 0) {
      res.status(400).json({ error: "offerIds array is required" });
      return;
    }

    const jobId = `job_${Date.now()}`;
    const jobStatus: ImportJobStatus = {
      jobId,
      totalItems: offerIds.length,
      completedItems: 0,
      failedItems: 0,
      status: "PROCESSING",
      results: []
    };

    inMemoryJobs.set(jobId, jobStatus);

    // Bulk extraction must be performed by the authenticated extension so its DOM
    // adapters can send normalized products. Never manufacture catalog data here.
    queueMicrotask(() => {
      for (const offerId of offerIds) {
        jobStatus.results.push({
          offerId,
          status: "FAILED",
          error: "EXTRACTION_REQUIRED: mở sản phẩm bằng extension để trích xuất dữ liệu thật"
        });
        jobStatus.failedItems++;
        jobStatus.completedItems++;
      }
      jobStatus.status = "FAILED";
    });

    res.status(202).json({
      success: true,
      message: `Đã xếp ${offerIds.length} sản phẩm vào hàng đợi xử lý`,
      jobId
    });
  }

  public async getJobStatus(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params;
    const job = inMemoryJobs.get(jobId);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json(job);
  }
}
