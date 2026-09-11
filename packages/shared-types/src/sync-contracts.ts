export interface ExistingProductCheckResult {
  exists: boolean;
  sourceProductId: string;
  webProductId?: string;
  webProductSlug?: string;
  currentMinSellingPriceVND?: number;
  currentCostCNY?: number;
  currentStock?: number;
  lastSyncedAt?: string;
  marginPercent?: number;
}

export interface DiffFieldChange {
  fieldName: "price" | "stock" | "variants" | "status";
  oldValue: any;
  newValue: any;
  deltaPercent?: number;
  severity: "INFO" | "WARNING" | "CRITICAL";
  autoApplied: boolean;
}

export interface ProductDiffSummary {
  sourceProductId: string;
  webProductId: string;
  productTitle: string;
  changes: DiffFieldChange[];
  hasPriceChange: boolean;
  hasStockChange: boolean;
  hasUnavailableSku: boolean;
  requiresReview: boolean;
  detectedAt: string;
}

export interface BulkImportRequest {
  offerIds: string[];
  settings: {
    categoryName?: string;
    pricingRuleId?: string;
    translationMode: "ACCURATE" | "ECOMMERCE" | "SEO" | "REWRITE";
    autoPublish: boolean;
  };
}

export interface ImportJobStatus {
  jobId: string;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  results: Array<{
    offerId: string;
    status: "SUCCESS" | "FAILED";
    webProductId?: string;
    error?: string;
  }>;
}

export type OrderSourcingStatus = "PENDING_SOURCING" | "ORDERED_1688" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED";

export interface CustomerOrderItem {
  skuCode: string;
  variantName: string;
  quantity: number;
  sellingPriceVND: number;
  costVND?: number;
  source1688Url?: string;
  sourceProductId?: string;
  sourceSkuId?: string;
  image?: string;
  // POD Customization data (Tên, avatar, kiểu tóc, lời chúc, ảnh preview đã custom)
  customizationData?: Record<string, any>;
  customizedPreviewUrl?: string;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  platform: "WOOCOMMERCE" | "SHOPIFY" | "MANUAL" | "STOREFRONT";
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: CustomerOrderItem[];
  totalAmountVND: number;
  totalCostVND: number;
  estimatedProfitVND: number;
  status: OrderSourcingStatus;
  paymentMethod?: "COD" | "VIETQR" | "BANK_TRANSFER";
  paymentStatus?: "PENDING" | "PAID";
  note?: string;
  giftAddonsSelected?: string[];
  discountCode?: string;
  discountAmountVND?: number;
  shippingFeeVND?: number;
  createdAt: string;
  updatedAt: string;
}

export type StorefrontDiscountType = "PERCENT" | "FIXED" | "FREE_SHIPPING";

export interface StorefrontDiscountRule {
  code: string;
  type: StorefrontDiscountType;
  value: number;
  maxDiscountVND?: number;
  label?: string;
  active: boolean;
}

export interface StorefrontConfig {
  storeName: string;
  tagline: string;
  hotline: string;
  zaloUrl?: string;
  address?: string;
  freeShipThresholdVND: number;
  shippingFeeVND: number;
  discountRules: StorefrontDiscountRule[];
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
  bannerTitle?: string;
  bannerSubtitle?: string;
  accentColor?: string;
}

export interface StorefrontCheckoutRequest {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  note?: string;
  paymentMethod: "COD" | "VIETQR" | "BANK_TRANSFER";
  items: Array<{
    productId: string;
    skuCode: string;
    sourceSkuId?: string;
    variantName: string;
    quantity: number;
    sellingPriceVND: number;
    image?: string;
    customizationData?: Record<string, any>;
    customizedPreviewUrl?: string;
    giftAddonsSelected?: string[];
  }>;
  giftAddonsSelected?: string[];
  discountCode?: string;
  discountAmountVND?: number;
}
