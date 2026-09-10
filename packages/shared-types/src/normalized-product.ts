import { Raw1688Product, Raw1688Shop } from "./1688-raw.js";

export type TranslationMode = "ACCURATE" | "ECOMMERCE" | "SEO" | "REWRITE";

export interface ImportSettings {
  targetLanguage: "vi" | "en" | "vi_en" | "zh";
  translationMode: TranslationMode;
  pricingRuleId?: string;
  categoryName?: string;
  autoPublish: boolean;
  copyDescriptionImages: boolean;
  selectedSkuIds?: string[]; // If user chooses specific variants in Sidepanel
}

export interface NormalizedVariant {
  sourceSkuId: string;
  colorCN?: string;
  sizeCN?: string;
  specCN?: string;
  colorVI?: string;
  sizeVI?: string;
  specVI?: string;
  priceCNY: number;
  stock: number;
  imageUrl?: string;
}

export type SourcePlatform = "1688" | "TAOBAO" | "TMALL" | "SHOPEE" | "TIKTOK_SHOP" | "ALIEXPRESS" | "GENERIC_WEB";

export interface Normalized1688Product {
  sourcePlatform: SourcePlatform;
  sourceProductId: string;
  sourceUrl: string;
  supplier: Raw1688Shop;
  moq: number;
  titleCN: string;
  cleanedTitleCN: string; // Stripped spam keywords
  price: {
    currency: "CNY";
    min: number;
    max: number;
  };
  media: {
    images: string[];
    videoUrl?: string | null;
  };
  attributes: Array<{
    keyCN: string;
    valueCN: string;
    keyVI?: string;
    valueVI?: string;
  }>;
  variants: NormalizedVariant[];
  description: {
    rawHtml?: string;
    images: string[];
    structuredText?: {
      intro?: string;
      highlights?: string[];
      material?: string;
      sizeGuide?: string;
      careInstructions?: string;
    };
  };
  rawSnapshot: Raw1688Product;
}

export interface ImportProductPayload {
  normalized: Normalized1688Product;
  settings: ImportSettings;
}
