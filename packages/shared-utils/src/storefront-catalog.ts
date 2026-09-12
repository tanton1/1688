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
  (variant.stockQuantity ?? 0) > 0
);
