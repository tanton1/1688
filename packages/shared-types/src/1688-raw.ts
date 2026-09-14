import { CustomizationEvidence, SourceCurrency, SourceOptionGroup, SourcePlatform } from "./normalized-product.js";

export interface Raw1688Shop {
  shopId: string;
  shopName: string;
  companyName?: string;
  shopUrl: string;
  memberId?: string;
  ratingScore?: number;
  tpYear?: number; // Chengxintong year
  province?: string;
  city?: string;
}

export interface Raw1688PriceTier {
  minQuantity: number;
  price: number;
}

export interface Raw1688Attribute {
  nameCN: string;
  valueCN: string;
}

export interface Raw1688SkuPropValue {
  valueId: string;
  valueCN: string;
  imageUrl?: string;
}

export interface Raw1688SkuProp {
  propId: string;
  propNameCN: string; // e.g. "颜色", "尺码", "规格"
  values: Raw1688SkuPropValue[];
}

export interface Raw1688SkuItem {
  skuId: string;
  specId?: string;
  propPath?: string; // e.g. "0:0;1:1"
  attributes: Record<string, string>; // e.g. { "颜色": "黑色", "尺码": "M" }
  priceCNY: number;
  retailPriceCNY?: number;
  stock: number;
  /** True when the source exposes a numeric inventory quantity. */
  inventoryTracked?: boolean;
  /** Availability flag exposed by sources such as Shopify. */
  available?: boolean;
  imageUrl?: string;
}

export interface Raw1688Product {
  offerId: string;
  sourceUrl: string;
  title: string;
  sourcePlatform?: SourcePlatform;
  originalCurrency?: SourceCurrency;
  originalPriceMin?: number;
  originalPriceMax?: number;
  categoryId?: string;
  categoryPath?: string[];
  shop: Raw1688Shop;
  moq: number;
  prices: {
    minPriceCNY: number;
    maxPriceCNY: number;
    currency: "CNY";
    priceTiers?: Raw1688PriceTier[];
  };
  images: string[];
  videoUrl?: string | null;
  attributes: Raw1688Attribute[];
  skuProps: Raw1688SkuProp[];
  skuMap: Record<string, Raw1688SkuItem>; // key = combination key or skuId
  descriptionHtml?: string;
  descriptionImages?: string[];
  /** Native variation controls observed on marketplaces such as Etsy/Amazon.
   * Informational metadata; kept separate from verified SKU rows.
   */
  optionGroups?: SourceOptionGroup[];
  /** External customizer metadata; never treated as native SKU axes. */
  customOptionGroups?: SourceOptionGroup[];
  /** Full artwork URLs discovered in an external customizer payload. */
  customImages?: string[];
  customizationEvidence?: CustomizationEvidence;
  customizerMockupTemplateUrl?: string;
  extractedAt: string; // ISO date string
}

export interface Raw1688SearchItem {
  offerId: string;
  title: string;
  priceCNY: number;
  thumbUrl: string;
  detailUrl: string;
  companyName?: string;
  repurchaseRate?: string;
  soldQuantity?: number;
}
