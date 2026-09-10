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
  ExternalLink
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
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Top Notification Bar */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white text-[11px] font-medium py-1 px-4 text-center flex items-center justify-between">
        <div className="hidden md:flex items-center gap-2">
          <Truck className="w-3.5 h-3.5" />
          <span>Miễn phí giao hàng toàn quốc cho đơn từ {config.freeShipThresholdVND ? `${config.freeShipThresholdVND.toLocaleString()}đ` : "500.000đ"}</span>
        </div>
        <div className="mx-auto md:mx-0 flex items-center gap-1.5 font-semibold">
          <Sparkles className="w-3 h-3 text-amber-200" />
          <span>Hàng Xưởng Tận Gốc • Giá Sỉ Cực Tốt • Bảo Hành Đổi Trả</span>
        </div>
        <div className="hidden md:flex items-center gap-3 text-orange-100">
          <a href={`tel:${config.hotline}`} className="hover:text-white flex items-center gap-1 font-bold">
            <Phone className="w-3 h-3" />
            <span>Hotline: {config.hotline}</span>
          </a>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToAdmin}
            className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Quay lại Admin Hub"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onSearchChange("")}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                  {config.storeName || "1688 STORE"}
                </span>
                <span className="bg-orange-100 text-orange-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded">
                  DIRECT
                </span>
              </div>
              <p className="text-[10px] text-slate-500 truncate max-w-[200px] hidden sm:block">
                {config.tagline || "Hàng xưởng sỉ cao cấp giá tận gốc"}
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-lg mx-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm kiếm sản phẩm, mẫu hot trend, quần áo, phụ kiện..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-100 hover:bg-slate-100/80 focus:bg-white border border-transparent focus:border-orange-500 rounded-full outline-hidden transition-all text-slate-800 placeholder-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Order Tracker */}
          <button
            onClick={onOpenTracker}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-orange-600 hover:bg-orange-50/50 rounded-xl transition-colors"
            title="Tra cứu tình trạng đơn hàng"
          >
            <PackageCheck className="w-4 h-4 text-orange-500" />
            <span className="hidden md:inline">Tra Cứu Đơn</span>
          </button>

          {/* Cart Button */}
          <button
            onClick={onOpenCart}
            className="relative flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl font-bold text-xs shadow-md shadow-orange-500/25 transition-all active:scale-95 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">Giỏ Hàng</span>
            {cartCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 bg-white text-orange-600 rounded-full text-[10px] font-black flex items-center justify-center animate-in zoom-in shadow-xs">
                {cartCount}
              </span>
            )}
          </button>

          {/* Admin Switcher */}
          <button
            onClick={onBackToAdmin}
            className="hidden lg:flex items-center gap-1 px-2.5 py-2 text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Vào trang quản trị sản phẩm"
          >
            <span>Admin</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </header>
  );
};
