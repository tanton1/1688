import React from "react";
import { WebProduct } from "@hub1688/shared-types";
import { ShoppingBag, Eye, Video, Sparkles, Check } from "lucide-react";

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
  // Giả lập giá niêm yết cũ để kích thích mua hàng (khoảng +25-35%)
  const originalPrice = Math.round(minPrice * 1.32 / 1000) * 1000;
  const discountPercent = originalPrice > minPrice ? Math.round(((originalPrice - minPrice) / originalPrice) * 100) : 0;

  const totalStock = (product.variants || []).reduce((acc, v) => acc + (v.stockQuantity || 0), 0);
  const isOutOfStock = totalStock <= 0;

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 hover:border-orange-400 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col h-full relative">
      {/* Image & Badges */}
      <div
        className="relative aspect-square overflow-hidden bg-slate-100 cursor-pointer"
        onClick={() => onSelect(product)}
      >
        <img
          src={product.primaryImage || "https://placehold.co/400x400?text=San+Pham"}
          alt={product.titleVI}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Video Badge */}
        {product.videoUrl && (
          <span className="absolute top-2.5 left-2.5 bg-purple-600/90 backdrop-blur-xs text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
            <Video className="w-3 h-3" />
            <span>Video</span>
          </span>
        )}

        {/* Discount Badge */}
        {discountPercent > 0 && (
          <span className="absolute top-2.5 right-2.5 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md">
            -{discountPercent}%
          </span>
        )}

        {/* Category Tag */}
        {product.categoryName && (
          <span className="absolute bottom-2.5 left-2.5 bg-slate-900/70 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
            {product.categoryName}
          </span>
        )}

        {/* Quick View Floating Overlay Button */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(product);
            }}
            className="px-4 py-2 bg-white/95 hover:bg-white text-slate-900 text-xs font-bold rounded-xl shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5 text-orange-600" />
            <span>Xem Nhanh</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Title */}
        <h3
          onClick={() => onSelect(product)}
          className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-orange-600 cursor-pointer line-clamp-2 leading-snug mb-2 flex-1"
          title={product.titleVI}
        >
          {product.titleVI}
        </h3>

        {/* Attributes / Stock info */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-3">
          <span>{product.variants?.length || 1} biến thể</span>
          <span className={isOutOfStock ? "text-rose-600 font-bold" : "text-emerald-600 font-medium"}>
            {isOutOfStock ? "Tạm hết hàng" : `Còn ${totalStock.toLocaleString()} cái`}
          </span>
        </div>

        {/* Price Box */}
        <div className="pt-2 border-t border-slate-100 flex items-end justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-black text-orange-600">
                {minPrice.toLocaleString("vi-VN")}đ
              </span>
              {maxPrice > minPrice && (
                <span className="text-xs font-bold text-orange-500">
                  - {maxPrice.toLocaleString("vi-VN")}đ
                </span>
              )}
            </div>
            {originalPrice > minPrice && (
              <span className="text-[11px] text-slate-400 line-through">
                {originalPrice.toLocaleString("vi-VN")}đ
              </span>
            )}
          </div>

          {/* Add to Cart Button */}
          <button
            disabled={isOutOfStock}
            onClick={(e) => {
              e.stopPropagation();
              onQuickAdd(product);
            }}
            className={`p-2.5 rounded-xl font-bold text-xs transition-all active:scale-90 flex items-center justify-center cursor-pointer ${
              isOutOfStock
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white border border-orange-200 hover:border-orange-600 shadow-xs"
            }`}
            title="Thêm nhanh vào giỏ hàng"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
