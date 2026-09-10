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
import {
  Filter,
  ArrowUpDown,
  ShoppingBag,
  Layers,
  Sparkles,
  Phone,
  Mail,
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

export const StorefrontView: React.FC<StorefrontViewProps> = ({
  onBackToAdmin,
  onShowToast,
  initialProductId
}) => {
  // Store Config
  const [config, setConfig] = useState<StorefrontConfig>({
    storeName: "1688 SYNC STORE",
    tagline: "Hàng xưởng sỉ cao cấp - Giá tận gốc",
    hotline: "0988.888.888",
    freeShipThresholdVND: 500000,
    bankName: "MBBank (Quân Đội)",
    bankAccountNo: "888899991688",
    bankAccountName: "CHU CUA HANG 1688"
  });

  // Products & Categories
  const [products, setProducts] = useState<WebProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"NEWEST" | "PRICE_ASC" | "PRICE_DESC">("NEWEST");
  const [isLoading, setIsLoading] = useState(true);

  // Cart State (Persisted in localStorage)
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("hub1688_storefront_cart");
      return saved ? JSON.parse(saved) : [];
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
    try {
      const [infoRes, prodRes] = await Promise.all([
        AdminApi.getStoreInfo().catch(() => null),
        AdminApi.getStoreProducts().catch(() => null)
      ]);

      if (infoRes?.config) {
        setConfig(infoRes.config);
      }

      if (prodRes?.products) {
        setProducts(prodRes.products);
        setCategories(prodRes.categories || []);

        if (initialProductId) {
          const match = prodRes.products.find((p: WebProduct) => p.id === initialProductId || p.slug === initialProductId);
          if (match) setDetailProduct(match);
        }
      } else {
        // Fallback: Nếu backend chưa có hoặc rỗng, lấy từ local persisted
        const rawLocal = localStorage.getItem("hub1688_persisted_products");
        if (rawLocal) {
          const parsed: WebProduct[] = JSON.parse(rawLocal);
          const published = parsed.filter(p => p.status === "PUBLISHED");
          setProducts(published);
          const catSet = new Set(published.map(p => p.categoryName).filter(Boolean));
          setCategories(Array.from(catSet) as string[]);
        }
      }
    } catch (err: any) {
      console.error("Lỗi khi tải dữ liệu cửa hàng:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStoreData();
  }, [initialProductId]);

  // Add Item to Cart
  const handleAddToCart = (variant: WebProductVariant, quantity: number, product: WebProduct) => {
    const sku = variant.sourceSkuId || product.skuCode || `SKU-${Date.now()}`;
    const vName = [variant.colorName, variant.sizeName].filter(Boolean).join(" - ") || variant.sourceSkuId || "Mặc định";
    const price = variant.sellingPriceVND || product.minPriceVND || 0;

    setCart(prev => {
      const existingIdx = prev.findIndex(item => item.skuCode === sku);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx].quantity += quantity;
        return next;
      } else {
        const newItem: CartItem = {
          productId: product.id!,
          skuCode: sku,
          variantName: vName,
          productTitle: product.titleVI,
          image: variant.imageUrl || product.primaryImage,
          priceVND: price,
          quantity
        };
        return [...prev, newItem];
      }
    });

    onShowToast(`Đã thêm ${quantity}x "${product.titleVI}" vào giỏ hàng!`);
    setIsCartOpen(true);
  };

  // Buy Now (Add to cart and open checkout)
  const handleBuyNow = (variant: WebProductVariant, quantity: number, product: WebProduct) => {
    handleAddToCart(variant, quantity, product);
    setDetailProduct(null);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  // Quick Add from Product Card
  const handleQuickAdd = (product: WebProduct) => {
    const defaultVariant = product.variants?.find(v => v.selectedForSale !== false) || product.variants?.[0];
    if (defaultVariant) {
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
    setCart(prev => prev.map(it => (it.skuCode === skuCode ? { ...it, quantity: qty } : it)));
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
        if (selectedCategory !== "ALL" && p.categoryName !== selectedCategory) {
          return false;
        }
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
  }, [products, selectedCategory, searchTerm, sortBy]);

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const scrollToCatalog = () => {
    catalogRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-orange-500 selection:text-white">
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

      {/* 3. Main Catalog Section */}
      <main ref={catalogRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-6">
        {/* Category Filters & Sort */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === "ALL"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Tất Cả Sản Phẩm ({products.length})
            </button>

            {categories.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-orange-600 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
            <span className="text-xs text-slate-500 font-medium">Sắp xếp:</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-hidden cursor-pointer"
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
          <div className="py-24 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Đang tải sản phẩm từ cửa hàng...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3 max-w-lg mx-auto shadow-xs">
            <div className="w-16 h-16 rounded-full bg-orange-50 text-orange-400 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Không tìm thấy sản phẩm nào</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Hiện tại chưa có sản phẩm nào ở danh mục này hoặc đang trong trạng thái bản nháp. Bạn có thể vào Admin để xuất bản sản phẩm sang trạng thái Đang Bán (PUBLISHED).
            </p>
            <button
              onClick={onBackToAdmin}
              className="mt-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              Vào Quản Trị Đăng Sản Phẩm
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6">
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
      <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 mt-16 pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
            {/* Brand Col */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold">
                  <Layers className="w-4 h-4" />
                </div>
                <span className="text-white font-extrabold text-sm">{config.storeName}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                {config.tagline || "Kênh phân phối nguồn hàng xưởng sỉ uy tín, giá tận gốc không qua trung gian."}
              </p>
              <div className="pt-1 flex items-center gap-2 text-emerald-400 font-bold text-[11px]">
                <ShieldCheck className="w-4 h-4" />
                <span>Kiểm định chất lượng 100%</span>
              </div>
            </div>

            {/* Contact Col */}
            <div className="space-y-2.5">
              <h4 className="text-white font-bold text-xs uppercase tracking-wider">Liên Hệ & Hỗ Trợ</h4>
              <p className="flex items-center gap-2 text-[11px]">
                <Phone className="w-3.5 h-3.5 text-orange-500" />
                <span>Hotline: <strong className="text-white">{config.hotline}</strong></span>
              </p>
              {config.address && (
                <p className="flex items-start gap-2 text-[11px]">
                  <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                  <span>{config.address}</span>
                </p>
              )}
              {config.zaloUrl && (
                <a
                  href={config.zaloUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-blue-400 hover:underline text-[11px]"
                >
                  Tư vấn Zalo trực tiếp ↗
                </a>
              )}
            </div>

            {/* Policy Col */}
            <div className="space-y-2">
              <h4 className="text-white font-bold text-xs uppercase tracking-wider">Chính Sách Khách Hàng</h4>
              <ul className="space-y-1.5 text-[11px]">
                <li className="hover:text-white cursor-pointer">Chính sách đồng kiểm khi nhận hàng</li>
                <li className="hover:text-white cursor-pointer">Bảo hành đổi trả 7 ngày lỗi xưởng</li>
                <li className="hover:text-white cursor-pointer">Chính sách ưu đãi khách sỉ / đại lý</li>
                <li className="hover:text-white cursor-pointer">Bảo mật thông tin khách hàng</li>
              </ul>
            </div>

            {/* Payment Partners Col */}
            <div className="space-y-2.5">
              <h4 className="text-white font-bold text-xs uppercase tracking-wider">Thanh Toán An Toàn</h4>
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                  <QrCode className="w-3 h-3 text-emerald-400" /> VietQR Napas 247
                </span>
                <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                  <Truck className="w-3 h-3 text-orange-400" /> COD Tận Nhà
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Được tích hợp trực tiếp từ hệ thống 1688 Sync Hub Pro
              </p>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
            <span>© {new Date().getFullYear()} {config.storeName}. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <button onClick={onBackToAdmin} className="text-orange-400 hover:underline font-semibold">
                Quay về Bảng Điều Khiển Admin
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
      />

      <StoreProductDetailModal
        isOpen={!!detailProduct}
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
      />

      <StoreCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cart}
        config={config}
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
    </div>
  );
};
