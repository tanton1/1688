import React, { useState, useEffect, useCallback } from "react";
import { WebProduct, ProductDiffSummary } from "@hub1688/shared-types";
import { AdminApi, clearAccessToken, getAccessToken, getApiBaseUrl, setApiBaseUrl } from "./services/api";
import { Sidebar, AdminTab } from "./components/Sidebar";
import { Header } from "./components/Header";
import { DashboardView } from "./components/DashboardView";
import { ProductsListView } from "./components/ProductsListView";
import { DiffCenterView } from "./components/DiffCenterView";
import { PricingRulesView } from "./components/PricingRulesView";
import { GlossaryView } from "./components/GlossaryView";
import { OrdersView } from "./components/OrdersView";
import { AuthModal, CurrentUser } from "./components/AuthModal";
import { StoreConnectorsModal } from "./components/StoreConnectorsModal";
import type { StudioMode } from "./components/BannerFrameStudioModal";
import { CheckCircle2, AlertCircle, Settings, Globe, Store, ExternalLink } from "lucide-react";

const ProductDetailModal = React.lazy(() => import("./components/ProductDetailModal").then(module => ({ default: module.ProductDetailModal })));
const BannerFrameStudioModal = React.lazy(() => import("./components/BannerFrameStudioModal").then(module => ({ default: module.BannerFrameStudioModal })));
const MultiPlatformCloneModal = React.lazy(() => import("./components/MultiPlatformCloneModal").then(module => ({ default: module.MultiPlatformCloneModal })));
const TemplatesView = React.lazy(() => import("./components/TemplatesView").then(module => ({ default: module.TemplatesView })));
const StorefrontView = React.lazy(() => import("./storefront/StorefrontView").then(module => ({ default: module.StorefrontView })));
const StoreSettingsModal = React.lazy(() => import("./storefront/StoreSettingsModal").then(module => ({ default: module.StoreSettingsModal })));
const LoadingPanel = () => <div role="status" className="grid min-h-40 place-items-center text-sm font-semibold text-slate-500">Đang tải phân hệ…</div>;
const getStorefrontRoute = () => {
  if (typeof window === "undefined") return { isStorefront: false, product: null as string | null, collection: null as string | null };
  const path = window.location.pathname.replace(/\/+$/, "");
  const params = new URLSearchParams(window.location.search);
  const productPath = path.match(/\/(?:store\/)?products\/([^/]+)/i)?.[1] || null;
  const collectionPath = path.match(/\/(?:store\/)?collections\/([^/]+)/i)?.[1] || null;
  return {
    isStorefront: path.startsWith("/shop") || path.startsWith("/store") || path.startsWith("/products") || path.startsWith("/collections") || params.get("view") === "store" || params.get("view") === "shop",
    product: productPath || params.get("product"),
    collection: collectionPath || params.get("collection")
  };
};
const hasPasswordRecoveryLink = (): boolean => {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return params.get("type") === "recovery" && Boolean(params.get("access_token"));
};

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<AdminTab>("DASHBOARD");
  const [products, setProducts] = useState<WebProduct[]>([]);
  const [productTotal, setProductTotal] = useState(0);
  const [dashboardStats, setDashboardStats] = useState<Awaited<ReturnType<typeof AdminApi.getDashboardStats>> | null>(null);
  const [diffLogs, setDiffLogs] = useState<ProductDiffSummary[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<WebProduct | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [backendUrl, setBackendUrlState] = useState<string>(getApiBaseUrl());
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState(backendUrl);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Web Bán Hàng Trực Tiếp (Storefront State)
  const [viewMode, setViewMode] = useState<"admin" | "storefront">(() => {
    return getStorefrontRoute().isStorefront ? "storefront" : "admin";
  });
  const [storefrontProductId, setStorefrontProductId] = useState<string | null>(() => {
    return getStorefrontRoute().product;
  });
  const [storefrontCollection, setStorefrontCollection] = useState<string | null>(() => getStorefrontRoute().collection);
  const [showStoreSettingsModal, setShowStoreSettingsModal] = useState(false);

  const openStorefront = (productId?: string) => {
    setStorefrontProductId(productId || null);
    setStorefrontCollection(null);
    setViewMode("storefront");
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("view", "store");
      if (productId) url.searchParams.set("product", productId);
      else url.searchParams.delete("product");
      url.pathname = "/store";
      window.history.pushState({}, "", url.toString());
    } catch {}
  };

  const openAdmin = () => {
    setViewMode("admin");
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("view");
      url.searchParams.delete("product");
      url.pathname = "/";
      window.history.pushState({}, "", url.toString());
    } catch {}
  };

  useEffect(() => {
    const syncRoute = () => {
      const route = getStorefrontRoute();
      setViewMode(route.isStorefront ? "storefront" : "admin");
      setStorefrontProductId(route.product);
      setStorefrontCollection(route.collection);
    };
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  // Authentication & Role State
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    if (hasPasswordRecoveryLink()) return null;
    const saved = sessionStorage.getItem("hub1688_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return null;
  });
  const [showAuthModal, setShowAuthModal] = useState(() => hasPasswordRecoveryLink() || !getAccessToken());

  // Omnichannel Store Connectors State
  const [showConnectorsModal, setShowConnectorsModal] = useState(false);
  const [connectorsProduct, setConnectorsProduct] = useState<WebProduct | null>(null);

  // E-Commerce Banner & Frame Studio State
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [bannerProduct, setBannerProduct] = useState<WebProduct | null>(null);
  const [bannerSelectedImage, setBannerSelectedImage] = useState<string | undefined>(undefined);
  const [bannerInitialMode, setBannerInitialMode] = useState<StudioMode>("TRANSLATE");

  // Multi-Platform Cloner State
  const [showMultiCloneModal, setShowMultiCloneModal] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (!currentUser) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("channel") !== "shopee") return;
    const connected = url.searchParams.get("connection") === "success";
    setShowConnectorsModal(true);
    showToast(
      connected ? "Đã kết nối tài khoản Shopee Seller thành công." : `Kết nối Shopee thất bại (${url.searchParams.get("reason") || "không xác định"}).`,
      connected ? "success" : "error"
    );
    url.searchParams.delete("channel");
    url.searchParams.delete("connection");
    url.searchParams.delete("reason");
    window.history.replaceState({}, "", url.toString());
  }, [currentUser]);

  const handleLogin = (user: CurrentUser) => {
    setCurrentUser(user);
    sessionStorage.setItem("hub1688_user", JSON.stringify(user));
    showToast(
      `Chào mừng ${user.name} (${user.role === "ADMIN" ? "Quản Trị Viên" : "Sourcing Specialist"})!`
    );
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem("hub1688_user");
    clearAccessToken();
    setProducts([]);
    setDiffLogs([]);
    showToast("Đã đăng xuất tài khoản!");
  };

  // Database is the only source of truth; the browser does not rehydrate server RAM.
  const loadData = useCallback(async () => {
    if (!getAccessToken()) return;
    setIsRefreshing(true);
    try {
      const [prodRes, diffRes, statsRes] = await Promise.all([
        AdminApi.getProducts(),
        AdminApi.getDiffLogs(),
        AdminApi.getDashboardStats()
      ]);
      setProducts(prodRes.items || []);
      setProductTotal(prodRes.total || 0);
      setDiffLogs(diffRes.logs || []);
      setDashboardStats(statsRes);
    } catch (err: any) {
      console.error("Lỗi khi tải dữ liệu:", err);
      if (String(err.message).includes("401")) { handleLogout(); setShowAuthModal(true); }
      showToast(err.message || "Không thể tải dữ liệu từ backend", "error");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const loadProductPage = useCallback(async (query: Parameters<typeof AdminApi.getProducts>[0]) => {
    if (!getAccessToken()) return;
    setIsRefreshing(true);
    try {
      const result = await AdminApi.getProducts(query);
      setProducts(result.items || []);
      setProductTotal(result.total || 0);
    } catch (err: any) {
      showToast(err.message || "Không thể tải trang sản phẩm", "error");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const refreshDashboardStats = useCallback(async () => {
    try { setDashboardStats(await AdminApi.getDashboardStats()); }
    catch (error) { console.warn("Không thể làm mới KPI:", error); }
  }, []);

  useEffect(() => {
    if (currentUser && getAccessToken()) loadData();
  }, [currentUser, loadData]);

  useEffect(() => {
    const onExpired = () => { setCurrentUser(null); setProducts([]); setDiffLogs([]); setShowAuthModal(true); };
    window.addEventListener("hub1688:auth-expired", onExpired);
    return () => window.removeEventListener("hub1688:auth-expired", onExpired);
  }, []);

  // Cập nhật sản phẩm
  const handleSaveProduct = async (updated: WebProduct) => {
    try {
      const result = await AdminApi.updateProduct(updated.id!, updated);
      setProducts(prev => prev.map(p => (p.id === updated.id ? result.product : p)));
      setSelectedProduct(current => current?.id === updated.id ? result.product : current);
      void refreshDashboardStats();
      showToast("Đã lưu thông tin sản phẩm và ma trận SKU thành công!");
      return result.product;
    } catch (err: any) {
      showToast(err.message || "Lỗi khi lưu sản phẩm", "error");
      throw err;
    }
  };

  const handlePublishFromEditor = async (updated: WebProduct): Promise<WebProduct> => {
    try {
      const { id: _id, skuCode: _skuCode, sourceProductId: _sourceProductId, sourceUrl: _sourceUrl, supplierName: _supplierName, createdAt: _createdAt, updatedAt: _updatedAt, minPriceVND: _minPriceVND, maxPriceVND: _maxPriceVND, ...editable } = updated;
      const saved = await AdminApi.updateProduct(updated.id!, { ...editable, status: "DRAFT" });
      const published = await AdminApi.publishProduct(saved.product.id!);
      setProducts(prev => prev.map(product => product.id === published.product.id ? published.product : product));
      setSelectedProduct(published.product);
      void refreshDashboardStats();
      showToast("Đã lưu và đăng sản phẩm lên storefront thành công!");
      return published.product;
    } catch (err: any) {
      showToast(err.message || "Không thể đăng sản phẩm lên storefront", "error");
      throw err;
    }
  };

  // Áp dụng ảnh bìa đóng khung từ Banner Studio
  const handleApplyBannerImage = async (newImageUrl: string) => {
    const target = bannerProduct || selectedProduct;
    if (!target?.id) return;

    const updated = { ...target, primaryImage: newImageUrl };
    await handleSaveProduct(updated);
    if (selectedProduct?.id === target.id) {
      setSelectedProduct(updated);
    }
  };

  // Áp dụng thay thế ảnh đã dịch / chỉnh sửa vào đúng vị trí ảnh đó (Gallery hoặc Bảng size chi tiết)
  const handleApplyEditedImage = async (originalImageUrl: string, newImageUrl: string) => {
    const target = bannerProduct || selectedProduct;
    if (!target?.id) return;

    let nextPrimary = target.primaryImage;
    if (target.primaryImage === originalImageUrl) {
      nextPrimary = newImageUrl;
    }
    const nextGallery = (target.galleryImages || []).map(img => (img === originalImageUrl ? newImageUrl : img));
    const nextDetail = (target.detailImages || []).map(img => (img === originalImageUrl ? newImageUrl : img));

    const updated: WebProduct = {
      ...target,
      primaryImage: nextPrimary,
      galleryImages: nextGallery,
      detailImages: nextDetail
    };
    await handleSaveProduct(updated);
    if (selectedProduct?.id === target.id) {
      setSelectedProduct(updated);
    }
  };

  // Đổi trạng thái xuất bản
  const handlePublishProduct = async (id: string) => {
    const prod = products.find(p => p.id === id);
    if (!prod) return;

    // A draft must always pass through the editor review. Publishing directly
    // from the table hid quality blockers and personalization bindings from
    // the merchant, which made a rejected publish look like a sync failure.
    if (prod.status !== "PUBLISHED") {
      setSelectedProduct(prod);
      showToast("Kiểm tra bảng review trong chi tiết sản phẩm rồi xác nhận đăng lên storefront.");
      return;
    }

    try {
      const result = await AdminApi.updateProduct(id, { status: "DRAFT", version: prod.version });
      setProducts(prev => prev.map(p => (p.id === id ? result.product : p)));
      void refreshDashboardStats();
      showToast("Đã chuyển sản phẩm về bản nháp!");
    } catch (err: any) {
      showToast(err.message || "Lỗi khi đổi trạng thái", "error");
    }
  };

  // Xóa 1 sản phẩm (Yêu cầu quyền Admin)
  const handleDeleteProduct = async (id: string) => {
    if (currentUser?.role === "SOURCING") {
      showToast("Tài khoản Chuyên Viên (Sourcing) không có quyền xóa sản phẩm. Yêu cầu quyền Quản Trị Viên (Admin).", "error");
      return;
    }

    try {
      await AdminApi.deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      setProductTotal(total => Math.max(0, total - 1));
      void refreshDashboardStats();
      showToast("Đã xóa sản phẩm thành công!");
    } catch (err: any) {
      showToast(err.message || "Lỗi khi xóa sản phẩm", "error");
    }
  };

  // Đăng bán hàng loạt
  const handleBulkPublish = async (ids: string[]) => {
    try {
      const result = await AdminApi.bulkPublish(ids);
      await loadData();
      showToast(`Đã đăng bán thành công ${result.count} sản phẩm đủ quality gate!`);
    } catch (err: any) {
      showToast(err.message || "Lỗi khi đăng bán hàng loạt", "error");
    }
  };

  // Xóa hàng loạt (Yêu cầu quyền Admin)
  const handleBulkDelete = async (ids: string[]) => {
    if (currentUser?.role === "SOURCING") {
      showToast("Tài khoản Chuyên Viên (Sourcing) không có quyền xóa hàng loạt. Yêu cầu quyền Quản Trị Viên (Admin).", "error");
      return;
    }

    try {
      const result = await AdminApi.bulkDelete(ids);
      setProducts(prev => prev.filter(p => !ids.includes(p.id!)));
      setProductTotal(total => Math.max(0, total - result.count));
      void refreshDashboardStats();
      showToast(`Đã xóa ${result.count} sản phẩm!`);
    } catch (err: any) {
      showToast(err.message || "Lỗi khi xóa hàng loạt", "error");
    }
  };

  // Xử lý lệch Diff
  const handleResolveDiff = async (webProductId: string, action: "APPLY" | "IGNORE") => {
    try {
      await AdminApi.resolveDiff(webProductId, action);
      setDiffLogs(prev => prev.filter(d => d.webProductId !== webProductId));
      void refreshDashboardStats();
      showToast(
        action === "APPLY"
          ? "Đã áp dụng thay đổi từ 1688 vào dữ liệu bán hàng!"
          : "Đã bỏ qua thay đổi và giữ nguyên cấu hình web!"
      );
    } catch (err: any) {
      showToast(err.message || "Lỗi khi xử lý diff", "error");
    }
  };

  // Kéo nhanh bằng Offer ID
  const handleQuickImport = async (offerId: string) => {
    const cleanId = offerId.replace(/[^0-9]/g, "");
    if (!cleanId) {
      showToast("ID sản phẩm 1688 không hợp lệ", "error");
      return;
    }

    try {
      showToast(`Đang gửi yêu cầu bóc tách sản phẩm #${cleanId}...`);
      const result = await AdminApi.executeCloneProduct({
        url: `https://detail.1688.com/offer/${cleanId}.html`,
        autoPublish: false
      });
      setProducts(prev => [result.product, ...prev.filter(p => p.id !== result.product.id)]);
      setProductTotal(total => total + 1);
      void refreshDashboardStats();
      setSelectedProduct(result.product);
      showToast("Đã nhập dữ liệu thật. Vui lòng duyệt trước khi đăng bán.");
    } catch (err: any) {
      showToast(err.message || "Lỗi khi kéo sản phẩm", "error");
    }
  };

  // Lưu cấu hình Backend URL
  const handleSaveBackendUrl = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const previousUrl = getApiBaseUrl();
      setApiBaseUrl(customUrlInput);
      const nextUrl = getApiBaseUrl();
      setBackendUrlState(nextUrl);
      setShowSettingsModal(false);
      if (previousUrl !== nextUrl) {
        clearAccessToken();
        setCurrentUser(null);
        setProducts([]);
        setDiffLogs([]);
        setShowAuthModal(true);
        showToast("Đã đổi Backend. Vui lòng đăng nhập lại để không chuyển token giữa các máy chủ.");
      }
    } catch (err: any) {
      showToast(err.message || "Backend URL không hợp lệ", "error");
    }
  };

  if (viewMode === "storefront") {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg border flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-200 ${
              toast.type === "success"
                ? "bg-emerald-600 text-white border-emerald-500"
                : "bg-rose-600 text-white border-rose-500"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{toast.message}</span>
          </div>
        )}

        <React.Suspense fallback={<LoadingPanel />}><StorefrontView
          onBackToAdmin={openAdmin}
          onShowToast={showToast}
          initialProductId={storefrontProductId}
          initialCollection={storefrontCollection}
        /></React.Suspense>

        <React.Suspense fallback={null}><StoreSettingsModal
          isOpen={showStoreSettingsModal}
          onClose={() => setShowStoreSettingsModal(false)}
          onShowToast={showToast}
        /></React.Suspense>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex">
      {/* Toast Notification */}
      {toast && (
        <div
          role={toast.type === "error" ? "alert" : "status"}
          aria-live={toast.type === "error" ? "assertive" : "polite"}
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl border text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top duration-200 ${
            toast.type === "success"
              ? "bg-emerald-600 text-white border-emerald-500"
              : "bg-rose-600 text-white border-rose-500"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        pendingDiffCount={diffLogs.length}
        totalProductsCount={products.length}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenStorefront={() => openStorefront()}
      />

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-w-0 pt-16 md:pt-0">
        <Header
          currentTab={currentTab}
          backendUrl={backendUrl}
          onRefresh={loadData}
          isRefreshing={isRefreshing}
          onQuickImport={handleQuickImport}
          currentUser={currentUser}
          onOpenAuth={() => setShowAuthModal(true)}
          onOpenConnectors={() => {
            setConnectorsProduct(null);
            setShowConnectorsModal(true);
          }}
          onOpenMultiClone={() => setShowMultiCloneModal(true)}
          onOpenStorefront={() => openStorefront()}
          onOpenStoreSettings={() => setShowStoreSettingsModal(true)}
        />

        <main className="p-3 sm:p-5 lg:p-6 flex-1 overflow-x-hidden">
          {currentTab === "DASHBOARD" && (
            <DashboardView
              products={products}
              stats={dashboardStats}
              diffLogs={diffLogs}
              onNavigateTab={setCurrentTab}
              onSelectProduct={setSelectedProduct}
            />
          )}

          {currentTab === "PRODUCTS" && (
            <ProductsListView
              products={products}
              availableCategories={dashboardStats ? Object.keys(dashboardStats.categoryCount) : undefined}
              totalProducts={productTotal}
              pageSize={25}
              onQueryChange={loadProductPage}
              onSelectProduct={setSelectedProduct}
              onPublishProduct={handlePublishProduct}
              onDeleteProduct={handleDeleteProduct}
              onBulkPublish={handleBulkPublish}
              onBulkDelete={handleBulkDelete}
              onViewOnStore={(prod) => openStorefront(prod.id)}
            />
          )}

          {currentTab === "STOREFRONT" && (
            <div className="space-y-4 -m-3 sm:-m-5 lg:-m-6">
              <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-4 flex flex-wrap items-center justify-between gap-3 sticky top-16 md:top-0 z-20 shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <Store className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xs sm:text-sm">Giao Diện Web Bán Hàng Trực Tiếp (Storefront Live)</h3>
                    <p className="text-[11px] text-emerald-100">Khách mua hàng có thể chọn sản phẩm, thêm giỏ và quét VietQR thanh toán</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowStoreSettingsModal(true)}
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>⚙️ Cài Đặt Shop & VietQR</span>
                  </button>
                  <button
                    onClick={() => openStorefront()}
                    className="px-3.5 py-1.5 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <span>Mở Toàn Màn Hình</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <React.Suspense fallback={<LoadingPanel />}>
                <StorefrontView
                  onBackToAdmin={() => setCurrentTab("PRODUCTS")}
                  onShowToast={showToast}
                  initialProductId={storefrontProductId}
                  initialCollection={storefrontCollection}
                />
              </React.Suspense>
            </div>
          )}

          {currentTab === "ORDERS" && (
            <OrdersView onShowToast={showToast} />
          )}

          {currentTab === "DIFFS" && (
            <DiffCenterView
              diffLogs={diffLogs}
              onResolveDiff={handleResolveDiff}
            />
          )}

          {currentTab === "PRICING" && <PricingRulesView />}

          {currentTab === "GLOSSARY" && <GlossaryView />}

          {currentTab === "TEMPLATES" && <React.Suspense fallback={<LoadingPanel />}><TemplatesView /></React.Suspense>}
        </main>
      </div>

      {/* Modal Chi Tiết & Biên Tập Sản Phẩm */}
      {selectedProduct && <React.Suspense fallback={null}><ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onSave={handleSaveProduct}
        onPublish={handlePublishFromEditor}
        onOpenStorefront={(p) => {
          setSelectedProduct(null);
          openStorefront(p.id);
        }}
        onOpenConnectors={(p) => {
          setConnectorsProduct(p);
          setShowConnectorsModal(true);
        }}
        onOpenBannerStudio={(p, initialImg, mode) => {
          setBannerProduct(p);
          setBannerSelectedImage(initialImg || p.primaryImage);
          setBannerInitialMode(mode || "TRANSLATE");
          setShowBannerModal(true);
        }}
      /></React.Suspense>}

      {/* Modal E-Commerce Banner & Frame Studio + AI Dịch Chữ Trên Ảnh */}
      <React.Suspense fallback={null}><BannerFrameStudioModal
        isOpen={showBannerModal}
        onClose={() => {
          setShowBannerModal(false);
          setBannerProduct(null);
          setBannerSelectedImage(undefined);
        }}
        product={bannerProduct || selectedProduct}
        initialSelectedImage={bannerSelectedImage}
        initialMode={bannerInitialMode}
        onApplyNewPrimaryImage={handleApplyBannerImage}
        onApplyEditedImage={handleApplyEditedImage}
        onShowToast={showToast}
      /></React.Suspense>

      {/* Modal Omnichannel Connectors (WooCommerce, Shopify, Shopee/TikTok CSV & Telegram) */}
      <StoreConnectorsModal
        isOpen={showConnectorsModal}
        onClose={() => {
          setShowConnectorsModal(false);
          setConnectorsProduct(null);
        }}
        products={products}
        selectedProduct={connectorsProduct}
        onShowToast={showToast}
      />

      {/* Modal Clone Sản Phẩm Đa Nền Tảng (Taobao, Tmall, Shopee, TikTok Shop, AliExpress, Web) */}
      <React.Suspense fallback={null}><MultiPlatformCloneModal
        isOpen={showMultiCloneModal}
        onClose={() => setShowMultiCloneModal(false)}
        onProductCreated={(newProd) => {
          setProducts(prev => [newProd, ...prev.filter(p => p.id !== newProd.id)]);
          loadData();
          setSelectedProduct(newProd);
        }}
        onShowToast={showToast}
      /></React.Suspense>

      {/* Modal Authentication & Role Management */}
      <AuthModal
        isOpen={showAuthModal}
        currentUser={currentUser}
        onClose={() => setShowAuthModal(false)}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {/* Modal Cấu Hình Web Bán Hàng Trực Tiếp (Storefront Settings) */}
      <React.Suspense fallback={null}><StoreSettingsModal
        isOpen={showStoreSettingsModal}
        onClose={() => setShowStoreSettingsModal(false)}
        onShowToast={showToast}
      /></React.Suspense>

      {/* Modal Cấu Hình Backend URL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
          <div className="flex min-h-[100dvh] w-screen flex-col bg-white p-5 shadow-2xl animate-in fade-in duration-150">
            <div className="mx-auto w-full max-w-2xl flex-1">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Settings className="w-4 h-4 text-orange-500" />
                Cấu Hình Máy Chủ Backend (API Host)
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBackendUrl} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Đường dẫn Backend Server:
                </label>
                <input
                  type="text"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder="https://1688-phi.vercel.app hoặc http://localhost:3001"
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCustomUrlInput("https://1688-phi.vercel.app")}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold"
                >
                  Vercel Cloud
                </button>
                <button
                  type="button"
                  onClick={() => setCustomUrlInput("http://localhost:3001")}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold"
                >
                  Localhost:3001
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg"
                >
                  Lưu Cấu Hình
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
