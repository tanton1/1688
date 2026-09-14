import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { WebProduct, WebProductVariant, CustomizerAsset } from "@hub1688/shared-types";
import { supabaseService } from "./supabase.service.js";
import { ENV } from "../config/env.js";
import { safeFetch } from "../utils/safe-network.js";

export class MediaMirrorService {
  private localUploadDir: string;

  constructor() {
    this.localUploadDir = path.join(process.cwd(), "public", "uploads", "products");
    if (ENV.NODE_ENV === "production") return;
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

      const res = await safeFetch(fetchUrl, {
        timeoutMs: ENV.OUTBOUND_TIMEOUT_MS,
        maxBytes: Math.min(ENV.OUTBOUND_MAX_BYTES, 10 * 1024 * 1024),
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
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
  public async uploadToStorage(buffer: Buffer, contentType: string, filename: string, rootFolder = "mirrored"): Promise<string | null> {
    // 1. Nếu Supabase Storage được cấu hình và có client
    if (supabaseService.isConfigured()) {
      try {
        const client = (supabaseService as any).client;
        if (client) {
          const bucket = ENV.SUPABASE_STORAGE_BUCKET || "product-media";
          const storagePath = `${rootFolder}/${filename}`;

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
            console.warn("[MediaMirror] Supabase upload failed:", error.message);
          }
        }
      } catch (err: any) {
        console.warn("[MediaMirror] Supabase upload exception:", err.message);
      }
    }

    // Serverless production filesystems are immutable; keep the original URL if cloud upload fails.
    if (ENV.NODE_ENV === "production") return null;

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
  public async mirrorSingleImage(originalUrl: string, productId: string, prefix: string, rootFolder = "mirrored"): Promise<string> {
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

    const hostedUrl = await this.uploadToStorage(downloaded.buffer, downloaded.contentType, filename, rootFolder);
    return hostedUrl || originalUrl;
  }

  /**
   * Mirror toàn bộ ảnh của một sản phẩm (Primary, Gallery, Detail, Variants)
   */
  public async mirrorProductAllImages(product: WebProduct): Promise<{
    product: WebProduct;
    stats: {
      total: number;
      succeeded: number;
      failed: number;
      productImages: { total: number; succeeded: number; failed: number };
      detailImages: { total: number; succeeded: number; failed: number };
      customAssets: { total: number; succeeded: number; failed: number };
    };
  }> {
    const prodId = (product.id || product.sourceProductId || `prod_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
    const stats = {
      total: 0,
      succeeded: 0,
      failed: 0,
      productImages: { total: 0, succeeded: 0, failed: 0 },
      detailImages: { total: 0, succeeded: 0, failed: 0 },
      customAssets: { total: 0, succeeded: 0, failed: 0 }
    };

    const cloned: WebProduct = JSON.parse(JSON.stringify(product));

    const mirroredUrls = new Map<string, string>();
    const mirror = async (url: string, prefix: string, bucket: "productImages" | "detailImages" | "customAssets", rootFolder = "mirrored") => {
      stats.total++;
      stats[bucket].total++;
      const original = url;
      let newUrl = mirroredUrls.get(`${rootFolder}:${original}`);
      if (!newUrl) {
        newUrl = await this.mirrorSingleImage(original, prodId, prefix, rootFolder);
        mirroredUrls.set(`${rootFolder}:${original}`, newUrl);
      }
      const alreadyHosted = original.startsWith("/uploads/") || original.includes("supabase.co/storage");
      if (newUrl !== original || alreadyHosted) {
        stats.succeeded++;
        stats[bucket].succeeded++;
      } else {
        stats.failed++;
        stats[bucket].failed++;
      }
      return newUrl;
    };
    const mapWithConcurrency = async <T, R>(items: T[], worker: (item: T, index: number) => Promise<R>, concurrency = 6): Promise<R[]> => {
      const output: R[] = new Array(items.length);
      let cursor = 0;
      const run = async () => {
        while (true) {
          const index = cursor++;
          if (index >= items.length) return;
          output[index] = await worker(items[index], index);
        }
      };
      await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
      return output;
    };

    // 1. Primary Image
    if (cloned.primaryImage) {
      cloned.primaryImage = await mirror(cloned.primaryImage, "primary", "productImages");
    }

    // 2. Gallery Images
    if (cloned.galleryImages && cloned.galleryImages.length > 0) {
      cloned.galleryImages = await mapWithConcurrency(cloned.galleryImages, (oldUrl, i) => mirror(oldUrl, `gallery_${i + 1}`, "productImages"));
    }

    // 3. Detail Images
    if (cloned.detailImages && cloned.detailImages.length > 0) {
      cloned.detailImages = await mapWithConcurrency(cloned.detailImages, (oldUrl, i) => mirror(oldUrl, `detail_${i + 1}`, "detailImages"));
    }

    // 4. Variants Images
    if (cloned.variants && cloned.variants.length > 0) {
      for (let i = 0; i < cloned.variants.length; i++) {
        const v = cloned.variants[i];
        if (v.imageUrl) {
          v.imageUrl = await mirror(v.imageUrl, `var_${i + 1}`, "productImages");
        }
      }
    }

    // 5. Customizer artwork: persist a reusable manifest and mirror every
    // option thumbnail, mockup, and canvas scene independently of the gallery.
    const customAssets: CustomizerAsset[] = Array.isArray(cloned.customizerAssets)
      ? cloned.customizerAssets.map(asset => ({ ...asset }))
      : [];
    const assetByUrl = new Map(customAssets.map(asset => [asset.originalUrl || asset.url, asset]));
    const addCustomAsset = async (url: string | undefined, label: string, category: string, sourceGroupId?: string, assetType: CustomizerAsset["assetType"] = "OPTION") => {
      if (!url) return url;
      const existing = assetByUrl.get(url);
      const mirrored = await mirror(url, `asset_${crypto.createHash("md5").update(url).digest("hex").slice(0, 12)}`, "customAssets", "customizer-assets");
      if (existing) {
        existing.originalUrl = existing.originalUrl || url;
        existing.url = mirrored;
      } else {
        const asset: CustomizerAsset = {
          id: `asset_${crypto.createHash("md5").update(url).digest("hex").slice(0, 12)}`,
          url: mirrored,
          originalUrl: url,
          label,
          category,
          sourceProductId: cloned.sourceProductId,
          sourceGroupId,
          assetType,
          createdAt: new Date().toISOString()
        };
        customAssets.push(asset);
        assetByUrl.set(url, asset);
      }
      return mirrored;
    };
    if (cloned.customizerMockupTemplateUrl) {
      cloned.customizerMockupTemplateUrl = await addCustomAsset(cloned.customizerMockupTemplateUrl, "Customizer mockup", "Mockup", undefined, "MOCKUP");
    }
    if (Array.isArray(cloned.customizerCanvas?.scenes)) {
      for (const scene of cloned.customizerCanvas.scenes) {
        if (scene.mockupUrl) scene.mockupUrl = await addCustomAsset(scene.mockupUrl, scene.label, "Mockup", scene.id, "MOCKUP");
        if (scene.variantMockupUrls) {
          for (const [sku, url] of Object.entries(scene.variantMockupUrls)) {
            scene.variantMockupUrls[sku] = await addCustomAsset(url, scene.label, "Mockup", scene.id, "MOCKUP") as string;
          }
        }
      }
    }
    if (Array.isArray(cloned.personalizationFields)) {
      for (const field of cloned.personalizationFields) {
        for (const option of field.options || []) {
          const source = option.previewAssetUrl || option.thumbnail;
          if (!source) continue;
          const mirrored = await addCustomAsset(source, option.label, field.label, field.id);
          if (option.previewAssetUrl) option.previewAssetUrl = mirrored;
          if (option.thumbnail) option.thumbnail = mirrored;
        }
      }
    }
    for (const asset of customAssets) {
      const mirrored = await addCustomAsset(asset.originalUrl || asset.url, asset.label || "Custom asset", asset.category || "Customizer", asset.sourceGroupId, asset.assetType);
      asset.url = mirrored as string;
    }
    cloned.customizerAssets = customAssets;

    cloned.isMediaMirrored = stats.failed === 0;
    cloned.mirroredAt = new Date().toISOString();

    return {
      product: cloned,
      stats
    };
  }
}

export const mediaMirrorService = new MediaMirrorService();
