import React, { useState, useEffect, useMemo } from "react";
import DOMPurify from "dompurify";
import { WebProduct, WebProductVariant } from "@hub1688/shared-types";
import {
  buildStorefrontVariantGroups,
  findStorefrontVariant,
  getStorefrontVariantValue,
  getStorefrontVariantMaxQuantity,
  isStorefrontVariantAvailable,
  isStorefrontVariantOptionAvailable,
  getPersonalizationImageUrl,
  isPersonalizationFieldVisible,
  validatePersonalizationValues,
  calculateStorefrontUnitPrice
} from "@hub1688/shared-utils";
import { AdminApi } from "../services/api";
import { LiveCustomizerEngine } from "./LiveCustomizerEngine";
import { VariantMockupPreview, getVariantVisual } from "./VariantMockupPreview";
import { createCustomizationId, getCustomizationGuestSessionId } from "./personalizationImage";
import { useAccessibleDialog } from "../hooks/useAccessibleDialog";
import {
  X,
  ShoppingBag,
  Zap,
  Check,
  Truck,
  ShieldCheck,
  Video,
  Sparkles,
  Gift,
  Star,
  Layers,
  Maximize2,
  ImageOff,
  Eye,
  ChevronDown,
  CheckCircle2
} from "lucide-react";

interface StoreProductDetailModalProps {
  product: WebProduct;
  fullPage?: boolean;
  demoMode?: boolean;
  relatedProducts?: WebProduct[];
  onSelectRelated?: (product: WebProduct) => void;
  onClose: () => void;
  onAddToCart: (
    variant: WebProductVariant,
    quantity: number,
    product: WebProduct,
    customizationData?: Record<string, any>,
    customizedPreviewUrl?: string,
    giftAddonsSelected?: string[],
    customizationId?: string,
    customizationSchemaVersion?: number
  ) => void;
  onBuyNow: (
    variant: WebProductVariant,
    quantity: number,
    product: WebProduct,
    customizationData?: Record<string, any>,
    customizedPreviewUrl?: string,
    giftAddonsSelected?: string[],
    customizationId?: string,
    customizationSchemaVersion?: number
  ) => void;
}

export const StoreProductDetailModal: React.FC<StoreProductDetailModalProps> = ({
  product,
  fullPage = false,
  demoMode = false,
  relatedProducts = [],
  onSelectRelated,
  onClose,
  onAddToCart,
  onBuyNow
}) => {
  const dialogRef = useAccessibleDialog<HTMLDivElement>(!fullPage, onClose);

  const validVariants = (product.variants || []).filter(v => v.selectedForSale !== false);
  const [selectedVariant, setSelectedVariant] = useState<WebProductVariant>(validVariants.find(isStorefrontVariantAvailable) || validVariants[0] || product.variants[0]);
  const [activeMedia, setActiveMedia] = useState<{ type: "image" | "video"; url: string }>({
    type: "image",
    url: product.primaryImage || ""
  });
  // Keep the mockup as the primary view after a variant is selected. Users can
  // still switch to the original source image from the thumbnail strip.
  const [mediaView, setMediaView] = useState<"mockup" | "source">("source");
  const [variantPreviewActive, setVariantPreviewActive] = useState(validVariants.length <= 1);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"desc" | "specs" | "reviews">("desc");
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [mediaLoadError, setMediaLoadError] = useState(false);
  const [showMobilePurchaseBar, setShowMobilePurchaseBar] = useState(false);
  const [showCustomizationReview, setShowCustomizationReview] = useState(false);
  const purchaseActionsRef = React.useRef<HTMLDivElement>(null);
  const primaryPreviewRef = React.useRef<HTMLDivElement>(null);
  const lightboxRef = useAccessibleDialog<HTMLDivElement>(isLightboxOpen, () => setIsLightboxOpen(false));

  useEffect(() => {
    if (!fullPage) return;
    const previousTitle = document.title;
    document.title = `${product.titleVI} — Macorner`;
    window.scrollTo({ top: 0, behavior: "auto" });
    return () => { document.title = previousTitle; };
  }, [fullPage, product.titleVI]);

  useEffect(() => setMediaLoadError(false), [activeMedia.url, activeMedia.type, mediaView]);

  useEffect(() => {
    const target = purchaseActionsRef.current;
    if (!target) return;
    let animationFrame = 0;
    const update = () => setShowMobilePurchaseBar(target.getBoundingClientRect().bottom < 0);
    const scheduleUpdate = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(update);
    };
    const observer = typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(scheduleUpdate, { threshold: 0 });
    observer?.observe(target);
    document.addEventListener("scroll", scheduleUpdate, true);
    window.addEventListener("resize", scheduleUpdate);
    update();
    return () => {
      window.cancelAnimationFrame(animationFrame);
      observer?.disconnect();
      document.removeEventListener("scroll", scheduleUpdate, true);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [product.id]);

  // Customization & Add-ons state
  const [customizationValues, setCustomizationValues] = useState<Record<string, any>>({});
  const [renderedPreviewUrl, setRenderedPreviewUrl] = useState<string | undefined>(undefined);
  const [persistedPreviewUrl, setPersistedPreviewUrl] = useState<string | undefined>(undefined);
  const [customizationId, setCustomizationId] = useState(createCustomizationId);
  const [showCustomizationValidation, setShowCustomizationValidation] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");
  const [isPreparingPurchase, setIsPreparingPurchase] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState<string[]>(() => {
    return (product.giftAddons || []).filter(a => a.defaultChecked).map(a => a.id);
  });

  // Initialize defaults on product load
  useEffect(() => {
    if (product) {
      const firstVar = validVariants.find(isStorefrontVariantAvailable) || validVariants[0] || product.variants[0];
      setSelectedVariant(firstVar);
      setActiveMedia({
        type: "image",
        url: firstVar?.imageUrl || product.primaryImage || ""
      });
      const supportsMockup = Boolean(
        product.isPersonalized ||
        product.customizerMockupTemplateUrl ||
        Object.keys(product.seo?.variantMockupVisuals || {}).length > 0 ||
        product.customizerCanvas?.scenes?.length ||
        product.customizerCanvas?.printAreas?.length
      );
      setMediaView(supportsMockup ? "mockup" : "source");
      setVariantPreviewActive(validVariants.length <= 1);
      setQuantity(1);

      // Default customization values or the guest's saved draft for this exact SKU.
      const initialCustom: Record<string, any> = {};
      (product.personalizationFields || []).forEach(f => {
        if (f.defaultValue !== undefined) {
          initialCustom[f.id] = f.defaultValue;
        }
      });
      const draftKey = `hub1688_customization_draft:${product.id || product.slug}:${firstVar?.sourceSkuId || "default"}`;
      const sharedDraftKey = `hub1688_customization_draft:${product.id || product.slug}:shared`;
      try {
        const draft = JSON.parse(localStorage.getItem(draftKey) || localStorage.getItem(sharedDraftKey) || "null");
        setCustomizationValues(draft?.values && typeof draft.values === "object" ? { ...initialCustom, ...draft.values } : initialCustom);
        setCustomizationId(typeof draft?.customizationId === "string" ? draft.customizationId : createCustomizationId());
      } catch {
        setCustomizationValues(initialCustom);
        setCustomizationId(createCustomizationId());
      }
      setRenderedPreviewUrl(undefined);
      setPersistedPreviewUrl(undefined);
      setShowCustomizationValidation(false);
      setShowCustomizationReview(false);
      setPurchaseError("");
      setSelectedAddons((product.giftAddons || []).filter(a => a.defaultChecked).map(a => a.id));
    }
  }, [product]);

  const getVariantDisplayName = (v?: WebProductVariant): string => {
    if (!v) return "";
    const parts = [v.colorName, v.sizeName].filter(Boolean);
    return parts.length > 0 ? parts.join(" - ") : (v.sourceSkuId || "Phân loại chuẩn");
  };

  const variantGroups = useMemo(() => buildStorefrontVariantGroups(validVariants), [validVariants]);

  const selectVariantOption = (field: string, value: string) => {
    const next = findStorefrontVariant(validVariants, variantGroups, selectedVariant, field, value);
    if (next) handleSelectVariant(next);
  };

  const descriptionHtml = useMemo(() => DOMPurify.sanitize(
    product.fullDescVI || product.shortDescVI || "Chưa có mô tả chi tiết cho sản phẩm này.",
    { ALLOWED_TAGS: ["h2", "h3", "h4", "p", "ul", "ol", "li", "strong", "em", "br", "a"], ALLOWED_ATTR: ["href", "target", "rel"] }
  ), [product.fullDescVI, product.shortDescVI]);

  const handleSelectVariant = (variant: WebProductVariant) => {
    if (product.isPersonalized && selectedVariant) {
      const currentKey = `hub1688_customization_draft:${product.id || product.slug}:${selectedVariant.sourceSkuId || "default"}`;
      const sharedKey = `hub1688_customization_draft:${product.id || product.slug}:shared`;
      try {
        const draft = JSON.stringify({ customizationId, values: customizationValues, updatedAt: new Date().toISOString() });
        localStorage.setItem(currentKey, draft);
        localStorage.setItem(sharedKey, draft);
      } catch {
        // Storage may be disabled; keep the active customization in memory.
      }
    }
    setSelectedVariant(variant);
    setQuantity(1);
    setVariantPreviewActive(true);
    if (variant.imageUrl) {
      setActiveMedia({ type: "image", url: variant.imageUrl });
    }
    if (
      product.isPersonalized ||
      product.customizerMockupTemplateUrl ||
      Object.keys(product.seo?.variantMockupVisuals || {}).length > 0 ||
      product.customizerCanvas?.scenes?.length ||
      product.customizerCanvas?.printAreas?.length
    ) {
      setMediaView("mockup");
    }
    if (product.isPersonalized) {
      const nextKey = `hub1688_customization_draft:${product.id || product.slug}:${variant.sourceSkuId || "default"}`;
      try {
        // Keep the active answers when customers compare colors/designs. A
        // per-SKU copy is still written so the draft can be restored later.
        localStorage.setItem(nextKey, JSON.stringify({ customizationId, values: customizationValues, updatedAt: new Date().toISOString() }));
      } catch {
        // Storage may be disabled; the in-memory answers are still preserved.
      }
      setRenderedPreviewUrl(undefined);
      setPersistedPreviewUrl(undefined);
      setPurchaseError("");
    }
  };

  const basePrice = selectedVariant?.sellingPriceVND || product.minPriceVND || 0;

  // Check volume discount
  const activeDiscountTier = useMemo(() => {
    const tiers = product.volumeDiscountTiers || [];
    return [...tiers].reverse().find(t => quantity >= t.minQty);
  }, [product.volumeDiscountTiers, quantity]);

  const discountPercent = activeDiscountTier?.discountPercent || 0;
  const currentPrice = calculateStorefrontUnitPrice(product, selectedVariant, quantity, customizationValues, selectedAddons);
  const maxQuantity = getStorefrontVariantMaxQuantity(selectedVariant);
  const isOutOfStock = !isStorefrontVariantAvailable(selectedVariant);
  const personalizationNeedsConfiguration = Boolean(product.isPersonalized && !(product.personalizationFields || []).length);
  const hasReviews = Number(product.reviewCount) > 0 && Number(product.rating) > 0;
  const hasMockup = Boolean(
    product.isPersonalized ||
    product.customizerMockupTemplateUrl ||
    Object.keys(product.seo?.variantMockupVisuals || {}).length > 0 ||
    product.customizerCanvas?.scenes?.length ||
    product.customizerCanvas?.printAreas?.length
  );
  const selectedVariantVisual = useMemo(
    () => getVariantVisual(product, variantPreviewActive ? selectedVariant : undefined),
    [product, selectedVariant, variantPreviewActive]
  );

  // Add-ons total calculation
  const addonsTotal = (product.giftAddons || [])
    .filter(a => selectedAddons.includes(a.id))
    .reduce((sum, a) => sum + a.priceVND, 0);

  const toggleAddon = (addonId: string) => {
    setSelectedAddons(prev =>
      prev.includes(addonId) ? prev.filter(id => id !== addonId) : [...prev, addonId]
    );
  };

  // All unique images
  const allImages = Array.from(
    new Set([
      product.primaryImage,
      ...(product.galleryImages || []),
      ...(product.variants || []).map(v => v.imageUrl).filter(Boolean)
    ])
  ).filter(Boolean) as string[];

  const handleCustomizerChange = (newValues: Record<string, any>, previewUrl?: string) => {
    setCustomizationValues(newValues);
    if (!previewUrl) setPersistedPreviewUrl(undefined);
    if (previewUrl) {
      setRenderedPreviewUrl(previewUrl);
    }
    if (selectedVariant) {
      const draftKey = `hub1688_customization_draft:${product.id || product.slug}:${selectedVariant.sourceSkuId || "default"}`;
      const sharedDraftKey = `hub1688_customization_draft:${product.id || product.slug}:shared`;
      try {
        const draft = JSON.stringify({ customizationId, values: newValues, updatedAt: new Date().toISOString() });
        localStorage.setItem(draftKey, draft);
        localStorage.setItem(sharedDraftKey, draft);
      } catch {
        // Storage may be disabled; personalization still works for the active page.
      }
    }
  };

  const customizationValidation = useMemo(
    () => validatePersonalizationValues(product.personalizationFields || [], customizationValues),
    [product.personalizationFields, customizationValues]
  );

  const visiblePersonalizationFields = useMemo(
    () => (product.personalizationFields || []).filter(field => isPersonalizationFieldVisible(field, customizationValues)),
    [product.personalizationFields, customizationValues]
  );

  type CustomizationSummaryItem = { id: string; label: string; value: string; imageUrl?: string };
  const customizationSummaryItems = useMemo<CustomizationSummaryItem[]>(() => visiblePersonalizationFields.flatMap<CustomizationSummaryItem>(field => {
    const value = customizationValues[field.id];
    const hasValue = field.type === "CHECKBOX"
      ? value === true
      : Array.isArray(value)
        ? value.length > 0
        : value !== undefined && value !== null && String(value).trim() !== "";
    if (!hasValue) return [];
    if (field.type === "IMAGE_UPLOAD") {
      const imageUrl = getPersonalizationImageUrl(value);
      const fileName = value && typeof value === "object" ? value.fileName : undefined;
      return [{ id: field.id, label: field.label, value: fileName || "Ảnh khách đã tải lên", imageUrl }];
    }
    if (field.type === "REPEAT_GROUP" && Array.isArray(value)) {
      return [{ id: field.id, label: field.label, value: `${value.length} ${field.repeat?.itemLabel?.toLowerCase() || "mục"}`, imageUrl: undefined }];
    }
    const option = field.options?.find(candidate => String(candidate.value) === String(value));
    return [{ id: field.id, label: field.label, value: field.type === "CHECKBOX" ? "Đã xác nhận" : option?.label || String(value), imageUrl: option?.thumbnail || option?.previewAssetUrl }];
  }), [visiblePersonalizationFields, customizationValues]);

  const openLargePreview = () => {
    setMediaView("mockup");
    primaryPreviewRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const resolvePersistentPreview = async (): Promise<string | undefined> => {
    if (!renderedPreviewUrl?.startsWith("data:")) return renderedPreviewUrl;
    // Demo catalogs have no persistence backend. Keep the customer's field data
    // in the cart, but use the product image instead of storing a large data URL.
    if (demoMode) return undefined;
    if (persistedPreviewUrl) return persistedPreviewUrl;
    const response = await AdminApi.uploadCustomizationImage({
      dataUrl: renderedPreviewUrl,
      fileName: `preview-${customizationId}.jpg`,
      guestSessionId: getCustomizationGuestSessionId(),
      width: 1000,
      height: 1000
    });
    setPersistedPreviewUrl(response.image.url);
    return response.image.url;
  };

  const executePurchase = async (mode: "cart" | "buy") => {
    setPurchaseError("");
    if (personalizationNeedsConfiguration) {
      setPurchaseError("Sản phẩm cá nhân hóa chưa có cấu hình trường nhập liệu. Vui lòng hoàn tất cấu hình trong quản trị trước khi bán.");
      requestAnimationFrame(() => document.getElementById("product-personalizer")?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }
    if (product.isPersonalized && !customizationValidation.valid) {
      setShowCustomizationValidation(true);
      setPurchaseError("Vui lòng hoàn thành các mục cá nhân hoá bắt buộc trước khi đặt hàng.");
      requestAnimationFrame(() => document.getElementById("product-personalizer")?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }
    setIsPreparingPurchase(true);
    try {
      const previewUrl = product.isPersonalized ? await resolvePersistentPreview() : renderedPreviewUrl;
      const args = [selectedVariant, quantity, product, customizationValues, previewUrl, selectedAddons, product.isPersonalized ? customizationId : undefined, product.version || 1] as const;
      if (mode === "buy") onBuyNow(...args);
      else onAddToCart(...args);
    } catch (error: any) {
      setPurchaseError(error?.message || "Không thể lưu bản thiết kế. Vui lòng thử lại.");
    } finally {
      setIsPreparingPurchase(false);
    }
  };

  const handleAddToCartClick = () => { void executePurchase("cart"); };
  const handleBuyNowClick = () => { void executePurchase("buy"); };

  const totalPriceCalculated = currentPrice * quantity;
  const lightboxImageUrl = mediaView === "mockup"
    ? renderedPreviewUrl
    : activeMedia.type === "image" ? activeMedia.url : undefined;

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const tabs = ["desc", "specs", "reviews"] as const;
    const index = tabs.indexOf(activeTab);
    const nextIndex = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length : -1;
    if (nextIndex < 0) return;
    event.preventDefault();
    const next = tabs[nextIndex];
    setActiveTab(next);
    document.getElementById(`product-tab-${next}`)?.focus();
  };

  return (
    <div className={fullPage ? "min-h-screen bg-[var(--mc-color-surface-canvas)]" : "fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-xs animate-in fade-in duration-200"}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role={fullPage ? "main" : "dialog"}
        aria-modal={fullPage ? undefined : "true"}
        aria-label={product.titleVI}
        className={fullPage ? "relative mx-auto min-h-screen w-full max-w-7xl overflow-x-hidden bg-white border-x border-[var(--mc-color-border-default)]/10" : "relative flex h-[100dvh] w-screen flex-col overflow-y-auto border-0 bg-white shadow-2xl"}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label={fullPage ? "Quay lại danh sách sản phẩm" : "Đóng chi tiết sản phẩm"}
          className={fullPage ? "mc-focus-ring absolute left-4 top-4 z-20 inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-200 bg-white/95 px-4 text-xs font-bold text-stone-700 shadow-sm transition-colors hover:bg-stone-100 sm:left-6 sm:top-6" : "absolute top-3 right-3 sm:top-4 sm:right-4 z-20 p-2 sm:p-2.5 rounded-full bg-white/90 hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition-colors shadow-md border border-stone-200 cursor-pointer"}
        >
          {fullPage ? <><X className="h-4 w-4" aria-hidden="true" /> Danh sách sản phẩm</> : <X className="w-5 h-5" />}
        </button>

        {fullPage && <nav aria-label="Breadcrumb" className="px-4 pb-0 pt-20 text-xs text-stone-500 sm:px-8 lg:px-10"><a href="#store-catalog" onClick={event => { event.preventDefault(); onClose(); }} className="mc-focus-ring rounded hover:text-[var(--mc-color-accent-strong)]">Trang chủ</a><span className="px-2" aria-hidden="true">/</span><span className="text-stone-900">{product.categoryName || "Sản phẩm"}</span><span className="px-2" aria-hidden="true">/</span><span className="line-clamp-1 inline-block max-w-[45%] align-bottom">{product.titleVI}</span></nav>}

        <div className={fullPage ? "grid flex-1 grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-12 lg:gap-10 lg:p-10" : "p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 flex-1"}>
          {/* Cột Trái: Media Gallery & Video */}
          <div className="lg:col-span-6 space-y-3 sm:space-y-4">
            {/* Active Display Window */}
            <div ref={primaryPreviewRef} className="relative aspect-square rounded-2xl overflow-hidden bg-stone-100 border border-stone-200/90 shadow-inner group scroll-mt-6">
              {mediaLoadError ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 bg-stone-100 px-6 text-center text-stone-500" role="img" aria-label="Không thể tải ảnh sản phẩm">
                  <ImageOff className="h-8 w-8" aria-hidden="true" />
                  <span className="text-xs font-semibold">Không thể tải ảnh này</span>
                </div>
              ) : mediaView === "mockup" && hasMockup ? (
                renderedPreviewUrl
                  ? <img src={renderedPreviewUrl} onError={() => setMediaLoadError(true)} alt={`Bản xem trước ${product.titleVI}`} className="h-full w-full object-contain bg-slate-100" />
                  : <VariantMockupPreview product={product} variant={variantPreviewActive ? selectedVariant : undefined} className="h-full rounded-none" />
              ) : activeMedia.type === "video" ? (
                <video
                  src={activeMedia.url}
                  controls
                  autoPlay
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <img
                  src={activeMedia.url}
                  alt={product.titleVI}
                  onError={() => setMediaLoadError(true)}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}

              {/* Badges */}
              <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
                {product.isPersonalized && (
                  <span className="bg-[var(--mc-color-action-primary)] backdrop-blur-xs text-white font-black text-[10px] px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 uppercase tracking-wider">
                    <Sparkles size={11} /> Có thể cá nhân hóa
                  </span>
                )}
                {discountPercent > 0 && (
                  <span className="bg-emerald-600 text-white font-black text-[10px] px-2.5 py-1 rounded-full shadow-md">
                    Giảm {discountPercent}% Mua Nhiều
                  </span>
                )}
              </div>
              <button type="button" onClick={() => lightboxImageUrl && setIsLightboxOpen(true)} disabled={!lightboxImageUrl || mediaLoadError} aria-label="Phóng to ảnh sản phẩm" className="mc-focus-ring absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-stone-700 shadow-md transition-colors hover:bg-white active:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"><Maximize2 className="h-4 w-4" aria-hidden="true" /></button>
            </div>

            {/* Thumbnails list */}
            <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
              {hasMockup && (
                <button
                  type="button"
                  onClick={() => setMediaView("mockup")}
                  aria-label="Xem mockup nền trơn của biến thể"
                  aria-pressed={mediaView === "mockup"}
                  className={`relative shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer bg-gradient-to-br from-slate-50 via-white to-slate-200 ${
                    mediaView === "mockup"
                      ? "border-orange-600 ring-2 ring-orange-500/20"
                      : "border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <div className="absolute inset-0 grid place-items-center text-slate-500">
                    <Layers className="h-5 w-5" />
                  </div>
                  <span className="absolute inset-x-0 bottom-0 bg-slate-950/65 px-1 py-0.5 text-[8px] font-bold text-white">Mockup</span>
                </button>
              )}

              {product.videoUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setMediaView("source");
                    setActiveMedia({ type: "video", url: product.videoUrl! });
                  }}
                  aria-label="Xem video sản phẩm"
                  aria-pressed={mediaView === "source" && activeMedia.type === "video"}
                  className={`relative shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all flex flex-col items-center justify-center bg-stone-900 text-white cursor-pointer ${
                    activeMedia.type === "video"
                      ? "border-orange-600 ring-2 ring-orange-500/20"
                      : "border-stone-200"
                  }`}
                >
                  <Video className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400 mb-0.5" />
                  <span className="text-[9px] font-bold">Video</span>
                </button>
              )}

              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setMediaView("source");
                    setActiveMedia({ type: "image", url: img });
                  }}
                  aria-label={`Xem ảnh sản phẩm ${idx + 1}`}
                  aria-pressed={mediaView === "source" && activeMedia.type === "image" && activeMedia.url === img}
                  className={`relative shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    mediaView === "source" && activeMedia.type === "image" && activeMedia.url === img
                      ? "border-orange-600 ring-2 ring-orange-500/20"
                      : "border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* Verified availability and policies */}
            <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200/80 rounded-2xl p-3 sm:p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-orange-950">
                <ShoppingBag size={15} className="shrink-0 text-[var(--mc-color-accent-strong)]" />
                <span>{isOutOfStock ? "Phân loại này đang tạm hết hàng" : selectedVariant?.inventoryTracked === false ? "Phân loại này đang còn hàng" : `Tồn kho hiện tại: ${maxQuantity.toLocaleString("vi-VN")} sản phẩm`}</span>
              </div>
              {product.shippingPolicy && (
                <div className="flex items-start gap-2 text-[11px] text-stone-700">
                  <Truck size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>{product.shippingPolicy}</span>
                </div>
              )}
              {product.warrantyPolicy && (
                <div className="flex items-start gap-2 text-[11px] text-stone-700">
                  <ShieldCheck size={13} className="text-blue-600 shrink-0 mt-0.5" />
                  <span>{product.warrantyPolicy}</span>
                </div>
              )}
            </div>
          </div>

          {/* Cột Phải: Thông Tin, Trình Customizer & Đặt Mua */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-4 sm:space-y-5">
            <div>
              {/* Category & Ratings */}
              <div className="flex items-center justify-between gap-2">
                <span className="bg-orange-50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-[var(--mc-color-accent-strong)] rounded-full">
                  {product.categoryName}
                </span>

                <div className="flex items-center gap-1 text-xs">
                  {hasReviews ? (
                    <>
                      <Star size={13} className="fill-current text-amber-400" />
                      <span className="font-extrabold text-stone-900">{product.rating}</span>
                      <span className="text-stone-400 text-[11px]">({product.reviewCount} đánh giá)</span>
                    </>
                  ) : (
                    <span className="text-stone-400 text-[11px]">Chưa có đánh giá</span>
                  )}
                </div>
              </div>

              {/* Title */}
              <h1 className="text-base sm:text-xl font-black text-stone-900 mt-2 leading-snug">
                {product.titleVI}
              </h1>

              {product.shortDescVI && (
                <p className="mt-2 text-xs leading-5 text-stone-600">{product.shortDescVI}</p>
              )}

              {/* Price Display */}
              <div className="mt-2.5 flex items-baseline gap-2.5 p-3 rounded-2xl bg-stone-50 border border-stone-200/80">
                <span className="text-2xl sm:text-3xl font-black text-[var(--mc-color-accent-strong)] tracking-tight">
                  {currentPrice.toLocaleString("vi-VN")}đ
                </span>
                {discountPercent > 0 && (
                  <span className="text-[11px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">
                    Tiết kiệm {discountPercent}%
                  </span>
                )}
              </div>
              {selectedVariant?.inventoryTracked !== false && maxQuantity > 0 && maxQuantity <= 10 && <div className="mt-2 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-900" role="status"><span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" aria-hidden="true" />Chỉ còn {maxQuantity.toLocaleString("vi-VN")} sản phẩm cho phân loại này</div>}

              {product.isPersonalized && <div className="mt-3 rounded-2xl border border-orange-200 bg-orange-50/70 p-3.5" aria-label="Tiến trình đặt sản phẩm cá nhân hóa">
                <div className="flex items-center justify-between gap-3">
                  <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-700">Lộ trình đặt hàng</p><p className="mt-0.5 text-[11px] font-semibold text-stone-600">Hoàn tất từng bước, xem mockup rồi mới đặt</p></div>
                  <span className="shrink-0 text-[11px] font-black text-orange-700">{customizationValidation.completedRequired}/{customizationValidation.totalRequired || 0}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1.5 text-[10px] font-bold">
                  <div className="flex items-center gap-1.5 rounded-xl bg-white px-2 py-2 text-stone-800 ring-1 ring-orange-200"><span className="grid h-5 w-5 place-items-center rounded-full bg-orange-600 text-[9px] text-white">1</span><span className="truncate">Chọn biến thể</span></div>
                  <div className={`flex items-center gap-1.5 rounded-xl px-2 py-2 ring-1 ${customizationValidation.valid ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-white text-stone-800 ring-orange-200"}`}><span className={`grid h-5 w-5 place-items-center rounded-full text-[9px] text-white ${customizationValidation.valid ? "bg-emerald-600" : "bg-orange-600"}`}>{customizationValidation.valid ? <Check className="h-3 w-3" /> : "2"}</span><span className="truncate">Nhập nội dung</span></div>
                  <button type="button" onClick={() => { setShowCustomizationReview(true); openLargePreview(); }} className="mc-focus-ring flex min-h-9 items-center gap-1.5 rounded-xl bg-white px-2 py-2 text-left font-bold text-stone-800 ring-1 ring-orange-200 transition hover:bg-orange-100"><span className="grid h-5 w-5 place-items-center rounded-full bg-orange-600 text-[9px] text-white">3</span><span className="truncate">Xem & đặt hàng</span></button>
                </div>
              </div>}

              {/* Volume Discount Tiers */}
              {product.volumeDiscountTiers && product.volumeDiscountTiers.length > 1 && (
                <div className="mt-3.5">
                  <span className="text-xs font-bold text-stone-900 block mb-1.5">
                    Ưu đãi mua nhiều giảm giá:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {product.volumeDiscountTiers.map((tier, idx) => {
                      const isTierActive = activeDiscountTier?.minQty === tier.minQty;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setQuantity(tier.minQty)}
                          aria-pressed={isTierActive}
                          className={`p-2 rounded-xl text-left border transition-all text-xs flex flex-col justify-between cursor-pointer ${
                            isTierActive
                              ? "border-orange-500 bg-orange-50 text-orange-950 ring-2 ring-orange-500/20 font-bold"
                              : "border-stone-200 bg-white hover:bg-stone-50 text-stone-700"
                          }`}
                        >
                          <span className="text-[11px] font-bold">{tier.badgeText}</span>
                          <span className="text-[10px] text-stone-500 mt-0.5">
                            {tier.discountPercent > 0 ? `Giảm ${tier.discountPercent}%` : "Giá chuẩn"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Structured variant selector */}
              {validVariants.length > 1 && (
                <div className="mt-4 space-y-3.5 rounded-2xl border border-stone-200 bg-stone-50/70 p-3.5">
                  <div className="flex items-center justify-between gap-3" aria-live="polite">
                    <span className="text-xs font-bold text-stone-900">Chọn phân loại</span>
                    <span className="flex min-w-0 items-center gap-1.5 truncate text-[11px] font-bold text-orange-700">
                      <span className="truncate">{getVariantDisplayName(selectedVariant)}</span>
                      <span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[9px] font-bold text-stone-500 ring-1 ring-stone-200">
                        {selectedVariantVisual.type === "DESIGN" ? "Design" : selectedVariantVisual.type === "COLOR" ? "Màu" : "Mặc định"}
                      </span>
                    </span>
                  </div>

                  {variantGroups.length > 0 ? variantGroups.map(group => (
                    <fieldset key={group.key} className="m-0 min-w-0 border-0 p-0">
                      <legend className="mb-2 block text-[11px] font-semibold text-stone-500">{group.label} ({group.options.length})</legend>
                      <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto pr-1">
                        {group.options.map(option => {
                          const selected = getStorefrontVariantValue(selectedVariant, group.key) === option.label;
                          const available = isStorefrontVariantOptionAvailable(validVariants, variantGroups, selectedVariant, group.key, option.label);
                          return (
                            <button key={option.label} type="button" disabled={!available} aria-pressed={selected} onClick={() => selectVariantOption(group.key, option.label)} className={`mc-focus-ring flex min-h-11 min-w-0 items-center gap-2 rounded-xl border p-1.5 pr-2.5 text-left text-[11px] font-semibold transition-all active:scale-[0.98] ${selected ? "border-orange-500 bg-white text-orange-700 ring-2 ring-orange-400/15" : available ? "border-stone-200 bg-white text-stone-700 hover:border-orange-400" : "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400 line-through"}`}>
                              {option.imageUrl && <img src={option.imageUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-stone-200 object-cover" />}
                              <span className="max-w-36 truncate">{option.label}</span>
                              {selected && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--mc-color-accent-strong)]" aria-hidden="true" />}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                  )) : (
                    <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto pr-1">
                      {validVariants.map(variant => <button key={variant.sourceSkuId} type="button" aria-pressed={selectedVariant?.sourceSkuId === variant.sourceSkuId} onClick={() => handleSelectVariant(variant)} className={`mc-focus-ring min-h-11 rounded-lg border px-3 py-2 text-[11px] font-semibold active:scale-[0.98] ${selectedVariant?.sourceSkuId === variant.sourceSkuId ? "border-orange-500 bg-orange-50 text-orange-700" : "border-stone-200 bg-white text-stone-700 hover:border-orange-400"}`}>{getVariantDisplayName(variant)}</button>)}
                    </div>
                  )}
                </div>
              )}

              {/* Live Customizer Engine (Macorner Feature) */}
              {product.isPersonalized && (
                <div className="mt-4 border-t border-stone-100 pt-4">
                  <LiveCustomizerEngine
                    product={product}
                    variant={selectedVariant}
                    values={customizationValues}
                    onChange={handleCustomizerChange}
                    showValidation={showCustomizationValidation}
                    onPreviewRequest={openLargePreview}
                  />
                </div>
              )}

              {product.isPersonalized && <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5" aria-labelledby="customization-review-heading">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${customizationValidation.valid ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}`}>{customizationValidation.valid ? <CheckCircle2 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</span><div className="min-w-0"><h3 id="customization-review-heading" className="truncate text-xs font-black text-slate-900">Kiểm tra thiết kế trước khi đặt</h3><p className="text-[10px] text-slate-500">{customizationSummaryItems.length ? `${customizationSummaryItems.length} nội dung đã sẵn sàng` : "Chưa có nội dung cá nhân hóa"}</p></div></div>
                  <button type="button" onClick={() => setShowCustomizationReview(current => !current)} aria-expanded={showCustomizationReview} className="mc-focus-ring inline-flex min-h-10 shrink-0 items-center gap-1 rounded-xl px-2.5 text-[11px] font-black text-orange-700 hover:bg-orange-100"><span>{showCustomizationReview ? "Thu gọn" : "Xem lại"}</span><ChevronDown className={`h-4 w-4 transition-transform ${showCustomizationReview ? "rotate-180" : ""}`} /></button>
                </div>
                {showCustomizationReview && <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                  <button type="button" onClick={openLargePreview} className="mc-focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-xs font-black text-slate-800 ring-1 ring-slate-200 hover:bg-slate-100"><Eye className="h-4 w-4 text-orange-600" /> Xem mockup cỡ lớn</button>
                  {customizationSummaryItems.length > 0 ? <div className="grid gap-2 sm:grid-cols-2">{customizationSummaryItems.map(item => <div key={item.id} className="flex min-w-0 items-center gap-2 rounded-xl bg-white px-2.5 py-2 ring-1 ring-slate-200"><div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : <Check className="h-4 w-4 text-emerald-600" />}</div><div className="min-w-0"><p className="truncate text-[10px] font-semibold text-slate-500">{item.label}</p><p className="truncate text-[11px] font-black text-slate-800">{item.value}</p></div></div>)}</div> : <p className="rounded-xl bg-white px-3 py-2 text-[11px] text-slate-500 ring-1 ring-slate-200">Nhập thông tin ở trên để xem tóm tắt thiết kế.</p>}
                </div>}
              </section>}

              {/* Gift Add-ons */}
              {product.giftAddons && product.giftAddons.length > 0 && (
                <div className="mt-4 pt-3.5 border-t border-stone-100">
                  <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5 mb-2">
                    <Gift className="w-3.5 h-3.5 text-rose-500" />
                    <span>Tùy chọn quà tặng kèm thêm:</span>
                  </span>
                  <div className="space-y-1.5">
                    {product.giftAddons.map((addon) => {
                      const isChecked = selectedAddons.includes(addon.id);
                      return (
                        <label
                          key={addon.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? "border-orange-400 bg-orange-50/70"
                              : "border-stone-200 hover:bg-stone-50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleAddon(addon.id)}
                              className="w-4 h-4 text-orange-600 rounded border-stone-300 focus:ring-orange-500"
                            />
                            <div>
                              <span className="font-bold text-stone-800">{addon.title}</span>
                              {addon.description && (
                                <p className="text-[10px] text-stone-500">{addon.description}</p>
                              )}
                            </div>
                          </div>
                          <span className="font-bold text-[var(--mc-color-accent-strong)]">
                            +{addon.priceVND.toLocaleString("vi-VN")}đ
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity Stepper (Desktop) */}
              <div className="mt-4 pt-3.5 border-t border-stone-100 flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900">Số lượng đặt:</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-stone-300 rounded-xl overflow-hidden bg-stone-50">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      aria-label="Giảm số lượng"
                      className="px-3 py-1.5 hover:bg-stone-200 font-bold text-stone-700 transition-colors text-sm cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-4 py-1.5 font-bold text-xs bg-white text-stone-900 min-w-[36px] text-center">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      disabled={isOutOfStock || quantity >= maxQuantity}
                      onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                      aria-label="Tăng số lượng"
                      className="px-3 py-1.5 hover:bg-stone-200 font-bold text-stone-700 transition-colors text-sm cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-[11px] text-stone-400">
                    {isOutOfStock ? "Tạm hết hàng" : selectedVariant?.inventoryTracked === false ? "Còn hàng" : `(Còn ${maxQuantity.toLocaleString()} cái)`}
                  </span>
                </div>
              </div>
            </div>

            {/* Primary purchase actions; the mobile sticky bar takes over after this block scrolls away. */}
            <div ref={purchaseActionsRef} className="space-y-2.5 border-t border-stone-100 pt-4" aria-busy={isPreparingPurchase}>
              {purchaseError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">{purchaseError}</div>}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isOutOfStock || isPreparingPurchase || personalizationNeedsConfiguration}
                  onClick={handleAddToCartClick}
                  className={`mc-focus-ring min-h-11 py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                    isOutOfStock || isPreparingPurchase || personalizationNeedsConfiguration
                      ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                      : "bg-orange-50 hover:bg-orange-100 text-[var(--mc-color-accent-strong)] border border-orange-200 shadow-xs"
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{isPreparingPurchase ? "Đang lưu…" : "Thêm Vào Giỏ"}</span>
                </button>

                <button
                  type="button"
                  disabled={isOutOfStock || isPreparingPurchase || personalizationNeedsConfiguration}
                  onClick={handleBuyNowClick}
                  className={`mc-focus-ring min-h-11 py-3.5 px-4 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer ${
                    isOutOfStock || isPreparingPurchase || personalizationNeedsConfiguration
                      ? "bg-stone-300 cursor-not-allowed"
                      : "bg-[var(--mc-color-action-primary)] hover:bg-[var(--mc-color-action-primary-hover)] shadow-orange-950/20"
                  }`}
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>{isPreparingPurchase ? "Đang lưu thiết kế…" : "Mua Ngay (Thanh Toán)"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs: Description, Specs, Reviews */}
        <div className="border-t border-stone-200 px-4 sm:px-8 py-5 sm:py-6 bg-stone-50/60 pb-24 sm:pb-6">
          <div className="flex items-center gap-3 sm:gap-4 border-b border-stone-200 pb-2.5 mb-4 overflow-x-auto no-scrollbar" role="tablist" aria-label="Thông tin sản phẩm">
            <button
              id="product-tab-desc"
              type="button"
              role="tab"
              aria-selected={activeTab === "desc"}
              aria-controls="product-panel-desc"
              tabIndex={activeTab === "desc" ? 0 : -1}
              onClick={() => setActiveTab("desc")}
              onKeyDown={handleTabKeyDown}
              className={`mc-focus-ring rounded-sm text-xs font-bold pb-1 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "desc"
                  ? "text-[var(--mc-color-accent-strong)] border-b-2 border-[var(--mc-color-accent-strong)]"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Mô Tả Sản Phẩm & Chính Sách
            </button>
            <button
              id="product-tab-specs"
              type="button"
              role="tab"
              aria-selected={activeTab === "specs"}
              aria-controls="product-panel-specs"
              tabIndex={activeTab === "specs" ? 0 : -1}
              onClick={() => setActiveTab("specs")}
              onKeyDown={handleTabKeyDown}
              className={`mc-focus-ring rounded-sm text-xs font-bold pb-1 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "specs"
                  ? "text-[var(--mc-color-accent-strong)] border-b-2 border-[var(--mc-color-accent-strong)]"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Thông Số Kỹ Thuật ({product.attributes?.length || 0})
            </button>
            <button
              id="product-tab-reviews"
              type="button"
              role="tab"
              aria-selected={activeTab === "reviews"}
              aria-controls="product-panel-reviews"
              tabIndex={activeTab === "reviews" ? 0 : -1}
              onClick={() => setActiveTab("reviews")}
              onKeyDown={handleTabKeyDown}
              className={`mc-focus-ring rounded-sm text-xs font-bold pb-1 transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                activeTab === "reviews"
                  ? "text-[var(--mc-color-accent-strong)] border-b-2 border-[var(--mc-color-accent-strong)]"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
              <span>Đánh Giá Khách Hàng ({product.reviewCount || 0})</span>
            </button>
          </div>

          {/* Tab contents */}
          {activeTab === "desc" && (
            <div id="product-panel-desc" role="tabpanel" aria-labelledby="product-tab-desc" tabIndex={0} className="mc-focus-ring max-h-[28rem] space-y-5 overflow-y-auto pr-2">
              <div className="prose prose-sm max-w-none whitespace-pre-line text-xs leading-6 text-stone-700" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
              {(product.detailImages || []).length > 0 && (
                <div className="space-y-3 border-t border-stone-200 pt-5">
                  <h3 className="text-xs font-extrabold text-stone-900">Hình ảnh chi tiết sản phẩm</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {(product.detailImages || []).map((image, index) => (
                      <img key={`${image}-${index}`} src={image} alt={`${product.titleVI} - chi tiết ${index + 1}`} loading="lazy" className="w-full rounded-xl border border-stone-200 bg-white object-contain" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "specs" && (
            <div id="product-panel-specs" role="tabpanel" aria-labelledby="product-tab-specs" tabIndex={0} className="mc-focus-ring grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {(!product.attributes || product.attributes.length === 0) && (
                <div className="sm:col-span-2 p-3 text-center text-stone-500 bg-white border border-stone-200 rounded-xl">Chưa có thông số kỹ thuật.</div>
              )}
              {(product.attributes || []).map((attr, idx) => (
                <div key={idx} className="flex p-2 rounded-lg bg-white border border-stone-200/80">
                  <span className="font-semibold text-stone-500 w-1/3 truncate">{attr.keyVI || attr.keyCN}:</span>
                  <span className="font-bold text-stone-800 w-2/3 truncate">{attr.valueVI || attr.valueCN}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "reviews" && (
            <div id="product-panel-reviews" role="tabpanel" aria-labelledby="product-tab-reviews" tabIndex={0} className="mc-focus-ring space-y-2.5 max-h-60 sm:max-h-72 overflow-y-auto pr-2">
              <div className="p-4 bg-white rounded-xl border border-stone-200 text-center space-y-1">
                {hasReviews ? (
                  <>
                    <div className="flex items-center justify-center gap-1 text-amber-500"><Star size={16} className="fill-current" /><strong>{product.rating}/5</strong></div>
                    <p className="text-xs text-stone-600">Tổng hợp từ {product.reviewCount} lượt đánh giá đã ghi nhận.</p>
                    <p className="text-[10px] text-stone-400">Nội dung từng đánh giá chưa được công khai qua API.</p>
                  </>
                ) : (
                  <p className="text-xs text-stone-500">Sản phẩm này chưa có đánh giá.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {fullPage && relatedProducts.length > 0 && <section className="border-t border-stone-200 bg-white px-4 py-8 sm:px-8 lg:px-10" aria-labelledby="related-products-heading">
          <div className="mb-4 flex items-end justify-between gap-3"><div><p className="mc-eyebrow">Gợi ý cho bạn</p><h2 id="related-products-heading" className="mt-1 text-xl font-black tracking-tight text-stone-900">Có thể bạn cũng thích</h2></div></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {relatedProducts.slice(0, 4).map(related => <button key={related.id || related.slug} type="button" onClick={() => onSelectRelated?.(related)} className="mc-focus-ring group overflow-hidden rounded-2xl border border-stone-200 bg-white text-left transition-shadow hover:shadow-lg"><div className="aspect-square overflow-hidden bg-stone-100">{related.primaryImage ? <img src={related.primaryImage} alt={related.titleVI} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" /> : <div className="grid h-full place-items-center text-xs text-stone-400">Chưa có ảnh</div>}</div><div className="p-3"><p className="line-clamp-2 min-h-10 text-xs font-bold leading-5 text-stone-800">{related.titleVI}</p><span className="mt-2 block text-sm font-black text-[var(--mc-color-accent-strong)]">{(related.minPriceVND || 0).toLocaleString("vi-VN")}đ</span></div></button>)}
          </div>
        </section>}

        {/* Sticky mobile purchase bar appears only after the primary actions scroll above the viewport. */}
        {showMobilePurchaseBar && <div className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-stone-200/90 p-3 flex items-center justify-between gap-2 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]" aria-busy={isPreparingPurchase}>
          {purchaseError && <div role="alert" className="absolute inset-x-3 bottom-full mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-semibold text-rose-700 shadow-lg">{purchaseError}</div>}
          <div className="min-w-0 flex-1">
            <div className="text-[10px] text-stone-500 truncate">{getVariantDisplayName(selectedVariant)}</div>
            <div className="text-base font-black text-[var(--mc-color-accent-strong)] leading-tight">
              {totalPriceCalculated.toLocaleString("vi-VN")}đ
            </div>
            {product.isPersonalized && !customizationValidation.valid && <div className="truncate text-[9px] font-bold text-orange-700">{customizationValidation.completedRequired}/{customizationValidation.totalRequired} mục bắt buộc</div>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isOutOfStock || isPreparingPurchase || personalizationNeedsConfiguration}
              onClick={handleAddToCartClick}
              className="mc-focus-ring min-h-11 px-3.5 py-2.5 rounded-xl font-bold text-xs bg-orange-50 text-[var(--mc-color-accent-strong)] border border-orange-200 flex items-center gap-1 transition-colors hover:bg-orange-100 active:scale-95 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{isPreparingPurchase ? "Đang lưu…" : isOutOfStock ? "Hết hàng" : product.isPersonalized && !customizationValidation.valid ? "Hoàn tất" : "Thêm Giỏ"}</span>
            </button>
            <button
              type="button"
              disabled={isOutOfStock || isPreparingPurchase || personalizationNeedsConfiguration}
              onClick={handleBuyNowClick}
              className="mc-focus-ring min-h-11 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-[var(--mc-color-action-primary)] shadow-md shadow-orange-950/20 flex items-center gap-1 transition-colors hover:bg-[var(--mc-color-action-primary-hover)] active:scale-95 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:shadow-none cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{isPreparingPurchase ? "Đang lưu…" : isOutOfStock ? "Hết hàng" : product.isPersonalized && !customizationValidation.valid ? "Xem lại" : "Mua Ngay"}</span>
            </button>
          </div>
        </div>}

        {isLightboxOpen && lightboxImageUrl && (
          <div ref={lightboxRef} tabIndex={-1} className="fixed inset-0 z-[70] grid place-items-center bg-stone-950/90 p-4" role="dialog" aria-modal="true" aria-label="Ảnh sản phẩm phóng to">
            <button type="button" onClick={() => setIsLightboxOpen(false)} className="mc-focus-ring absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white text-stone-900 shadow-lg" aria-label="Đóng ảnh phóng to"><X className="h-5 w-5" aria-hidden="true" /></button>
            <img src={lightboxImageUrl} alt={product.titleVI} className="max-h-[90dvh] max-w-[94vw] rounded-xl object-contain shadow-2xl" />
          </div>
        )}
      </div>
    </div>
  );
};
