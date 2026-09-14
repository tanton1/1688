import { Request, Response } from "express";
import { inMemoryProducts } from "./import.controller.js";
import { evaluateProductQuality } from "@hub1688/shared-utils";
import { WebProduct } from "@hub1688/shared-types";
import { supabaseService } from "../services/supabase.service.js";
import { mediaMirrorService } from "../services/media-mirror.service.js";

export class ProductsController {
  private async findProduct(id: string): Promise<WebProduct | undefined> {
    if (supabaseService.isConfigured()) {
      const product = await supabaseService.getProductById(id);
      if (product) inMemoryProducts.set(id, product);
      return product || undefined;
    }
    return inMemoryProducts.get(id);
  }
  /**
   * Helper: Đồng bộ / nạp sản phẩm từ Supabase vào bộ nhớ nếu cần
   */
  private async hydrateFromSupabase(): Promise<boolean> {
    if (!supabaseService.isConfigured()) return true;
    try {
      const loaded: WebProduct[] = [];
      let page = 1;
      let total = 0;
      do {
        const result = await supabaseService.getProducts({ page, pageSize: 100 });
        if (!result) throw new Error("PERSISTENCE_FAILED");
        loaded.push(...result.items); total = result.total; page++;
      } while (loaded.length < total);
      inMemoryProducts.clear();
      for (const product of loaded) if (product.id) inMemoryProducts.set(product.id, product);
      return true;
    } catch (err) {
      console.error("[hydrateFromSupabase error]", err);
      return false;
    }
  }

  /**
   * Danh sách sản phẩm có phân trang, tìm kiếm và lọc
   */
  public async listProducts(req: Request, res: Response): Promise<void> {
    const { status, category, search, minQuality, maxQuality, media, sort, page: rawPage, pageSize: rawPageSize } = req.query as Record<string, string>;
    const page = Math.max(1, Number.parseInt(rawPage || "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(rawPageSize || "50", 10) || 50));

    if (supabaseService.isConfigured()) {
      const result = await supabaseService.getProducts({ status, category, search, minQuality: minQuality ? Number(minQuality) : undefined, maxQuality: maxQuality ? Number(maxQuality) : undefined, media, sort, page, pageSize });
      if (!result) { res.status(503).json({ error: "PERSISTENCE_FAILED" }); return; }
      res.json({ ...result, page, pageSize });
      return;
    }

    // Nạp thêm từ Supabase nếu có dữ liệu mới
    await this.hydrateFromSupabase();

    let items = Array.from(inMemoryProducts.values());

    // 1. Tìm kiếm theo tên tiếng Việt, tiếng Anh, SKU hoặc ID 1688
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(p =>
        p.titleVI.toLowerCase().includes(q) ||
        (p.titleEN && p.titleEN.toLowerCase().includes(q)) ||
        p.skuCode.toLowerCase().includes(q) ||
        p.sourceProductId.toLowerCase().includes(q) ||
        (p.supplierName && p.supplierName.toLowerCase().includes(q))
      );
    }

    // 2. Lọc theo trạng thái (PUBLISHED, DRAFT, ARCHIVED)
    if (status && status !== "ALL") {
      items = items.filter(p => p.status === status);
    }

    // 3. Lọc theo danh mục
    if (category && category !== "ALL") {
      items = items.filter(p => p.categoryName === category);
    }

    // 4. Lọc theo điểm chất lượng tối thiểu
    if (minQuality) {
      const qNum = parseInt(minQuality, 10);
      if (!isNaN(qNum)) {
        items = items.filter(p => (p.qualityScore || 0) >= qNum);
      }
    }
    if (maxQuality) {
      const qNum = parseInt(maxQuality, 10);
      if (!isNaN(qNum)) items = items.filter(p => (p.qualityScore || 0) <= qNum);
    }
    if (media === "VIDEO_ONLY") items = items.filter(product => Boolean(product.videoUrl));
    if (media === "NO_VIDEO") items = items.filter(product => !product.videoUrl);

    // 5. Sắp xếp
    if (sort === "PRICE_ASC") {
      items.sort((a, b) => a.minPriceVND - b.minPriceVND);
    } else if (sort === "PRICE_DESC") {
      items.sort((a, b) => b.minPriceVND - a.minPriceVND);
    } else if (sort === "QUALITY_DESC") {
      items.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
    } else if (sort === "UPDATED_ASC") {
      items.sort((a, b) => new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime());
    } else {
      // Mặc định mới nhất
      items.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    }

    const total = items.length;
    res.json({ total, page, pageSize, items: items.slice((page - 1) * pageSize, page * pageSize) });
  }

  /**
   * Lấy chi tiết 1 sản phẩm
   */
  public async getProductById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const storedProduct = await this.findProduct(id);

    if (!storedProduct) {
      res.status(404).json({ error: "Không tìm thấy sản phẩm" });
      return;
    }
    const product = structuredClone(storedProduct);
    res.json(product);
  }

  /** Reusable customizer artwork library aggregated from imported products. */
  public async listCustomizerAssets(req: Request, res: Response): Promise<void> {
    const search = String(req.query.search || "").trim().toLowerCase();
    const assetType = String(req.query.assetType || "").trim().toUpperCase();
    let products: WebProduct[] = [];
    if (supabaseService.isConfigured()) {
      let page = 1;
      let total = 0;
      do {
        const result = await supabaseService.getProducts({ page, pageSize: 100 });
        if (!result) { res.status(503).json({ error: "PERSISTENCE_FAILED" }); return; }
        products.push(...result.items);
        total = result.total;
        page++;
      } while (products.length < total);
    } else {
      products = Array.from(inMemoryProducts.values());
    }
    const assets = new Map<string, any>();
    products.forEach(product => (product.customizerAssets || []).forEach(asset => {
      if (assetType && asset.assetType !== assetType) return;
      if (search && !`${asset.label || ""} ${asset.category || ""} ${asset.sourceProductId || ""}`.toLowerCase().includes(search)) return;
      const key = asset.originalUrl || asset.url;
      if (!assets.has(key)) assets.set(key, { ...asset, usedBy: [product.id] });
      else {
        const existing = assets.get(key);
        if (product.id && !existing.usedBy.includes(product.id)) existing.usedBy.push(product.id);
      }
    }));
    res.json({ total: assets.size, items: Array.from(assets.values()).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))) });
  }

  /**
   * Cập nhật thông tin sản phẩm (Tiêu đề, mô tả, biến thể, giá bán, SEO, ngôn ngữ)
   */
  public async updateProduct(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const storedProduct = await this.findProduct(id);

    if (!storedProduct) {
      res.status(404).json({ error: "Không tìm thấy sản phẩm" });
      return;
    }
    const product = structuredClone(storedProduct);

    const updates = req.body as Partial<WebProduct>;
    if (updates.status === "PUBLISHED") {
      res.status(409).json({
        error: "PUBLISH_ENDPOINT_REQUIRED",
        message: "Dùng thao tác Đăng bán để hệ thống thực thi quality gate"
      });
      return;
    }
    const currentVersion = product.version || 1;
    if (updates.version !== undefined && updates.version !== currentVersion) {
      res.status(409).json({ error: "VERSION_CONFLICT", message: "Sản phẩm đã được cập nhật ở phiên khác", currentVersion });
      return;
    }

    if (updates.titleVI) product.titleVI = updates.titleVI;
    if (updates.slug !== undefined) product.slug = updates.slug;
    if (updates.titleEN !== undefined) product.titleEN = updates.titleEN;
    if (updates.shortDescVI !== undefined) product.shortDescVI = updates.shortDescVI;
    if (updates.shortDescEN !== undefined) product.shortDescEN = updates.shortDescEN;
    if (updates.fullDescVI !== undefined) product.fullDescVI = updates.fullDescVI;
    if (updates.fullDescEN !== undefined) product.fullDescEN = updates.fullDescEN;
    if (updates.displayLanguage) product.displayLanguage = updates.displayLanguage;
    if (updates.categoryName) product.categoryName = updates.categoryName;
    if (updates.status) product.status = updates.status;
    if (updates.primaryImage) product.primaryImage = updates.primaryImage;
    if (updates.galleryImages) product.galleryImages = updates.galleryImages;
    if (updates.detailImages) product.detailImages = updates.detailImages;
    if (updates.videoUrl !== undefined) product.videoUrl = updates.videoUrl;
    if (updates.videoPosterUrl !== undefined) product.videoPosterUrl = updates.videoPosterUrl;

    // SEO updates
    if (updates.metaTitle !== undefined) product.metaTitle = updates.metaTitle;
    if (updates.metaDescription !== undefined) product.metaDescription = updates.metaDescription;
    if (updates.focusKeywords !== undefined) product.focusKeywords = updates.focusKeywords;
    if (updates.imagesSEO !== undefined) product.imagesSEO = updates.imagesSEO;
    if (updates.faqs !== undefined) product.faqs = updates.faqs;
    if (updates.attributes !== undefined) product.attributes = updates.attributes;
    if (updates.priceTiers !== undefined) product.priceTiers = updates.priceTiers;
    if (updates.seo !== undefined) product.seo = updates.seo;
    if (updates.storeSyncHistory !== undefined) product.storeSyncHistory = updates.storeSyncHistory;
    if (updates.warrantyPolicy !== undefined) product.warrantyPolicy = updates.warrantyPolicy;
    if (updates.shippingPolicy !== undefined) product.shippingPolicy = updates.shippingPolicy;
    if (updates.isPersonalized !== undefined) product.isPersonalized = updates.isPersonalized;
    if (updates.personalizationFields !== undefined) product.personalizationFields = updates.personalizationFields;
    if (updates.customizerMockupTemplateUrl !== undefined) product.customizerMockupTemplateUrl = updates.customizerMockupTemplateUrl;
    if (updates.customizerCanvas !== undefined) product.customizerCanvas = updates.customizerCanvas;
    if (updates.volumeDiscountTiers !== undefined) product.volumeDiscountTiers = updates.volumeDiscountTiers;
    if (updates.giftAddons !== undefined) product.giftAddons = updates.giftAddons;
    if (updates.occasionTags !== undefined) product.occasionTags = updates.occasionTags;
    if (updates.recipientTags !== undefined) product.recipientTags = updates.recipientTags;
    if (updates.rating !== undefined) product.rating = updates.rating;
    if (updates.reviewCount !== undefined) product.reviewCount = updates.reviewCount;

    if (Array.isArray(updates.variants)) {
      product.variants = updates.variants;
      // Tính lại min / max price
      const validPrices = product.variants.filter(v => v.selectedForSale).map(v => v.sellingPriceVND);
      if (validPrices.length > 0) {
        product.minPriceVND = Math.min(...validPrices);
        product.maxPriceVND = Math.max(...validPrices);
      }
    }

    // Cập nhật các cờ khóa trường
    if (typeof updates.isTitleLocked === "boolean") product.isTitleLocked = updates.isTitleLocked;
    if (typeof updates.isDescLocked === "boolean") product.isDescLocked = updates.isDescLocked;
    if (typeof updates.isImagesLocked === "boolean") product.isImagesLocked = updates.isImagesLocked;
    if (typeof updates.isPriceAutoSync === "boolean") product.isPriceAutoSync = updates.isPriceAutoSync;
    if (typeof updates.isStockAutoSync === "boolean") product.isStockAutoSync = updates.isStockAutoSync;

    // Chấm lại điểm chất lượng
    const quality = evaluateProductQuality(product);
    product.qualityScore = quality.totalScore;
    product.updatedAt = new Date().toISOString();
    product.version = currentVersion + 1;

    // Lưu bền vững vào Supabase
    if (supabaseService.isConfigured()) {
      try {
        const persisted = await supabaseService.updateWebProduct(id, product, currentVersion);
        if (!persisted) {
          res.status(409).json({ error: "PERSISTENCE_OR_VERSION_CONFLICT", message: "Không thể lưu vì dữ liệu đã thay đổi" });
          return;
        }
      } catch (err) {
        console.error("[updateProduct Supabase error]", err);
        res.status(503).json({ error: "PERSISTENCE_FAILED" });
        return;
      }
    }

    inMemoryProducts.set(id, product);

    res.json({
      success: true,
      product,
      qualityScore: quality
    });
  }

  /**
   * Cập nhật nhanh cờ khóa trường (Field Locks)
   */
  public async updateFieldLocks(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const storedProduct = await this.findProduct(id);
    if (!storedProduct) {
      res.status(404).json({ error: "Không tìm thấy sản phẩm" });
      return;
    }
    const product = structuredClone(storedProduct);

    const { isTitleLocked, isDescLocked, isImagesLocked, isPriceAutoSync, isStockAutoSync } = req.body;
    if (typeof isTitleLocked === "boolean") product.isTitleLocked = isTitleLocked;
    if (typeof isDescLocked === "boolean") product.isDescLocked = isDescLocked;
    if (typeof isImagesLocked === "boolean") product.isImagesLocked = isImagesLocked;
    if (typeof isPriceAutoSync === "boolean") product.isPriceAutoSync = isPriceAutoSync;
    if (typeof isStockAutoSync === "boolean") product.isStockAutoSync = isStockAutoSync;

    product.updatedAt = new Date().toISOString();
    if (supabaseService.isConfigured()) {
      try {
        const persisted = await supabaseService.updateWebProduct(id, {
          isTitleLocked: product.isTitleLocked,
          isDescLocked: product.isDescLocked,
          isImagesLocked: product.isImagesLocked,
          isPriceAutoSync: product.isPriceAutoSync,
          isStockAutoSync: product.isStockAutoSync
        });
        if (!persisted) { res.status(503).json({ error: "PERSISTENCE_FAILED" }); return; }
      } catch (err) {
        console.error("[updateFieldLocks Supabase error]", err);
        res.status(503).json({ error: "PERSISTENCE_FAILED" }); return;
      }
    }

    inMemoryProducts.set(id, product);

    res.json({ success: true, product });
  }

  /**
   * Xuất bản (Publish) sản phẩm lên website bán hàng
   */
  public async publishProduct(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const storedProduct = await this.findProduct(id);
    if (!storedProduct) {
      res.status(404).json({ error: "Không tìm thấy sản phẩm" });
      return;
    }
    const product = structuredClone(storedProduct);

    const qualityResult = evaluateProductQuality(product);
    if (!qualityResult.canPublish) {
      res.status(422).json({
        error: "QUALITY_GATE_FAILED",
        message: "Sản phẩm chưa đạt điều kiện đăng bán",
        blockers: qualityResult.blockers,
        qualityScore: qualityResult
      });
      return;
    }
    const previousStatus = product.status;
    product.status = "PUBLISHED";
    product.updatedAt = new Date().toISOString();
    if (supabaseService.isConfigured()) {
      try {
        const persisted = await supabaseService.updateWebProduct(id, { status: "PUBLISHED" });
        if (!persisted) throw new Error("PERSISTENCE_FAILED");
      } catch (err) {
        console.error("[publishProduct Supabase error]", err);
        product.status = previousStatus;
        inMemoryProducts.set(id, product);
        res.status(503).json({ error: "PERSISTENCE_FAILED" });
        return;
      }
    }

    inMemoryProducts.set(id, product);

    res.json({ success: true, product });
  }

  /**
   * Đăng bán hàng loạt (Bulk Publish)
   */
  public async bulkPublish(req: Request, res: Response): Promise<void> {
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: "ids must be a non-empty array" });
      return;
    }

    let updatedCount = 0;
    for (const id of ids) {
      const storedProduct = await this.findProduct(id);
      if (storedProduct) {
        const p = structuredClone(storedProduct);
        const qualityResult = evaluateProductQuality(p);
        if (!qualityResult.canPublish) continue;
        p.status = "PUBLISHED";
        p.updatedAt = new Date().toISOString();
        if (supabaseService.isConfigured()) {
          const persisted = await supabaseService.updateWebProduct(id, { status: "PUBLISHED" });
          if (!persisted) continue;
        }
        inMemoryProducts.set(id, p);
        updatedCount++;
      }
    }

    res.json({ success: true, count: updatedCount });
  }

  /**
   * Xóa sản phẩm khỏi hệ thống
   */
  public async deleteProduct(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const exists = Boolean(await this.findProduct(id));

    if (supabaseService.isConfigured()) {
      try {
        const deleted = await supabaseService.deleteWebProduct(id);
        if (!deleted) { res.status(404).json({ error: "NOT_FOUND" }); return; }
      } catch (err) {
        console.error("[deleteProduct Supabase error]", err);
        res.status(503).json({ error: "PERSISTENCE_FAILED" }); return;
      }
    }

    inMemoryProducts.delete(id);

    if (!exists && !supabaseService.isConfigured()) {
      res.status(404).json({ error: "Không tìm thấy sản phẩm" });
      return;
    }

    res.json({ success: true, message: "Đã xóa sản phẩm thành công" });
  }

  /**
   * Xóa hàng loạt sản phẩm
   */
  public async bulkDelete(req: Request, res: Response): Promise<void> {
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: "ids must be a non-empty array" });
      return;
    }

    let deletedCount = 0;
    for (const id of ids) {
      const existedInMemory = inMemoryProducts.has(id);
      if (existedInMemory) {
        inMemoryProducts.delete(id);
      }
      let deleted = existedInMemory;
      if (supabaseService.isConfigured()) {
        try {
          deleted = (await supabaseService.deleteWebProduct(id)) || deleted;
        } catch (err) {
          console.error("[bulkDelete Supabase error]", err);
        }
      }
      if (deleted) deletedCount++;
    }

    res.json({ success: true, count: deletedCount });
  }

  /**
   * Thống kê số liệu tổng quan (Dashboard KPIs)
   */
  public async getDashboardStats(req: Request, res: Response): Promise<void> {
    if (!(await this.hydrateFromSupabase())) {
      res.status(503).json({ error: "PERSISTENCE_FAILED" });
      return;
    }

    const products = Array.from(inMemoryProducts.values());
    const totalProducts = products.length;
    const publishedCount = products.filter(p => p.status === "PUBLISHED").length;
    const draftCount = products.filter(p => p.status === "DRAFT").length;
    const totalStock = products.reduce((acc, p) => acc + (p.variants || []).reduce((s, v) => s + (v.stockQuantity || 0), 0), 0);
    const totalVariants = products.reduce((acc, p) => acc + (p.variants || []).length, 0);
    const avgQuality = totalProducts > 0
      ? Math.round(products.reduce((acc, p) => acc + (p.qualityScore || 0), 0) / totalProducts)
      : 0;

    // Phân bổ danh mục
    const categoryCount: Record<string, number> = {};
    products.forEach(p => {
      const cat = p.categoryName || "Khác";
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    res.json({
      totalProducts,
      publishedCount,
      draftCount,
      totalStock,
      totalVariants,
      avgQuality,
      categoryCount,
      supplierCount: new Set(products.map(p => p.supplierName)).size
    });
  }

  /**
   * Đồng bộ hàng loạt sản phẩm từ Client (Persistence Re-hydration chống mất dữ liệu khi Cold Start)
   */
  public async syncBatch(req: Request, res: Response): Promise<void> {
    if (process.env.NODE_ENV === "production") {
      res.status(410).json({ error: "CLIENT_REHYDRATION_DISABLED", message: "Cơ sở dữ liệu là nguồn dữ liệu duy nhất" });
      return;
    }
    const { products } = req.body as { products?: WebProduct[] };
    let addedCount = 0;
    if (Array.isArray(products)) {
      for (const p of products) {
        if (p && p.id) {
          if (!inMemoryProducts.has(p.id)) {
            addedCount++;
          }
          inMemoryProducts.set(p.id, p);
          if (supabaseService.isConfigured()) {
            supabaseService.saveWebProduct(p).catch(() => {});
          }
        }
      }
    }
    res.json({
      success: true,
      addedCount,
      totalCount: inMemoryProducts.size
    });
  }

  /**
   * Tải và lưu trữ vĩnh viễn toàn bộ ảnh của sản phẩm lên Supabase Storage / CDN
   */
  public async mirrorImages(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const product = await this.findProduct(id);

    if (!product) {
      res.status(404).json({ success: false, error: "Không tìm thấy sản phẩm" });
      return;
    }

    try {
      const { product: mirroredProduct, stats } = await mediaMirrorService.mirrorProductAllImages(product);

      if (supabaseService.isConfigured()) {
        if (!(await supabaseService.saveWebProduct(mirroredProduct))) {
          res.status(503).json({ success: false, error: "PERSISTENCE_FAILED" });
          return;
        }
      }
      inMemoryProducts.set(id, mirroredProduct);

      res.json({
        success: true,
        message: `Đã lưu trữ vĩnh viễn ${stats.succeeded}/${stats.total} ảnh sản phẩm`,
        stats,
        product: mirroredProduct
      });
    } catch (err: any) {
      console.error("[mirrorImages error]", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
