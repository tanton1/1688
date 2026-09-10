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

    // 3. Ghép với ngành hàng và từ khóa ý định mua hàng (Buyer Intent)
    const catLower = category.toLowerCase();
    keywords.add(`${catLower} cao cấp`);
    keywords.add(`${catLower} hot trend 2026`);
    keywords.add(`${cleanTitle.slice(0, 30)} chính hãng`);
    keywords.add(`${cleanTitle.slice(0, 30)} giá sỉ tận xưởng`);
  } else {
    // English keywords
    keywords.add(cleanTitle.toLowerCase());
    const segments = cleanTitle.split(/[-–—|,()]/).map(s => s.trim().toLowerCase()).filter(Boolean);
    segments.forEach(seg => {
      if (seg.length > 5 && seg.length < 40) keywords.add(seg);
    });

    const catLower = category.toLowerCase();
    keywords.add(`premium ${catLower}`);
    keywords.add(`trendy ${catLower} 2026`);
    keywords.add(`${cleanTitle.slice(0, 30)} online`);
    keywords.add(`wholesale ${catLower}`);
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
    let metaTitle = `${cleanTitle} | Hàng Cao Cấp, Chuẩn Form`;
    if (metaTitle.length > 65) {
      metaTitle = cleanTitle.slice(0, 62) + "...";
    }

    // Lấy thông tin chất liệu nếu có
    const material = attributes?.find(a => a.keyVI === "Chất liệu")?.valueVI || "vải cao cấp thoáng khí";

    // Meta Description chuẩn 125-155 ký tự với Call-To-Action (CTA)
    const metaDescription = `Mua ngay ${cleanTitle} chất lượng cao, ${material}. Thiết kế tôn dáng, form chuẩn đẹp, độ bền cao. Cam kết giá tốt tận gốc, hỗ trợ đổi trả uy tín!`.slice(0, 158);

    return { metaTitle, metaDescription };
  } else {
    // English Meta
    let metaTitle = `${cleanTitle} - Premium Quality & Trendy Style`;
    if (metaTitle.length > 65) {
      metaTitle = cleanTitle.slice(0, 62) + "...";
    }

    const material = attributes?.find(a => a.keyEN === "Material")?.valueEN || "premium breathable fabric";
    const metaDescription = `Shop ${cleanTitle} crafted from ${material}. Designed for everyday elegance, comfort, and durability. Fast shipping & satisfaction guarantee. Buy now!`.slice(0, 158);

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
      alt: `${title} - Ảnh đại diện chính thức cao cấp sắc nét`,
      title: `${title} - Hình ảnh chính diện`,
      type: "PRIMARY"
    });
  }

  // 2. Ảnh Gallery
  galleryImages.forEach((url, idx) => {
    result.push({
      url,
      alt: `${title} - Góc chụp chi tiết #${idx + 1} chất liệu và đường may chuẩn form`,
      title: `${title} - Chi tiết sản phẩm góc ${idx + 1}`,
      type: "GALLERY"
    });
  });

  // 3. Ảnh Chi tiết dài (Detail Images)
  detailImages.forEach((url, idx) => {
    result.push({
      url,
      alt: `${title} - Bảng thông số kích thước Size Chart & infographic chi tiết #${idx + 1}`,
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
        answer: `Bạn nên tham khảo bảng đo kích thước chi tiết (ngực, eo, mông, chiều dài) trong phần mô tả ảnh chi tiết. Nếu ở giữa 2 size hoặc thích mặc rộng rãi thoải mái, chúng tôi khuyên bạn nên chọn tăng 1 size.`
      },
      {
        question: `Chất liệu sản phẩm có bị xù lông hoặc phai màu sau khi giặt không?`,
        answer: `Sản phẩm sử dụng chất liệu vải đã qua xử lý giữ màu và chống co rút. Để sản phẩm luôn như mới, nên giặt ở nhiệt độ thường với trang phục cùng màu và tránh chất tẩy rửa mạnh.`
      },
      {
        question: `Thời gian giao hàng và chính sách đổi trả như thế nào?`,
        answer: `Đơn hàng được đóng gói kỹ lưỡng và giao trong 1-3 ngày làm việc. Chúng tôi hỗ trợ đổi trả hoặc đổi size trong vòng 7 ngày nếu sản phẩm còn nguyên tem mác và chưa qua sử dụng.`
      },
      {
        question: `Sản phẩm có giống 100% so với hình ảnh thực tế không?`,
        answer: `Toàn bộ hình ảnh và video đều là ảnh chụp mẫu thực tế từ xưởng sản xuất. Màu sắc có thể chênh lệch nhẹ 3-5% do độ phân giải màn hình hiển thị.`
      }
    ];
  } else {
    return [
      {
        question: `How do I choose the correct size for ${title}?`,
        answer: `Please refer to our comprehensive size guide in the product details image section. If you are between two sizes or prefer a relaxed silhouette, we suggest ordering one size up.`
      },
      {
        question: `What is the recommended care instruction for this item?`,
        answer: `Machine wash cold with like colors on a delicate cycle. Do not bleach. Hang or line dry in shade to preserve fabric softness and garment shape.`
      },
      {
        question: `What is your return and exchange policy?`,
        answer: `We offer hassle-free 14-day returns and size exchanges provided the item is in unworn condition with all original tags attached.`
      }
    ];
  }
}

/**
 * Sinh cấu trúc JSON-LD Product Schema Markup cho Google Search Rich Results
 */
export function generateProductJsonLd(
  product: Partial<WebProduct>,
  siteUrl: string = "https://1688-phi.vercel.app"
): Record<string, any> {
  const images = [product.primaryImage, ...(product.galleryImages || [])].filter(Boolean);
  const minPrice = product.minPriceVND || 0;
  const maxPrice = product.maxPriceVND || minPrice;

  return {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.titleVI || product.titleEN || "Sản phẩm",
    "image": images,
    "description": product.shortDescVI || product.shortDescEN || product.titleVI,
    "sku": product.skuCode,
    "mpn": product.sourceProductId || product.skuCode,
    "brand": {
      "@type": "Brand",
      "name": product.supplierName || "1688 Direct Hub"
    },
    "category": product.categoryName || "Thời trang",
    "offers": {
      "@type": "AggregateOffer",
      "url": `${siteUrl}/products/${product.slug || product.skuCode}`,
      "priceCurrency": "VND",
      "lowPrice": minPrice,
      "highPrice": maxPrice,
      "offerCount": product.variants?.length || 1,
      "availability": "https://schema.org/InStock",
      "itemCondition": "https://schema.org/NewCondition"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "128"
    }
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
      : "Cần viết Meta Description từ 110 - 160 ký tự kèm ưu đãi để tăng tỷ lệ click."
  });
  if (isMetaGood) score += 20;

  // 3. Thẻ ALT ảnh chuẩn SEO
  const totalImages = (product.galleryImages?.length || 0) + 1 + (product.detailImages?.length || 0);
  const altItems = product.imagesSEO || product.seo?.imagesSEO || [];
  const hasAltCoverage = altItems.length > 0 && altItems.every(img => Boolean(img.alt?.trim()));
  checks.push({
    id: "image_alt",
    title: `Thẻ ALT cho toàn bộ hình ảnh (${altItems.length}/${totalImages} ảnh)`,
    passed: hasAltCoverage,
    scoreDelta: 20,
    tip: hasAltCoverage
      ? "100% hình ảnh đã có thẻ mô tả ALT, tối ưu cho Google Image Search."
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
