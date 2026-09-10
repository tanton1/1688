export type PublishStatus = "DRAFT" | "READY_TO_REVIEW" | "PUBLISHED" | "ARCHIVED";

export interface ProductTitleVariants {
  original: string;
  literal: string;
  clean: string;
  seo: string;
  display: string;
}

export interface WebProductVariant {
  id?: string;
  sourceVariantId?: string;
  sourceSkuId: string;
  colorName?: string;
  colorNameEN?: string;
  sizeName?: string;
  sizeNameEN?: string;
  specDetails?: Record<string, string>;
  costPriceVND: number;
  sellingPriceVND: number;
  stockQuantity: number;
  imageUrl?: string;
  sourceAvailable: boolean;
  selectedForSale: boolean;
}

export interface ProductAttributeItem {
  keyCN: string;
  valueCN: string;
  keyVI?: string;
  valueVI?: string;
  keyEN?: string;
  valueEN?: string;
}

export interface ProductPriceTierItem {
  minQuantity: number;
  priceCNY: number;
  priceVND: number;
  priceUSD?: number;
}

export interface ProductImageSEO {
  url: string;
  alt: string;
  title?: string;
  type?: "PRIMARY" | "GALLERY" | "DETAIL" | "VARIANT";
}

export interface ProductFAQItem {
  question: string;
  answer: string;
}

export interface ProductSEOMetadata {
  metaTitleVI?: string;
  metaTitleEN?: string;
  metaDescriptionVI?: string;
  metaDescriptionEN?: string;
  focusKeywordsVI?: string[];
  focusKeywordsEN?: string[];
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  faqs?: ProductFAQItem[];
  jsonLdSchema?: Record<string, any>;
  imagesSEO?: ProductImageSEO[];
  seoScore?: number;
}

export interface WebProduct {
  id?: string;
  slug: string;
  skuCode: string;
  
  // Tiêu đề & Mô tả tiếng Việt
  titleVI: string;
  titleVariants?: ProductTitleVariants;
  shortDescVI?: string;
  fullDescVI?: string;

  // Tiêu đề & Mô tả tiếng Anh (E-Commerce / Global)
  titleEN?: string;
  titleVariantsEN?: ProductTitleVariants;
  shortDescEN?: string;
  fullDescEN?: string;
  displayLanguage?: "VI" | "EN";

  categoryName: string;
  
  // Media & Video
  primaryImage: string;
  galleryImages: string[];
  detailImages?: string[]; // Ảnh mô tả dài (bảng size, infographic, cận cảnh vải)
  videoUrl?: string | null; // Video sản phẩm 1688 (.mp4 hoặc stream URL)
  videoPosterUrl?: string | null;

  // Thuộc tính chi tiết & Bảng giá sỉ bậc thang
  attributes?: ProductAttributeItem[];
  priceTiers?: ProductPriceTierItem[];

  // SEO & Dữ liệu có cấu trúc Google
  seo?: ProductSEOMetadata;
  metaTitle?: string;
  metaDescription?: string;
  focusKeywords?: string[];
  imagesSEO?: ProductImageSEO[];
  faqs?: ProductFAQItem[];

  status: PublishStatus;
  qualityScore: number;
  minPriceVND: number;
  maxPriceVND: number;
  
  // Field lock state
  isTitleLocked: boolean;
  isDescLocked: boolean;
  isImagesLocked: boolean;
  isPriceAutoSync: boolean;
  isStockAutoSync: boolean;

  variants: WebProductVariant[];
  sourceProductId: string;
  sourceUrl: string;
  supplierName: string;
  createdAt?: string;
  updatedAt?: string;
}
