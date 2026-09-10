import { SourcePlatform } from "./normalized-product.js";

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

export type StoreConnectorType = "WOOCOMMERCE" | "SHOPIFY" | "SHOPEE" | "TIKTOK_SHOP";

export interface WooCommerceConfig {
  storeUrl: string;
  siteUrl?: string; // alias for storeUrl
  consumerKey: string;
  consumerSecret: string;
}

export interface ShopifyConfig {
  shopDomain: string;
  accessToken: string;
  apiVersion?: string;
  currency?: "VND" | "USD";
  exchangeRateVNDToUSD?: number;
}

export interface TelegramAlertConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
  alertOnPriceRise: boolean;
  alertOnOutOfStock: boolean;
}

export interface StoreSyncResult {
  connectorType: StoreConnectorType;
  remoteId?: string;
  externalProductId?: string; // alias
  remoteUrl?: string;
  externalUrl?: string; // alias
  status: "SUCCESS" | "FAILED" | "PENDING";
  message?: string;
  errorMessage?: string; // alias
  syncedAt: string;
}

export type AICopywritingStyle = "AIDA" | "PAS" | "STORYTELLING" | "SOCIAL_ADS";

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

  // Lịch sử đồng bộ kênh bán lẻ (Downstream Sync)
  storeSyncHistory?: StoreSyncResult[];

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
  sourcePlatform?: SourcePlatform;
  sourceCurrency?: "CNY" | "VND" | "USD";
  sourceProductId: string;
  sourceUrl: string;
  supplierName: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SupportedPlatformInfo {
  id: SourcePlatform;
  name: string;
  badge: string;
  icon: string;
  color: string;
  defaultCurrency: "CNY" | "VND" | "USD";
  sampleUrl: string;
  description: string;
}

export interface ClonedVariantPreview {
  skuId: string;
  name: string;
  nameVI?: string;
  originalPrice: number;
  priceVND: number;
  stock: number;
  imageUrl?: string;
}

export interface ClonePreviewResponse {
  sourcePlatform: SourcePlatform;
  sourceProductId: string;
  sourceUrl: string;
  originalTitle: string;
  translatedTitleVI: string;
  translatedTitleEN?: string;
  supplierName: string;
  currency: "CNY" | "USD" | "VND";
  originalPriceMin: number;
  originalPriceMax: number;
  estimatedCostVND: number;
  estimatedSellingPriceVND: number;
  estimatedMarginPercent: number;
  primaryImage: string;
  galleryImages: string[];
  variants: ClonedVariantPreview[];
  categorySuggested: string;
  rawAttributes?: Array<{ key: string; value: string }>;
  qualityScorePreview: number;
}

export interface CloneExecuteRequest {
  url: string;
  platform?: SourcePlatform;
  customTitle?: string;
  pricingRuleId?: string;
  categoryName?: string;
  autoPublish?: boolean;
}

export interface BatchCloneRequest {
  urls: string[];
  pricingRuleId?: string;
  categoryName?: string;
  autoPublish?: boolean;
}

export interface BatchCloneItemResult {
  url: string;
  success: boolean;
  product?: WebProduct;
  error?: string;
  sourcePlatform?: SourcePlatform;
}

export interface BatchCloneResponse {
  total: number;
  succeeded: number;
  failed: number;
  results: BatchCloneItemResult[];
}

export interface VisualSourcingRequest {
  productId?: string;
  imageUrl?: string;
  title?: string;
  currentSellingPriceVND?: number;
}

export interface VisualSourcingMatch {
  offerId: string;
  sourceUrl: string;
  titleCN: string;
  titleVI: string;
  shopName: string;
  location: string;
  moq: number;
  factoryPriceCNY: number;
  factoryPriceVND: number;
  currentProductSellingPriceVND: number;
  estimatedMarginWith1688: number;
  similarityScore: number;
  primaryImage: string;
  repurchaseRate: number;
}

export interface VisualSourcingResponse {
  success: boolean;
  queryTitle?: string;
  queryImage?: string;
  matches: VisualSourcingMatch[];
}


