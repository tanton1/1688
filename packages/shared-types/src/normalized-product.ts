import { Raw1688Product, Raw1688Shop } from "./1688-raw.js";
import type { PersonalizationField } from "./web-product.js";

export type TranslationMode = "ACCURATE" | "ECOMMERCE" | "SEO" | "REWRITE";

export interface ImportSettings {
  targetLanguage: "vi" | "en" | "vi_en" | "zh";
  translationMode: TranslationMode;
  pricingRuleId?: string;
  categoryName?: string;
  autoPublish: boolean;
  copyDescriptionImages: boolean;
  selectedSkuIds?: string[]; // If user chooses specific variants in Sidepanel
  /** Explicitly update an existing product with the same sourceProductId. */
  resyncExisting?: boolean;
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
  /** Source availability can be known even when inventory is not numerically tracked. */
  available?: boolean;
  inventoryTracked?: boolean;
  imageUrl?: string;
}

/**
 * Source option metadata is deliberately separate from the sellable SKU matrix.
 * An option rendered by a customizer can be an asset/text input and must not be
 * multiplied into synthetic variants.
 */
export type SourceOptionKind = "VARIATION" | "PERSONALIZATION" | "ATTRIBUTE" | "UNKNOWN";
export type SourceOptionInputType = "SELECT" | "ASSET_PICKER" | "TEXT" | "TEXTAREA" | "IMAGE_UPLOAD" | "COLOR_SWATCH";

export interface SourceOptionValue {
  id: string;
  label: string;
  imageUrl?: string;
  sourceValue?: string;
}

export interface SourceOptionGroup {
  id: string;
  name: string;
  kind: SourceOptionKind;
  inputType?: SourceOptionInputType;
  required?: boolean;
  source?: "NATIVE_SKU" | "EXTERNAL_CUSTOMIZER" | "DOM" | "1688" | "AI_SUGGESTION";
  values: SourceOptionValue[];
}

export interface CustomizationTextFieldHint {
  id: string;
  label: string;
  type: "TEXT" | "TEXTAREA" | "IMAGE_UPLOAD";
  required?: boolean;
  maxLength?: number;
  accept?: string[];
  /** Optional copy captured from the source customizer input. */
  placeholder?: string;
  /** Optional helper copy captured from the source customizer input. */
  helpText?: string;
}

export interface CustomizationEvidence {
  hasCustomTextInput?: boolean;
  hasImageUpload?: boolean;
  hasCustomerAssetPicker?: boolean;
  detectedLabels?: string[];
  textFields?: CustomizationTextFieldHint[];
  confidence?: number;
  reviewRequired?: boolean;
}

export type SourcePlatform = "1688" | "TAOBAO" | "TMALL" | "SHOPEE" | "TIKTOK_SHOP" | "ALIEXPRESS" | "ETSY" | "AMAZON" | "GENERIC_WEB";
export type SourceCurrency =
  | "CNY" | "USD" | "VND" | "EUR" | "GBP" | "CAD" | "AUD" | "JPY" | "INR"
  | "BRL" | "MXN" | "SEK" | "PLN" | "SGD" | "AED" | "SAR" | "TRY";

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
  /** Native SKU/variation groups only. */
  optionGroups?: SourceOptionGroup[];
  /** Options owned by an external/custom personalization UI. */
  customOptionGroups?: SourceOptionGroup[];
  customImages?: string[];
  personalizationFields?: PersonalizationField[];
  customizationEvidence?: CustomizationEvidence;
  customizerMockupTemplateUrl?: string;
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
