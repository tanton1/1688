import React from "react";
import {
  ShoppingBag,
  Search,
  Phone,
  ArrowLeft,
  Truck,
  PackageCheck,
  Sparkles,
  ExternalLink,
  Heart,
  X
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

const TRENDING_SEARCHES = ["Biển mica LED", "Ly giữ nhiệt", "Đồ treo cây", "Quà cho mẹ", "Cún cưng"];

export const StoreHeader: React.FC<StoreHeaderProps> = ({
  config,
  cartCount,
  onOpenCart,
  searchTerm,
  onSearchChange,
  onOpenTracker,
  onBackToAdmin
}) => {
  const storeName = config.storeName && config.storeName !== "1688 STORE" ? config.storeName : "MACORNER";
  const tagline = config.tagline && config.tagline !== "Cửa hàng trực tuyến" ? config.tagline : "Quà cá nhân hóa cho những người bạn yêu";

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--mc-color-border-default)]/80 bg-[var(--mc-color-surface-base)] text-[var(--mc-color-text-tertiary)]">
      <div className="bg-[var(--mc-color-surface-muted)] px-4 py-2 text-[11px] font-semibold leading-4 text-[var(--mc-color-text-tertiary)] sm:px-6">
        <div className="mc-content-width mx-auto flex items-center justify-between gap-3">
          <div className="hidden items-center gap-2 md:flex">
            <Truck className="h-3.5 w-3.5 text-[var(--mc-color-accent)]" aria-hidden="true" />
            <span>
              Freeship đơn từ{" "}
              <strong className="text-white">
                {config.freeShipThresholdVND ? `${config.freeShipThresholdVND.toLocaleString("vi-VN")}đ` : "theo chính sách shop"}
              </strong>
            </span>
          </div>
          <div className="mx-auto flex items-center gap-1.5 text-center md:mx-0">
            <Sparkles className="h-3.5 w-3.5 text-[var(--mc-color-accent)]" aria-hidden="true" />
            <span>Thiết kế riêng · Làm quà thật đặc biệt</span>
          </div>
          {config.hotline ? (
            <a className="hidden items-center gap-1.5 text-[var(--mc-color-text-tertiary)] transition-colors hover:text-[var(--mc-color-accent)] md:flex" href={`tel:${config.hotline}`}>
              <Phone className="h-3 w-3 text-[var(--mc-color-accent)]" aria-hidden="true" />
              <span>{config.hotline}</span>
            </a>
          ) : <span className="hidden md:block" aria-hidden="true" />}
        </div>
      </div>

      <div className="mc-content-width mx-auto px-4 py-3.5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 lg:gap-6">
          <button type="button" onClick={onBackToAdmin} className="mc-focus-ring -ml-2 rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white" title="Quay lại Hub Quản Trị" aria-label="Quay lại Hub Quản Trị">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>

          <a href="#store-catalog" className="mc-focus-ring flex min-w-0 shrink-0 items-center gap-2.5 rounded-lg">
            <span className="flex h-10 w-10 items-center justify-center rounded-[var(--mc-radius-xs)] bg-[var(--mc-color-surface-strong)] text-[var(--mc-color-surface-base)]" aria-hidden="true">
              <Heart className="h-5 w-5 fill-[var(--mc-color-accent)] text-[var(--mc-color-accent)]" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="truncate text-[17px] font-bold tracking-[-0.03em] text-white sm:text-[19px]">{storeName}</span>
                <span className="hidden rounded-full border border-[var(--mc-color-accent)]/50 px-2 py-0.5 text-[10px] font-bold tracking-[0.08em] text-[var(--mc-color-accent)] sm:inline">ATELIER</span>
              </span>
              <span className="block max-w-[170px] truncate text-[11px] leading-4 text-white/60 sm:max-w-[220px]">{tagline}</span>
            </span>
          </a>

          <nav aria-label="Điều hướng chính" className="hidden items-center gap-5 text-[13px] font-semibold text-white/70 lg:flex">
            <a className="mc-focus-ring rounded-md transition-colors hover:text-white" href="#store-catalog">Tất cả quà</a>
            <a className="mc-focus-ring rounded-md transition-colors hover:text-white" href="#store-occasions-section">Theo dịp tặng</a>
            <a className="mc-focus-ring rounded-md transition-colors hover:text-white" href="#store-catalog">Bán chạy</a>
          </nav>

          <div className="ml-auto hidden max-w-[390px] flex-1 md:block">
            <label className="sr-only" htmlFor="store-search-desktop">Tìm sản phẩm</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" aria-hidden="true" />
              <input id="store-search-desktop" type="search" value={searchTerm} onChange={(event) => onSearchChange(event.target.value)} placeholder="Tìm món quà dành riêng cho bạn..." className="mc-focus-ring h-10 w-full rounded-[var(--mc-radius-sm)] border border-white/15 bg-white/10 pl-10 pr-10 text-sm text-white placeholder:text-white/45 transition-colors hover:border-white/30 focus:border-[var(--mc-color-accent)] focus:bg-white/15" />
              {searchTerm && <button type="button" onClick={() => onSearchChange("")} className="mc-focus-ring absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white" aria-label="Xóa tìm kiếm"><X className="h-4 w-4" aria-hidden="true" /></button>}
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button type="button" onClick={onOpenTracker} className="mc-focus-ring hidden items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white sm:flex" title="Tra cứu tình trạng đơn hàng">
              <PackageCheck className="h-4 w-4 text-[var(--mc-color-accent)]" aria-hidden="true" />
              <span>Tra cứu đơn</span>
            </button>
            <button type="button" onClick={onOpenCart} className="mc-focus-ring relative flex h-10 items-center gap-2 rounded-full bg-[var(--mc-color-accent)] px-3.5 text-xs font-bold text-white transition-colors hover:bg-[var(--mc-color-accent-strong)] active:translate-y-px sm:px-4" aria-label={`Mở giỏ hàng, hiện có ${cartCount} sản phẩm`}>
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Giỏ hàng</span>
              {cartCount > 0 && <span className="flex min-h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-black text-[var(--mc-color-accent-strong)]">{cartCount > 99 ? "99+" : cartCount}</span>}
            </button>
            <button type="button" onClick={onBackToAdmin} className="mc-focus-ring hidden rounded-md p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white lg:block" title="Vào bảng quản trị Admin" aria-label="Vào bảng quản trị Admin">
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="mt-3 md:hidden">
          <label className="sr-only" htmlFor="store-search-mobile">Tìm sản phẩm</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" aria-hidden="true" />
            <input id="store-search-mobile" type="search" value={searchTerm} onChange={(event) => onSearchChange(event.target.value)} placeholder="Tìm sản phẩm..." className="mc-focus-ring h-10 w-full rounded-[var(--mc-radius-sm)] border border-white/15 bg-white/10 pl-9 pr-9 text-sm text-white placeholder:text-white/45 focus:border-[var(--mc-color-accent)]" />
            {searchTerm && <button type="button" onClick={() => onSearchChange("")} className="mc-focus-ring absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-white/70" aria-label="Xóa tìm kiếm"><X className="h-4 w-4" aria-hidden="true" /></button>}
          </div>
          {!searchTerm && <div className="mc-no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-0.5 text-[11px]"><span className="shrink-0 text-white/45">Gợi ý</span>{TRENDING_SEARCHES.map((tag) => <button key={tag} type="button" onClick={() => onSearchChange(tag)} className="mc-focus-ring shrink-0 rounded-full border border-white/15 px-2.5 py-1 text-white/70 hover:border-white/40 hover:text-white">{tag}</button>)}</div>}
        </div>
      </div>
    </header>
  );
};
