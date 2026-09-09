import { Request, Response } from "express";
import { inMemoryProducts } from "./import.controller.js";

export class ProductsController {
  public async listProducts(req: Request, res: Response): Promise<void> {
    const products = Array.from(inMemoryProducts.values());
    res.json({
      total: products.length,
      items: products
    });
  }

  public async getProductById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const product = inMemoryProducts.get(id);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(product);
  }

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
}
