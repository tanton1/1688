export type ChannelPlatform = "SHOPEE" | "TIKTOK_SHOP";

export type ChannelConnectionStatus =
  | "NOT_CONFIGURED"
  | "DISCONNECTED"
  | "CONNECTED"
  | "TOKEN_EXPIRED"
  | "ERROR";

export type ChannelListingStatus =
  | "DRAFT"
  | "VALIDATING"
  | "READY"
  | "SUBMITTING"
  | "UNDER_REVIEW"
  | "LIVE"
  | "REJECTED"
  | "SYNC_ERROR"
  | "PAUSED";

export interface ChannelAccountSummary {
  id?: string;
  appConfigId?: string;
  platform: ChannelPlatform;
  shopId?: string;
  shopName?: string;
  region: string;
  status: ChannelConnectionStatus;
  tokenExpiresAt?: string;
  grantedScopes?: string[];
  lastHealthCheckAt?: string;
  lastInventorySyncAt?: string;
  autoSyncEnabled?: boolean;
  syncErrorCount?: number;
  disconnectedAt?: string;
  message?: string;
}

export interface ShopeeAppConfigSummary {
  id?: string;
  platform: "SHOPEE";
  name: string;
  region: string;
  partnerId?: string;
  partnerKeyMasked?: string;
  keyConfigured: boolean;
  redirectUrl: string;
  isActive: boolean;
  source: "DATABASE" | "ENVIRONMENT" | "NONE";
  message?: string;
}

export interface ShopeeAppConfigInput {
  id?: string;
  name?: string;
  region?: string;
  partnerId: string;
  /** Leave blank when editing to keep the encrypted key already stored. */
  partnerKey?: string;
}

export interface ShopeeConnectorDashboard {
  appCount: number;
  sellerCount: number;
  connectedSellerCount: number;
  attentionSellerCount: number;
  listingCount: number;
  liveListingCount: number;
  reviewListingCount: number;
  rejectedListingCount: number;
  syncErrorListingCount: number;
  lastInventorySyncAt?: string;
  schedule: string;
}

export interface ShopeeSyncRunResult {
  success: boolean;
  processed: number;
  stockUpdated: number;
  statusUpdated: number;
  failed: number;
  skipped: number;
  completedAt: string;
  errors: Array<{ listingId: string; message: string }>;
}

export interface ChannelPackageDimensions {
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
}

export interface ChannelListingAttributeValue {
  attributeId: string;
  valueId?: string;
  valueName?: string;
}

export interface ShopeeLogisticsSelection {
  logisticId: string;
  enabled: boolean;
  shippingFeeVND?: number;
  freeShipping?: boolean;
}

export interface ShopeeListingDraft {
  productId: string;
  accountId?: string;
  title: string;
  description: string;
  categoryId: string;
  categoryPath?: string;
  brandId?: string;
  brandName?: string;
  weightKg: number;
  dimensions?: ChannelPackageDimensions;
  attributes: ChannelListingAttributeValue[];
  requiredAttributeIds?: string[];
  logistics: ShopeeLogisticsSelection[];
  selectedVariantIds?: string[];
  primaryVariationName?: string;
  secondaryVariationName?: string;
  stockBuffer?: number;
  priceAdjustmentPercent?: number;
}

export type ChannelReadinessSeverity = "BLOCKER" | "WARNING" | "INFO";

export interface ChannelReadinessIssue {
  code: string;
  severity: ChannelReadinessSeverity;
  field: string;
  message: string;
  sku?: string;
}

export interface ChannelReadinessResult {
  platform: ChannelPlatform;
  score: number;
  isReady: boolean;
  issues: ChannelReadinessIssue[];
  stats: {
    selectedVariants: number;
    variantsWithImages: number;
    galleryImages: number;
    totalStock: number;
  };
}

export interface ShopeeCategoryOption {
  id: string;
  name: string;
  parentId?: string;
  hasChildren?: boolean;
}

export interface ShopeeAttributeOptionValue {
  id: string;
  name: string;
}

export interface ShopeeAttributeOption {
  id: string;
  name: string;
  isMandatory: boolean;
  inputType?: string;
  values: ShopeeAttributeOptionValue[];
}

export interface ShopeeLogisticsOption {
  id: string;
  name: string;
  enabled: boolean;
  feeType?: string;
}

export interface ChannelListingSummary {
  id: string;
  productId: string;
  platform: ChannelPlatform;
  accountId: string;
  title: string;
  status: ChannelListingStatus;
  externalProductId?: string;
  externalUrl?: string;
  auditStatus?: string;
  lastError?: string;
  updatedAt: string;
}

export interface ChannelPublishResult {
  success: boolean;
  listing: ChannelListingSummary;
  readiness: ChannelReadinessResult;
  remoteRequestId?: string;
}
