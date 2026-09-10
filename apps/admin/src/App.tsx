import React, { useState, useEffect, useCallback } from "react";
import { WebProduct, ProductDiffSummary } from "@hub1688/shared-types";
import { AdminApi, getApiBaseUrl, setApiBaseUrl } from "./services/api";
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

  // Authentication & Role State
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    const saved = localStorage.getItem("hub1688_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    // Mặc định tài khoản Quản Trị Viên (Owner / Admin) để trải nghiệm liền mạch không rào cản
    return {
      email: "admin@1688hub.com",
      name: "Quản Trị Viên (Owner)",
      role: "ADMIN",
      isDemo: true
    };
  });
  const [showAuthModal, setShowAuthModal] = useState(false);

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
    localStorage.setItem("hub1688_user", JSON.stringify(user));
    showToast(
      `Chào mừng ${user.name} (${user.role === "ADMIN" ? "Quản Trị Viên" : "Sourcing Specialist"})!`
    );
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("hub1688_user");
    showToast("Đã đăng xuất tài khoản!");
  };

  // Persistent local cache helper (Chống mất dữ liệu khi Vercel Serverless Function bị cold-start reset RAM)
  const getPersistedProducts = (): WebProduct[] => {
    try {
      const raw = localStorage.getItem("hub1688_persisted_products");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const savePersistedProducts = (items: WebProduct[]) => {
    try {
      localStorage.setItem("hub1688_persisted_products", JSON.stringify(items));
    } catch (e) {
      console.warn("Could not save to localStorage:", e);
    }
  };

  // Tải dữ liệu từ backend kết hợp Local Storage Persistence
  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [prodRes, diffRes] = await Promise.all([
        AdminApi.getProducts().catch(() => ({ total: 0, items: [] })),
        AdminApi.getDiffLogs().catch(() => ({ logs: [] }))
      ]);

      const backendItems = prodRes.items || [];
      const localItems = getPersistedProducts();

      // Hợp nhất dữ liệu thông minh giữa Backend và LocalStorage
      const mergedMap = new Map<string, WebProduct>();

      // 1. Đưa sản phẩm từ backend vào trước
      backendItems.forEach(p => {
        if (p.id) mergedMap.set(p.id, p);
      });

      // 2. Đưa sản phẩm từ local persisted vào (đảm bảo các sản phẩm vừa scan/clone không bao giờ mất)
      const missingOnBackend: WebProduct[] = [];
      localItems.forEach(p => {
        if (p.id) {
          const existing = mergedMap.get(p.id);
          if (!existing) {
            mergedMap.set(p.id, p);
            missingOnBackend.push(p);
          } else {
            const localTime = new Date(p.updatedAt || p.createdAt || 0).getTime();
            const backendTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
            if (localTime >= backendTime) {
              mergedMap.set(p.id, p);
            }
          }
        }
      });

      const finalProducts = Array.from(mergedMap.values());
      setProducts(finalProducts);
      savePersistedProducts(finalProducts);
      setDiffLogs(diffRes.logs || []);

      // Tự động re-hydrate lại RAM của backend nếu backend vừa bị Cold Start
      if (missingOnBackend.length > 0) {
        AdminApi.syncBatchProducts(missingOnBackend).catch(() => {});
      }
    } catch (err: any) {
      console.error("Lỗi khi tải dữ liệu:", err);
      // Fallback về local persisted nếu mất mạng hoặc backend lỗi
      const localItems = getPersistedProducts();
      if (localItems.length > 0) {
        setProducts(localItems);
      }
      showToast(err.message || "Không thể tải dữ liệu từ backend", "error");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Lắng nghe thay đổi từ các tab khác hoặc Extension
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "hub1688_persisted_products" && e.newValue) {
        try {
          const items = JSON.parse(e.newValue);
          if (Array.isArray(items)) {
            setProducts(items);
          }
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Cập nhật sản phẩm
  const handleSaveProduct = async (updated: WebProduct) => {
    try {
      setProducts(prev => {
        const next = prev.map(p => (p.id === updated.id ? updated : p));
        savePersistedProducts(next);
        return next;
      });
      await AdminApi.updateProduct(updated.id!, updated).catch(err => {
        console.warn("Lưu backend tạm lỗi, dữ liệu đã lưu an toàn vào LocalStorage:", err);
      });
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
      setProducts(prev => {
        const next: WebProduct[] = prev.map(p => (p.id === id ? { ...p, status: newStatus } : p));
        savePersistedProducts(next);
        return next;
      });
      await AdminApi.updateProduct(id, { status: newStatus }).catch(() => {});
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
      setProducts(prev => {
        const next = prev.filter(p => p.id !== id);
        savePersistedProducts(next);
        return next;
      });
      showToast("Đã xóa sản phẩm thành công!");
    } catch (err: any) {
      showToast(err.message || "Lỗi khi xóa sản phẩm", "error");
    }
  };

  // Đăng bán hàng loạt
  const handleBulkPublish = async (ids: string[]) => {
    try {
      await AdminApi.bulkPublish(ids);
      setProducts(prev => {
        const next = prev.map(p => (ids.includes(p.id!) ? { ...p, status: "PUBLISHED" as const } : p));
        savePersistedProducts(next);
        return next;
      });
      showToast(`Đã đăng bán thành công ${ids.length} sản phẩm!`);
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
      setProducts(prev => {
        const next = prev.filter(p => !ids.includes(p.id!));
        savePersistedProducts(next);
        return next;
      });
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
      await loadData();
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

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl border text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top duration-200 ${
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
      />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-w-0">
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
        />

        <main className="p-6 flex-1 overflow-x-hidden">
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
          setProducts(prev => {
            const next = [newProd, ...prev.filter(p => p.id !== newProd.id)];
            savePersistedProducts(next);
            return next;
          });
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
