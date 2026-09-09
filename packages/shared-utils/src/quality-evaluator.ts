import { WebProduct, QualityScoreResult } from "@hub1688/shared-types";

/**
 * Đánh giá điểm sẵn sàng của sản phẩm Web trước khi Publish (Quality Score 0 - 100)
 */
export function evaluateProductQuality(product: Partial<WebProduct>): QualityScoreResult {
  const warnings: string[] = [];
  const blockers: string[] = [];

  // 1. Tiêu đề (10 điểm)
  let titleScore = 0;
  if (product.titleVI && product.titleVI.length >= 10) {
    titleScore = 10;
  } else if (product.titleVI) {
    titleScore = 5;
    warnings.push("Tiêu đề sản phẩm quá ngắn (dưới 10 ký tự)");
  } else {
    blockers.push("Thiếu tiêu đề sản phẩm tiếng Việt");
  }

  // 2. Dịch thuật (15 điểm)
  let transScore = 0;
  if (product.titleVI && !/[\u4e00-\u9fa5]/.test(product.titleVI)) {
    transScore = 15;
  } else if (product.titleVI) {
    transScore = 8;
    warnings.push("Tiêu đề vẫn còn chứa ký tự tiếng Trung chưa dịch hết");
  } else {
    blockers.push("Chưa hoàn thành dịch thuật");
  }

  // 3. Hình ảnh (15 điểm)
  let imageScore = 0;
  const imageCount = (product.galleryImages?.length || 0) + (product.primaryImage ? 1 : 0);
  if (imageCount >= 4) {
    imageScore = 15;
  } else if (imageCount >= 1) {
    imageScore = 10;
    warnings.push("Nên có ít nhất 4 hình ảnh sản phẩm để tăng tỷ lệ chuyển đổi");
  } else {
    blockers.push("Sản phẩm chưa có hình ảnh đại diện");
  }

  // 4. SKU Mapping (20 điểm)
  let skuScore = 0;
  const variants = product.variants || [];
  if (variants.length > 0) {
    const hasSourceSku = variants.every(v => v.sourceSkuId && v.sourceSkuId.length > 0);
    const hasPrices = variants.every(v => v.sellingPriceVND > 0);
    if (hasSourceSku && hasPrices) {
      skuScore = 20;
    } else {
      skuScore = 10;
      warnings.push("Một số biến thể SKU chưa được định giá hoặc thiếu Source SKU ID");
    }
  } else {
    blockers.push("Chưa tạo ma trận biến thể SKU");
  }

  // 5. Định giá & Biên lợi nhuận (15 điểm)
  let priceScore = 0;
  if (variants.length > 0) {
    const allProfitable = variants.every(v => v.sellingPriceVND > v.costPriceVND);
    if (allProfitable) {
      priceScore = 15;
    } else {
      priceScore = 5;
      blockers.push("Có SKU có giá bán thấp hơn hoặc bằng giá vốn!");
    }
  }

  // 6. Mô tả sản phẩm (10 điểm)
  let descScore = 0;
  if (product.fullDescVI && product.fullDescVI.length >= 100) {
    descScore = 10;
  } else if (product.fullDescVI && product.fullDescVI.length > 0) {
    descScore = 5;
    warnings.push("Mô tả sản phẩm còn sơ sài");
  } else {
    warnings.push("Chưa có mô tả chi tiết sản phẩm");
  }

  // 7. Danh mục (5 điểm)
  let catScore = product.categoryName ? 5 : 0;
  if (!product.categoryName) warnings.push("Chưa phân loại danh mục sản phẩm");

  // 8. Tồn kho (5 điểm)
  const totalStock = variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0);
  let stockScore = totalStock > 0 ? 5 : 0;
  if (totalStock === 0) warnings.push("Tổng tồn kho các biến thể hiện tại bằng 0");

  // 9. Nhà cung cấp (5 điểm)
  let supplierScore = product.supplierName ? 5 : 0;

  const totalScore = titleScore + transScore + imageScore + skuScore + priceScore + descScore + catScore + stockScore + supplierScore;
  const canPublish = blockers.length === 0 && totalScore >= 75;

  return {
    totalScore,
    canPublish,
    checklist: {
      title: { score: titleScore, max: 10 },
      translation: { score: transScore, max: 15 },
      images: { score: imageScore, max: 15 },
      skuMapping: { score: skuScore, max: 20 },
      pricing: { score: priceScore, max: 15 },
      description: { score: descScore, max: 10 },
      category: { score: catScore, max: 5 },
      stock: { score: stockScore, max: 5 },
      supplier: { score: supplierScore, max: 5 }
    },
    warnings,
    blockers
  };
}
