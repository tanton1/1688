import {
  ProductTitleVariants,
  TranslationMode,
  Raw1688Attribute,
  ProductAttributeItem,
  ProductSEOMetadata,
  ProductImageSEO,
  ProductFAQItem
} from "@hub1688/shared-types";
import {
  clean1688Title,
  applyGlossary,
  applyGlossaryEN,
  DEFAULT_GLOSSARY,
  DEFAULT_GLOSSARY_EN,
  normalizeSizeProp,
  generateSlug,
  extractSEOKeywords,
  generateSEOMeta,
  generateImageAltTags,
  generateProductFAQs,
  generateProductJsonLd,
  auditListingSEO
} from "@hub1688/shared-utils";

export class TranslationEngineService {
  private customGlossary: Record<string, string> = {};

  constructor(customGlossary: Record<string, string> = {}) {
    this.customGlossary = customGlossary;
  }

  public updateGlossary(glossary: Record<string, string>) {
    this.customGlossary = { ...this.customGlossary, ...glossary };
  }

  /**
   * Sinh các biến thể tiêu đề Tiếng Việt (Original, Literal, Clean, SEO, Display)
   */
  public generateTitleVariants(rawTitleCN: string, category: string = "Thời trang"): ProductTitleVariants {
    const cleanedCN = clean1688Title(rawTitleCN);
    const translatedLiteral = applyGlossary(cleanedCN, this.customGlossary);
    const cleanTitle = this.formatEcommerceTitle(translatedLiteral);
    const seoTitle = `${cleanTitle} – Cao Cấp, Bền Đẹp, Chuẩn Form`;
    const displayTitle = `${cleanTitle} (Mẫu Mới 2026)`;

    return {
      original: rawTitleCN,
      literal: translatedLiteral,
      clean: cleanTitle,
      seo: seoTitle,
      display: displayTitle
    };
  }

  /**
   * Sinh các biến thể tiêu đề Tiếng Anh (Original, Literal, Clean, SEO, Display)
   */
  public generateTitleVariantsEN(rawTitleCN: string, category: string = "Fashion"): ProductTitleVariants {
    const cleanedCN = clean1688Title(rawTitleCN);
    const translatedLiteral = applyGlossaryEN(cleanedCN);
    const cleanTitle = this.formatEcommerceTitle(translatedLiteral);
    const seoTitle = `${cleanTitle} - Premium Quality & Modern Design`;
    const displayTitle = `${cleanTitle} (New Arrival 2026)`;

    return {
      original: rawTitleCN,
      literal: translatedLiteral,
      clean: cleanTitle,
      seo: seoTitle,
      display: displayTitle
    };
  }

  /**
   * Dịch thuộc tính sản phẩm sang cả Tiếng Việt và Tiếng Anh
   */
  public translateAttributes(attrs: Raw1688Attribute[]): ProductAttributeItem[] {
    return attrs.map(attr => {
      // Dịch sang tiếng Việt
      let keyVI = applyGlossary(attr.nameCN, this.customGlossary);
      if (attr.nameCN.includes("颜色")) keyVI = "Màu sắc";
      if (attr.nameCN.includes("尺码") || attr.nameCN.includes("尺寸")) keyVI = "Kích thước";
      if (attr.nameCN.includes("材质") || attr.nameCN.includes("面料")) keyVI = "Chất liệu";
      if (attr.nameCN.includes("货号")) keyVI = "Mã sản phẩm";
      if (attr.nameCN.includes("产地")) keyVI = "Xuất xứ";

      let valueVI = applyGlossary(attr.valueCN, this.customGlossary);
      valueVI = normalizeSizeProp(valueVI);

      // Dịch sang tiếng Anh
      let keyEN = applyGlossaryEN(attr.nameCN);
      if (attr.nameCN.includes("颜色")) keyEN = "Color";
      if (attr.nameCN.includes("尺码") || attr.nameCN.includes("尺寸")) keyEN = "Size";
      if (attr.nameCN.includes("材质") || attr.nameCN.includes("面料")) keyEN = "Material";
      if (attr.nameCN.includes("货号")) keyEN = "Item No.";
      if (attr.nameCN.includes("产地")) keyEN = "Origin";

      let valueEN = applyGlossaryEN(attr.valueCN);

      return {
        keyCN: attr.nameCN,
        valueCN: attr.valueCN,
        keyVI,
        valueVI,
        keyEN,
        valueEN
      };
    });
  }

  /**
   * Tái cấu trúc mô tả sản phẩm Tiếng Việt chuẩn Semantic SEO H1-H3
   */
  public generateStructuredDescription(
    titleVI: string,
    attributes: ProductAttributeItem[],
    rawDescText: string = ""
  ): string {
    const materialAttr = attributes.find(a => a.keyVI === "Chất liệu")?.valueVI || "Vải cao cấp thoáng khí";
    const originAttr = attributes.find(a => a.keyVI === "Xuất xứ")?.valueVI || "Nội địa cao cấp";

    return `
### GIỚI THIỆU SẢN PHẨM
${titleVI} được sản xuất với tiêu chuẩn chất lượng cao, phong cách hiện đại, thanh lịch và phù hợp sử dụng hàng ngày hoặc đi chơi, đi làm.

### ĐẶC ĐIỂM NỔI BẬT
• Thiết kế tôn dáng, đường may tỉ mỉ, chắc chắn từng chi tiết.
• Vải mềm mại, co giãn đàn hồi và thoáng mát vượt trội.
• Khả năng thấm hút mồ hôi và nhanh khô, không xù lông hay phai màu sau nhiều lần giặt.
• Form chuẩn, mang lại cảm giác thoải mái suốt ngày dài.

### THÔNG SỐ & CHẤT LIỆU
• **Chất liệu**: ${materialAttr}
• **Xuất xứ**: ${originAttr}
• **Quy cách đóng gói**: Túi zip bảo quản chuyên dụng

### HƯỚNG DẪN BẢO QUẢN
• Giặt ở nhiệt độ thường với đồ có màu tương tự.
• Không sử dụng hóa chất tẩy mạnh.
• Phơi ở nơi thoáng gió, tránh ánh nắng gay gắt trực tiếp.
    `.trim();
  }

  /**
   * Tái cấu trúc mô tả sản phẩm Tiếng Anh (English Global Store / Shopify)
   */
  public generateStructuredDescriptionEN(
    titleEN: string,
    attributes: ProductAttributeItem[],
    rawDescText: string = ""
  ): string {
    const materialAttr = attributes.find(a => a.keyEN === "Material")?.valueEN || "High Quality Breathable Fabric";
    const originAttr = attributes.find(a => a.keyEN === "Origin")?.valueEN || "Certified Factory Direct";

    return `
### PRODUCT OVERVIEW
${titleEN} features contemporary craftsmanship, premium comfort, and an elegant silhouette suitable for everyday wear, work, or casual outings.

### KEY HIGHLIGHTS
• Flattering fit with reinforced, precision stitching throughout.
• Ultra-soft touch, breathable fabric with natural flexibility.
• Moisture-wicking and quick-drying, resilient against shrinkage or fading.
• Ergonomic cut providing effortless comfort all day long.

### SPECIFICATIONS & MATERIALS
• **Material**: ${materialAttr}
• **Origin**: ${originAttr}
• **Packaging**: Eco-friendly protective zipper bag

### CARE INSTRUCTIONS
• Machine wash cold with like colors.
• Tumble dry low or air dry in shade.
• Do not bleach or use harsh chemicals.
    `.trim();
  }

  /**
   * Tự động sinh trọn gói gói tối ưu SEO cho sản phẩm (Slug, Meta, Thẻ ALT, FAQ, JSON-LD)
   */
  public generateCompleteSEOPackage(params: {
    titleVI: string;
    titleEN: string;
    categoryName: string;
    attributes: ProductAttributeItem[];
    primaryImage: string;
    galleryImages?: string[];
    detailImages?: string[];
    variants?: any[];
    skuCode?: string;
    minPriceVND?: number;
    maxPriceVND?: number;
    supplierName?: string;
  }): {
    slug: string;
    metaTitle: string;
    metaDescription: string;
    focusKeywords: string[];
    imagesSEO: ProductImageSEO[];
    faqs: ProductFAQItem[];
    seo: ProductSEOMetadata;
  } {
    const {
      titleVI,
      titleEN,
      categoryName,
      attributes,
      primaryImage,
      galleryImages = [],
      detailImages = [],
      variants = [],
      skuCode = `SKU-${Date.now().toString().slice(-6)}`,
      minPriceVND = 0,
      maxPriceVND = 0,
      supplierName = "1688 Direct Hub"
    } = params;

    const slug = generateSlug(titleVI);
    const metaVI = generateSEOMeta(titleVI, categoryName, attributes, "VI");
    const metaEN = generateSEOMeta(titleEN, categoryName, attributes, "EN");
    const focusKeywordsVI = extractSEOKeywords(titleVI, categoryName, "VI");
    const focusKeywordsEN = extractSEOKeywords(titleEN, categoryName, "EN");
    const imagesSEO = generateImageAltTags(titleVI, primaryImage, galleryImages, detailImages, variants);
    const faqs = generateProductFAQs(titleVI, categoryName, "VI");

    const jsonLdSchema = generateProductJsonLd({
      titleVI,
      titleEN,
      skuCode,
      categoryName,
      primaryImage,
      galleryImages,
      minPriceVND,
      maxPriceVND,
      supplierName,
      variants,
      slug
    });

    const seo: ProductSEOMetadata = {
      metaTitleVI: metaVI.metaTitle,
      metaTitleEN: metaEN.metaTitle,
      metaDescriptionVI: metaVI.metaDescription,
      metaDescriptionEN: metaEN.metaDescription,
      focusKeywordsVI,
      focusKeywordsEN,
      imagesSEO,
      faqs,
      jsonLdSchema,
      seoScore: 95
    };

    return {
      slug,
      metaTitle: metaVI.metaTitle,
      metaDescription: metaVI.metaDescription,
      focusKeywords: focusKeywordsVI,
      imagesSEO,
      faqs,
      seo
    };
  }

  private formatEcommerceTitle(text: string): string {
    return text
      .split(" ")
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
}
