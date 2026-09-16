import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional();
const id = text(128);
const httpUrl = z.string().url().max(2_048).refine(value => /^https?:\/\//i.test(value), "URL phải dùng HTTP hoặc HTTPS");
const imageRef = z.string().max(2_000_000);
const persistedImageRef = z.string().max(2_048).refine(
  value => /^https?:\/\//i.test(value) || value.startsWith("/uploads/products/"),
  "Ảnh phải được tải lên kho lưu trữ trước"
);
const money = z.number().finite().nonnegative().max(10_000_000_000);
const positiveMoney = z.number().finite().positive().max(10_000_000_000);
const sourcePlatform = z.enum(["1688", "TAOBAO", "TMALL", "SHOPEE", "TIKTOK_SHOP", "ALIEXPRESS", "ETSY", "AMAZON", "GENERIC_WEB"]);

const rawSku = z.object({
  skuId: id,
  priceCNY: z.number().finite().positive().max(10_000_000),
  stock: z.number().int().nonnegative().max(1_000_000_000).nullable().optional(),
  available: z.boolean().optional(),
  inventoryTracked: z.boolean().optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  imageUrl: imageRef.optional()
}).passthrough();

const rawProduct = z.object({
  offerId: id,
  sourceUrl: httpUrl.optional(),
  skuMap: z.record(z.string(), rawSku).default({}),
  attributes: z.array(z.unknown()).max(500).optional(),
  descriptionImages: z.array(imageRef).max(500).optional()
}).passthrough();

const normalizedVariant = z.object({
  sourceSkuId: id,
  colorCN: optionalText(300),
  sizeCN: optionalText(300),
  specCN: optionalText(500),
  colorVI: optionalText(300),
  sizeVI: optionalText(300),
  specVI: optionalText(500),
  priceCNY: z.number().finite().positive().max(10_000_000),
  stock: z.number().int().nonnegative().max(1_000_000_000),
  available: z.boolean().optional(),
  inventoryTracked: z.boolean().optional(),
  imageUrl: imageRef.optional()
}).strict();

const sourceOptionValue = z.object({
  id: text(300),
  label: text(500),
  imageUrl: imageRef.optional(),
  sourceValue: z.string().max(500).optional()
}).strict();

const sourceOptionGroup = z.object({
  id: text(300),
  name: text(500),
  kind: z.enum(["VARIATION", "PERSONALIZATION", "ATTRIBUTE", "UNKNOWN"]),
  inputType: z.enum(["SELECT", "ASSET_PICKER", "TEXT", "TEXTAREA", "IMAGE_UPLOAD", "COLOR_SWATCH"]).optional(),
  required: z.boolean().optional(),
  source: z.enum(["NATIVE_SKU", "EXTERNAL_CUSTOMIZER", "DOM", "1688", "AI_SUGGESTION"]).optional(),
  values: z.array(sourceOptionValue).max(500)
}).strict();

const customizationEvidence = z.object({
  hasCustomTextInput: z.boolean().optional(),
  hasImageUpload: z.boolean().optional(),
  hasCustomerAssetPicker: z.boolean().optional(),
  detectedLabels: z.array(z.string().max(500)).max(100).optional(),
  textFields: z.array(z.object({
    id: text(300),
    label: text(500),
    type: z.enum(["TEXT", "TEXTAREA", "IMAGE_UPLOAD"]),
    required: z.boolean().optional(),
    maxLength: z.number().int().positive().max(10_000).optional(),
    accept: z.array(z.string().max(200)).max(20).optional(),
    placeholder: optionalText(1_000),
    helpText: optionalText(1_000)
  }).strict()).max(100).optional(),
  confidence: z.number().finite().min(0).max(1).optional(),
  reviewRequired: z.boolean().optional()
}).strict();

export const importSingleSchema = z.object({
  normalized: z.object({
    sourcePlatform,
    sourceProductId: id,
    sourceUrl: httpUrl,
    supplier: z.object({
      shopId: id,
      shopName: text(300),
      companyName: optionalText(300),
      shopUrl: httpUrl
    }).passthrough(),
    moq: z.number().int().nonnegative().max(1_000_000),
    titleCN: text(1_000),
    cleanedTitleCN: z.string().max(1_000),
    price: z.object({ currency: z.literal("CNY"), min: positiveMoney, max: positiveMoney }).strict(),
    media: z.object({ images: z.array(imageRef).max(500), videoUrl: imageRef.nullable().optional() }).strict(),
    attributes: z.array(z.object({ keyCN: text(500), valueCN: z.string().max(2_000), keyVI: optionalText(500), valueVI: optionalText(2_000) }).strict()).max(500),
    variants: z.array(normalizedVariant).max(5_000),
    optionGroups: z.array(sourceOptionGroup).max(100).optional(),
    customOptionGroups: z.array(sourceOptionGroup).max(100).optional(),
    customImages: z.array(imageRef).max(5_000).optional(),
    personalizationFields: z.array(z.unknown()).max(100).optional(),
    customizationEvidence: customizationEvidence.optional(),
    customizerMockupTemplateUrl: imageRef.optional(),
    description: z.object({ rawHtml: z.string().max(2_000_000).optional(), images: z.array(imageRef).max(500), structuredText: z.unknown().optional() }).strict(),
    rawSnapshot: rawProduct
  }).strict(),
  settings: z.object({
    targetLanguage: z.enum(["vi", "en", "vi_en", "zh"]),
    translationMode: z.enum(["ACCURATE", "ECOMMERCE", "SEO", "REWRITE"]),
    pricingRuleId: optionalText(64),
    categoryName: optionalText(120),
    autoPublish: z.boolean(),
    copyDescriptionImages: z.boolean(),
    selectedSkuIds: z.array(id).max(5_000).optional(),
    resyncExisting: z.boolean().optional()
  }).strict()
}).strict();

export const bulkImportSchema = z.object({
  offerIds: z.array(id).min(1).max(100),
  settings: z.object({
    categoryName: optionalText(120),
    pricingRuleId: optionalText(64),
    translationMode: z.enum(["ACCURATE", "ECOMMERCE", "SEO", "REWRITE"]),
    autoPublish: z.boolean()
  }).strict()
}).strict();

const webVariant = z.object({
  id: optionalText(128).nullable(),
  sourceVariantId: optionalText(128).nullable(),
  sourceSkuId: id,
  colorName: optionalText(300).nullable(),
  colorNameEN: optionalText(300).nullable(),
  sizeName: optionalText(300).nullable(),
  sizeNameEN: optionalText(300).nullable(),
  specDetails: z.record(z.string(), z.string()).optional(),
  costPriceVND: money,
  sourcePrice: z.number().finite().nonnegative().optional(),
  sellingPriceVND: money,
  stockQuantity: z.number().int().nonnegative().max(1_000_000_000),
  imageUrl: imageRef.nullable().optional(),
  inventoryTracked: z.boolean().optional(),
  sourceAvailable: z.boolean(),
  selectedForSale: z.boolean()
}).strict();

export const productUpdateSchema = z.object({
  version: z.number().int().positive().optional(),
  slug: z.string().trim().min(1).max(300).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  titleVI: optionalText(1_000),
  titleEN: z.string().trim().max(1_000).nullable().optional(),
  shortDescVI: z.string().max(10_000).nullable().optional(),
  shortDescEN: z.string().max(10_000).nullable().optional(),
  fullDescVI: z.string().max(2_000_000).nullable().optional(),
  fullDescEN: z.string().max(2_000_000).nullable().optional(),
  displayLanguage: z.enum(["VI", "EN"]).optional(),
  categoryName: optionalText(120).nullable(),
  status: z.enum(["DRAFT", "READY_TO_REVIEW", "PUBLISHED", "ARCHIVED"]).optional(),
  primaryImage: imageRef.nullable().optional(),
  galleryImages: z.array(imageRef).max(500).optional(),
  detailImages: z.array(imageRef).max(500).optional(),
  videoUrl: imageRef.nullable().optional(),
  videoPosterUrl: imageRef.nullable().optional(),
  metaTitle: z.string().max(300).nullable().optional(),
  metaDescription: z.string().max(2_000).nullable().optional(),
  focusKeywords: z.array(z.string().max(200)).max(100).optional(),
  imagesSEO: z.array(z.unknown()).max(1_000).optional(),
  faqs: z.array(z.unknown()).max(200).optional(),
  attributes: z.array(z.unknown()).max(500).optional(),
  priceTiers: z.array(z.unknown()).max(500).optional(),
  seo: z.record(z.string(), z.unknown()).optional(),
  storeSyncHistory: z.array(z.unknown()).max(500).optional(),
  warrantyPolicy: z.string().max(10_000).nullable().optional(),
  shippingPolicy: z.string().max(10_000).nullable().optional(),
  isPersonalized: z.boolean().optional(),
  personalizationFields: z.array(z.unknown()).max(100).optional(),
  customizerMockupTemplateUrl: imageRef.nullable().optional(),
  customizerAssets: z.array(z.object({
    id: id,
    url: imageRef,
    originalUrl: imageRef.nullable().optional(),
    label: optionalText(500).nullable(),
    category: optionalText(200).nullable(),
    sourceProductId: optionalText(128).nullable(),
    sourceGroupId: optionalText(300).nullable(),
    assetType: z.enum(["OPTION", "MOCKUP", "BACKGROUND", "FLOWER", "FONT", "SHAPE"]),
    mimeType: optionalText(120).nullable(),
    width: z.number().int().positive().max(50_000).nullable().optional(),
    height: z.number().int().positive().max(50_000).nullable().optional(),
    createdAt: z.string().datetime().nullable().optional()
  }).strict()).max(5_000).optional(),
  customizerCanvas: z.object({
    width: z.number().positive().max(20_000).nullable().optional(),
    height: z.number().positive().max(20_000).nullable().optional(),
    idea: z.enum(["PHOTO_GIFT", "DESIGN_CHOICE", "NAME_TEXT", "AVATAR", "PET", "MULTI_PERSON", "CUSTOM"]).nullable().optional(),
    scenes: z.array(z.object({
      id: id,
      label: text(120),
      mockupUrl: imageRef.nullable().optional(),
      variantMockupUrls: z.record(z.string(), imageRef.nullable()).optional()
    }).strict()).max(10).optional(),
    printAreas: z.array(z.object({
      id: id,
      label: optionalText(120).nullable(),
      sceneId: id.nullable().optional(),
      xPercent: z.number().min(0).max(100),
      yPercent: z.number().min(0).max(100),
      widthPercent: z.number().positive().max(100),
      heightPercent: z.number().positive().max(100),
      rotationDeg: z.number().min(-360).max(360).nullable().optional(),
      shape: z.enum(["RECT", "CIRCLE"]).nullable().optional(),
      fit: z.enum(["CONTAIN", "COVER"]).nullable().optional(),
      safeZonePercent: z.number().min(0).max(45).nullable().optional(),
      fieldIds: z.array(id).max(100).nullable().optional()
    }).strict()).max(20),
    layers: z.array(z.object({
      id: id,
      label: optionalText(120).nullable(),
      source: z.enum(["FIELD", "VARIANT_DESIGN", "VARIANT_COLOR"]),
      fieldId: id.nullable().optional(),
      printAreaId: id,
      sceneId: id.nullable().optional(),
      zIndex: z.number().int().min(-100).max(100),
      opacity: z.number().min(0).max(1).nullable().optional(),
      blendMode: z.enum(["NORMAL", "MULTIPLY", "SCREEN", "OVERLAY"]).nullable().optional(),
      fit: z.enum(["CONTAIN", "COVER"]).nullable().optional()
    }).strict()).max(200).optional()
  }).strict().superRefine((canvas, ctx) => {
    const sceneIds = new Set((canvas.scenes || []).map(scene => scene.id));
    const areaIds = new Set(canvas.printAreas.map(area => area.id));
    canvas.printAreas.forEach((area, index) => {
      if (area.xPercent + area.widthPercent > 100 || area.yPercent + area.heightPercent > 100) {
        ctx.addIssue({ code: "custom", path: ["printAreas", index], message: "Vùng in phải nằm gọn trong khung mockup" });
      }
      if (area.sceneId && !sceneIds.has(area.sceneId)) {
        ctx.addIssue({ code: "custom", path: ["printAreas", index, "sceneId"], message: "Scene của vùng in không tồn tại" });
      }
    });
    (canvas.layers || []).forEach((layer, index) => {
      if (!areaIds.has(layer.printAreaId)) {
        ctx.addIssue({ code: "custom", path: ["layers", index, "printAreaId"], message: "Layer phải gắn với một vùng in tồn tại" });
      }
      if (layer.sceneId && !sceneIds.has(layer.sceneId)) {
        ctx.addIssue({ code: "custom", path: ["layers", index, "sceneId"], message: "Scene của layer không tồn tại" });
      }
    });
  }).optional(),
  volumeDiscountTiers: z.array(z.unknown()).max(100).optional(),
  giftAddons: z.array(z.unknown()).max(100).optional(),
  occasionTags: z.array(z.string().max(100)).max(100).optional(),
  recipientTags: z.array(z.string().max(100)).max(100).optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().nonnegative().max(1_000_000_000).optional(),
  variants: z.array(webVariant).max(5_000).optional(),
  isTitleLocked: z.boolean().optional(),
  isDescLocked: z.boolean().optional(),
  isImagesLocked: z.boolean().optional(),
  isPriceAutoSync: z.boolean().optional(),
  isStockAutoSync: z.boolean().optional()
});

export const checkoutSchema = z.object({
  customerName: text(150),
  customerPhone: z.string().trim().regex(/^\+?[0-9][0-9 .-]{7,18}$/),
  customerAddress: text(500),
  note: optionalText(1_000),
  paymentMethod: z.enum(["COD", "VIETQR", "BANK_TRANSFER"]),
  items: z.array(z.object({
    productId: id,
    skuCode: id,
    sourceSkuId: id.optional(),
    variantName: text(500),
    quantity: z.number().int().min(1).max(100),
    sellingPriceVND: money,
    image: imageRef.optional(),
    customizationData: z.record(z.string(), z.unknown()).optional(),
    customizedPreviewUrl: persistedImageRef.optional(),
    customizationId: z.string().uuid().optional(),
    customizationSchemaVersion: z.number().int().positive().max(10_000).optional(),
    giftAddonsSelected: z.array(id).max(50).optional()
  }).strict()).min(1).max(100),
  giftAddonsSelected: z.array(id).max(50).optional(),
  discountCode: optionalText(40),
  discountAmountVND: money.optional()
}).strict();

export const storefrontCustomizationUploadSchema = z.object({
  dataUrl: z.string().max(4_000_000).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=\r\n]+$/),
  fileName: z.string().trim().min(1).max(180),
  guestSessionId: z.string().uuid(),
  width: z.number().int().positive().max(20_000),
  height: z.number().int().positive().max(20_000)
}).strict();

export const trackOrderSchema = z.object({
  orderNumber: z.string().trim().min(6).max(100),
  customerPhone: z.string().trim().regex(/^\+?[0-9][0-9 .-]{7,18}$/)
}).strict();

const storefrontDiscountRuleSchema = z.object({
  code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/),
  type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]),
  value: money,
  maxDiscountVND: money.optional(),
  label: optionalText(120),
  active: z.boolean()
}).strict().superRefine((rule, context) => {
  if (rule.type === "PERCENT" && (rule.value <= 0 || rule.value > 100)) {
    context.addIssue({ code: "custom", path: ["value"], message: "Phần trăm giảm phải lớn hơn 0 và không quá 100" });
  }
  if (rule.type === "FIXED" && rule.value <= 0) {
    context.addIssue({ code: "custom", path: ["value"], message: "Số tiền giảm phải lớn hơn 0" });
  }
});

export const storeSettingsSchema = z.object({
  storeName: optionalText(150), tagline: optionalText(300), hotline: optionalText(30),
  zaloUrl: z.union([z.string().url().max(2_048), z.literal("")]).optional(), address: optionalText(500),
  freeShipThresholdVND: money.optional(), shippingFeeVND: money.optional(),
  discountRules: z.array(storefrontDiscountRuleSchema).max(50).optional(),
  bankName: optionalText(100), bankAccountNo: optionalText(50),
  bankAccountName: optionalText(150), bannerTitle: optionalText(300), bannerSubtitle: optionalText(1_000),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional()
}).strict().superRefine((config, context) => {
  if (!config.discountRules) return;
  const normalizedCodes = config.discountRules.map(rule => rule.code.toUpperCase());
  if (new Set(normalizedCodes).size !== normalizedCodes.length) {
    context.addIssue({ code: "custom", path: ["discountRules"], message: "Mã ưu đãi không được trùng nhau" });
  }
});

export const wooCommerceSyncSchema = z.object({ productId: id }).strict();
export const shopifySyncSchema = z.object({ productId: id }).strict();

const templateContentSchema = z.object({
  titlePrefix: z.string().max(200).optional(),
  titleSuffix: z.string().max(200).optional(),
  titleFormula: z.string().max(1_000).optional(),
  shortDescVI: z.string().max(10_000).optional(),
  shortDescEN: z.string().max(10_000).optional(),
  fullDescVI: z.string().max(2_000_000).optional(),
  fullDescEN: z.string().max(2_000_000).optional(),
  attributes: z.array(z.object({
    key: text(500),
    value: z.string().max(2_000)
  }).strict()).max(500).optional(),
  warrantyPolicy: z.string().max(10_000).nullable().optional(),
  shippingPolicy: z.string().max(10_000).nullable().optional(),
  focusKeywords: z.array(z.string().trim().min(1).max(200)).max(100).optional(),
  faqs: z.array(z.object({
    question: text(1_000),
    answer: text(10_000)
  }).strict()).max(200).optional()
}).strict();

const templateVariationSchema = z.object({
  options: z.array(z.object({
    name: text(300),
    values: z.array(z.string().trim().min(1).max(300)).max(500)
  }).strict()).max(20),
  defaultStock: z.number().int().nonnegative().max(1_000_000_000).optional(),
  skuPattern: z.string().trim().max(500).optional(),
  predefinedVariants: z.array(z.object({
    name: text(500),
    option1: optionalText(300),
    option2: optionalText(300),
    priceAdjustmentVND: z.number().finite().min(-10_000_000_000).max(10_000_000_000).optional(),
    stock: z.number().int().nonnegative().max(1_000_000_000).optional()
  }).strict()).max(5_000).optional()
}).strict();

const editableTemplateFields = {
  id: optionalText(128),
  name: text(300),
  description: z.string().max(2_000).optional(),
  categoryName: text(300),
  targetPlatform: z.enum(["ALL", "SHOPIFY", "WOOCOMMERCE", "SHOPEE", "TIKTOK_SHOP"]).optional(),
  isDefault: z.boolean().optional(),
  content: templateContentSchema.optional(),
  variation: templateVariationSchema.optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
};

export const templateCreateSchema = z.object(editableTemplateFields).strict();
export const templateUpdateSchema = z.object(editableTemplateFields)
  .partial()
  .strict()
  .refine(value => Object.keys(value).length > 0, "Cần ít nhất một trường để cập nhật");
export const telegramTestSchema = z.object({}).strict();
export const telegramAlertSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("PRICE_CHANGE"),
    data: z.object({
      productTitle: text(1_000), skuCode: id,
      oldPriceCNY: positiveMoney, newPriceCNY: positiveMoney,
      oldPriceVND: positiveMoney, newPriceVND: positiveMoney,
      sourceUrl: httpUrl.optional()
    }).strict()
  }).strict(),
  z.object({
    type: z.literal("STOCK"),
    data: z.object({
      productTitle: text(1_000), skuCode: id, variantName: text(500),
      remainingStock: z.number().int().nonnegative().max(1_000_000_000),
      sourceUrl: httpUrl.optional()
    }).strict()
  }).strict(),
  z.object({
    type: z.literal("CUSTOM"),
    data: z.object({ message: text(4_000) }).strict()
  }).strict()
]);
export const aiGenerateCopySchema = z.object({
  productId: id,
  style: z.enum(["AIDA", "PAS", "STORYTELLING", "SOCIAL_ADS"]).optional(),
  language: z.enum(["VI", "EN"]).optional(),
  focusKeyword: optionalText(160),
  secondaryKeywords: z.array(text(160)).max(12).optional(),
  tone: z.enum(["TRUSTWORTHY", "CONVERSION", "PREMIUM", "FRIENDLY"]).optional(),
  model: optionalText(100)
}).strict();
export const aiGenerateTemplateSchema = z.object({
  name: text(300),
  categoryName: text(300),
  targetPlatform: z.enum(["ALL", "SHOPIFY", "WOOCOMMERCE", "SHOPEE", "TIKTOK_SHOP"]).optional(),
  brief: optionalText(2_000),
  model: optionalText(100)
}).strict();
export const aiTranslateImageSchema = z.object({ imageUrl: httpUrl, model: optionalText(100) }).strict();
export const aiInpaintImageSchema = z.object({
  imageUrl: httpUrl,
  maskDataUrl: z.string().max(5_000_000).optional(),
  rectangles: z.array(z.object({
    x: z.number().finite().nonnegative(),
    y: z.number().finite().nonnegative(),
    width: z.number().finite().positive(),
    height: z.number().finite().positive()
  }).strict()).max(500).optional()
}).strict();
export const visualSourcingSchema = z.object({
  productId: id.optional(),
  imageUrl: httpUrl.optional(),
  title: optionalText(1_000),
  currentSellingPriceVND: money.optional()
}).strict().superRefine((value, context) => {
  if (!value.productId && (!value.imageUrl || !value.currentSellingPriceVND)) {
    context.addIssue({ code: "custom", message: "Cần productId hoặc imageUrl kèm giá bán" });
  }
});
export const exportCsvSchema = z.object({ productIds: z.array(id).min(1).max(500), platform: z.enum(["SHOPEE", "TIKTOK_SHOP", "SHOPIFY", "WOOCOMMERCE", "HARAVAN"]) }).strict();
export const shopeeAppConfigSchema = z.object({
  id: id.optional(),
  name: optionalText(100),
  region: z.string().trim().toUpperCase().regex(/^[A-Z]{2,5}$/).optional(),
  partnerId: z.string().trim().regex(/^\d{1,20}$/, "Partner ID phải là dãy số"),
  partnerKey: z.string().trim().min(8).max(500).optional()
}).strict();
export const shopeeAuthorizationSchema = z.object({ appConfigId: id.optional() }).strict();
const shopeeAttributeValueSchema = z.object({
  attributeId: id,
  valueId: optionalText(128),
  valueName: optionalText(500)
}).strict().refine(value => Boolean(value.valueId || value.valueName), "Thuộc tính cần valueId hoặc valueName");
const shopeeLogisticsSchema = z.object({
  logisticId: id,
  enabled: z.boolean(),
  shippingFeeVND: money.optional(),
  freeShipping: z.boolean().optional()
}).strict();
export const shopeeListingDraftSchema = z.object({
  productId: id,
  accountId: id.optional(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(30_000),
  categoryId: z.string().trim().max(128),
  categoryPath: optionalText(1_000),
  brandId: optionalText(128),
  brandName: optionalText(500),
  weightKg: z.number().finite().nonnegative().max(1_000),
  dimensions: z.object({
    lengthCm: z.number().finite().positive().max(10_000).optional(),
    widthCm: z.number().finite().positive().max(10_000).optional(),
    heightCm: z.number().finite().positive().max(10_000).optional()
  }).strict().optional(),
  attributes: z.array(shopeeAttributeValueSchema).max(500),
  requiredAttributeIds: z.array(id).max(500).optional(),
  logistics: z.array(shopeeLogisticsSchema).max(100),
  selectedVariantIds: z.array(id).max(1_000).optional(),
  primaryVariationName: optionalText(100),
  secondaryVariationName: optionalText(100),
  stockBuffer: z.number().int().nonnegative().max(1_000_000).optional(),
  priceAdjustmentPercent: z.number().finite().min(-90).max(1_000).optional()
}).strict();
export const checkExistingSchema = z.object({ sourceProductIds: z.array(id).min(1).max(500) }).strict();
export const triggerDiffSchema = z.object({ rawLatestProduct: rawProduct }).strict();
export const resolveDiffSchema = z.object({ webProductId: id, action: z.enum(["APPLY", "IGNORE"]) }).strict();
export const lockUpdateSchema = z.object({ isTitleLocked: z.boolean().optional(), isDescLocked: z.boolean().optional(), isImagesLocked: z.boolean().optional(), isPriceAutoSync: z.boolean().optional(), isStockAutoSync: z.boolean().optional() }).strict();
export const orderStatusSchema = z.object({ status: z.enum(["PENDING_SOURCING", "ORDERED_1688", "IN_TRANSIT", "COMPLETED", "CANCELLED"]), note: optionalText(2_000) }).strict();
export const orderWebhookSchema = z.object({
  orderNumber: optionalText(100),
  platform: z.enum(["WOOCOMMERCE", "SHOPIFY", "MANUAL", "STOREFRONT"]),
  customerName: text(150),
  customerPhone: optionalText(30),
  customerAddress: optionalText(500),
  items: z.array(z.object({
    skuCode: id, variantName: text(500), quantity: z.number().int().min(1).max(10_000),
    sellingPriceVND: money, costVND: money.optional(), source1688Url: httpUrl.optional(),
    sourceProductId: optionalText(128), sourceSkuId: optionalText(128), image: imageRef.optional()
  }).passthrough()).min(1).max(1_000),
  totalAmountVND: money.optional(), totalCostVND: money.optional(), estimatedProfitVND: money.optional(),
  status: z.enum(["PENDING_SOURCING", "ORDERED_1688", "IN_TRANSIT", "COMPLETED", "CANCELLED"]).optional(),
  paymentMethod: z.enum(["COD", "VIETQR", "BANK_TRANSFER"]).optional(),
  paymentStatus: z.enum(["PENDING", "PAID"]).optional(), note: optionalText(2_000)
}).strict();
