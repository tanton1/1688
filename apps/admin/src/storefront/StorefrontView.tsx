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
import { StoreSocialProofPopup } from "./StoreSocialProofPopup";
import { DEMO_MACORNER_PRODUCTS } from "./demoMacornerCatalog";
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
  const [activeOccasion, setActiveOccasion] = useState<string>("all");
  const [activeRecipient, setActiveRecipient] = useState<string>("all");
  const [appliedDiscountCode, setAppliedDiscountCode] = useState<string>("");
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

      let loadedProducts: WebProduct[] = [];

      // 1. Kiểm tra sản phẩm từ Backend
      if (prodRes?.products && prodRes.products.length > 0) {
        loadedProducts = prodRes.products;
      }

      // 2. Kiểm tra từ localStorage persistence
      if (loadedProducts.length === 0) {
        const rawLocal = localStorage.getItem("hub1688_persisted_products");
        if (rawLocal) {
          try {
            const parsed: WebProduct[] = JSON.parse(rawLocal);
            const published = parsed.filter(p => p.status === "PUBLISHED");
            if (published.length > 0) {
              loadedProducts = published;
            } else if (parsed.length > 0) {
              // Hiển thị các sản phẩm đã clone/cào để người dùng thấy ngay trên cửa hàng
              loadedProducts = parsed;
            }
          } catch {}
        }
      }

      // 3. Nếu kho hoàn toàn trống, nạp sản phẩm demo chuẩn xưởng
      if (loadedProducts.length === 0) {
        loadedProducts = getDemoStoreProducts();
      }

      // Tích hợp trọn bộ sản phẩm cá nhân hóa Macorner POD cùng các sản phẩm đã đồng bộ
      const finalCatalog: WebProduct[] = [...DEMO_MACORNER_PRODUCTS];
      loadedProducts.forEach(p => {
        if (!finalCatalog.some(existing => existing.id === p.id || existing.slug === p.slug)) {
          finalCatalog.push(p);
        }
      });

      setProducts(finalCatalog);
      const catSet = new Set(finalCatalog.map(p => p.categoryName).filter(Boolean));
      setCategories(Array.from(catSet) as string[]);

      if (initialProductId) {
        const match = finalCatalog.find(p => p.id === initialProductId || p.slug === initialProductId);
        if (match) setDetailProduct(match);
      }
    } catch (err: any) {
      console.error("Lỗi khi tải dữ liệu cửa hàng:", err);
      const fallbackCatalog = [...DEMO_MACORNER_PRODUCTS, ...getDemoStoreProducts()];
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
          image: customizedPreviewUrl || variant.imageUrl || product.primaryImage,
          priceVND: price,
          quantity,
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

      {/* 2.5 Occasions & Recipients Filter Bar (Macorner Feature) */}
      <StoreOccasionsNav
        activeOccasion={activeOccasion}
        onSelectOccasion={setActiveOccasion}
        activeRecipient={activeRecipient}
        onSelectRecipient={setActiveRecipient}
        totalProductsCount={products.length}
      />

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
        appliedDiscountCode={appliedDiscountCode}
        onApplyDiscountCode={setAppliedDiscountCode}
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

      {/* Social Proof Realtime Purchases (Macorner Feature) */}
      <StoreSocialProofPopup products={products} />
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
