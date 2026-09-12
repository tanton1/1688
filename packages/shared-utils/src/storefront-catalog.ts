import type { WebProductVariant } from "@hub1688/shared-types";

export interface StorefrontVariantOption {
  label: string;
  imageUrl?: string;
}

export interface StorefrontVariantGroup {
  key: string;
  label: string;
  options: StorefrontVariantOption[];
}

/**
 * A source can expose availability without exposing a numeric inventory count
 * (for example Shopify returns available=true and inventory_quantity=null).
 * Keep that distinction explicit so the storefront never turns an available
 * item into a false "sold out" state.
 */
export const isStorefrontVariantAvailable = (variant: WebProductVariant | undefined): boolean => {
  if (!variant || variant.selectedForSale === false || variant.sourceAvailable === false) return false;
  if (variant.inventoryTracked === false) return true;
  return (variant.stockQuantity ?? 0) > 0;
};

/**
 * Returns a quantity ceiling for UI steppers. Untracked inventory uses a
 * bounded order safety limit instead of a fabricated stock quantity.
 */
export const getStorefrontVariantMaxQuantity = (
  variant: WebProductVariant | undefined,
  untrackedLimit = 20
): number => {
  if (!isStorefrontVariantAvailable(variant)) return 0;
  if (variant?.inventoryTracked === false) return Math.max(1, untrackedLimit);
  return Math.max(0, variant?.stockQuantity ?? 0);
};

export const normalizeCatalogKey = (value: string): string => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/đ/gi, "d")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

export const getStorefrontVariantValue = (variant: WebProductVariant | undefined, key: string): string => {
  if (!variant) return "";
  if (key === "colorName") return variant.colorName?.trim() || "";
  if (key === "sizeName") return variant.sizeName?.trim() || "";
  return String(variant.specDetails?.[key] || "").trim();
};

export const buildStorefrontVariantGroups = (variants: WebProductVariant[]): StorefrontVariantGroup[] => {
  const keys: Array<{ key: string; label: string }> = [];
  if (variants.some(variant => variant.colorName?.trim())) keys.push({ key: "colorName", label: "Màu sắc / Mẫu" });
  if (variants.some(variant => variant.sizeName?.trim())) keys.push({ key: "sizeName", label: "Kích thước / Quy cách" });
  const specificationKeys = new Set<string>();
  variants.forEach(variant => Object.keys(variant.specDetails || {}).forEach(key => specificationKeys.add(key)));
  specificationKeys.forEach(key => {
    if (!keys.some(group => group.key === key)) keys.push({ key, label: key });
  });

  return keys.map(group => ({
    ...group,
    options: Array.from(new Map(variants.map(variant => {
      const value = getStorefrontVariantValue(variant, group.key);
      return value
        ? [value, { label: value, imageUrl: group.key === "colorName" ? variant.imageUrl : undefined }]
        : null;
    }).filter(Boolean) as Array<[string, StorefrontVariantOption]>).values())
  }));
};

const matchesOtherSelections = (
  variant: WebProductVariant,
  changedKey: string,
  selectedVariant: WebProductVariant | undefined,
  groups: StorefrontVariantGroup[]
): boolean => groups.every(group => {
  if (group.key === changedKey) return true;
  const selectedValue = getStorefrontVariantValue(selectedVariant, group.key);
  return !selectedValue || getStorefrontVariantValue(variant, group.key) === selectedValue;
});

export const findStorefrontVariant = (
  variants: WebProductVariant[],
  groups: StorefrontVariantGroup[],
  selectedVariant: WebProductVariant | undefined,
  changedKey: string,
  value: string
): WebProductVariant | undefined => variants.find(variant =>
  getStorefrontVariantValue(variant, changedKey) === value &&
  matchesOtherSelections(variant, changedKey, selectedVariant, groups)
) || variants.find(variant => getStorefrontVariantValue(variant, changedKey) === value);

export const isStorefrontVariantOptionAvailable = (
  variants: WebProductVariant[],
  groups: StorefrontVariantGroup[],
  selectedVariant: WebProductVariant | undefined,
  changedKey: string,
  value: string
): boolean => variants.some(variant =>
  getStorefrontVariantValue(variant, changedKey) === value &&
  matchesOtherSelections(variant, changedKey, selectedVariant, groups) &&
  isStorefrontVariantAvailable(variant)
);
