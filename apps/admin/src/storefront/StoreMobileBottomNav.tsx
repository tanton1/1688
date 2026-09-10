import React from "react";
import { Home, Gift, PackageCheck, ShoppingBag, Search } from "lucide-react";

interface StoreMobileBottomNavProps {
  cartCount: number;
  onGoHome: () => void;
  onOpenOccasions: () => void;
  onOpenSearch: () => void;
  onOpenTracker: () => void;
  onOpenCart: () => void;
  activeFilterCount?: number;
}

export const StoreMobileBottomNav: React.FC<StoreMobileBottomNavProps> = ({
  cartCount,
  onGoHome,
  onOpenOccasions,
  onOpenSearch,
  onOpenTracker,
  onOpenCart,
  activeFilterCount = 0
}) => {
  return (
    <nav
      aria-label="Điều hướng trên thiết bị di động"
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 backdrop-blur-xl border-t border-stone-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))]"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* 1. Trang Chủ */}
        <button
          type="button"
          onClick={onGoHome}
          className="flex flex-col items-center justify-center flex-1 py-1 text-stone-600 hover:text-orange-600 active:scale-95 transition-all group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center group-hover:bg-orange-50 group-active:bg-orange-100 transition-colors">
            <Home className="w-5 h-5 text-stone-700 group-hover:text-orange-600" />
          </div>
          <span className="text-[10px] font-bold tracking-tight text-stone-700 group-hover:text-orange-600">
            Trang Chủ
          </span>
        </button>

        {/* 2. Dịp Quà Tặng */}
        <button
          type="button"
          onClick={onOpenOccasions}
          className="relative flex flex-col items-center justify-center flex-1 py-1 text-stone-600 hover:text-orange-600 active:scale-95 transition-all group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center group-hover:bg-orange-50 group-active:bg-orange-100 transition-colors">
            <Gift className="w-5 h-5 text-stone-700 group-hover:text-orange-600" />
            {activeFilterCount > 0 && (
              <span className="absolute top-1 right-3.5 w-2 h-2 rounded-full bg-orange-600 ring-2 ring-white" />
            )}
          </div>
          <span className="text-[10px] font-bold tracking-tight text-stone-700 group-hover:text-orange-600">
            Dịp Quà Tặng
          </span>
        </button>

        {/* 3. Tìm Kiếm */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex flex-col items-center justify-center flex-1 py-1 text-stone-600 hover:text-orange-600 active:scale-95 transition-all group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center group-hover:bg-orange-50 group-active:bg-orange-100 transition-colors">
            <Search className="w-5 h-5 text-stone-700 group-hover:text-orange-600" />
          </div>
          <span className="text-[10px] font-bold tracking-tight text-stone-700 group-hover:text-orange-600">
            Tìm Kiếm
          </span>
        </button>

        {/* 4. Tra Cứu Đơn */}
        <button
          type="button"
          onClick={onOpenTracker}
          className="flex flex-col items-center justify-center flex-1 py-1 text-stone-600 hover:text-orange-600 active:scale-95 transition-all group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center group-hover:bg-orange-50 group-active:bg-orange-100 transition-colors">
            <PackageCheck className="w-5 h-5 text-stone-700 group-hover:text-orange-600" />
          </div>
          <span className="text-[10px] font-bold tracking-tight text-stone-700 group-hover:text-orange-600">
            Tra Cứu Đơn
          </span>
        </button>

        {/* 5. Giỏ Hàng (Nổi bật) */}
        <button
          type="button"
          onClick={onOpenCart}
          className="relative flex flex-col items-center justify-center flex-1 py-1 text-stone-600 hover:text-orange-600 active:scale-95 transition-all group cursor-pointer"
        >
          <div className="relative w-9 h-9 rounded-full flex items-center justify-center bg-orange-500/10 group-hover:bg-orange-500 group-active:bg-orange-600 transition-colors">
            <ShoppingBag className="w-5 h-5 text-orange-600 group-hover:text-white transition-colors" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-md animate-in zoom-in ring-2 ring-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold tracking-tight text-orange-600 group-hover:text-orange-700">
            Giỏ Hàng
          </span>
        </button>
      </div>
    </nav>
  );
};
