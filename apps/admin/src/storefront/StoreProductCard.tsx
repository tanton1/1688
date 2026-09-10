import React from "react";
import { WebProduct } from "@hub1688/shared-types";
import { ShoppingBag, Eye, Video, Sparkles, Star, Heart } from "lucide-react";

interface StoreProductCardProps {
  product: WebProduct;
  onSelect: (product: WebProduct) => void;
  onQuickAdd: (product: WebProduct) => void;
}

export const StoreProductCard: React.FC<StoreProductCardProps> = ({
  product,
  onSelect,
  onQuickAdd
}) => {
  const minPrice = product.minPriceVND || 0;
  const maxPrice = product.maxPriceVND || minPrice;
  const originalPrice = Math.round((minPrice * 1.32) / 1000) * 1000;
  const discountPercent =
    originalPrice > minPrice
      ? Math.round(((originalPrice - minPrice) / originalPrice) * 100)
      : 0;

  const totalStock = (product.variants || []).reduce(
    (acc, v) => acc + (v.stockQuantity || 0),
    0
  );
  const isOutOfStock = totalStock <= 0;

  return (
    <article
      onClick={() => onSelect(product)}
      className="group bg-white rounded-2xl sm:rounded-3xl border border-stone-200/90 hover:border-orange-500/80 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col h-full relative cursor-pointer select-none"
    >
      {/* Product Image & Floating Badges */}
      <div className="relative aspect-square overflow-hidden bg-stone-100">
        <img
          loading="lazy"
          decoding="async"
          src={product.primaryImage || "https://placehold.co/400x400?text=San+Pham"}
          alt={product.titleVI}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Top Badges (Left) */}
        <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 flex flex-col gap-1 items-start z-10">
          {product.isPersonalized && (
            <span className="bg-orange-600/95 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm uppercase tracking-wider">
              <Sparkles className="w-2.5 h-2.5" />
              <span>Custom</span>
            </span>
          )}

          {product.videoUrl && (
            <span className="bg-purple-600/90 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <Video className="w-2.5 h-2.5" />
              <span className="hidden sm:inline">Video</span>
            </span>
          )}
        </div>

        {/* Discount Badge (Right) */}
        {discountPercent > 0 && (
          <span className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 bg-rose-600 text-white text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm z-10">
            -{discountPercent}%
          </span>
        )}

        {/* Category Pill */}
        {product.categoryName && (
          <span className="absolute bottom-2 left-2 sm:bottom-2.5 sm:left-2.5 bg-stone-900/75 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-lg z-10 truncate max-w-[80%]">
            {product.categoryName}
          </span>
        )}

        {/* Quick View Floating Overlay Button (Desktop) */}
        <div className="hidden sm:flex absolute inset-0 bg-stone-900/25 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center p-4">
          <span className="px-4 py-2 bg-white text-stone-900 text-xs font-black rounded-xl shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-orange-600" />
            <span>Tùy Biến & Xem Nhanh</span>
          </span>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-2.5 sm:p-4 flex flex-col flex-1 justify-between">
        <div>
          {/* Rating stars & review count */}
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-amber-500 font-bold mb-1">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={11} className="fill-current text-amber-400" />
              ))}
            </div>
            <span className="text-stone-800 text-[10px] font-extrabold">{product.rating || 4.9}</span>
            <span className="text-stone-400 text-[10px]">({product.reviewCount || 980})</span>
          </div>

          {/* Title */}
          <h3
            className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-orange-600 line-clamp-2 leading-snug mb-1.5 transition-colors"
            title={product.titleVI}
          >
            {product.titleVI}
          </h3>

          {/* Volume Discount Tag */}
          {product.volumeDiscountTiers && product.volumeDiscountTiers.length > 1 && (
            <div className="mb-2">
              <span className="text-[9px] sm:text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-1.5 sm:px-2 py-0.5 rounded-md inline-block">
                Mua 2 Giảm 10% • Mua 3 Freeship
              </span>
            </div>
          )}
        </div>

        {/* Price & Quick Add Box */}
        <div className="pt-2 border-t border-stone-100 flex items-end justify-between gap-1.5">
          <div className="min-w-0">
            <div className="flex items-baseline gap-1 flex-wrap">
              <span className="text-sm sm:text-base font-black text-orange-600 tracking-tight">
                {minPrice.toLocaleString("vi-VN")}đ
              </span>
              {maxPrice > minPrice && (
                <span className="text-[10px] sm:text-xs font-bold text-orange-500">
                  ~ {maxPrice.toLocaleString("vi-VN")}đ
                </span>
              )}
            </div>
            {originalPrice > minPrice && (
              <span className="text-[10px] text-stone-400 line-through block">
                {originalPrice.toLocaleString("vi-VN")}đ
              </span>
            )}
          </div>

          {/* Touch-Friendly Action Button */}
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={(e) => {
              e.stopPropagation();
              onQuickAdd(product);
            }}
            className={`min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] p-2 sm:p-2.5 rounded-xl font-bold text-xs transition-all active:scale-90 flex items-center justify-center cursor-pointer shrink-0 ${
              isOutOfStock
                ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                : "bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white border border-orange-200 hover:border-orange-600 shadow-xs"
            }`}
            title="Thêm nhanh vào giỏ hàng"
            aria-label="Thêm nhanh vào giỏ hàng"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
        </div>
      </div>
    </article>
  );
};
