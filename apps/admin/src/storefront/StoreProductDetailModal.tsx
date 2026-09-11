import React, { useState, useEffect, useMemo } from "react";
import DOMPurify from "dompurify";
import { WebProduct, WebProductVariant } from "@hub1688/shared-types";
import { LiveCustomizerEngine } from "./LiveCustomizerEngine";
import { VariantMockupPreview, getVariantVisual, MOCKUP_VISUAL_TYPE_KEY } from "./VariantMockupPreview";
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
  Layers
} from "lucide-react";

interface StoreProductDetailModalProps {
  product: WebProduct;
  onClose: () => void;
  onAddToCart: (
    variant: WebProductVariant,
    quantity: number,
    product: WebProduct,
    customizationData?: Record<string, any>,
    customizedPreviewUrl?: string,
    giftAddonsSelected?: string[]
  ) => void;
  onBuyNow: (
    variant: WebProductVariant,
    quantity: number,
    product: WebProduct,
    customizationData?: Record<string, any>,
    customizedPreviewUrl?: string,
    giftAddonsSelected?: string[]
  ) => void;
}

export const StoreProductDetailModal: React.FC<StoreProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  onBuyNow
}) => {
  const dialogRef = useAccessibleDialog<HTMLDivElement>(true, onClose);

  const validVariants = (product.variants || []).filter(v => v.selectedForSale !== false);
  const [selectedVariant, setSelectedVariant] = useState<WebProductVariant>(validVariants[0] || product.variants[0]);
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

  // Customization & Add-ons state
  const [customizationValues, setCustomizationValues] = useState<Record<string, any>>({});
  const [renderedPreviewUrl, setRenderedPreviewUrl] = useState<string | undefined>(undefined);
  const [selectedAddons, setSelectedAddons] = useState<string[]>(() => {
    return (product.giftAddons || []).filter(a => a.defaultChecked).map(a => a.id);
  });

  // Initialize defaults on product load
  useEffect(() => {
    if (product) {
      const firstVar = validVariants[0] || product.variants[0];
      setSelectedVariant(firstVar);
      setActiveMedia({
        type: "image",
        url: firstVar?.imageUrl || product.primaryImage || ""
      });
      const supportsMockup = Boolean(
        product.isPersonalized ||
        product.customizerMockupTemplateUrl ||
        product.variants.some(variant => variant.specDetails?.[MOCKUP_VISUAL_TYPE_KEY])
      );
      setMediaView(supportsMockup ? "mockup" : "source");
      setVariantPreviewActive(validVariants.length <= 1);
      setQuantity(1);

      // Default customization values
      const initialCustom: Record<string, any> = {};
      (product.personalizationFields || []).forEach(f => {
        if (f.defaultValue !== undefined) {
          initialCustom[f.id] = f.defaultValue;
        }
      });
      setCustomizationValues(initialCustom);
      setSelectedAddons((product.giftAddons || []).filter(a => a.defaultChecked).map(a => a.id));
    }
  }, [product]);

  const getVariantDisplayName = (v?: WebProductVariant): string => {
    if (!v) return "";
    const parts = [v.colorName, v.sizeName].filter(Boolean);
    return parts.length > 0 ? parts.join(" - ") : (v.sourceSkuId || "Phân loại chuẩn");
  };

  const colorOptions = useMemo(() => {
    const options = new Map<string, { label: string; imageUrl?: string }>();
    validVariants.forEach(variant => {
      const label = variant.colorName?.trim();
      if (label && !options.has(label)) options.set(label, { label, imageUrl: variant.imageUrl });
    });
    return Array.from(options.values());
  }, [product.variants]);

  const sizeOptions = useMemo(() => Array.from(new Set(
    validVariants.map(variant => variant.sizeName?.trim()).filter(Boolean) as string[]
  )), [product.variants]);

  const selectVariantOption = (field: "colorName" | "sizeName", value: string) => {
    const counterpart = field === "colorName" ? "sizeName" : "colorName";
    const preferredCounterpart = selectedVariant?.[counterpart]?.trim();
    const exact = validVariants.find(variant =>
      variant[field]?.trim() === value && (!preferredCounterpart || variant[counterpart]?.trim() === preferredCounterpart)
    );
    const fallback = validVariants.find(variant => variant[field]?.trim() === value);
    const next = exact || fallback;
    if (next) handleSelectVariant(next);
  };

  const descriptionHtml = useMemo(() => DOMPurify.sanitize(
    product.fullDescVI || product.shortDescVI || "Chưa có mô tả chi tiết cho sản phẩm này.",
    { ALLOWED_TAGS: ["h2", "h3", "h4", "p", "ul", "ol", "li", "strong", "em", "br", "a"], ALLOWED_ATTR: ["href", "target", "rel"] }
  ), [product.fullDescVI, product.shortDescVI]);

  const handleSelectVariant = (variant: WebProductVariant) => {
    setSelectedVariant(variant);
    setVariantPreviewActive(true);
    if (variant.imageUrl) {
      setActiveMedia({ type: "image", url: variant.imageUrl });
    }
    if (
      product.isPersonalized ||
      product.customizerMockupTemplateUrl ||
      product.variants.some(item => item.specDetails?.[MOCKUP_VISUAL_TYPE_KEY])
    ) {
      setMediaView("mockup");
    }
  };

  const basePrice = selectedVariant?.sellingPriceVND || product.minPriceVND || 0;

  // Check volume discount
  const activeDiscountTier = useMemo(() => {
    const tiers = product.volumeDiscountTiers || [];
    return [...tiers].reverse().find(t => quantity >= t.minQty);
  }, [product.volumeDiscountTiers, quantity]);

  const discountPercent = activeDiscountTier?.discountPercent || 0;
  const currentPrice = Math.round(basePrice * (1 - discountPercent / 100));
  const currentStock = selectedVariant?.stockQuantity ?? 0;
  const isOutOfStock = currentStock <= 0;
  const hasReviews = Number(product.reviewCount) > 0 && Number(product.rating) > 0;
  const hasMockup = Boolean(
    product.isPersonalized ||
    product.customizerMockupTemplateUrl ||
    product.variants.some(variant => variant.specDetails?.[MOCKUP_VISUAL_TYPE_KEY])
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
    if (previewUrl) {
      setRenderedPreviewUrl(previewUrl);
    }
  };

  const handleAddToCartClick = () => {
    onAddToCart(selectedVariant, quantity, product, customizationValues, renderedPreviewUrl, selectedAddons);
  };

  const handleBuyNowClick = () => {
    onBuyNow(selectedVariant, quantity, product, customizationValues, renderedPreviewUrl, selectedAddons);
  };

  const totalPriceCalculated = (currentPrice + addonsTotal) * quantity;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-xs flex items-center justify-center sm:p-4 lg:p-6 animate-in fade-in duration-200">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={product.titleVI}
        className="relative bg-white w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:rounded-3xl shadow-2xl max-w-5xl overflow-y-auto border border-stone-200 flex flex-col"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Đóng chi tiết sản phẩm"
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 p-2 sm:p-2.5 rounded-full bg-white/90 hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition-colors shadow-md border border-stone-200 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 flex-1">
          {/* Cột Trái: Media Gallery & Video */}
          <div className="lg:col-span-6 space-y-3 sm:space-y-4">
            {/* Active Display Window */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-stone-100 border border-stone-200/90 shadow-inner group">
              {mediaView === "mockup" && hasMockup ? (
                <VariantMockupPreview product={product} variant={variantPreviewActive ? selectedVariant : undefined} className="h-full rounded-none" />
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
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}

              {/* Badges */}
              <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
                {product.isPersonalized && (
                  <span className="bg-orange-600/95 backdrop-blur-xs text-white font-black text-[10px] px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 uppercase tracking-wider">
                    <Sparkles size={11} /> Có thể cá nhân hóa
                  </span>
                )}
                {discountPercent > 0 && (
                  <span className="bg-emerald-600 text-white font-black text-[10px] px-2.5 py-1 rounded-full shadow-md">
                    Giảm {discountPercent}% Mua Nhiều
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnails list */}
            <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
              {hasMockup && (
                <button
                  type="button"
                  onClick={() => setMediaView("mockup")}
                  aria-label="Xem mockup nền trơn của biến thể"
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
                <ShoppingBag size={15} className="text-orange-600 shrink-0" />
                <span>{isOutOfStock ? "Phân loại này đang tạm hết hàng" : `Tồn kho hiện tại: ${currentStock.toLocaleString("vi-VN")} sản phẩm`}</span>
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
                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
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
                <span className="text-2xl sm:text-3xl font-black text-orange-600 tracking-tight">
                  {currentPrice.toLocaleString("vi-VN")}đ
                </span>
                {discountPercent > 0 && (
                  <span className="text-[11px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">
                    Tiết kiệm {discountPercent}%
                  </span>
                )}
              </div>

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
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-stone-900">Chọn phân loại</span>
                    <span className="flex min-w-0 items-center gap-1.5 truncate text-[11px] font-bold text-orange-700">
                      <span className="truncate">{getVariantDisplayName(selectedVariant)}</span>
                      <span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[9px] font-bold text-stone-500 ring-1 ring-stone-200">
                        {selectedVariantVisual.type === "DESIGN" ? "Design" : selectedVariantVisual.type === "COLOR" ? "Màu" : "Mặc định"}
                      </span>
                    </span>
                  </div>

                  {colorOptions.length > 0 && (
                    <div>
                      <span className="mb-2 block text-[11px] font-semibold text-stone-500">Màu sắc / Mẫu ({colorOptions.length})</span>
                      <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto pr-1">
                        {colorOptions.map(option => {
                          const selected = selectedVariant?.colorName?.trim() === option.label;
                          return (
                            <button key={option.label} type="button" onClick={() => selectVariantOption("colorName", option.label)} className={`flex min-w-0 items-center gap-2 rounded-xl border p-1.5 pr-2.5 text-left text-[11px] font-semibold transition-all ${selected ? "border-orange-500 bg-white text-orange-700 ring-2 ring-orange-400/15" : "border-stone-200 bg-white text-stone-700 hover:border-stone-400"}`}>
                              {option.imageUrl && <img src={option.imageUrl} alt={option.label} className="h-9 w-9 shrink-0 rounded-lg border border-stone-200 object-cover" />}
                              <span className="max-w-32 truncate">{option.label}</span>
                              {selected && <Check className="h-3.5 w-3.5 shrink-0 text-orange-600" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {sizeOptions.length > 0 && (
                    <div>
                      <span className="mb-2 block text-[11px] font-semibold text-stone-500">Kích thước / Quy cách ({sizeOptions.length})</span>
                      <div className="flex flex-wrap gap-2">
                        {sizeOptions.map(size => {
                          const selected = selectedVariant?.sizeName?.trim() === size;
                          const available = validVariants.some(variant => variant.sizeName?.trim() === size && (!selectedVariant?.colorName || variant.colorName === selectedVariant.colorName) && (variant.stockQuantity ?? 0) > 0);
                          return (
                            <button key={size} type="button" onClick={() => selectVariantOption("sizeName", size)} className={`min-w-11 rounded-lg border px-3 py-2 text-[11px] font-bold transition-all ${selected ? "border-orange-500 bg-orange-600 text-white shadow-sm" : available ? "border-stone-300 bg-white text-stone-700 hover:border-orange-400" : "border-stone-200 bg-stone-100 text-stone-400"}`}>
                              {size}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {colorOptions.length === 0 && sizeOptions.length === 0 && (
                    <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto pr-1">
                      {validVariants.map(variant => {
                        const selected = selectedVariant?.sourceSkuId === variant.sourceSkuId;
                        return <button key={variant.sourceSkuId} type="button" onClick={() => handleSelectVariant(variant)} className={`rounded-lg border px-3 py-2 text-[11px] font-semibold ${selected ? "border-orange-500 bg-orange-50 text-orange-700" : "border-stone-200 bg-white text-stone-700"}`}>{getVariantDisplayName(variant)}</button>;
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Live Customizer Engine (Macorner Feature) */}
              {product.isPersonalized && (
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <LiveCustomizerEngine
                    product={product}
                    values={customizationValues}
                    onChange={handleCustomizerChange}
                  />
                </div>
              )}

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
                          <span className="font-bold text-orange-600">
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
                      disabled={isOutOfStock || quantity >= currentStock}
                      onClick={() => setQuantity((q) => Math.min(currentStock, q + 1))}
                      aria-label="Tăng số lượng"
                      className="px-3 py-1.5 hover:bg-stone-200 font-bold text-stone-700 transition-colors text-sm cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-[11px] text-stone-400">
                    {isOutOfStock ? "Tạm hết hàng" : `(Còn ${currentStock.toLocaleString()} cái)`}
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop Action CTA Buttons */}
            <div className="hidden sm:block pt-4 border-t border-stone-100 space-y-2.5">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={handleAddToCartClick}
                  className={`py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                    isOutOfStock
                      ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                      : "bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 shadow-xs"
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Thêm Vào Giỏ</span>
                </button>

                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={handleBuyNowClick}
                  className={`py-3.5 px-4 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer ${
                    isOutOfStock
                      ? "bg-stone-300 cursor-not-allowed"
                      : "bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-orange-600/30"
                  }`}
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Mua Ngay (Thanh Toán)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs: Description, Specs, Reviews */}
        <div className="border-t border-stone-200 px-4 sm:px-8 py-5 sm:py-6 bg-stone-50/60 pb-24 sm:pb-6">
          <div className="flex items-center gap-3 sm:gap-4 border-b border-stone-200 pb-2.5 mb-4 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("desc")}
              className={`text-xs font-bold pb-1 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "desc"
                  ? "text-orange-600 border-b-2 border-orange-600"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Mô Tả Sản Phẩm & Chính Sách
            </button>
            <button
              onClick={() => setActiveTab("specs")}
              className={`text-xs font-bold pb-1 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "specs"
                  ? "text-orange-600 border-b-2 border-orange-600"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Thông Số Kỹ Thuật ({product.attributes?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={`text-xs font-bold pb-1 transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                activeTab === "reviews"
                  ? "text-orange-600 border-b-2 border-orange-600"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
              <span>Đánh Giá Khách Hàng ({product.reviewCount || 0})</span>
            </button>
          </div>

          {/* Tab contents */}
          {activeTab === "desc" && (
            <div className="max-h-[28rem] space-y-5 overflow-y-auto pr-2">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
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
            <div className="space-y-2.5 max-h-60 sm:max-h-72 overflow-y-auto pr-2">
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

        {/* Sticky Mobile Bottom Bar (Always available when scrolling on mobile) */}
        <div className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-stone-200/90 p-3 flex items-center justify-between gap-2 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] text-stone-500 truncate">{getVariantDisplayName(selectedVariant)}</div>
            <div className="text-base font-black text-orange-600 leading-tight">
              {totalPriceCalculated.toLocaleString("vi-VN")}đ
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isOutOfStock}
              onClick={handleAddToCartClick}
              className="px-3.5 py-2.5 rounded-xl font-bold text-xs bg-orange-50 text-orange-600 border border-orange-200 flex items-center gap-1 active:scale-95 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Thêm Giỏ</span>
            </button>
            <button
              type="button"
              disabled={isOutOfStock}
              onClick={handleBuyNowClick}
              className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-orange-600 to-amber-600 shadow-md shadow-orange-500/25 flex items-center gap-1 active:scale-95 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Mua Ngay</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
