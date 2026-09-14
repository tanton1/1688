import React, { useEffect, useRef, useState } from "react";
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
  X,
  ChevronDown,
  ArrowUpRight
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
  onNavigateToCatalog?: (target: StoreHeaderNavigationTarget) => void;
}

export type StoreHeaderNavigationTarget =
  | { kind: "category"; value: string }
  | { kind: "occasion"; value: string }
  | { kind: "recipient"; value: string }
  | { kind: "price"; value: "UNDER_300K" | "UNDER_500K" | "OVER_500K" }
  | { kind: "personalized" }
  | { kind: "search"; value: string };

const TRENDING_SEARCHES = ["Biển mica LED", "Ly giữ nhiệt", "Đồ treo cây", "Quà cho mẹ", "Cún cưng"];
const STORE_NAV_ITEMS = [
  {
    label: "Theo mùa",
    columns: [
      { heading: "Dịp nổi bật", items: [["Giáng sinh", { kind: "occasion", value: "christmas" }], ["Sinh nhật", { kind: "occasion", value: "birthday" }], ["Kỷ niệm", { kind: "occasion", value: "anniversary" }], ["Tình yêu", { kind: "occasion", value: "valentines" }]] },
      { heading: "Quà ý nghĩa", items: [["Tặng mẹ", { kind: "occasion", value: "mothers-day" }], ["Tặng bố", { kind: "occasion", value: "fathers-day" }], ["Tưởng nhớ", { kind: "occasion", value: "memorial" }]] }
    ]
  },
  {
    label: "Quà tặng",
    columns: [
      { heading: "Theo dịp", items: [["Sinh nhật", { kind: "occasion", value: "birthday" }], ["Kỷ niệm", { kind: "occasion", value: "anniversary" }], ["Tình yêu", { kind: "occasion", value: "valentines" }], ["Tặng mẹ", { kind: "occasion", value: "mothers-day" }]] },
      { heading: "Theo người nhận", items: [["Cho mẹ", { kind: "recipient", value: "for-mom" }], ["Cho bố", { kind: "recipient", value: "for-dad" }], ["Cho cặp đôi", { kind: "recipient", value: "for-couples" }], ["Cho bạn thân", { kind: "recipient", value: "for-besties" }]] },
      { heading: "Được yêu thích", items: [["Quà cá nhân hóa", { kind: "personalized" }], ["Quà mới", { kind: "search", value: "mới" }], ["Tất cả quà tặng", { kind: "category", value: "ALL" }]] }
    ]
  },
  {
    label: "Nhà cửa & đời sống",
    columns: [
      { heading: "Trang trí", items: [["Tranh & khung ảnh", { kind: "search", value: "tranh" }], ["Đèn & bảng mica", { kind: "search", value: "đèn" }], ["Đồ treo & ornament", { kind: "search", value: "treo" }]] },
      { heading: "Phòng ngủ", items: [["Chăn gối", { kind: "search", value: "gối" }], ["Đồ dùng nhà cửa", { kind: "category", value: "Nhà cửa & đời sống" }]] },
      { heading: "Mua theo giá", items: [["Dưới 300.000đ", { kind: "price", value: "UNDER_300K" }], ["Dưới 500.000đ", { kind: "price", value: "UNDER_500K" }], ["Từ 500.000đ", { kind: "price", value: "OVER_500K" }]] }
    ]
  },
  {
    label: "Đồ uống",
    columns: [
      { heading: "Bình & cốc", items: [["Ly giữ nhiệt", { kind: "search", value: "ly" }], ["Cốc sứ", { kind: "search", value: "cốc" }], ["Bình nước", { kind: "search", value: "bình" }]] },
      { heading: "Phụ kiện bar", items: [["Quà cho người thích cà phê", { kind: "search", value: "cà phê" }], ["Quà cho người thích rượu", { kind: "search", value: "rượu" }]] }
    ]
  },
  {
    label: "Thời trang",
    columns: [
      { heading: "Trang phục", items: [["Áo & hoodie", { kind: "search", value: "áo" }], ["Đầm váy", { kind: "search", value: "đầm" }], ["Đồ đôi", { kind: "recipient", value: "for-couples" }]] },
      { heading: "Chọn nhanh", items: [["Quà cho cô ấy", { kind: "recipient", value: "for-mom" }], ["Quà cho anh ấy", { kind: "recipient", value: "for-dad" }]] }
    ]
  },
  {
    label: "Phụ kiện",
    columns: [
      { heading: "Cá nhân", items: [["Túi & balo", { kind: "search", value: "túi" }], ["Trang sức", { kind: "search", value: "trang sức" }], ["Móc khóa", { kind: "search", value: "móc khóa" }]] },
      { heading: "Sở thích", items: [["Yêu thú cưng", { kind: "recipient", value: "for-pet-lovers" }], ["Thể thao & du lịch", { kind: "search", value: "thể thao" }]] }
    ]
  },
  {
    label: "Theo sở thích",
    columns: [
      { heading: "Lifestyle", items: [["Yêu thú cưng", { kind: "recipient", value: "for-pet-lovers" }], ["Du lịch & dã ngoại", { kind: "search", value: "du lịch" }], ["Đọc sách", { kind: "search", value: "sách" }]] },
      { heading: "Đồ uống", items: [["Cà phê", { kind: "search", value: "cà phê" }], ["Rượu vang", { kind: "search", value: "rượu" }], ["Bia", { kind: "search", value: "bia" }]] }
    ]
  },
  {
    label: "Gift Finder",
    columns: [
      { heading: "Chọn cho ai", items: [["Mẹ", { kind: "recipient", value: "for-mom" }], ["Bố", { kind: "recipient", value: "for-dad" }], ["Cặp đôi", { kind: "recipient", value: "for-couples" }], ["Người yêu thú cưng", { kind: "recipient", value: "for-pet-lovers" }]] },
      { heading: "Chọn theo ngân sách", items: [["Dưới 300.000đ", { kind: "price", value: "UNDER_300K" }], ["Dưới 500.000đ", { kind: "price", value: "UNDER_500K" }], ["Từ 500.000đ", { kind: "price", value: "OVER_500K" }]] }
    ]
  }
] as const;

export const StoreHeader: React.FC<StoreHeaderProps> = ({
  config,
  cartCount,
  onOpenCart,
  searchTerm,
  onSearchChange,
  onOpenTracker,
  onBackToAdmin,
  onNavigateToCatalog
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const storeName = config.storeName?.trim() || "1688 STORE";
  const tagline = config.tagline?.trim() && config.tagline !== "Cửa hàng trực tuyến" ? config.tagline : "Quà tặng chọn riêng cho người quan trọng";

  useEffect(() => {
    if (!openMenu) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpenMenu(null); };
    const onPointerDown = (event: PointerEvent) => { if (!navRef.current?.contains(event.target as Node)) setOpenMenu(null); };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => { document.removeEventListener("keydown", onKeyDown); document.removeEventListener("pointerdown", onPointerDown); };
  }, [openMenu]);

  const navigate = (target: StoreHeaderNavigationTarget) => {
    setOpenMenu(null);
    onNavigateToCatalog?.(target);
  };

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
                <span className="hidden rounded-full border border-[var(--mc-color-accent)]/50 px-2 py-0.5 text-[10px] font-bold tracking-[0.08em] text-[var(--mc-color-accent)] sm:inline">STUDIO</span>
              </span>
              <span className="block max-w-[170px] truncate text-[11px] leading-4 text-white/60 sm:max-w-[220px]">{tagline}</span>
            </span>
          </a>

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

        <nav ref={navRef} aria-label="Danh mục cửa hàng" className="relative mt-3 hidden items-center gap-1 overflow-visible border-t border-white/10 pt-3 text-[12px] font-semibold text-white/70 lg:flex">
          {STORE_NAV_ITEMS.map((item, itemIndex) => {
            const expanded = openMenu === item.label;
            return <div key={item.label} className="relative shrink-0">
              <button type="button" aria-expanded={expanded} onClick={() => setOpenMenu(expanded ? null : item.label)} className={`mc-focus-ring inline-flex min-h-9 items-center gap-1 rounded-md px-3 transition-colors hover:bg-white/10 hover:text-white ${expanded ? "bg-white/10 text-white" : ""}`}>
                {item.label}<ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              {expanded && <div role="menu" aria-label={item.label} className={`absolute top-[calc(100%+0.75rem)] z-50 grid min-w-[560px] max-w-[min(880px,calc(100vw-2rem))] grid-cols-2 gap-x-8 gap-y-6 rounded-2xl border border-white/15 bg-[var(--mc-color-surface-base)] p-6 text-white shadow-[var(--mc-shadow-lift)] md:grid-cols-3 ${itemIndex >= STORE_NAV_ITEMS.length - 2 ? "right-0" : "left-0"}`}>
                {item.columns.map(column => <div key={column.heading} className="min-w-0">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--mc-color-accent)]">{column.heading}</p>
                  <div className="space-y-0.5">{column.items.map(([label, target]) => <button key={label} type="button" role="menuitem" onClick={() => navigate(target as StoreHeaderNavigationTarget)} className="mc-focus-ring flex min-h-9 w-full items-center justify-between gap-3 rounded-lg px-2 text-left text-xs font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white"><span className="truncate">{label}</span><ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-white/35" aria-hidden="true" /></button>)}</div>
                </div>)}
                <button type="button" role="menuitem" onClick={() => navigate({ kind: "category", value: "ALL" })} className="mc-focus-ring col-span-full mt-1 flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/15 text-xs font-bold text-white/80 hover:border-[var(--mc-color-accent)] hover:text-white">Khám phá toàn bộ cửa hàng <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></button>
              </div>}
            </div>;
          })}
        </nav>

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
