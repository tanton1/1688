import React, { useState, useEffect } from "react";
import { WebProduct, WebProductVariant } from "@hub1688/shared-types";
import {
  X,
  ShoppingBag,
  Zap,
  Check,
  Truck,
  ShieldCheck,
  RotateCcw,
  Video,
  Ruler,
  Info,
  ChevronRight,
  Sparkles,
  ImageIcon
} from "lucide-react";

interface StoreProductDetailModalProps {
  isOpen: boolean;
  product: WebProduct | null;
  onClose: () => void;
  onAddToCart: (variant: WebProductVariant, quantity: number, product: WebProduct) => void;
  onBuyNow: (variant: WebProductVariant, quantity: number, product: WebProduct) => void;
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
  const [activeTab, setActiveTab] = useState<"desc" | "specs" | "detail_images">("desc");

  useEffect(() => {
    if (product) {
      const firstVar = validVariants[0] || product.variants[0];
      setSelectedVariant(firstVar);
      setActiveMedia({
        type: "image",
        url: firstVar?.imageUrl || product.primaryImage || ""
      });
      setQuantity(1);
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

  const currentPrice = selectedVariant?.sellingPriceVND || product.minPriceVND || 0;
  const originalPrice = Math.round(currentPrice * 1.32 / 1000) * 1000;
  const currentStock = selectedVariant?.stockQuantity ?? 0;
  const isOutOfStock = currentStock <= 0;

  // Gom tất cả ảnh không trùng lặp
  const allImages = Array.from(
    new Set([
      product.primaryImage,
      ...(product.galleryImages || []),
      ...(product.variants || []).map(v => v.imageUrl).filter(Boolean)
    ])
  ).filter(Boolean) as string[];

  const hasDetailImages = product.detailImages && product.detailImages.length > 0;

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
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner flex items-center justify-center">
              {activeMedia.type === "video" && product.videoUrl ? (
                <video
                  src={product.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <img
                  src={activeMedia.url || "https://placehold.co/600x600?text=San+Pham"}
                  alt={product.titleVI}
                  className="w-full h-full object-cover transition-all duration-300"
                />
              )}

              {product.videoUrl && activeMedia.type !== "video" && (
                <button
                  onClick={() => setActiveMedia({ type: "video", url: product.videoUrl! })}
                  className="absolute bottom-4 right-4 bg-purple-600/90 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-lg backdrop-blur-xs transition-all"
                >
                  <Video className="w-4 h-4" />
                  <span>Xem Video Sản Phẩm</span>
                </button>
              )}
            </div>

            {/* Thumbnail Strip */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
              {product.videoUrl && (
                <button
                  onClick={() => setActiveMedia({ type: "video", url: product.videoUrl! })}
                  className={`shrink-0 w-16 h-16 rounded-xl border-2 overflow-hidden flex flex-col items-center justify-center text-[10px] font-bold transition-all ${
                    activeMedia.type === "video"
                      ? "border-purple-600 bg-purple-50 text-purple-700 shadow-sm"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <Video className="w-5 h-5 text-purple-600 mb-0.5" />
                  <span>Video</span>
                </button>
              )}

              {allImages.slice(0, 10).map((imgUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveMedia({ type: "image", url: imgUrl })}
                  className={`shrink-0 w-16 h-16 rounded-xl border-2 overflow-hidden transition-all ${
                    activeMedia.type === "image" && activeMedia.url === imgUrl
                      ? "border-orange-500 shadow-md scale-95"
                      : "border-slate-200 hover:border-slate-300 opacity-80 hover:opacity-100"
                  }`}
                >
                  <img src={imgUrl} alt="thumb" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* Trust Perks */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <Truck className="w-4 h-4 text-orange-600 mx-auto mb-1" />
                <p className="text-[11px] font-bold text-slate-800">Giao Nhanh</p>
                <p className="text-[10px] text-slate-500">Toàn quốc 2-4 ngày</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <ShieldCheck className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                <p className="text-[11px] font-bold text-slate-800">Kiểm Tra Hàng</p>
                <p className="text-[10px] text-slate-500">Ưng ý mới thanh toán</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <RotateCcw className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                <p className="text-[11px] font-bold text-slate-800">Đổi Trả 7 Ngày</p>
                <p className="text-[10px] text-slate-500">Lỗi 1 đổi 1 tận nơi</p>
              </div>
            </div>
          </div>

          {/* Cột Phải: Thông tin chi tiết & Mua hàng */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-5">
            <div>
              {/* Category & Badge */}
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 bg-orange-100 text-orange-700 font-extrabold text-[10px] rounded-full">
                  {product.categoryName || "Thời Trang Sỉ"}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Mã SKU: {product.skuCode || "N/A"}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                {product.titleVI}
              </h2>
              {product.titleEN && (
                <p className="text-xs text-blue-600 font-medium mt-1">
                  🇬🇧 {product.titleEN}
                </p>
              )}

              {/* Price Box */}
              <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-orange-50/70 via-amber-50/40 to-white border border-orange-200/80">
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl sm:text-3xl font-black text-orange-600 tracking-tight">
                    {currentPrice.toLocaleString("vi-VN")}đ
                  </span>
                  {originalPrice > currentPrice && (
                    <span className="text-sm text-slate-400 line-through">
                      {originalPrice.toLocaleString("vi-VN")}đ
                    </span>
                  )}
                  <span className="px-2 py-0.5 bg-rose-500 text-white font-bold text-xs rounded-full">
                    Tiết Kiệm 30%
                  </span>
                </div>

                {/* Bảng giá sỉ bậc thang nếu có */}
                {product.priceTiers && product.priceTiers.length > 1 && (
                  <div className="mt-3 pt-3 border-t border-orange-200/60">
                    <p className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Ưu đãi giá sỉ theo số lượng:
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {product.priceTiers.map((tier, idx) => (
                        <div key={idx} className="p-2 bg-white rounded-lg border border-orange-100 text-center shadow-2xs">
                          <p className="text-[10px] text-slate-500 font-medium">Từ {tier.minQuantity} cái</p>
                          <p className="text-xs font-bold text-orange-600">
                            {(tier.priceVND || Math.round(tier.priceCNY * 3650)).toLocaleString()}đ
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Variant Selector */}
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900">
                    Chọn Phân Loại / Màu Sắc / Kích Cỡ:
                  </label>
                  <span className="text-[11px] font-bold text-orange-600">
                    {getVariantDisplayName(selectedVariant)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
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

              {/* Quantity Selector */}
              <div className="mt-5 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Số lượng:</span>
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
                  onClick={() => onAddToCart(selectedVariant, quantity, product)}
                  className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
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
                  onClick={() => onBuyNow(selectedVariant, quantity, product)}
                  className={`py-3 px-4 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer ${
                    isOutOfStock
                      ? "bg-slate-300 cursor-not-allowed"
                      : "bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-orange-500/25"
                  }`}
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Mua Ngay</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs: Description, Specs, Detail Images */}
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
              Mô Tả Sản Phẩm
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
            {hasDetailImages && (
              <button
                onClick={() => setActiveTab("detail_images")}
                className={`text-xs font-bold pb-1 transition-all flex items-center gap-1 ${
                  activeTab === "detail_images"
                    ? "text-orange-600 border-b-2 border-orange-600"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Ảnh Chi Tiết / Bảng Size ({product.detailImages?.length})</span>
              </button>
            )}
          </div>

          {/* Content corresponding to tab */}
          {activeTab === "desc" && (
            <div className="text-xs text-slate-700 leading-relaxed space-y-3 max-h-72 overflow-y-auto pr-2 whitespace-pre-line">
              {product.fullDescVI || product.shortDescVI || "Sản phẩm được nhập trực tiếp từ xưởng uy tín, bảo đảm chất lượng theo tiêu chuẩn xuất khẩu."}
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

          {activeTab === "detail_images" && hasDetailImages && (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {product.detailImages?.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Detail ${idx + 1}`}
                  className="w-full rounded-xl border border-slate-200"
                  loading="lazy"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
