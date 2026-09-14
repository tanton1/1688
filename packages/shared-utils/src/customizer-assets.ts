import type { CustomizerAsset, CustomizerAssetType, SourceOptionGroup } from "@hub1688/shared-types";

const hash = (value: string): string => {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
};

const inferAssetType = (label: string, category: string): CustomizerAssetType => {
  const value = `${label} ${category}`.toLowerCase();
  if (/mockup|template|preview/.test(value)) return "MOCKUP";
  if (/background|nền/.test(value)) return "BACKGROUND";
  if (/flower|hoa/.test(value)) return "FLOWER";
  if (/font|chữ|typeface/.test(value)) return "FONT";
  if (/shape|hình|circle|square|round/.test(value)) return "SHAPE";
  return "OPTION";
};

/**
 * Convert customizer option images into a stable, reusable asset manifest.
 * The manifest intentionally keeps the source URL; the media mirror replaces
 * `url` after downloading while `originalUrl` remains available for retries.
 */
export const buildCustomizerAssets = (
  groups: SourceOptionGroup[] = [],
  mockupUrl?: string,
  sourceProductId?: string,
  extraUrls: string[] = []
): CustomizerAsset[] => {
  const assets: CustomizerAsset[] = [];
  const seen = new Set<string>();
  const add = (url: unknown, label: string, category: string, sourceGroupId?: string, assetType?: CustomizerAssetType) => {
    if (typeof url !== "string" || !/^https?:\/\//i.test(url.trim())) return;
    const originalUrl = url.trim();
    const key = originalUrl.split("?")[0].toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    assets.push({
      id: `asset_${hash(originalUrl)}`,
      url: originalUrl,
      originalUrl,
      label: label || undefined,
      category: category || undefined,
      sourceProductId,
      sourceGroupId,
      assetType: assetType || inferAssetType(label, category),
      createdAt: new Date().toISOString()
    });
  };
  groups.forEach(group => group.values.forEach(value => add(value.imageUrl, value.label, group.name, group.id)));
  extraUrls.forEach(url => add(url, "Custom asset", "Customizer"));
  add(mockupUrl, "Customizer mockup", "Mockup", undefined, "MOCKUP");
  return assets;
};

