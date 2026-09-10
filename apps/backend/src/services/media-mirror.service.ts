import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { WebProduct, WebProductVariant } from "@hub1688/shared-types";
import { supabaseService } from "./supabase.service.js";
import { ENV } from "../config/env.js";

export class MediaMirrorService {
  private localUploadDir: string;

  constructor() {
    this.localUploadDir = path.join(process.cwd(), "public", "uploads", "products");
    try {
      if (!fs.existsSync(this.localUploadDir)) {
        fs.mkdirSync(this.localUploadDir, { recursive: true });
      }
    } catch (e) {
      console.warn("[MediaMirror] Could not create localUploadDir:", e);
    }
  }

  /**
   * Tải ảnh từ CDN từ xa (1688, Taobao, Shopify, CDN Aliyun) với headers chống chặn
   */
  public async downloadImage(imageUrl: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    try {
      if (!imageUrl || (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://"))) {
        return null;
      }

      // Chuẩn hóa protocol nếu link dạng //cbu01.alicdn.com/...
      let fetchUrl = imageUrl;
      if (fetchUrl.startsWith("//")) {
        fetchUrl = "https:" + fetchUrl;
      }

      const res = await fetch(fetchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Referer": fetchUrl.includes("alicdn") ? "https://detail.1688.com/" : (fetchUrl.includes("shopify") ? "https://shopify.com/" : ""),
          "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
        }
      });

      if (!res.ok) {
        console.warn(`[MediaMirror] Failed to download image ${fetchUrl}: HTTP ${res.status}`);
        return null;
      }

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = res.headers.get("content-type") || "image/jpeg";

      return { buffer, contentType };
    } catch (error: any) {
      console.error(`[MediaMirror] Download error for ${imageUrl}:`, error.message);
      return null;
    }
  }

  /**
   * Lưu trữ ảnh: Ưu tiên Supabase Storage, fallback về Local Static Directory
   */
  public async uploadToStorage(buffer: Buffer, contentType: string, filename: string): Promise<string | null> {
    // 1. Nếu Supabase Storage được cấu hình và có client
    if (supabaseService.isConfigured()) {
      try {
        const client = (supabaseService as any).client;
        if (client) {
          const bucket = ENV.SUPABASE_STORAGE_BUCKET || "product-media";
          const storagePath = `mirrored/${filename}`;

          const { data, error } = await client.storage
            .from(bucket)
            .upload(storagePath, buffer, {
              contentType,
              upsert: true
            });

          if (!error && data) {
            const { data: publicData } = client.storage.from(bucket).getPublicUrl(storagePath);
            if (publicData?.publicUrl) {
              return publicData.publicUrl;
            }
          } else if (error) {
            console.warn("[MediaMirror] Supabase upload failed, using local fallback:", error.message);
          }
        }
      } catch (err: any) {
        console.warn("[MediaMirror] Supabase upload exception, using local fallback:", err.message);
      }
    }

    // 2. Fallback: Lưu vào Local Directory của Backend
    try {
      const filePath = path.join(this.localUploadDir, filename);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, buffer);

      // Trả về relative URL tĩnh `/uploads/products/${filename}`
      return `/uploads/products/${filename}`;
    } catch (err: any) {
      console.error("[MediaMirror] Local write error:", err.message);
      return null;
    }
  }

  /**
   * Mirror một ảnh duy nhất
   */
  public async mirrorSingleImage(originalUrl: string, productId: string, prefix: string): Promise<string> {
    if (!originalUrl || originalUrl.startsWith("/uploads/") || originalUrl.includes("supabase.co/storage")) {
      // Đã được mirror rồi, không cần mirror lại
      return originalUrl;
    }

    const downloaded = await this.downloadImage(originalUrl);
    if (!downloaded) {
      return originalUrl; // Fallback an toàn giữ URL gốc
    }

    // Xác định phần mở rộng file
    let ext = ".jpg";
    if (downloaded.contentType.includes("png")) ext = ".png";
    else if (downloaded.contentType.includes("webp")) ext = ".webp";

    const hash = crypto.createHash("md5").update(originalUrl).digest("hex").substring(0, 8);
    const filename = `${productId}/${prefix}_${hash}${ext}`;

    const hostedUrl = await this.uploadToStorage(downloaded.buffer, downloaded.contentType, filename);
    return hostedUrl || originalUrl;
  }

  /**
   * Mirror toàn bộ ảnh của một sản phẩm (Primary, Gallery, Detail, Variants)
   */
  public async mirrorProductAllImages(product: WebProduct): Promise<{
    product: WebProduct;
    stats: { total: number; succeeded: number; failed: number };
  }> {
    const prodId = product.id || product.sourceProductId || `prod_${Date.now()}`;
    let total = 0;
    let succeeded = 0;
    let failed = 0;

    const cloned: WebProduct = JSON.parse(JSON.stringify(product));

    // 1. Primary Image
    if (cloned.primaryImage) {
      total++;
      const newUrl = await this.mirrorSingleImage(cloned.primaryImage, prodId, "primary");
      if (newUrl !== cloned.primaryImage) succeeded++;
      else failed++;
      cloned.primaryImage = newUrl;
    }

    // 2. Gallery Images
    if (cloned.galleryImages && cloned.galleryImages.length > 0) {
      const newGallery: string[] = [];
      for (let i = 0; i < cloned.galleryImages.length; i++) {
        total++;
        const oldUrl = cloned.galleryImages[i];
        const newUrl = await this.mirrorSingleImage(oldUrl, prodId, `gallery_${i + 1}`);
        if (newUrl !== oldUrl) succeeded++;
        else failed++;
        newGallery.push(newUrl);
      }
      cloned.galleryImages = newGallery;
    }

    // 3. Detail Images
    if (cloned.detailImages && cloned.detailImages.length > 0) {
      const newDetail: string[] = [];
      for (let i = 0; i < cloned.detailImages.length; i++) {
        total++;
        const oldUrl = cloned.detailImages[i];
        const newUrl = await this.mirrorSingleImage(oldUrl, prodId, `detail_${i + 1}`);
        if (newUrl !== oldUrl) succeeded++;
        else failed++;
        newDetail.push(newUrl);
      }
      cloned.detailImages = newDetail;
    }

    // 4. Variants Images
    if (cloned.variants && cloned.variants.length > 0) {
      for (let i = 0; i < cloned.variants.length; i++) {
        const v = cloned.variants[i];
        if (v.imageUrl) {
          total++;
          const oldUrl = v.imageUrl;
          const newUrl = await this.mirrorSingleImage(oldUrl, prodId, `var_${i + 1}`);
          if (newUrl !== oldUrl) succeeded++;
          else failed++;
          v.imageUrl = newUrl;
        }
      }
    }

    cloned.isMediaMirrored = true;
    cloned.mirroredAt = new Date().toISOString();

    return {
      product: cloned,
      stats: { total, succeeded, failed }
    };
  }
}

export const mediaMirrorService = new MediaMirrorService();
