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
