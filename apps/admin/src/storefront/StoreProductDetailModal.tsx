import React, { useState, useEffect, useMemo } from "react";
import { WebProduct, WebProductVariant } from "@hub1688/shared-types";
import { LiveCustomizerEngine } from "./LiveCustomizerEngine";
import { useAccessibleDialog } from "../hooks/useAccessibleDialog";
import {
  X,
  ShoppingBag,
  Zap,
  Check,
  Truck,
  ShieldCheck,
  RotateCcw,
  Video,
  Sparkles,
  Gift,
  Clock,
  Star,
  Flame,
  CheckCircle2,
  ImageIcon,
  Share2
} from "lucide-react";

interface StoreProductDetailModalProps {
  isOpen: boolean;
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
  isOpen,
  product,
  onClose,
  onAddToCart,
  onBuyNow
}) => {
  const dialogRef = useAccessibleDialog<HTMLDivElement>(isOpen, onClose);
  if (!isOpen) return null;

  const validVariants = (product.variants || []).filter(v => v.selectedForSale !== false);
  const [selectedVariant, setSelectedVariant] = useState<WebProductVariant>(validVariants[0] || product.variants[0]);
  const [activeMedia, setActiveMedia] = useState<{ type: "image" | "video"; url: string }>({
    type: "image",
    url: product.primaryImage || ""
  });
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

  const handleSelectVariant = (variant: WebProductVariant) => {
    setSelectedVariant(variant);
    if (variant.imageUrl) {
      setActiveMedia({ type: "image", url: variant.imageUrl });
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
  const originalPrice = Math.round((basePrice * 1.32) / 1000) * 1000;
  const currentStock = selectedVariant?.stockQuantity ?? 0;
  const isOutOfStock = currentStock <= 0;

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

  const totalPriceCalculated = currentPrice * quantity + addonsTotal;

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
              {activeMedia.type === "video" ? (
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
                    <Sparkles size={11} /> Cá Nhân Hóa 100%
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
              {product.videoUrl && (
                <button
                  type="button"
                  onClick={() => setActiveMedia({ type: "video", url: product.videoUrl! })}
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
                  onClick={() => setActiveMedia({ type: "image", url: img })}
                  className={`relative shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    activeMedia.type === "image" && activeMedia.url === img
                      ? "border-orange-600 ring-2 ring-orange-500/20"
                      : "border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* Urgency & Guarantee banner */}
            <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200/80 rounded-2xl p-3 sm:p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-orange-950">
                <Flame size={15} className="text-orange-600 fill-orange-500 shrink-0" />
                <span>Hơn 1,200+ khách hàng đã đánh giá 5 sao cho sản phẩm này</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-stone-700">
                <Clock size={13} className="text-stone-500 shrink-0" />
                <span>
                  Đặt trong <strong>02h 15m</strong> tới để được ưu tiên lên khuôn in sớm nhất
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-stone-700">
                <Truck size={13} className="text-emerald-600 shrink-0" />
                <span>Miễn phí vận chuyển toàn quốc cho đơn từ 500.000đ</span>
              </div>
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
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={13} className="fill-current" />
                    ))}
                  </div>
                  <span className="font-extrabold text-stone-900">{product.rating || 4.9}</span>
                  <span className="text-stone-400 text-[11px]">({product.reviewCount || 1200} đánh giá)</span>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-base sm:text-xl font-black text-stone-900 mt-2 leading-snug">
                {product.titleVI}
              </h1>

              {/* Price Display */}
              <div className="mt-2.5 flex items-baseline gap-2.5 p-3 rounded-2xl bg-stone-50 border border-stone-200/80">
                <span className="text-2xl sm:text-3xl font-black text-orange-600 tracking-tight">
                  {currentPrice.toLocaleString("vi-VN")}đ
                </span>
                {originalPrice > currentPrice && (
                  <span className="text-xs sm:text-sm font-medium text-stone-400 line-through">
                    {originalPrice.toLocaleString("vi-VN")}đ
                  </span>
                )}
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

              {/* Variant Selector */}
              {validVariants.length > 1 && (
                <div className="mt-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-stone-900">
                      Quy cách / Phân loại:
                    </span>
                    <span className="text-xs text-orange-600 font-bold">
                      {getVariantDisplayName(selectedVariant)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                    {validVariants.map((v, idx) => {
                      const isSelected = selectedVariant?.sourceSkuId === v.sourceSkuId;
                      const displayName = getVariantDisplayName(v);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectVariant(v)}
                          className={`flex items-center gap-1.5 p-1.5 pr-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                            isSelected
                              ? "border-orange-500 bg-orange-50 text-orange-700 shadow-xs ring-2 ring-orange-400/20 font-bold"
                              : "border-stone-200 hover:border-stone-300 text-stone-700 bg-white"
                          }`}
                        >
                          {v.imageUrl && (
                            <img
                              src={v.imageUrl}
                              alt={displayName}
                              className="w-6 h-6 rounded-lg object-cover border border-stone-200"
                            />
                          )}
                          <span>{displayName}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-orange-600 ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>
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
                      className="px-3 py-1.5 hover:bg-stone-200 font-bold text-stone-700 transition-colors text-sm cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-4 py-1.5 font-bold text-xs bg-white text-stone-900 min-w-[36px] text-center">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
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
              <span>Đánh Giá Khách Hàng ({product.reviewCount || 1200})</span>
            </button>
          </div>

          {/* Tab contents */}
          {activeTab === "desc" && (
            <div className="text-xs text-stone-700 leading-relaxed space-y-3 max-h-60 sm:max-h-72 overflow-y-auto pr-2 whitespace-pre-line">
              {product.fullDescVI ||
                product.shortDescVI ||
                "Sản phẩm được gia công tỉ mỉ bằng công nghệ in UV và cắt laser độ nét cao, bảo đảm sắc nét và bền bỉ theo thời gian."}
            </div>
          )}

          {activeTab === "specs" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
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
              <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-stone-800">
                    <span>Nguyễn Thùy Dung</span>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                      <CheckCircle2 size={10} /> Đã mua hàng
                    </span>
                  </div>
                  <div className="flex text-amber-400 text-xs">★★★★★</div>
                </div>
                <p className="text-xs text-stone-600">
                  "Sản phẩm đẹp hơn cả mong đợi! Biển đèn LED phát sáng rất ấm áp, chữ khắc laser sắc nét. Bạn mình nhận quà thích mê ly. Sẽ tiếp tục ủng hộ shop!"
                </p>
                <span className="text-[10px] text-stone-400">2 ngày trước • Đã mua: Đế Gỗ LED Vàng Ấm</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-stone-800">
                    <span>Trần Quốc Bảo</span>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                      <CheckCircle2 size={10} /> Đã mua hàng
                    </span>
                  </div>
                  <div className="flex text-amber-400 text-xs">★★★★★</div>
                </div>
                <p className="text-xs text-stone-600">
                  "Ly giữ nhiệt in hình 2 đứa bạn thân giống y xì đúc trên bản dựng preview luôn. Đóng gói hộp quà rất sang trọng, giao nhanh kịp sinh nhật."
                </p>
                <span className="text-[10px] text-stone-400">5 ngày trước • Đã mua: Ly 20oz Skinny</span>
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
