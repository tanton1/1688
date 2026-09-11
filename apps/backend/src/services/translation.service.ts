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
    const seoTitle = category ? `${cleanTitle} – ${category}` : cleanTitle;
    const displayTitle = cleanTitle;

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
    const seoTitle = category ? `${cleanTitle} - ${category}` : cleanTitle;
    const displayTitle = cleanTitle;

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
    const verifiedAttributes = attributes
      .filter(attribute => attribute.keyVI && attribute.valueVI)
      .map(attribute => `• **${attribute.keyVI}**: ${attribute.valueVI}`)
      .join("\n");

    return `
### GIỚI THIỆU SẢN PHẨM
${titleVI}

### THÔNG TIN ĐÃ TRÍCH XUẤT
${verifiedAttributes || "Nguồn chưa cung cấp thuộc tính chi tiết."}

### LƯU Ý
Nội dung được tạo từ dữ liệu nguồn. Cần đối chiếu hình ảnh, phân loại và hướng dẫn sử dụng trước khi xuất bản.
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
    const verifiedAttributes = attributes
      .filter(attribute => attribute.keyEN && attribute.valueEN)
      .map(attribute => `• **${attribute.keyEN}**: ${attribute.valueEN}`)
      .join("\n");

    return `
### PRODUCT OVERVIEW
${titleEN}

### EXTRACTED PRODUCT DATA
${verifiedAttributes || "The source did not provide detailed product attributes."}

### NOTICE
This draft is generated from source data. Verify images, variants, and usage instructions before publishing.
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
      supplierName = ""
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

    const seoAudit = auditListingSEO({
      titleVI,
      slug,
      metaDescription: metaVI.metaDescription,
      imagesSEO,
      focusKeywords: focusKeywordsVI,
      faqs,
      primaryImage,
      galleryImages,
      detailImages
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
      seoScore: seoAudit.score
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
