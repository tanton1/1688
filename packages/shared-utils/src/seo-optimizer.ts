import {
  WebProduct,
  ProductImageSEO,
  ProductFAQItem,
  ProductSEOMetadata
} from "@hub1688/shared-types";

/**
 * Chuyển đổi chuỗi tiếng Việt hoặc tiếng Anh thành URL Slug chuẩn SEO (không dấu, kebab-case)
 */
export function generateSlug(text: string): string {
  if (!text) return "";

  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Xóa dấu tiếng Việt
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9\s-]/g, "") // Xóa ký tự đặc biệt
    .trim()
    .replace(/\s+/g, "-") // Thay khoảng trắng bằng gạch ngang
    .replace(/-+/g, "-"); // Xóa gạch ngang trùng lặp
}

/**
 * Trích xuất và mở rộng danh sách từ khóa chính & LSI chuẩn SEO
 */
export function extractSEOKeywords(
  title: string,
  category: string = "Thời trang",
  language: "VI" | "EN" = "VI"
): string[] {
  if (!title) return [];

  const keywords: Set<string> = new Set();
  const cleanTitle = title.trim();

  if (language === "VI") {
    // 1. Cụm từ chính từ tiêu đề
    keywords.add(cleanTitle.toLowerCase());

    // 2. Tách các cụm danh từ / tính từ tiêu biểu
    const segments = cleanTitle.split(/[-–—|,()]/).map(s => s.trim().toLowerCase()).filter(Boolean);
    segments.forEach(seg => {
      if (seg.length > 5 && seg.length < 40) keywords.add(seg);
    });

    // 3. Chỉ ghép từ khóa từ dữ liệu đầu vào, không tự thêm tuyên bố chất lượng/xu hướng.
    const catLower = category.toLowerCase();
    keywords.add(catLower);
    keywords.add(`${cleanTitle.slice(0, 40).toLowerCase()} ${catLower}`);
    keywords.add(`${cleanTitle.slice(0, 40).toLowerCase()} thông tin sản phẩm`);
  } else {
    // English keywords
    keywords.add(cleanTitle.toLowerCase());
    const segments = cleanTitle.split(/[-–—|,()]/).map(s => s.trim().toLowerCase()).filter(Boolean);
    segments.forEach(seg => {
      if (seg.length > 5 && seg.length < 40) keywords.add(seg);
    });

    const catLower = category.toLowerCase();
    keywords.add(catLower);
    keywords.add(`${cleanTitle.slice(0, 40).toLowerCase()} ${catLower}`);
    keywords.add(`${cleanTitle.slice(0, 40).toLowerCase()} product details`);
  }

  return Array.from(keywords).slice(0, 8);
}

/**
 * Tự động tạo Meta Title và Meta Description chuẩn Google SERP
 */
export function generateSEOMeta(
  title: string,
  category: string = "Thời trang",
  attributes: any[] = [],
  language: "VI" | "EN" = "VI"
): { metaTitle: string; metaDescription: string } {
  const cleanTitle = title.trim();

  if (language === "VI") {
    // Meta Title chuẩn độ dài 50-65 ký tự
    let metaTitle = `${cleanTitle} | ${category}`;
    if (metaTitle.length > 65) {
      metaTitle = cleanTitle.slice(0, 62) + "...";
    }

    // Lấy thông tin chất liệu nếu có
    const material = attributes?.find(a => a.keyVI === "Chất liệu")?.valueVI;

    // Meta Description chuẩn 125-155 ký tự với Call-To-Action (CTA)
    const metaDescription = `Xem ${cleanTitle} trong danh mục ${category}. ${material ? `Chất liệu theo dữ liệu nguồn: ${material}.` : "Thông tin chất liệu được hiển thị theo dữ liệu đã xác minh."} Kiểm tra phân loại, giá và tồn kho trước khi đặt hàng.`.slice(0, 158);

    return { metaTitle, metaDescription };
  } else {
    // English Meta
    let metaTitle = `${cleanTitle} | ${category}`;
    if (metaTitle.length > 65) {
      metaTitle = cleanTitle.slice(0, 62) + "...";
    }

    const material = attributes?.find(a => a.keyEN === "Material")?.valueEN;
    const metaDescription = `View ${cleanTitle} in ${category}. ${material ? `Source-listed material: ${material}.` : "Material details are shown when verified."} Review available variants, current price, and stock before ordering.`.slice(0, 158);

    return { metaTitle, metaDescription };
  }
}

/**
 * Tự động sinh danh sách thẻ ALT ảnh chuẩn SEO cho Google Image Search
 */
export function generateImageAltTags(
  productTitle: string,
  primaryImage: string,
  galleryImages: string[] = [],
  detailImages: string[] = [],
  variants: any[] = []
): ProductImageSEO[] {
  const title = productTitle?.trim() || "Sản phẩm";
  const result: ProductImageSEO[] = [];

  // 1. Ảnh chính
  if (primaryImage) {
    result.push({
      url: primaryImage,
      alt: `${title} - Ảnh đại diện sản phẩm`,
      title: `${title} - Hình ảnh chính diện`,
      type: "PRIMARY"
    });
  }

  // 2. Ảnh Gallery
  galleryImages.forEach((url, idx) => {
    result.push({
      url,
      alt: `${title} - Góc chụp chi tiết #${idx + 1}`,
      title: `${title} - Chi tiết sản phẩm góc ${idx + 1}`,
      type: "GALLERY"
    });
  });

  // 3. Ảnh Chi tiết dài (Detail Images)
  detailImages.forEach((url, idx) => {
    result.push({
      url,
      alt: `${title} - Ảnh mô tả hoặc Size Chart #${idx + 1}`,
      title: `${title} - Bảng thông số kỹ thuật #${idx + 1}`,
      type: "DETAIL"
    });
  });

  // 4. Ảnh Variants (nếu có ảnh riêng)
  variants.forEach(v => {
    if (v.imageUrl && !result.some(r => r.url === v.imageUrl)) {
      const colorText = v.colorName ? `Màu ${v.colorName}` : "";
      const sizeText = v.sizeName ? `Size ${v.sizeName}` : "";
      const variantDesc = [colorText, sizeText].filter(Boolean).join(" - ");
      result.push({
        url: v.imageUrl,
        alt: `${title} - Phân loại ${variantDesc || "biến thể thực tế"}`,
        title: `${title} - ${variantDesc}`,
        type: "VARIANT"
      });
    }
  });

  return result;
}

/**
 * Tự động sinh khối FAQ Schema e-commerce giải đáp thắc mắc người mua
 */
export function generateProductFAQs(
  title: string,
  category: string = "Thời trang",
  language: "VI" | "EN" = "VI"
): ProductFAQItem[] {
  if (language === "VI") {
    return [
      {
        question: `Làm sao để chọn đúng kích cỡ (size) cho ${title}?`,
        answer: `Hãy đối chiếu tên phân loại và bảng kích thước do người bán cung cấp trong phần mô tả. Nếu chưa có đủ số đo, cần xác nhận với cửa hàng trước khi đặt.`
      },
      {
        question: `Chất liệu của ${title} được ghi ở đâu?`,
        answer: `Chất liệu chỉ được hiển thị khi có trong thuộc tính hoặc mô tả từ nguồn. Nếu mục này đang trống, cửa hàng cần xác minh trước khi tư vấn cho khách.`
      },
      {
        question: `Thời gian giao hàng và chính sách đổi trả như thế nào?`,
        answer: `Thời gian giao và điều kiện đổi trả phụ thuộc chính sách hiện hành của cửa hàng. Hãy kiểm tra thông tin được công bố tại thời điểm đặt hàng.`
      },
      {
        question: `Hình ảnh của ${title} lấy từ đâu?`,
        answer: `Hình ảnh được đồng bộ từ nguồn sản phẩm đã ghi nhận. Cửa hàng cần kiểm tra quyền sử dụng và độ chính xác của ảnh trước khi xuất bản.`
      }
    ];
  } else {
    return [
      {
        question: `How do I choose the correct size for ${title}?`,
        answer: `Compare the selected variant with the source-provided size guide. If measurements are missing, confirm them with the store before ordering.`
      },
      {
        question: `What is the recommended care instruction for this item?`,
        answer: `Use only the care instructions supplied in the verified product attributes or packaging. Ask the store when those instructions are unavailable.`
      },
      {
        question: `What is your return and exchange policy?`,
        answer: `Delivery estimates and return eligibility follow the store policy published at the time of purchase.`
      }
    ];
  }
}

/**
 * Sinh cấu trúc JSON-LD Product Schema Markup cho Google Search Rich Results
 */
export function generateProductJsonLd(
  product: Partial<WebProduct>,
  siteUrl: string = ""
): Record<string, any> {
  const images = [product.primaryImage, ...(product.galleryImages || [])].filter(Boolean);
  const minPrice = product.minPriceVND || 0;
  const maxPrice = product.maxPriceVND || minPrice;
  const activeVariants = (product.variants || []).filter(variant => variant.selectedForSale !== false);
  const hasStock = activeVariants.some(variant => variant.sourceAvailable !== false && (variant.stockQuantity ?? 0) > 0);
  const productUrl = siteUrl && (product.slug || product.skuCode)
    ? `${siteUrl.replace(/\/$/, "")}/products/${product.slug || product.skuCode}`
    : undefined;
  const offers = minPrice > 0 ? {
    "@type": "AggregateOffer",
    ...(productUrl ? { "url": productUrl } : {}),
    "priceCurrency": "VND",
    "lowPrice": minPrice,
    "highPrice": maxPrice,
    "offerCount": activeVariants.length,
    "availability": hasStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
  } : undefined;
  const aggregateRating = Number(product.rating) > 0 && Number(product.reviewCount) > 0 ? {
    "@type": "AggregateRating",
    "ratingValue": Number(product.rating),
    "reviewCount": Number(product.reviewCount)
  } : undefined;

  return {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.titleVI || product.titleEN || "Sản phẩm",
    "image": images,
    "description": product.shortDescVI || product.shortDescEN || product.titleVI,
    "sku": product.skuCode,
    ...(product.sourceProductId || product.skuCode ? { "mpn": product.sourceProductId || product.skuCode } : {}),
    ...(product.supplierName ? { "brand": {
      "@type": "Brand",
      "name": product.supplierName
    } } : {}),
    ...(product.categoryName ? { "category": product.categoryName } : {}),
    ...(offers ? { offers } : {}),
    ...(aggregateRating ? { aggregateRating } : {})
  };
}

export interface SEOCheckItem {
  id: string;
  title: string;
  passed: boolean;
  scoreDelta: number;
  tip: string;
}

/**
 * Đánh giá & Chấm điểm SEO Listing toàn diện (0 - 100 điểm)
 */
export function auditListingSEO(product: Partial<WebProduct>): {
  score: number;
  checks: SEOCheckItem[];
} {
  const checks: SEOCheckItem[] = [];
  let score = 0;

  // 1. Tiêu đề SEO (Độ dài tối ưu 40 - 75 ký tự)
  const title = product.titleVI || "";
  const isTitleGood = title.length >= 40 && title.length <= 80;
  checks.push({
    id: "title_length",
    title: `Độ dài tiêu đề SEO (${title.length} ký tự)`,
    passed: isTitleGood,
    scoreDelta: 20,
    tip: isTitleGood
      ? "Độ dài tiêu đề hoàn hảo, hiển thị trọn vẹn trên Google Tìm kiếm."
      : "Nên điều chỉnh tiêu đề trong khoảng 40 - 75 ký tự để tránh bị Google cắt bớt chữ."
  });
  if (isTitleGood) score += 20;

  // 2. Meta Description (110 - 165 ký tự)
  const metaDesc = product.metaDescription || product.seo?.metaDescriptionVI || "";
  const isMetaGood = metaDesc.length >= 100 && metaDesc.length <= 165;
  checks.push({
    id: "meta_desc",
    title: `Thẻ Meta Description (${metaDesc.length} ký tự)`,
    passed: isMetaGood,
    scoreDelta: 20,
    tip: isMetaGood
      ? "Mô tả ngắn gọn, hấp dẫn kèm lời kêu gọi hành động chuẩn CTR."
      : "Cần viết Meta Description từ 110 - 160 ký tự mô tả đúng nội dung sản phẩm."
  });
  if (isMetaGood) score += 20;

  // 3. Thẻ ALT ảnh chuẩn SEO
  const totalImages = (product.galleryImages?.length || 0) + (product.primaryImage ? 1 : 0) + (product.detailImages?.length || 0);
  const altItems = product.imagesSEO || product.seo?.imagesSEO || [];
  const hasAltCoverage = altItems.length > 0 && altItems.every(img => Boolean(img.alt?.trim()));
  checks.push({
    id: "image_alt",
    title: `Thẻ ALT cho toàn bộ hình ảnh (${altItems.length}/${totalImages} ảnh)`,
    passed: hasAltCoverage,
    scoreDelta: 20,
    tip: hasAltCoverage
      ? "Các hình ảnh hiện có đều đã có thẻ mô tả ALT."
      : "Bổ sung thẻ ALT chứa từ khóa cho ảnh để thu hút truy cập từ tìm kiếm hình ảnh."
  });
  if (hasAltCoverage) score += 20;

  // 4. Từ khóa chính (Focus Keywords)
  const keywords = product.focusKeywords || product.seo?.focusKeywordsVI || [];
  const hasKeywords = keywords.length >= 3;
  checks.push({
    id: "focus_keywords",
    title: `Bộ từ khóa mục tiêu (${keywords.length} từ khóa)`,
    passed: hasKeywords,
    scoreDelta: 15,
    tip: hasKeywords
      ? "Đã cấu hình đầy đủ từ khóa chính và từ khóa ngách."
      : "Nên thêm ít nhất 3 từ khóa tìm kiếm phổ biến của khách hàng."
  });
  if (hasKeywords) score += 15;

  // 5. Cấu trúc nội dung & FAQ
  const faqs = product.faqs || product.seo?.faqs || [];
  const hasFaq = faqs.length >= 2;
  checks.push({
    id: "faq_schema",
    title: `Khối câu hỏi thường gặp FAQ Schema (${faqs.length} câu hỏi)`,
    passed: hasFaq,
    scoreDelta: 15,
    tip: hasFaq
      ? "Đã có FAQ Schema giúp hiển thị khối giải đáp trực tiếp trên kết quả tìm kiếm."
      : "Thêm FAQ để nâng cao trải nghiệm khách hàng và chiếm vị trí nổi bật trên Google."
  });
  if (hasFaq) score += 15;

  // 6. Schema JSON-LD & URL Slug
  const hasSlug = Boolean(product.slug && product.slug.includes("-"));
  checks.push({
    id: "url_slug",
    title: "Đường dẫn URL Slug thân thiện SEO",
    passed: hasSlug,
    scoreDelta: 10,
    tip: hasSlug
      ? "URL slug không dấu, phân tách bằng dấu gạch ngang chuẩn SEO quốc tế."
      : "Cần tạo slug ngắn gọn không chứa dấu tiếng Việt hoặc ký tự đặc biệt."
  });
  if (hasSlug) score += 10;

  return {
    score: Math.min(100, score),
    checks
  };
}
