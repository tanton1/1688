import React, { useState, useEffect, useMemo, useRef } from "react";
import { WebProduct, WebProductVariant, StorefrontConfig, CustomerOrder } from "@hub1688/shared-types";
import { AdminApi } from "../services/api";
import { StoreHeader } from "./StoreHeader";
import { StoreHeroBanner } from "./StoreHeroBanner";
import { StoreProductCard } from "./StoreProductCard";
import { StoreProductDetailModal } from "./StoreProductDetailModal";
import { StoreCartDrawer, CartItem } from "./StoreCartDrawer";
import { StoreCheckoutModal } from "./StoreCheckoutModal";
import { StoreOrderSuccessModal } from "./StoreOrderSuccessModal";
import { StoreOrderTrackerModal } from "./StoreOrderTrackerModal";
import { StoreOccasionsNav } from "./StoreOccasionsNav";
import { StoreMobileBottomNav } from "./StoreMobileBottomNav";
import { StoreSocialProofPopup } from "./StoreSocialProofPopup";
import { DEMO_MACORNER_PRODUCTS } from "./demoMacornerCatalog";
import {
  Filter,
  ArrowUpDown,
  ShoppingBag,
  Layers,
  Sparkles,
  Phone,
  MapPin,
  ShieldCheck,
  Truck,
  RotateCcw,
  QrCode
} from "lucide-react";

interface StorefrontViewProps {
  onBackToAdmin: () => void;
  onShowToast: (message: string, type?: "success" | "error") => void;
  initialProductId?: string | null;
}

const STOREFRONT_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

export const StorefrontView: React.FC<StorefrontViewProps> = ({
  onBackToAdmin,
  onShowToast,
  initialProductId
}) => {
  // Store Config
  const [config, setConfig] = useState<StorefrontConfig>({
    storeName: "MACORNER",
    tagline: "Quà cá nhân hóa cho những người bạn yêu",
    hotline: "",
    freeShipThresholdVND: 500000,
    shippingFeeVND: 30000,
    discountRules: [],
    bankName: "",
    bankAccountNo: "",
    bankAccountName: ""
  });

  // Products & Categories
  const [products, setProducts] = useState<WebProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [activeOccasion, setActiveOccasion] = useState<string>("all");
  const [activeRecipient, setActiveRecipient] = useState<string>("all");
  const [appliedDiscountCode, setAppliedDiscountCode] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"NEWEST" | "PRICE_ASC" | "PRICE_DESC">("NEWEST");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [catalogMode, setCatalogMode] = useState<"LIVE" | "DEMO">("LIVE");

  // Cart State (Persisted in localStorage)
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("hub1688_storefront_cart");
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed)
        ? parsed.map(item => ({ ...item, maxQuantity: Number.isFinite(item.maxQuantity) ? item.maxQuantity : Number.MAX_SAFE_INTEGER }))
        : [];
    } catch {
      return [];
    }
  });

  // Modals State
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<WebProduct | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [lastCreatedOrder, setLastCreatedOrder] = useState<CustomerOrder | null>(null);
  const [lastQrCodeUrl, setLastQrCodeUrl] = useState<string | undefined>(undefined);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [trackerOrderNo, setTrackerOrderNo] = useState<string>("");
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);

  const catalogRef = useRef<HTMLDivElement | null>(null);

  // Sync Cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("hub1688_storefront_cart", JSON.stringify(cart));
    } catch (e) {
      console.warn("Could not persist cart:", e);
    }
  }, [cart]);

  // Load Store Info & Products
  const loadStoreData = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const loadCatalog = async () => {
        const first = await AdminApi.getStoreProducts({ page: 1, limit: 100 });
        const all = [...(first.products || [])];
        const pages = Math.ceil((first.total || 0) / 100);
        if (pages > 1) {
          const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, index) =>
            AdminApi.getStoreProducts({ page: index + 2, limit: 100 })
          ));
          for (const response of rest) all.push(...(response.products || []));
        }
        return { ...first, products: all };
      };
      const [infoResult, productsResult] = await Promise.allSettled([
        AdminApi.getStoreInfo(),
        loadCatalog()
      ]);

      const infoRes = infoResult.status === "fulfilled" ? infoResult.value : null;
      if (productsResult.status === "rejected") throw productsResult.reason;
      const prodRes = productsResult.value;

      if (infoRes?.config) {
        setConfig(infoRes.config);
      }

      let loadedProducts: WebProduct[] = prodRes?.products || [];

      // Dữ liệu cục bộ và catalog mẫu chỉ được phép xuất hiện trong demo build.
      if (STOREFRONT_DEMO_MODE && loadedProducts.length === 0) {
        const rawLocal = localStorage.getItem("hub1688_persisted_products");
        if (rawLocal) {
          try {
            const parsed: WebProduct[] = JSON.parse(rawLocal);
            const published = parsed.filter(p => p.status === "PUBLISHED");
            if (published.length > 0) loadedProducts = published;
          } catch {}
        }
      }

      const finalCatalog: WebProduct[] = STOREFRONT_DEMO_MODE && loadedProducts.length === 0
        ? [...DEMO_MACORNER_PRODUCTS, ...getDemoStoreProducts()]
        : loadedProducts;
      setCatalogMode(STOREFRONT_DEMO_MODE && loadedProducts.length === 0 ? "DEMO" : "LIVE");

      setProducts(finalCatalog);
      setCart(current => current.map(item => {
        const product = finalCatalog.find(candidate => candidate.id === item.productId);
        const variant = product?.variants.find(candidate => candidate.sourceSkuId === item.sourceSkuId);
        return variant ? { ...item, maxQuantity: Math.max(0, variant.stockQuantity ?? 0) } : item;
      }));
      const catSet = new Set(finalCatalog.map(p => p.categoryName).filter(Boolean));
      setCategories(Array.from(catSet) as string[]);

      if (initialProductId) {
        const match = finalCatalog.find(p => p.id === initialProductId || p.slug === initialProductId);
        if (match) setDetailProduct(match);
      }
    } catch (err: any) {
      console.error("Lỗi khi tải dữ liệu cửa hàng:", err);
      const fallbackCatalog = STOREFRONT_DEMO_MODE
        ? [...DEMO_MACORNER_PRODUCTS, ...getDemoStoreProducts()]
        : [];
      setCatalogMode(STOREFRONT_DEMO_MODE ? "DEMO" : "LIVE");
      setLoadError(STOREFRONT_DEMO_MODE ? "API chưa sẵn sàng; đang hiển thị catalog mô phỏng." : (err?.message || "Không thể tải catalog từ máy chủ."));
      setProducts(fallbackCatalog);
      const catSet = new Set(fallbackCatalog.map(p => p.categoryName).filter(Boolean));
      setCategories(Array.from(catSet) as string[]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStoreData();
  }, [initialProductId]);

  // Giá hiển thị dùng cùng contract với checkout phía server.
  const calculateUnitPrice = (product: WebProduct, variant: WebProductVariant, quantity: number, addonIds: string[] = []) => {
    const tier = [...(product.volumeDiscountTiers || [])]
      .sort((a, b) => b.minQty - a.minQty)
      .find(candidate => quantity >= candidate.minQty);
    const discounted = Math.round(variant.sellingPriceVND * (1 - (tier?.discountPercent || 0) / 100));
    const addons = (product.giftAddons || [])
      .filter(addon => addonIds.includes(addon.id))
      .reduce((sum, addon) => sum + addon.priceVND, 0);
    return discounted + addons;
  };

  // Add Item to Cart
  const handleAddToCart = (
    variant: WebProductVariant,
    quantity: number,
    product: WebProduct,
    customizationData?: Record<string, any>,
    customizedPreviewUrl?: string,
    giftAddonsSelected?: string[]
  ) => {
    const hasCustom = customizationData && Object.keys(customizationData).length > 0;
    const baseSku = variant.sourceSkuId || product.skuCode || `SKU-${Date.now()}`;
    const sku = hasCustom ? `${baseSku}-CUST-${Date.now().toString(36)}` : baseSku;
    const vName = [variant.colorName, variant.sizeName].filter(Boolean).join(" - ") || variant.sourceSkuId || "Mặc định";
    const price = calculateUnitPrice(product, variant, quantity, giftAddonsSelected);

    setCart(prev => {
      const existingIdx = prev.findIndex(item => item.skuCode === sku);
      if (existingIdx >= 0) {
        const next = [...prev];
        const nextQuantity = Math.min(variant.stockQuantity, next[existingIdx].quantity + quantity);
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: nextQuantity,
          maxQuantity: variant.stockQuantity,
          priceVND: calculateUnitPrice(product, variant, nextQuantity, giftAddonsSelected)
        };
        return next;
      } else {
        const newItem: CartItem = {
          productId: product.id!,
          skuCode: sku,
          sourceSkuId: variant.sourceSkuId,
          variantName: vName,
          productTitle: product.titleVI,
          image: customizedPreviewUrl || variant.imageUrl || product.primaryImage,
          priceVND: price,
          quantity: Math.min(quantity, variant.stockQuantity),
          maxQuantity: variant.stockQuantity,
          customizationData,
          customizedPreviewUrl,
          giftAddonsSelected
        };
        return [...prev, newItem];
      }
    });

    onShowToast(`Đã thêm ${quantity}x "${product.titleVI}" vào giỏ hàng!`);
    setIsCartOpen(true);
  };

  // Buy Now (Add to cart and open checkout)
  const handleBuyNow = (
    variant: WebProductVariant,
    quantity: number,
    product: WebProduct,
    customizationData?: Record<string, any>,
    customizedPreviewUrl?: string,
    giftAddonsSelected?: string[]
  ) => {
    handleAddToCart(variant, quantity, product, customizationData, customizedPreviewUrl, giftAddonsSelected);
    setDetailProduct(null);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  // Quick Add from Product Card
  const handleQuickAdd = (product: WebProduct) => {
    const defaultVariant = product.variants?.find(v => v.selectedForSale !== false) || product.variants?.[0];
    if (defaultVariant && !product.isPersonalized) {
      handleAddToCart(defaultVariant, 1, product);
    } else {
      setDetailProduct(product);
    }
  };

  // Cart Operations
  const handleUpdateCartQty = (skuCode: string, qty: number) => {
    if (qty <= 0) {
      handleRemoveCartItem(skuCode);
      return;
    }
    setCart(prev => prev.map(item => {
      if (item.skuCode !== skuCode) return item;
      const product = products.find(candidate => candidate.id === item.productId);
      const variant = product?.variants.find(candidate => candidate.sourceSkuId === item.sourceSkuId);
      const maxQuantity = Math.max(0, variant?.stockQuantity ?? item.maxQuantity);
      const nextQuantity = Math.min(qty, maxQuantity);
      return {
        ...item,
        quantity: nextQuantity,
        maxQuantity,
        priceVND: product && variant ? calculateUnitPrice(product, variant, nextQuantity, item.giftAddonsSelected) : item.priceVND
      };
    }));
  };

  const handleRemoveCartItem = (skuCode: string) => {
    setCart(prev => prev.filter(it => it.skuCode !== skuCode));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Checkout Success
  const handleOrderSuccess = (order: CustomerOrder, qrCodeUrl?: string) => {
    setLastCreatedOrder(order);
    setLastQrCodeUrl(qrCodeUrl);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    setCart([]); // Clear cart
    setIsSuccessOpen(true);
  };

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        // Category filter
        if (selectedCategory !== "ALL" && p.categoryName !== selectedCategory) {
          return false;
        }
        // Occasion filter (Macorner style)
        if (activeOccasion !== "all" && !p.occasionTags?.includes(activeOccasion)) {
          return false;
        }
        // Recipient filter (Macorner style)
        if (activeRecipient !== "all" && !p.recipientTags?.includes(activeRecipient)) {
          return false;
        }
        // Search filter
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchTitleVI = p.titleVI?.toLowerCase().includes(q);
          const matchTitleEN = p.titleEN?.toLowerCase().includes(q);
          const matchSku = p.skuCode?.toLowerCase().includes(q);
          if (!matchTitleVI && !matchTitleEN && !matchSku) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "PRICE_ASC") return (a.minPriceVND || 0) - (b.minPriceVND || 0);
        if (sortBy === "PRICE_DESC") return (b.minPriceVND || 0) - (a.minPriceVND || 0);
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      });
  }, [products, selectedCategory, activeOccasion, activeRecipient, searchTerm, sortBy]);

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const scrollToCatalog = () => {
    catalogRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleGoHome = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenOccasions = () => {
    const el = document.getElementById("store-occasions-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      scrollToCatalog();
    }
  };

  const handleOpenSearch = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="mc-storefront flex min-h-screen flex-col pb-20 selection:bg-[var(--mc-color-accent)] selection:text-white md:pb-0">
      {/* 1. Header */}
      <StoreHeader
        config={config}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onOpenTracker={() => {
          setTrackerOrderNo("");
          setIsTrackerOpen(true);
        }}
        onBackToAdmin={onBackToAdmin}
      />

      {/* 2. Hero Banner */}
      <StoreHeroBanner config={config} onExploreClick={scrollToCatalog} />

      {(catalogMode === "DEMO" || loadError) && (
        <div className={`${catalogMode === "DEMO" ? "bg-[var(--mc-color-surface-muted)] text-[var(--mc-color-text-tertiary)]" : "bg-[var(--mc-color-danger)] text-white"} border-y border-[var(--mc-color-border-default)]/20 px-4 py-2.5 text-center text-xs font-semibold`} role="status">
          {catalogMode === "DEMO" ? "Bạn đang xem catalog mô phỏng — toàn bộ hành trình mua hàng vẫn hoạt động để bạn trải nghiệm." : loadError}
        </div>
      )}

      {/* 2.5 Occasions & Recipients Filter Bar (Macorner Feature) */}
      <StoreOccasionsNav
        activeOccasion={activeOccasion}
        onSelectOccasion={setActiveOccasion}
        activeRecipient={activeRecipient}
        onSelectRecipient={setActiveRecipient}
        totalProductsCount={products.length}
      />

      {/* 3. Main Catalog Section */}
      <main id="store-catalog" ref={catalogRef} className="mc-content-width mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        {/* Category Filters & Sort */}
        <div className="flex flex-col gap-4 border-b border-[var(--mc-color-border-default)]/15 pb-5 md:flex-row md:items-end md:justify-between">
          {/* Category Pills */}
          <div className="min-w-0">
            <p className="mc-eyebrow">Bộ sưu tập</p>
            <div className="mc-no-scrollbar mt-2 flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              aria-pressed={selectedCategory === "ALL"}
              onClick={() => setSelectedCategory("ALL")}
              className={`mc-focus-ring min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === "ALL"
                  ? "border-[var(--mc-color-surface-base)] bg-[var(--mc-color-surface-base)] text-white"
                  : "border-[var(--mc-color-border-default)]/15 bg-[var(--mc-color-surface-strong)] text-[var(--mc-color-text-secondary)] hover:border-[var(--mc-color-accent)]/50 hover:text-[var(--mc-color-accent-strong)]"
              }`}
            >
              Tất cả sản phẩm <span className="ml-1 opacity-60">{products.length}</span>
            </button>

            {categories.map((cat, idx) => (
              <button
                type="button"
                key={idx}
                aria-pressed={selectedCategory === cat}
                onClick={() => setSelectedCategory(cat)}
                className={`mc-focus-ring min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? "border-[var(--mc-color-accent)] bg-[var(--mc-color-accent)] text-white"
                    : "border-[var(--mc-color-border-default)]/15 bg-[var(--mc-color-surface-strong)] text-[var(--mc-color-text-secondary)] hover:border-[var(--mc-color-accent)]/50 hover:text-[var(--mc-color-accent-strong)]"
                }`}
              >
                {cat}
              </button>
            ))}
            </div>
          </div>

          {/* Sort Dropdown */}
          <div className="flex shrink-0 items-center gap-2 self-end md:self-auto">
            <label htmlFor="store-sort" className="text-xs font-semibold text-[var(--mc-color-text-secondary)]">Sắp xếp</label>
            <div className="relative">
              <select
                id="store-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="mc-focus-ring min-h-10 cursor-pointer rounded-full border border-[var(--mc-color-border-default)]/20 bg-[var(--mc-color-surface-strong)] px-3.5 text-xs font-semibold text-[var(--mc-color-text-primary)]"
              >
                <option value="NEWEST">Mới Nhất</option>
                <option value="PRICE_ASC">Giá: Thấp đến Cao</option>
                <option value="PRICE_DESC">Giá: Cao đến Thấp</option>
              </select>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <div className="space-y-4 py-24 text-center" aria-live="polite" aria-busy="true">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[var(--mc-color-accent)] border-t-transparent" role="status" aria-label="Đang tải sản phẩm" />
            <p className="text-sm font-medium text-[var(--mc-color-text-secondary)]">Đang tải bộ sưu tập...</p>
          </div>
        ) : loadError && products.length === 0 ? (
          <div className="mx-auto max-w-lg space-y-4 rounded-[var(--mc-radius-xs)] border border-[var(--mc-color-danger)]/25 bg-[var(--mc-color-surface-strong)] p-12 text-center shadow-[var(--mc-shadow-soft)]" role="alert">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--mc-color-danger)]/10 text-[var(--mc-color-danger)]">
              <RotateCcw className="h-7 w-7" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-[var(--mc-color-text-primary)]">Không thể tải bộ sưu tập</h3>
            <p className="text-sm leading-6 text-[var(--mc-color-text-secondary)]">{loadError}</p>
            <button type="button" onClick={loadStoreData} className="mc-focus-ring mt-2 min-h-11 rounded-full bg-[var(--mc-color-surface-base)] px-5 text-sm font-bold text-white transition-colors hover:bg-[var(--mc-color-accent-strong)]">Thử tải lại</button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="mx-auto max-w-lg space-y-4 rounded-[var(--mc-radius-xs)] border border-[var(--mc-color-border-default)]/15 bg-[var(--mc-color-surface-strong)] p-12 text-center shadow-[var(--mc-shadow-soft)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--mc-color-accent)]/10 text-[var(--mc-color-accent-strong)]">
              <ShoppingBag className="h-7 w-7" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-[var(--mc-color-text-primary)]">Chưa có thiết kế phù hợp</h3>
            <p className="text-sm leading-6 text-[var(--mc-color-text-secondary)]">Thử bỏ bớt bộ lọc hoặc tìm một từ khóa khác. Nếu bạn đang quản lý shop, hãy xuất bản sản phẩm để hiển thị tại đây.</p>
            <button type="button" onClick={onBackToAdmin} className="mc-focus-ring mt-2 min-h-11 rounded-full bg-[var(--mc-color-accent)] px-5 text-sm font-bold text-white transition-colors hover:bg-[var(--mc-color-accent-strong)]">Mở quản trị sản phẩm</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
            {filteredProducts.map(product => (
              <StoreProductCard
                key={product.id}
                product={product}
                onSelect={(p) => setDetailProduct(p)}
                onQuickAdd={handleQuickAdd}
              />
            ))}
          </div>
        )}
      </main>

      {/* 4. Footer */}
      <footer className="mt-10 border-t border-[var(--mc-color-border-default)] bg-[var(--mc-color-surface-base)] pb-8 pt-12 text-xs text-white/60">
        <div className="mc-content-width mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 border-b border-white/15 pb-10 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
            {/* Brand Col */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-[var(--mc-radius-xs)] bg-[var(--mc-color-surface-strong)] text-[var(--mc-color-accent)]">
                  <Layers className="h-4 w-4" aria-hidden="true" />
                </div>
                <span className="text-sm font-bold text-white">{config.storeName && config.storeName !== "1688 STORE" ? config.storeName : "MACORNER"}</span>
              </div>
              <p className="max-w-xs text-sm leading-6 text-white/60">{config.tagline && config.tagline !== "Cửa hàng trực tuyến" ? config.tagline : "Quà cá nhân hóa cho những người bạn yêu"}</p>
              <div className="flex items-start gap-2 text-xs font-semibold text-white/80">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--mc-color-accent)]" aria-hidden="true" />
                <span>Giá và tồn kho được xác nhận khi đặt hàng</span>
              </div>
            </div>

            {/* Contact Col */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white">Liên hệ & hỗ trợ</h4>
              {config.hotline && <p className="flex items-center gap-2 text-xs">
                <Phone className="h-3.5 w-3.5 text-[var(--mc-color-accent)]" aria-hidden="true" />
                <span>Hotline: <strong className="text-white">{config.hotline}</strong></span>
              </p>}
              {config.address && (
                <p className="flex items-start gap-2 text-xs leading-5">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--mc-color-accent)]" aria-hidden="true" />
                  <span>{config.address}</span>
                </p>
              )}
              {config.zaloUrl && (
                <a
                  href={config.zaloUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mc-focus-ring inline-block rounded text-xs text-[var(--mc-color-accent)] hover:underline"
                >
                  Tư vấn Zalo trực tiếp <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>

            {/* Policy Col */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white">Thông tin mua hàng</h4>
              <ul className="space-y-2 text-xs leading-5">
                <li>Tra cứu đơn bằng mã đơn và số điện thoại</li>
                <li>Giá bán được tính lại tại máy chủ</li>
                <li>Tồn kho được giữ khi tạo đơn thành công</li>
                <li>Thông tin nguồn hàng không công khai</li>
              </ul>
            </div>

            {/* Payment Partners Col */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white">Thanh toán an toàn</h4>
              <div className="flex flex-wrap gap-2 text-xs">
                {config.bankName && config.bankAccountNo && config.bankAccountName && <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-white/80">
                  <QrCode className="h-3 w-3 text-[var(--mc-color-accent)]" aria-hidden="true" /> VietQR
                </span>}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-white/80">
                  <Truck className="h-3 w-3 text-[var(--mc-color-accent)]" aria-hidden="true" /> COD tận nhà
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-white/45">Phương thức khả dụng được xác nhận khi thanh toán.</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-2 pt-6 text-[11px] text-white/45 sm:flex-row">
            <span>© {new Date().getFullYear()} {config.storeName && config.storeName !== "1688 STORE" ? config.storeName : "MACORNER"}. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <button type="button" onClick={onBackToAdmin} className="mc-focus-ring rounded text-[var(--mc-color-accent)] hover:underline">
                Quay về quản trị
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* 5. Modals and Drawers */}
      <StoreCartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onOpenCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
        config={config}
        appliedDiscountCode={appliedDiscountCode}
        onApplyDiscountCode={setAppliedDiscountCode}
      />

      {detailProduct && <StoreProductDetailModal
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
      />}

      <StoreCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cart}
        config={config}
        appliedDiscountCode={appliedDiscountCode}
        onOrderSuccess={handleOrderSuccess}
        onShowToast={onShowToast}
      />

      <StoreOrderSuccessModal
        isOpen={isSuccessOpen}
        order={lastCreatedOrder}
        qrCodeUrl={lastQrCodeUrl}
        config={config}
        onClose={() => setIsSuccessOpen(false)}
        onOpenTracker={(orderNo) => {
          setIsSuccessOpen(false);
          setTrackerOrderNo(orderNo);
          setIsTrackerOpen(true);
        }}
      />

      <StoreOrderTrackerModal
        isOpen={isTrackerOpen}
        initialQuery={trackerOrderNo}
        onClose={() => setIsTrackerOpen(false)}
      />

      {/* Social Proof Realtime Purchases (Macorner Feature) */}
      <StoreSocialProofPopup products={products} enabled={catalogMode === "DEMO"} />

      {/* 6. Mobile Sticky Bottom Navigation Bar */}
      <StoreMobileBottomNav
        cartCount={totalCartCount}
        onGoHome={handleGoHome}
        onOpenOccasions={handleOpenOccasions}
        onOpenSearch={handleOpenSearch}
        onOpenTracker={() => {
          setTrackerOrderNo("");
          setIsTrackerOpen(true);
        }}
        onOpenCart={() => setIsCartOpen(true)}
        activeFilterCount={(activeOccasion !== "all" ? 1 : 0) + (activeRecipient !== "all" ? 1 : 0) + (selectedCategory !== "ALL" ? 1 : 0)}
      />
    </div>
  );
};

function getDemoStoreProducts(): WebProduct[] {
  return [
    {
      id: "DEMO-001",
      slug: "ao-polo-nam-cotton-pique-cao-cap",
      skuCode: "POLO-2026-01",
      titleVI: "Áo Polo Nam Cotton Pique Cao Cấp Co Giãn Thoáng Khí Phong Cách Công Sở",
      titleEN: "Men's Classic Pique Cotton Polo Shirt Breathable Casual Business",
      categoryName: "Thời Trang Nam",
      primaryImage: "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=600&auto=format&fit=crop&q=80",
      galleryImages: [
        "https://images.unsplash.com/photo-1625910513413-56839352e008?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600&auto=format&fit=crop&q=80"
      ],
      detailImages: [
        "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=800&auto=format&fit=crop&q=80"
      ],
      minPriceVND: 189000,
      maxPriceVND: 219000,
      qualityScore: 96,
      status: "PUBLISHED",
      sourceProductId: "1688-DEMO-001",
      sourceUrl: "https://detail.1688.com/offer/demo1.html",
      supplierName: "Xưởng Dệt May Quảng Châu",
      isTitleLocked: false,
      isDescLocked: false,
      isImagesLocked: false,
      isPriceAutoSync: true,
      isStockAutoSync: true,
      fullDescVI: "Áo polo nam chất liệu Cotton Pique dệt mắt chim cao cấp, thấm hút mồ hôi cực tốt. Phù hợp đi làm, dạo phố, thể thao nhẹ nhàng. Đường may tỉ mỉ, bo cổ dày dặn không bai dão sau nhiều lần giặt.",
      attributes: [
        { keyVI: "Chất liệu", valueVI: "95% Cotton Pique, 5% Spandex", keyCN: "材质", valueCN: "棉" },
        { keyVI: "Kiểu dáng", valueVI: "Slim-fit vừa vặn tôn dáng", keyCN: "版型", valueCN: "修身" },
        { keyVI: "Xuất xứ", valueVI: "Xưởng dệt may cao cấp", keyCN: "产地", valueCN: "广东" }
      ],
      variants: [
        {
          sourceSkuId: "POLO-BLK-L",
          colorName: "Đen Basic",
          sizeName: "Size L (55-65kg)",
          costPriceVND: 95000,
          sellingPriceVND: 189000,
          stockQuantity: 150,
          imageUrl: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=300&auto=format&fit=crop&q=80",
          sourceAvailable: true,
          selectedForSale: true
        },
        {
          sourceSkuId: "POLO-WHT-XL",
          colorName: "Trắng Tinh Khôi",
          sizeName: "Size XL (65-75kg)",
          costPriceVND: 95000,
          sellingPriceVND: 189000,
          stockQuantity: 200,
          imageUrl: "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=300&auto=format&fit=crop&q=80",
          sourceAvailable: true,
          selectedForSale: true
        },
        {
          sourceSkuId: "POLO-BLU-2XL",
          colorName: "Xanh Navy",
          sizeName: "Size 2XL (75-85kg)",
          costPriceVND: 105000,
          sellingPriceVND: 219000,
          stockQuantity: 80,
          imageUrl: "https://images.unsplash.com/photo-1625910513413-56839352e008?w=300&auto=format&fit=crop&q=80",
          sourceAvailable: true,
          selectedForSale: true
        }
      ]
    },
    {
      id: "DEMO-002",
      slug: "dam-vay-xoe-hoa-nhi-vintage-du-tiec",
      skuCode: "DRESS-2026-02",
      titleVI: "Đầm Váy Xòe Nữ Hoa Nhí Phong Cách Vintage Hàn Quốc Dáng Dài Tôn Dáng",
      titleEN: "Women's Vintage Floral Midi Dress Elegant Party Casual",
      categoryName: "Thời Trang Nữ",
      primaryImage: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&auto=format&fit=crop&q=80",
      galleryImages: [
        "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&auto=format&fit=crop&q=80"
      ],
      minPriceVND: 245000,
      maxPriceVND: 265000,
      qualityScore: 94,
      status: "PUBLISHED",
      sourceProductId: "1688-DEMO-002",
      sourceUrl: "https://detail.1688.com/offer/demo2.html",
      supplierName: "Xưởng Váy Đầm Thiết Kế",
      isTitleLocked: false,
      isDescLocked: false,
      isImagesLocked: false,
      isPriceAutoSync: true,
      isStockAutoSync: true,
      fullDescVI: "Thiết kế đầm xòe cổ V dịu dàng, chất voan tơ 2 lớp mềm mịn bay bổng. Họa tiết hoa nhí vintage nhẹ nhàng sang chảnh phù hợp đi làm, dự tiệc, đi chơi chụp ảnh.",
      attributes: [
        { keyVI: "Chất liệu", valueVI: "Voan lụa tơ 2 lớp kèm lót trong", keyCN: "面料", valueCN: "雪纺" },
        { keyVI: "Chiều dài", valueVI: "Dáng dài qua gối 105cm", keyCN: "裙长", valueCN: "长裙" }
      ],
      variants: [
        {
          sourceSkuId: "DR-FLW-S",
          colorName: "Hoa Vàng Nhạt",
          sizeName: "Size S (42-48kg)",
          costPriceVND: 120000,
          sellingPriceVND: 245000,
          stockQuantity: 90,
          imageUrl: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=300&auto=format&fit=crop&q=80",
          sourceAvailable: true,
          selectedForSale: true
        },
        {
          sourceSkuId: "DR-FLW-M",
          colorName: "Hoa Vàng Nhạt",
          sizeName: "Size M (49-55kg)",
          costPriceVND: 120000,
          sellingPriceVND: 245000,
          stockQuantity: 120,
          imageUrl: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=300&auto=format&fit=crop&q=80",
          sourceAvailable: true,
          selectedForSale: true
        }
      ]
    },
    {
      id: "DEMO-003",
      slug: "giay-sneaker-the-thao-nam-nu-don-de",
      skuCode: "SHOE-2026-03",
      titleVI: "Giày Thể Thao Sneaker Nữ Unisex Phong Cách Chunky Độn Đế Êm Chân",
      titleEN: "Unisex Chunky Sneaker Platform Running Sports Shoes",
      categoryName: "Giày Dép & Phụ Kiện",
      primaryImage: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80",
      galleryImages: [
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80"
      ],
      minPriceVND: 299000,
      maxPriceVND: 320000,
      qualityScore: 95,
      status: "PUBLISHED",
      sourceProductId: "1688-DEMO-003",
      sourceUrl: "https://detail.1688.com/offer/demo3.html",
      supplierName: "Xưởng Giày Phúc Kiến",
      isTitleLocked: false,
      isDescLocked: false,
      isImagesLocked: false,
      isPriceAutoSync: true,
      isStockAutoSync: true,
      fullDescVI: "Giày sneaker thể thao phong cách Hàn Quốc thời thượng, đế cao su non đúc nguyên khối 4.5cm êm nhẹ chống trơn trượt.",
      attributes: [
        { keyVI: "Chất liệu đế", valueVI: "Cao su đúc nguyên khối chống mòn", keyCN: "鞋底", valueCN: "橡胶" },
        { keyVI: "Độ cao đế", valueVI: "4.5 cm", keyCN: "跟高", valueCN: "4.5cm" }
      ],
      variants: [
        {
          sourceSkuId: "SH-WHT-37",
          colorName: "Trắng Sữa",
          sizeName: "Size 37",
          costPriceVND: 140000,
          sellingPriceVND: 299000,
          stockQuantity: 60,
          imageUrl: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=300&auto=format&fit=crop&q=80",
          sourceAvailable: true,
          selectedForSale: true
        },
        {
          sourceSkuId: "SH-WHT-38",
          colorName: "Trắng Sữa",
          sizeName: "Size 38",
          costPriceVND: 140000,
          sellingPriceVND: 299000,
          stockQuantity: 75,
          imageUrl: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=300&auto=format&fit=crop&q=80",
          sourceAvailable: true,
          selectedForSale: true
        }
      ]
    },
    {
      id: "DEMO-004",
      slug: "balo-thoi-trang-chong-nuoc-laptop-15-inch",
      skuCode: "BAG-2026-04",
      titleVI: "Balo Thời Trang Chống Thấm Nước Đựng Vừa Laptop 15.6 Inch Nhiều Ngăn Tiện Ích",
      titleEN: "Waterproof Casual Backpack Travel School Bag with Laptop Sleeve",
      categoryName: "Túi Xách & Balo",
      primaryImage: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80",
      galleryImages: [
        "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=600&auto=format&fit=crop&q=80"
      ],
      minPriceVND: 215000,
      maxPriceVND: 235000,
      qualityScore: 92,
      status: "PUBLISHED",
      sourceProductId: "1688-DEMO-004",
      sourceUrl: "https://detail.1688.com/offer/demo4.html",
      supplierName: "Xưởng Balo & Túi Xách Bạch Câu",
      isTitleLocked: false,
      isDescLocked: false,
      isImagesLocked: false,
      isPriceAutoSync: true,
      isStockAutoSync: true,
      fullDescVI: "Balo vải Oxford 900D kháng nước vượt trội, khóa kéo kim loại chống kẹt, quai đeo đệm lưới thoáng khí giảm áp lực vai.",
      attributes: [
        { keyVI: "Chất liệu", valueVI: "Vải Oxford 900D trượt nước", keyCN: "材质", valueCN: "牛津纺" },
        { keyVI: "Ngăn đựng laptop", valueVI: "Đệm chống sốc cho laptop 15.6 inch", keyCN: "电脑仓", valueCN: "15.6寸" }
      ],
      variants: [
        {
          sourceSkuId: "BAG-GRY-STD",
          colorName: "Xám Tiêu Chuẩn",
          sizeName: "Cỡ Lớn (45 x 30 x 14cm)",
          costPriceVND: 110000,
          sellingPriceVND: 215000,
          stockQuantity: 110,
          imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&auto=format&fit=crop&q=80",
          sourceAvailable: true,
          selectedForSale: true
        }
      ]
    }
  ];
}
