import React, { useState, useEffect, useMemo } from "react";
import { WebProduct, WebProductVariant } from "@hub1688/shared-types";
import { LiveCustomizerEngine } from "./LiveCustomizerEngine";
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
  ImageIcon
} from "lucide-react";

interface StoreProductDetailModalProps {
  isOpen: boolean;
  product: WebProduct | null;
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
  if (!isOpen || !product) return null;

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
    return parts.length > 0 ? parts.join(" - ") : (v.sourceSkuId || "Phân loại mặc định");
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
  const originalPrice = Math.round(basePrice * 1.32 / 1000) * 1000;
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto border border-slate-200 flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors shadow-xs"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Cột Trái: Media Gallery & Video */}
          <div className="lg:col-span-6 space-y-4">
            {/* Active Display Window */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner group">
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

              {/* Macorner Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                {product.isPersonalized && (
                  <span className="bg-orange-600 text-white font-black text-[10px] px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 uppercase tracking-wider">
                    <Sparkles size={11} /> Cá Nhân Hóa 100%
                  </span>
                )}
                {discountPercent > 0 && (
                  <span className="bg-emerald-600 text-white font-black text-[10px] px-2.5 py-1 rounded-full shadow-md">
                    Giảm {discountPercent}% Số Lượng
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnails list */}
            <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar">
              {product.videoUrl && (
                <button
                  type="button"
                  onClick={() => setActiveMedia({ type: "video", url: product.videoUrl! })}
                  className={`relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all flex flex-col items-center justify-center bg-slate-900 text-white ${
                    activeMedia.type === "video" ? "border-orange-600 ring-2 ring-orange-500/20" : "border-slate-200"
                  }`}
                >
                  <Video className="w-5 h-5 text-orange-400 mb-0.5" />
                  <span className="text-[9px] font-bold">Video</span>
                </button>
              )}

              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveMedia({ type: "image", url: img })}
                  className={`relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                    activeMedia.type === "image" && activeMedia.url === img
                      ? "border-orange-600 ring-2 ring-orange-500/20"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* Urgency and Guarantee banner */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/80 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-orange-950">
                <Flame size={16} className="text-orange-600 fill-orange-500 shrink-0" />
                <span>Đã có hơn 1,200+ khách hàng hài lòng đánh giá 5 sao</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-700">
                <Clock size={14} className="text-slate-500 shrink-0" />
                <span>
                  Đặt trong <strong>02h 15m</strong> tới để được ưu tiên lên khuôn in & gửi hàng sớm nhất
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-700">
                <Truck size={14} className="text-emerald-600 shrink-0" />
                <span>Miễn phí vận chuyển toàn quốc cho đơn hàng từ 500.000đ</span>
              </div>
            </div>
          </div>

          {/* Cột Phải: Thông Tin, Trình Customizer & Đặt Mua */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-5">
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
                  <span className="font-bold text-slate-800">{product.rating || 4.9}</span>
                  <span className="text-slate-400 text-[11px]">({product.reviewCount || 1200} đánh giá)</span>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-lg sm:text-xl font-black text-slate-900 mt-2 leading-snug">
                {product.titleVI}
              </h1>

              {/* Price Display */}
              <div className="mt-3 flex items-baseline gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-2xl sm:text-3xl font-black text-orange-600">
                  {currentPrice.toLocaleString("vi-VN")}đ
                </span>
                {originalPrice > currentPrice && (
                  <span className="text-sm font-medium text-slate-400 line-through">
                    {originalPrice.toLocaleString("vi-VN")}đ
                  </span>
                )}
                {discountPercent > 0 && (
                  <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">
                    Tiết kiệm {discountPercent}%
                  </span>
                )}
              </div>

              {/* Volume Discount Tier Selectors (Macorner style) */}
              {product.volumeDiscountTiers && product.volumeDiscountTiers.length > 1 && (
                <div className="mt-4">
                  <span className="text-xs font-bold text-slate-900 block mb-2">
                    Ưu đãi mua nhiều giảm giá (Volume Discounts):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {product.volumeDiscountTiers.map((tier, idx) => {
                      const isTierActive = activeDiscountTier?.minQty === tier.minQty;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setQuantity(tier.minQty)}
                          className={`p-2 rounded-xl text-left border transition-all text-xs flex flex-col justify-between ${
                            isTierActive
                              ? "border-orange-500 bg-orange-50 text-orange-950 ring-2 ring-orange-500/20 font-bold"
                              : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <span className="text-[11px] font-semibold">{tier.badgeText}</span>
                          <span className="text-[10px] text-slate-500 mt-0.5">
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
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900">
                      Tùy chọn quy cách / Kích thước:
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
                          onClick={() => handleSelectVariant(v)}
                          className={`flex items-center gap-2 p-1.5 pr-3 rounded-xl border text-xs font-medium transition-all ${
                            isSelected
                              ? "border-orange-500 bg-orange-50 text-orange-700 shadow-xs ring-2 ring-orange-400/20 font-bold"
                              : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                          }`}
                        >
                          {v.imageUrl && (
                            <img
                              src={v.imageUrl}
                              alt={displayName}
                              className="w-7 h-7 rounded-lg object-cover border border-slate-200"
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

              {/* Live Personalization Engine (Macorner Signature Feature) */}
              {product.isPersonalized && (
                <div className="mt-5">
                  <LiveCustomizerEngine
                    product={product}
                    values={customizationValues}
                    onChange={handleCustomizerChange}
                  />
                </div>
              )}

              {/* Gift Add-ons Upsells */}
              {product.giftAddons && product.giftAddons.length > 0 && (
                <div className="mt-5 p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/70">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950 mb-2">
                    <Gift size={15} className="text-amber-700" />
                    <span>Dịch vụ & Quà tặng kèm (Nâng cấp trải nghiệm):</span>
                  </div>
                  <div className="space-y-2">
                    {product.giftAddons.map(addon => {
                      const isChecked = selectedAddons.includes(addon.id);
                      return (
                        <label
                          key={addon.id}
                          onClick={() => toggleAddon(addon.id)}
                          className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                            isChecked
                              ? "bg-white border-amber-400 shadow-xs font-medium"
                              : "bg-transparent border-transparent hover:bg-white/60 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly
                              className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                            />
                            <div>
                              <span className="font-bold text-slate-900">{addon.title}</span>
                              {addon.description && (
                                <p className="text-[10px] text-slate-500">{addon.description}</p>
                              )}
                            </div>
                          </div>
                          <span className="font-bold text-orange-700 shrink-0 ml-2">
                            +{addon.priceVND.toLocaleString("vi-VN")}đ
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="mt-5 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Số lượng món:</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="px-3 py-1.5 hover:bg-slate-200 font-bold text-slate-600 transition-colors text-sm"
                    >
                      -
                    </button>
                    <span className="px-4 py-1.5 font-bold text-xs bg-white text-slate-900 min-w-[36px] text-center">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(q => q + 1)}
                      className="px-3 py-1.5 hover:bg-slate-200 font-bold text-slate-600 transition-colors text-sm"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {isOutOfStock ? "Tạm hết hàng" : `(Còn ${currentStock.toLocaleString()} cái)`}
                  </span>
                </div>
              </div>
            </div>

            {/* Action CTA Buttons */}
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <div className="grid grid-cols-2 gap-3">
                <button
                  disabled={isOutOfStock}
                  onClick={handleAddToCartClick}
                  className={`py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                    isOutOfStock
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 shadow-xs"
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Thêm Vào Giỏ</span>
                </button>

                <button
                  disabled={isOutOfStock}
                  onClick={handleBuyNowClick}
                  className={`py-3.5 px-4 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer ${
                    isOutOfStock
                      ? "bg-slate-300 cursor-not-allowed"
                      : "bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-orange-500/30"
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
        <div className="border-t border-slate-200 px-6 sm:px-8 py-6 bg-slate-50/50 rounded-b-3xl">
          <div className="flex items-center gap-4 border-b border-slate-200 pb-3 mb-4">
            <button
              onClick={() => setActiveTab("desc")}
              className={`text-xs font-bold pb-1 transition-all ${
                activeTab === "desc"
                  ? "text-orange-600 border-b-2 border-orange-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Mô Tả Sản Phẩm & Chính Sách
            </button>
            <button
              onClick={() => setActiveTab("specs")}
              className={`text-xs font-bold pb-1 transition-all ${
                activeTab === "specs"
                  ? "text-orange-600 border-b-2 border-orange-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Thông Số Kỹ Thuật ({product.attributes?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={`text-xs font-bold pb-1 transition-all flex items-center gap-1 ${
                activeTab === "reviews"
                  ? "text-orange-600 border-b-2 border-orange-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
              <span>Đánh Giá Khách Hàng ({product.reviewCount || 1200})</span>
            </button>
          </div>

          {/* Tab contents */}
          {activeTab === "desc" && (
            <div className="text-xs text-slate-700 leading-relaxed space-y-3 max-h-72 overflow-y-auto pr-2 whitespace-pre-line">
              {product.fullDescVI || product.shortDescVI || "Sản phẩm được gia công tỉ mỉ bằng công nghệ in UV và cắt laser độ nét cao, bảo đảm sắc nét và bền bỉ theo thời gian."}
            </div>
          )}

          {activeTab === "specs" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {(product.attributes || []).map((attr, idx) => (
                <div key={idx} className="flex p-2 rounded-lg bg-white border border-slate-200/80">
                  <span className="font-semibold text-slate-500 w-1/3 truncate">{attr.keyVI || attr.keyCN}:</span>
                  <span className="font-bold text-slate-800 w-2/3 truncate">{attr.valueVI || attr.valueCN}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <span>Nguyễn Thùy Dung</span>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                      <CheckCircle2 size={10} /> Đã mua hàng
                    </span>
                  </div>
                  <div className="flex text-amber-400 text-xs">★★★★★</div>
                </div>
                <p className="text-xs text-slate-600">
                  "Sản phẩm đẹp hơn cả mong đợi! Biển đèn LED phát sáng rất ấm áp, chữ khắc laser sắc nét. Bạn mình nhận quà thích mê ly. Sẽ tiếp tục ủng hộ shop!"
                </p>
                <span className="text-[10px] text-slate-400">2 ngày trước • Đã mua: Đế Gỗ LED Vàng Ấm</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <span>Trần Quốc Bảo</span>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                      <CheckCircle2 size={10} /> Đã mua hàng
                    </span>
                  </div>
                  <div className="flex text-amber-400 text-xs">★★★★★</div>
                </div>
                <p className="text-xs text-slate-600">
                  "Ly giữ nhiệt in hình 2 đứa bạn thân giống y xì đúc trên bản dựng preview luôn. Đóng gói hộp quà rất sang trọng, giao nhanh kịp sinh nhật."
                </p>
                <span className="text-[10px] text-slate-400">5 ngày trước • Đã mua: Ly 20oz Skinny</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
