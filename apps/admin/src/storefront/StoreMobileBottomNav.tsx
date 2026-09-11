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

export const StoreMobileBottomNav: React.FC<StoreMobileBottomNavProps> = ({ cartCount, onGoHome, onOpenOccasions, onOpenSearch, onOpenTracker, onOpenCart, activeFilterCount = 0 }) => {
  const itemClass = "mc-focus-ring group flex min-h-14 flex-1 flex-col items-center justify-center rounded-lg py-1 text-[var(--mc-color-text-secondary)] transition-colors hover:text-[var(--mc-color-accent-strong)] active:scale-95";
  return (
    <nav aria-label="Điều hướng trên thiết bị di động" className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--mc-color-border-default)]/15 bg-[var(--mc-color-surface-strong)]/95 px-2 py-1.5 shadow-[0_-8px_30px_rgb(49_43_54_/_10%)] backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around gap-1">
        <button type="button" onClick={onGoHome} className={itemClass} aria-label="Về trang chủ"><Home className="h-5 w-5 text-[var(--mc-color-text-primary)] group-hover:text-[var(--mc-color-accent-strong)]" aria-hidden="true" /><span className="mt-0.5 text-[10px] font-semibold">Trang chủ</span></button>
        <button type="button" onClick={onOpenOccasions} className={`${itemClass} relative`} aria-label={`Lọc theo dịp tặng${activeFilterCount > 0 ? `, ${activeFilterCount} bộ lọc đang bật` : ""}`}><span className="relative"><Gift className="h-5 w-5 text-[var(--mc-color-text-primary)] group-hover:text-[var(--mc-color-accent-strong)]" aria-hidden="true" />{activeFilterCount > 0 && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[var(--mc-color-accent)] ring-2 ring-white" aria-hidden="true" />}</span><span className="mt-0.5 text-[10px] font-semibold">Dịp tặng</span></button>
        <button type="button" onClick={onOpenSearch} className={itemClass} aria-label="Tìm kiếm"><Search className="h-5 w-5 text-[var(--mc-color-text-primary)] group-hover:text-[var(--mc-color-accent-strong)]" aria-hidden="true" /><span className="mt-0.5 text-[10px] font-semibold">Tìm kiếm</span></button>
        <button type="button" onClick={onOpenTracker} className={itemClass} aria-label="Tra cứu đơn hàng"><PackageCheck className="h-5 w-5 text-[var(--mc-color-text-primary)] group-hover:text-[var(--mc-color-accent-strong)]" aria-hidden="true" /><span className="mt-0.5 text-[10px] font-semibold">Tra cứu đơn</span></button>
        <button type="button" onClick={onOpenCart} className={`${itemClass} text-[var(--mc-color-accent-strong)]`} aria-label={`Mở giỏ hàng, hiện có ${cartCount} sản phẩm`}><span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-[var(--mc-color-accent)]/10 group-hover:bg-[var(--mc-color-accent)] group-hover:text-white"><ShoppingBag className="h-4 w-4" aria-hidden="true" />{cartCount > 0 && <span className="absolute -right-2 -top-2 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--mc-color-accent-strong)] px-1 text-[10px] font-black text-white ring-2 ring-white">{cartCount > 99 ? "99+" : cartCount}</span>}</span><span className="mt-0.5 text-[10px] font-bold">Giỏ hàng</span></button>
      </div>
    </nav>
  );
};
