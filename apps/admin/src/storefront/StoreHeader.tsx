import React from "react";
import {
  ShoppingBag,
  Search,
  Phone,
  Layers,
  ArrowLeft,
  Truck,
  PackageCheck,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Heart
} from "lucide-react";
import { StorefrontConfig } from "@hub1688/shared-types";

interface StoreHeaderProps {
  config: StorefrontConfig;
  cartCount: number;
  onOpenCart: () => void;
  searchTerm: string;
  onSearchChange: (q: string) => void;
  onOpenTracker: () => void;
  onBackToAdmin: () => void;
}

const TRENDING_SEARCHES = ["Biển Mica LED", "Ly Giữ Nhiệt", "Đồ Treo Cây", "Cặp Đôi", "Cún Cưng"];

export const StoreHeader: React.FC<StoreHeaderProps> = ({
  config,
  cartCount,
  onOpenCart,
  searchTerm,
  onSearchChange,
  onOpenTracker,
  onBackToAdmin
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-xs">
      {/* Top Notification Announcement Bar */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 text-white text-[11px] sm:text-xs font-semibold py-1.5 px-3 sm:px-6 flex items-center justify-between shadow-inner">
        <div className="hidden md:flex items-center gap-2">
          <Truck className="w-3.5 h-3.5 text-amber-200" />
          <span>
            Miễn phí giao hàng toàn quốc đơn từ{" "}
            <strong className="text-amber-100 underline decoration-amber-300">
              {config.freeShipThresholdVND ? `${config.freeShipThresholdVND.toLocaleString("vi-VN")}đ` : "500.000đ"}
            </strong>
          </span>
        </div>

        <div className="mx-auto md:mx-0 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-200 shrink-0" />
          <span className="tracking-wide">
            Cá Nhân Hóa Tên & Ảnh Trực Tiếp • Xem Trước Bản Vẽ 100% Thực Tế
          </span>
        </div>

        <div className="hidden md:flex items-center gap-3 text-orange-100">
          <a
            href={`tel:${config.hotline || "0988.888.888"}`}
            className="hover:text-white flex items-center gap-1 font-bold transition-colors"
          >
            <Phone className="w-3 h-3 text-amber-300" />
            <span>Hotline: {config.hotline || "0988.888.888"}</span>
          </a>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand / Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onBackToAdmin}
              className="p-2 -ml-1.5 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
              title="Quay lại Hub Quản Trị"
              aria-label="Quay lại Hub Quản Trị"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div
              className="flex items-center gap-2.5 cursor-pointer select-none group"
              onClick={() => onSearchChange("")}
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/25 group-hover:scale-105 transition-transform">
                <Heart className="w-5 h-5 fill-white/20" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-stone-900 text-base sm:text-lg tracking-tight group-hover:text-orange-600 transition-colors">
                    {config.storeName || "1688 STORE"}
                  </span>
                  <span className="bg-orange-100 text-orange-700 text-[10px] font-black px-1.5 py-0.5 rounded-md border border-orange-200">
                    CRAFT
                  </span>
                </div>
                <p className="text-[10px] text-stone-500 truncate max-w-[180px] sm:max-w-[260px]">
                  {config.tagline || "Quà Tặng & Đồ Trang Trí Cá Nhân Hóa Độc Bản"}
                </p>
              </div>
            </div>
          </div>

          {/* Search Bar on Desktop (hidden on mobile, rendered below) */}
          <div className="hidden md:flex flex-1 max-w-md lg:max-w-lg mx-2">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Tìm quà tặng, biển mica LED, ly giữ nhiệt, áo thun..."
                className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-stone-100 hover:bg-stone-100/80 focus:bg-white border border-transparent focus:border-orange-500 rounded-full outline-hidden transition-all text-stone-800 placeholder-stone-400 focus:ring-3 focus:ring-orange-500/15"
              />
              {searchTerm && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full hover:bg-stone-200"
                  aria-label="Xóa tìm kiếm"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Quick Hotline Call on Mobile */}
            <a
              href={`tel:${config.hotline || "0988.888.888"}`}
              className="md:hidden p-2 text-stone-600 hover:text-orange-600 rounded-xl hover:bg-orange-50 transition-colors"
              title="Gọi Hotline tư vấn"
              aria-label="Gọi hotline"
            >
              <Phone className="w-4 h-4 text-orange-600" />
            </a>

            {/* Order Tracker */}
            <button
              onClick={onOpenTracker}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-stone-700 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors cursor-pointer"
              title="Tra cứu tình trạng đơn hàng"
            >
              <PackageCheck className="w-4 h-4 text-orange-500" />
              <span className="hidden sm:inline">Tra Cứu Đơn</span>
            </button>

            {/* Cart Button */}
            <button
              onClick={onOpenCart}
              className="relative flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-orange-500/25 transition-all active:scale-95 cursor-pointer"
              aria-label={`Mở giỏ hàng, hiện có ${cartCount} sản phẩm`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Giỏ Hàng</span>
              {cartCount > 0 && (
                <span className="min-w-[19px] h-[19px] px-1 bg-white text-orange-600 rounded-full text-[11px] font-black flex items-center justify-center shadow-xs animate-in zoom-in">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Admin Switcher for Store Manager */}
            <button
              onClick={onBackToAdmin}
              className="hidden lg:flex items-center gap-1 px-2.5 py-2 text-[11px] font-bold text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
              title="Vào bảng quản trị Admin"
            >
              <span>Admin</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Mobile Search Row & Trending Pills (Exclusive for Mobile screens) */}
        <div className="mt-2.5 md:hidden space-y-1.5">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm quà tặng, mica, ly giữ nhiệt, áo thun..."
              className="w-full pl-9 pr-9 py-2 text-xs bg-stone-100 hover:bg-stone-100/80 focus:bg-white border border-stone-200/80 focus:border-orange-500 rounded-full outline-hidden text-stone-800 placeholder-stone-400 focus:ring-2 focus:ring-orange-500/20"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full hover:bg-stone-200"
                aria-label="Xóa tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Trending Keyword Pills on Mobile */}
          {!searchTerm && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-[10px]">
              <span className="text-stone-400 font-semibold shrink-0">Gợi ý:</span>
              {TRENDING_SEARCHES.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onSearchChange(tag)}
                  className="px-2 py-0.5 bg-stone-100 hover:bg-orange-50 hover:text-orange-600 text-stone-600 rounded-full shrink-0 font-medium transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
