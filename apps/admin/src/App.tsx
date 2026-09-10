import React, { useState, useEffect, useCallback } from "react";
import { WebProduct, ProductDiffSummary } from "@hub1688/shared-types";
import { AdminApi, clearAccessToken, getAccessToken, getApiBaseUrl, setApiBaseUrl } from "./services/api";
import { Sidebar, AdminTab } from "./components/Sidebar";
import { Header } from "./components/Header";
import { DashboardView } from "./components/DashboardView";
import { ProductsListView } from "./components/ProductsListView";
import { ProductDetailModal } from "./components/ProductDetailModal";
import { DiffCenterView } from "./components/DiffCenterView";
import { PricingRulesView } from "./components/PricingRulesView";
import { GlossaryView } from "./components/GlossaryView";
import { OrdersView } from "./components/OrdersView";
import { AuthModal, CurrentUser } from "./components/AuthModal";
import { StoreConnectorsModal } from "./components/StoreConnectorsModal";
import { BannerFrameStudioModal, StudioMode } from "./components/BannerFrameStudioModal";
import { MultiPlatformCloneModal } from "./components/MultiPlatformCloneModal";
import { TemplatesView } from "./components/TemplatesView";
import { StorefrontView } from "./storefront/StorefrontView";
import { StoreSettingsModal } from "./storefront/StoreSettingsModal";
import { CheckCircle2, AlertCircle, Settings, Globe } from "lucide-react";

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<AdminTab>("DASHBOARD");
  const [products, setProducts] = useState<WebProduct[]>([]);
  const [diffLogs, setDiffLogs] = useState<ProductDiffSummary[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<WebProduct | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [backendUrl, setBackendUrlState] = useState<string>(getApiBaseUrl());
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState(backendUrl);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Web Bán Hàng Trực Tiếp (Storefront State)
  const [viewMode, setViewMode] = useState<"admin" | "storefront">(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      if (path.startsWith("/shop") || path.startsWith("/store") || params.get("view") === "store" || params.get("view") === "shop") {
        return "storefront";
      }
    }
    return "admin";
  });
  const [storefrontProductId, setStorefrontProductId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("product") || null;
    }
    return null;
  });
  const [showStoreSettingsModal, setShowStoreSettingsModal] = useState(false);

  const openStorefront = (productId?: string) => {
    setStorefrontProductId(productId || null);
    setViewMode("storefront");
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("view", "store");
      if (productId) url.searchParams.set("product", productId);
      else url.searchParams.delete("product");
      window.history.pushState({}, "", url.toString());
    } catch {}
  };

  const openAdmin = () => {
    setViewMode("admin");
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("view");
      url.searchParams.delete("product");
      window.history.pushState({}, "", url.toString());
    } catch {}
  };

  // Authentication & Role State
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    const saved = sessionStorage.getItem("hub1688_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return null;
  });
  const [showAuthModal, setShowAuthModal] = useState(() => !getAccessToken());

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
      const [prodRes, diffRes] = await Promise.all([
        AdminApi.getProducts(),
        AdminApi.getDiffLogs()
      ]);
      setProducts(prodRes.items || []);
      setDiffLogs(diffRes.logs || []);
    } catch (err: any) {
      console.error("Lỗi khi tải dữ liệu:", err);
      if (String(err.message).includes("401")) { handleLogout(); setShowAuthModal(true); }
      showToast(err.message || "Không thể tải dữ liệu từ backend", "error");
    } finally {
      setIsRefreshing(false);
    }
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
      showToast("Đã lưu thông tin sản phẩm và ma trận SKU thành công!");
    } catch (err: any) {
      showToast(err.message || "Lỗi khi lưu sản phẩm", "error");
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

    const newStatus: "PUBLISHED" | "DRAFT" = prod.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      const result = newStatus === "PUBLISHED"
        ? await AdminApi.publishProduct(id)
        : await AdminApi.updateProduct(id, { status: "DRAFT" });
      setProducts(prev => prev.map(p => (p.id === id ? result.product : p)));
      showToast(
        newStatus === "PUBLISHED"
          ? "Đã xuất bản sản phẩm lên website!"
          : "Đã chuyển sản phẩm về bản nháp!"
      );
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
      await AdminApi.bulkDelete(ids);
      setProducts(prev => prev.filter(p => !ids.includes(p.id!)));
      showToast(`Đã xóa ${ids.length} sản phẩm!`);
    } catch (err: any) {
      showToast(err.message || "Lỗi khi xóa hàng loạt", "error");
    }
  };

  // Xử lý lệch Diff
  const handleResolveDiff = async (webProductId: string, action: "APPLY" | "IGNORE") => {
    try {
      await AdminApi.resolveDiff(webProductId, action);
      setDiffLogs(prev => prev.filter(d => d.webProductId !== webProductId));
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
      setSelectedProduct(result.product);
      showToast("Đã nhập dữ liệu thật. Vui lòng duyệt trước khi đăng bán.");
    } catch (err: any) {
      showToast(err.message || "Lỗi khi kéo sản phẩm", "error");
    }
  };

  // Lưu cấu hình Backend URL
  const handleSaveBackendUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setApiBaseUrl(customUrlInput);
    setBackendUrlState(customUrlInput);
    setShowSettingsModal(false);
    showToast("Đã lưu địa chỉ Backend URL mới!");
    loadData();
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

        <StorefrontView
          onBackToAdmin={openAdmin}
          onShowToast={showToast}
          initialProductId={storefrontProductId}
        />

        <StoreSettingsModal
          isOpen={showStoreSettingsModal}
          onClose={() => setShowStoreSettingsModal(false)}
          onShowToast={showToast}
        />
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
              diffLogs={diffLogs}
              onNavigateTab={setCurrentTab}
              onSelectProduct={setSelectedProduct}
            />
          )}

          {currentTab === "PRODUCTS" && (
            <ProductsListView
              products={products}
              onSelectProduct={setSelectedProduct}
              onPublishProduct={handlePublishProduct}
              onDeleteProduct={handleDeleteProduct}
              onBulkPublish={handleBulkPublish}
              onBulkDelete={handleBulkDelete}
              onViewOnStore={(prod) => openStorefront(prod.id)}
            />
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

          {currentTab === "TEMPLATES" && <TemplatesView />}
        </main>
      </div>

      {/* Modal Chi Tiết & Biên Tập Sản Phẩm */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onSave={handleSaveProduct}
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
      />

      {/* Modal E-Commerce Banner & Frame Studio + AI Dịch Chữ Trên Ảnh */}
      <BannerFrameStudioModal
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
      />

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
      <MultiPlatformCloneModal
        isOpen={showMultiCloneModal}
        onClose={() => setShowMultiCloneModal(false)}
        onProductCreated={(newProd) => {
          setProducts(prev => [newProd, ...prev.filter(p => p.id !== newProd.id)]);
          loadData();
          setSelectedProduct(newProd);
        }}
        onShowToast={showToast}
      />

      {/* Modal Authentication & Role Management */}
      <AuthModal
        isOpen={showAuthModal}
        currentUser={currentUser}
        onClose={() => setShowAuthModal(false)}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {/* Modal Cấu Hình Web Bán Hàng Trực Tiếp (Storefront Settings) */}
      <StoreSettingsModal
        isOpen={showStoreSettingsModal}
        onClose={() => setShowStoreSettingsModal(false)}
        onShowToast={showToast}
      />

      {/* Modal Cấu Hình Backend URL */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-in fade-in zoom-in duration-150">
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
      )}
    </div>
  );
};
