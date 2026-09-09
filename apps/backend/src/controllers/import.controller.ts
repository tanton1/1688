import { Request, Response } from "express";
import {
  ImportProductPayload,
  WebProduct,
  ExistingProductCheckResult,
  BulkImportRequest,
  ImportJobStatus
} from "@hub1688/shared-types";
import { evaluateProductQuality } from "@hub1688/shared-utils";
import { TranslationEngineService } from "../services/translation.service.js";
import { PricingEngineService } from "../services/pricing.service.js";
import { SkuMappingService } from "../services/sku-mapping.service.js";
import { supabaseService } from "../services/supabase.service.js";

// Bộ nhớ in-memory giả lập Database Repository khi chưa kết nối Postgres thực tế
export const inMemoryProducts = new Map<string, WebProduct>();
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
          marginPercent: 58.5
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

    // 3. Xử lý Dịch thuật
    const titleVariants = translationService.generateTitleVariants(
      normalized.titleCN,
      settings.categoryName || "Thời trang"
    );

    let finalTitle = titleVariants.clean;
    if (settings.translationMode === "ACCURATE") finalTitle = titleVariants.literal;
    if (settings.translationMode === "SEO") finalTitle = titleVariants.seo;
    if (settings.translationMode === "REWRITE") finalTitle = titleVariants.display;

    const translatedAttrs = translationService.translateAttributes(raw.attributes || []);
    const structuredDesc = translationService.generateStructuredDescription(
      finalTitle,
      translatedAttrs,
      normalized.description.rawHtml || ""
    );

    // 4. Sinh ma trận biến thể SKU (Cartesian Product)
    const rawVariants = skuMappingService.generateVariantsFromRaw(raw, pricingRule);

    // Lọc các variant nếu người dùng chỉ chọn 1 số SKU nhất định
    const selectedVariants = settings.selectedSkuIds && settings.selectedSkuIds.length > 0
      ? rawVariants.map(v => ({
          ...v,
          selectedForSale: settings.selectedSkuIds!.includes(v.sourceSkuId)
        }))
      : rawVariants;

    // Tính toán min/max price
    const { variants, minPriceVND, maxPriceVND } = pricingService.applyPricingToVariants(
      selectedVariants,
      pricingRule.id
    );

    const productId = `prod_${Date.now()}`;
    const slug = `${finalTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString().slice(-4)}`;

    const newProduct: WebProduct = {
      id: productId,
      slug,
      skuCode: `SP-${Date.now().toString().slice(-6)}`,
      titleVI: finalTitle,
      titleVariants,
      shortDescVI: `Sản phẩm ${finalTitle} nhập chính hãng nguồn 1688`,
      fullDescVI: structuredDesc,
      categoryName: settings.categoryName || "Thời trang nữ",
      primaryImage: normalized.media.images[0] || "",
      galleryImages: normalized.media.images.slice(1),
      status: settings.autoPublish ? "PUBLISHED" : "DRAFT",
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
        console.error("[Supabase save error]", dbErr);
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

    // Giả lập worker nền xử lý batch không đồng bộ
    setTimeout(() => {
      offerIds.forEach((offerId, index) => {
        const prodId = `prod_bulk_${Date.now()}_${index}`;
        const dummyProduct: WebProduct = {
          id: prodId,
          slug: `bulk-imported-item-${offerId}`,
          skuCode: `SP-BLK-${offerId.slice(-4)}`,
          titleVI: `Sản Phẩm Thời Trang Nữ Cao Cấp 1688 #${offerId.slice(-4)}`,
          categoryName: settings.categoryName || "Thời trang",
          primaryImage: "https://cbu01.alicdn.com/img/ibank/dummy.jpg",
          galleryImages: [],
          status: settings.autoPublish ? "PUBLISHED" : "DRAFT",
          qualityScore: 88,
          minPriceVND: 189000,
          maxPriceVND: 249000,
          isTitleLocked: false,
          isDescLocked: false,
          isImagesLocked: false,
          isPriceAutoSync: true,
          isStockAutoSync: true,
          variants: [
            {
              sourceSkuId: `sku_${offerId}_01`,
              colorName: "Đen",
              sizeName: "M",
              costPriceVND: 80000,
              sellingPriceVND: 189000,
              stockQuantity: 250,
              sourceAvailable: true,
              selectedForSale: true
            }
          ],
          sourceProductId: offerId,
          sourceUrl: `https://detail.1688.com/offer/${offerId}.html`,
          supplierName: "Nhà Cung Cấp 1688 Uy Tín",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        inMemoryProducts.set(prodId, dummyProduct);
        jobStatus.results.push({
          offerId,
          status: "SUCCESS",
          webProductId: prodId
        });
        jobStatus.completedItems++;
      });
      jobStatus.status = "COMPLETED";
    }, 1000);

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
