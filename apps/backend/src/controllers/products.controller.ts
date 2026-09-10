import { Request, Response } from "express";
import { inMemoryProducts } from "./import.controller.js";
import { evaluateProductQuality } from "@hub1688/shared-utils";
import { WebProduct } from "@hub1688/shared-types";
import { supabaseService } from "../services/supabase.service.js";

export class ProductsController {
  /**
   * Helper: Đồng bộ / nạp sản phẩm từ Supabase vào bộ nhớ nếu cần
   */
  private async hydrateFromSupabase(): Promise<void> {
    if (!supabaseService.isConfigured()) return;
    try {
      const dbProducts = await supabaseService.getProducts();
      if (dbProducts && dbProducts.items && dbProducts.items.length > 0) {
        for (const p of dbProducts.items) {
          if (p.id && !inMemoryProducts.has(p.id)) {
            inMemoryProducts.set(p.id, p);
          }
        }
      }
    } catch (err) {
      console.error("[hydrateFromSupabase error]", err);
    }
  }

  /**
   * Danh sách sản phẩm có phân trang, tìm kiếm và lọc
   */
  public async listProducts(req: Request, res: Response): Promise<void> {
    const { status, category, search, minQuality, sort } = req.query as Record<string, string>;

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

    // 5. Sắp xếp
    if (sort === "PRICE_ASC") {
      items.sort((a, b) => a.minPriceVND - b.minPriceVND);
    } else if (sort === "PRICE_DESC") {
      items.sort((a, b) => b.minPriceVND - a.minPriceVND);
    } else if (sort === "QUALITY_DESC") {
      items.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
    } else {
      // Mặc định mới nhất
      items.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    }

    res.json({
      total: items.length,
      items
    });
  }

  /**
   * Lấy chi tiết 1 sản phẩm
   */
  public async getProductById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    let product = inMemoryProducts.get(id);

    if (!product && supabaseService.isConfigured()) {
      const dbProduct = await supabaseService.getProductById(id);
      if (dbProduct) {
        inMemoryProducts.set(id, dbProduct);
        product = dbProduct;
      }
    }

    if (!product) {
      res.status(404).json({ error: "Không tìm thấy sản phẩm" });
      return;
    }
    res.json(product);
  }

  /**
   * Cập nhật thông tin sản phẩm (Tiêu đề, mô tả, biến thể, giá bán, SEO, ngôn ngữ)
   */
  public async updateProduct(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    let product = inMemoryProducts.get(id);

    if (!product && supabaseService.isConfigured()) {
      product = (await supabaseService.getProductById(id)) || undefined;
    }

    if (!product) {
      res.status(404).json({ error: "Không tìm thấy sản phẩm" });
      return;
    }

    const updates = req.body as Partial<WebProduct>;

    if (updates.titleVI) product.titleVI = updates.titleVI;
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

    inMemoryProducts.set(id, product);

    // Lưu bền vững vào Supabase
    if (supabaseService.isConfigured()) {
      try {
        await supabaseService.updateWebProduct(id, product);
      } catch (err) {
        console.error("[updateProduct Supabase error]", err);
      }
    }

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
    let product = inMemoryProducts.get(id);
    if (!product && supabaseService.isConfigured()) {
      product = (await supabaseService.getProductById(id)) || undefined;
    }
    if (!product) {
      res.status(404).json({ error: "Không tìm thấy sản phẩm" });
      return;
    }

    const { isTitleLocked, isDescLocked, isImagesLocked, isPriceAutoSync, isStockAutoSync } = req.body;
    if (typeof isTitleLocked === "boolean") product.isTitleLocked = isTitleLocked;
    if (typeof isDescLocked === "boolean") product.isDescLocked = isDescLocked;
    if (typeof isImagesLocked === "boolean") product.isImagesLocked = isImagesLocked;
    if (typeof isPriceAutoSync === "boolean") product.isPriceAutoSync = isPriceAutoSync;
    if (typeof isStockAutoSync === "boolean") product.isStockAutoSync = isStockAutoSync;

    product.updatedAt = new Date().toISOString();
    inMemoryProducts.set(id, product);

    if (supabaseService.isConfigured()) {
      try {
        await supabaseService.updateWebProduct(id, {
          isTitleLocked: product.isTitleLocked,
          isDescLocked: product.isDescLocked,
          isImagesLocked: product.isImagesLocked,
          isPriceAutoSync: product.isPriceAutoSync,
          isStockAutoSync: product.isStockAutoSync
        });
      } catch (err) {
        console.error("[updateFieldLocks Supabase error]", err);
      }
    }

    res.json({ success: true, product });
  }

  /**
   * Xuất bản (Publish) sản phẩm lên website bán hàng
   */
  public async publishProduct(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    let product = inMemoryProducts.get(id);
    if (!product && supabaseService.isConfigured()) {
      product = (await supabaseService.getProductById(id)) || undefined;
    }
    if (!product) {
      res.status(404).json({ error: "Không tìm thấy sản phẩm" });
      return;
    }

    product.status = "PUBLISHED";
    product.updatedAt = new Date().toISOString();
    inMemoryProducts.set(id, product);

    if (supabaseService.isConfigured()) {
      try {
        await supabaseService.updateWebProduct(id, { status: "PUBLISHED" });
      } catch (err) {
        console.error("[publishProduct Supabase error]", err);
      }
    }

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
      let p = inMemoryProducts.get(id);
      if (!p && supabaseService.isConfigured()) {
        p = (await supabaseService.getProductById(id)) || undefined;
      }
      if (p) {
        p.status = "PUBLISHED";
        p.updatedAt = new Date().toISOString();
        inMemoryProducts.set(id, p);
        if (supabaseService.isConfigured()) {
          await supabaseService.updateWebProduct(id, { status: "PUBLISHED" });
        }
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
    const exists = inMemoryProducts.has(id);

    if (exists) {
      inMemoryProducts.delete(id);
    }

    if (supabaseService.isConfigured()) {
      try {
        await supabaseService.deleteWebProduct(id);
      } catch (err) {
        console.error("[deleteProduct Supabase error]", err);
      }
    }

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
      if (inMemoryProducts.has(id)) {
        inMemoryProducts.delete(id);
        deletedCount++;
      }
      if (supabaseService.isConfigured()) {
        try {
          await supabaseService.deleteWebProduct(id);
          deletedCount++;
        } catch (err) {
          console.error("[bulkDelete Supabase error]", err);
        }
      }
    }

    res.json({ success: true, count: deletedCount });
  }

  /**
   * Thống kê số liệu tổng quan (Dashboard KPIs)
   */
  public async getDashboardStats(req: Request, res: Response): Promise<void> {
    await this.hydrateFromSupabase();

    const products = Array.from(inMemoryProducts.values());
    const totalProducts = products.length;
    const publishedCount = products.filter(p => p.status === "PUBLISHED").length;
    const draftCount = products.filter(p => p.status === "DRAFT").length;
    const totalStock = products.reduce((acc, p) => acc + (p.variants || []).reduce((s, v) => s + (v.stockQuantity || 0), 0), 0);
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
      avgQuality,
      categoryCount,
      supplierCount: new Set(products.map(p => p.supplierName)).size
    });
  }

  /**
   * Đồng bộ hàng loạt sản phẩm từ Client (Persistence Re-hydration chống mất dữ liệu khi Cold Start)
   */
  public async syncBatch(req: Request, res: Response): Promise<void> {
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
}
