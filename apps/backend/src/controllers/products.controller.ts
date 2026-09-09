import { Request, Response } from "express";
import { inMemoryProducts } from "./import.controller.js";
import { evaluateProductQuality } from "@hub1688/shared-utils";
import { WebProduct } from "@hub1688/shared-types";

export class ProductsController {
  /**
   * Danh sách sản phẩm có phân trang, tìm kiếm và lọc
   */
  public async listProducts(req: Request, res: Response): Promise<void> {
    let items = Array.from(inMemoryProducts.values());

    const { status, category, search, minQuality, sort } = req.query as Record<string, string>;

    // 1. Tìm kiếm theo tên tiếng Việt, tiếng Trung hoặc SKU / ID 1688
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(p =>
        p.titleVI.toLowerCase().includes(q) ||
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
    const product = inMemoryProducts.get(id);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(product);
  }

  /**
   * Cập nhật thông tin sản phẩm (Tiêu đề, mô tả, biến thể, giá bán)
   */
  public async updateProduct(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const product = inMemoryProducts.get(id);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const updates = req.body as Partial<WebProduct>;

    if (updates.titleVI) product.titleVI = updates.titleVI;
    if (updates.shortDescVI !== undefined) product.shortDescVI = updates.shortDescVI;
    if (updates.fullDescVI !== undefined) product.fullDescVI = updates.fullDescVI;
    if (updates.categoryName) product.categoryName = updates.categoryName;
    if (updates.status) product.status = updates.status;
    if (updates.primaryImage) product.primaryImage = updates.primaryImage;
    if (updates.galleryImages) product.galleryImages = updates.galleryImages;

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
    const product = inMemoryProducts.get(id);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
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

    res.json({ success: true, product });
  }

  /**
   * Xuất bản (Publish) sản phẩm lên website bán hàng
   */
  public async publishProduct(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const product = inMemoryProducts.get(id);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    product.status = "PUBLISHED";
    product.updatedAt = new Date().toISOString();
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
    ids.forEach(id => {
      const p = inMemoryProducts.get(id);
      if (p) {
        p.status = "PUBLISHED";
        p.updatedAt = new Date().toISOString();
        inMemoryProducts.set(id, p);
        updatedCount++;
      }
    });

    res.json({ success: true, count: updatedCount });
  }

  /**
   * Xóa sản phẩm khỏi hệ thống
   */
  public async deleteProduct(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const exists = inMemoryProducts.has(id);
    if (!exists) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    inMemoryProducts.delete(id);
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
    ids.forEach(id => {
      if (inMemoryProducts.has(id)) {
        inMemoryProducts.delete(id);
        deletedCount++;
      }
    });

    res.json({ success: true, count: deletedCount });
  }

  /**
   * Thống kê số liệu tổng quan (Dashboard KPIs)
   */
  public async getDashboardStats(req: Request, res: Response): Promise<void> {
    const products = Array.from(inMemoryProducts.values());
    const totalProducts = products.length;
    const publishedCount = products.filter(p => p.status === "PUBLISHED").length;
    const draftCount = products.filter(p => p.status === "DRAFT").length;
    const totalStock = products.reduce((acc, p) => acc + p.variants.reduce((s, v) => s + v.stockQuantity, 0), 0);
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
}
