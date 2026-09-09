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
  sizeName?: string;
  specDetails?: Record<string, string>;
  costPriceVND: number;
  sellingPriceVND: number;
  stockQuantity: number;
  imageUrl?: string;
  sourceAvailable: boolean;
  selectedForSale: boolean;
}

export interface WebProduct {
  id?: string;
  slug: string;
  skuCode: string;
  titleVI: string;
  titleVariants?: ProductTitleVariants;
  shortDescVI?: string;
  fullDescVI?: string;
  categoryName: string;
  primaryImage: string;
  galleryImages: string[];
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
