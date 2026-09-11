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
  /** Source price snapshot used for like-for-like diffing. */
  sourcePrice?: number;
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

export type PersonalizationFieldType = 
  | "TEXT" 
  | "TEXTAREA" 
  | "SELECT" 
  | "AVATAR_BUILDER" 
  | "PET_BUILDER" 
  | "COLOR_SWATCH" 
  | "NUMBER" 
  | "CHECKBOX";

export interface PersonalizationOptionItem {
  id: string;
  label: string;
  value: string;
  previewAssetUrl?: string;
  thumbnail?: string;
  priceDeltaVND?: number;
}

export interface PersonalizationField {
  id: string;
  label: string;
  placeholder?: string;
  type: PersonalizationFieldType;
  required?: boolean;
  maxLength?: number;
  options?: PersonalizationOptionItem[];
  defaultValue?: any;
  group?: string;
  helpText?: string;
}

export interface VolumeDiscountTier {
  minQty: number;
  discountPercent: number;
  badgeText: string;
  isPopular?: boolean;
}

export interface GiftAddonItem {
  id: string;
  title: string;
  description?: string;
  priceVND: number;
  originalPriceVND?: number;
  image?: string;
  defaultChecked?: boolean;
}

export interface WebProduct {
  id?: string;
  version?: number;
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
  warrantyPolicy?: string;
  shippingPolicy?: string;

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

  // Media Mirroring (Host ảnh vĩnh viễn trên Supabase/CDN)
  isMediaMirrored?: boolean;
  mirroredAt?: string;

  variants: WebProductVariant[];
  
  // Tính năng cá nhân hóa (POD / Personalized Gifts theo mô hình Macorner)
  isPersonalized?: boolean;
  personalizationFields?: PersonalizationField[];
  customizerMockupTemplateUrl?: string;
  volumeDiscountTiers?: VolumeDiscountTier[];
  giftAddons?: GiftAddonItem[];
  occasionTags?: string[]; // "christmas", "mothers-day", "fathers-day", "anniversary", "memorial", "birthday", "valentines"
  recipientTags?: string[]; // "for-mom", "for-dad", "for-couples", "for-besties", "for-pet-lovers", "for-grandparents"
  rating?: number; // Ví dụ 4.9/5.0
  reviewCount?: number; // Ví dụ 1,280 reviews

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
  option1?: string;
  option2?: string;
  option3?: string;
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
  detailImages?: string[];
  variants: ClonedVariantPreview[];
  categorySuggested: string;
  rawAttributes?: Array<{ key: string; value: string }>;
  rawOptions?: Array<{ name: string; values: string[] }>;
  qualityScorePreview: number;
  extractionStatus: "LIVE" | "DEMO" | "UNVERIFIED";
  isDemo: boolean;
  confidence: number;
  provenance: string[];
  warnings: string[];
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
  isDemo?: boolean;
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
  mode?: "LIVE" | "DEMO";
  queryTitle?: string;
  queryImage?: string;
  matches: VisualSourcingMatch[];
}

export interface TemplateContentPreset {
  titlePrefix?: string;
  titleSuffix?: string;
  titleFormula?: string;
  shortDescVI?: string;
  shortDescEN?: string;
  fullDescVI?: string;
  fullDescEN?: string;
  attributes?: Array<{ key: string; value: string }>;
  warrantyPolicy?: string;
  shippingPolicy?: string;
  focusKeywords?: string[];
  faqs?: Array<{ question: string; answer: string }>;
}

export interface TemplateVariationOption {
  name: string;
  values: string[];
}

export interface TemplateVariationPreset {
  options: TemplateVariationOption[];
  defaultStock?: number;
  skuPattern?: string;
  predefinedVariants?: Array<{
    name: string;
    option1?: string;
    option2?: string;
    priceAdjustmentVND?: number;
    stock?: number;
  }>;
}

export interface ProductTemplate {
  id: string;
  name: string;
  description?: string;
  categoryName: string;
  targetPlatform?: "ALL" | "SHOPIFY" | "WOOCOMMERCE" | "SHOPEE" | "TIKTOK_SHOP";
  isDefault?: boolean;
  content: TemplateContentPreset;
  variation: TemplateVariationPreset;
  createdAt: string;
  updatedAt: string;
}

export interface BulkSearchItem {
  offerId: string;
  title: string;
  imageUrl: string;
  priceCNY: number;
  salesCount?: number;
  repurchaseRate?: number;
  shopName?: string;
  location?: string;
  detailUrl: string;
  alreadyImported?: boolean;
}

export interface ImageInpaintRequest {
  imageUrl: string;
  maskDataUrl?: string;
  rectangles?: Array<{ x: number; y: number; width: number; height: number }>;
}

export interface ImageInpaintResponse {
  success: boolean;
  resultImageUrl: string;
  message?: string;
}
