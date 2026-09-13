import React, { useState } from "react";
import { AdminTab } from "./Sidebar";
import { CurrentUser } from "./AuthModal";
import {
  Search,
  PlusCircle,
  ExternalLink,
  RefreshCw,
  Globe,
  CheckCircle2,
  AlertCircle,
  Share2,
  ShieldCheck,
  User,
  Store
} from "lucide-react";

interface HeaderProps {
  currentTab: AdminTab;
  backendUrl: string;
  onRefresh: () => void;
  isRefreshing: boolean;
  onQuickImport: (offerId: string) => void;
  currentUser: CurrentUser | null;
  onOpenAuth: () => void;
  onOpenConnectors: () => void;
  onOpenMultiClone: () => void;
  onOpenStorefront: () => void;
  onOpenStoreSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  backendUrl,
  onRefresh,
  isRefreshing,
  onQuickImport,
  currentUser,
  onOpenAuth,
  onOpenConnectors,
  onOpenMultiClone,
  onOpenStorefront,
  onOpenStoreSettings
}) => {
  const [quickOfferId, setQuickOfferId] = useState("");
  const [showQuickModal, setShowQuickModal] = useState(false);

  const getTabTitle = (tab: AdminTab) => {
    switch (tab) {
      case "DASHBOARD":
        return { title: "Tổng Quan Hệ Thống", subtitle: "Báo cáo số liệu đồng bộ, sức khỏe listing và cảnh báo biến động" };
      case "PRODUCTS":
        return { title: "Quản Lý Sản Phẩm Đồng Bộ", subtitle: "Danh sách sản phẩm từ 1688, kiểm soát khóa trường và ma trận SKU" };
      case "ORDERS":
        return { title: "Trung Tâm Đơn Hàng & Mua Hộ 1688", subtitle: "Quản lý đơn khách đặt từ WooCommerce / Shopify và hỗ trợ đặt hàng nguồn 1688" };
      case "DIFFS":
        return { title: "Trung Tâm Xử Lý Chênh Lệch (Diff)", subtitle: "Theo dõi & duyệt biến động giá, tồn kho từ nguồn 1688 Trung Quốc" };
      case "PRICING":
        return { title: "Cấu Hình Quy Tắc Định Giá", subtitle: "Công thức tính giá vốn VNĐ, tỷ giá tệ NDT và mô phỏng giá bán tự động" };
      case "GLOSSARY":
        return { title: "Từ Điển Thuật Ngữ E-Commerce", subtitle: "Quy chuẩn dịch thuật chuyên ngành thời trang & phụ kiện" };
      case "TEMPLATES":
        return { title: "Quản Lý Mẫu Đăng Bán (Templates)", subtitle: "Thiết lập cấu trúc nội dung sẵn và ma trận biến thể mẫu để áp dụng 1-click" };
      default:
        return { title: "1688 Hub Admin", subtitle: "Hệ thống quản trị đồng bộ & đăng bán đa kênh" };
    }
  };

  const { title, subtitle } = getTabTitle(currentTab);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickOfferId.trim()) {
      onQuickImport(quickOfferId.trim());
      setQuickOfferId("");
      setShowQuickModal(false);
    }
  };

  return (
    <header className="min-h-14 bg-white border-b border-slate-200 px-3 py-2 sm:min-h-16 sm:px-6 sm:py-3 flex items-center justify-between gap-3 shadow-xs">
      <div className="min-w-0">
        <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
          {title}
        </h1>
        <p className="hidden sm:block text-xs text-slate-500 truncate">{subtitle}</p>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 overflow-x-auto">
        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          title="Làm mới dữ liệu từ máy chủ"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-orange-600" : ""}`} />
          <span className="hidden xl:inline">{isRefreshing ? "Đang tải..." : "Làm mới"}</span>
        </button>

        {/* Omnichannel Connectors Hub */}
        <button
          onClick={onOpenConnectors}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition-all"
          title="Đồng bộ WooCommerce, Shopify, Shopee, TikTok Shop & Telegram"
        >
          <Share2 className="w-3.5 h-3.5 text-orange-600" />
          <span className="hidden 2xl:inline">Kênh Đẩy Web (API)</span>
        </button>

        {/* Multi-Platform Cloner Button */}
        <button
          onClick={onOpenMultiClone}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-xs transition-all"
          title="Clone sản phẩm từ Taobao, Tmall, Shopee, TikTok Shop, AliExpress và Web bất kỳ"
        >
          <Globe className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden xl:inline">Clone Đa Nền Tảng</span>
        </button>

        {/* Web Bán Hàng Trực Tiếp (Storefront Direct) */}
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenStorefront}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-xs transition-all active:scale-95"
            title="Mở Cửa Hàng Bán Lẻ & Bán Sỉ Trực Tiếp"
          >
            <Store className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden 2xl:inline">Mở Web Bán Hàng ↗</span>
          </button>
          <button
            onClick={onOpenStoreSettings}
            aria-label="Cấu hình cửa hàng"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Cấu hình VietQR & Thương hiệu Web Bán Hàng"
          >
            <span className="text-xs">⚙️</span>
          </button>
        </div>

        {/* Quick Ingest Button */}
        <button
          onClick={() => setShowQuickModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-lg shadow-sm shadow-orange-500/30 transition-all"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Kéo Nhanh Từ 1688</span>
        </button>

        {/* Auth Role Button */}
        <button
          onClick={onOpenAuth}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
            currentUser
              ? currentUser.role === "ADMIN"
                ? "bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-900"
                : "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-900"
              : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
          }`}
          title="Thông tin phân quyền người dùng"
        >
          {currentUser ? (
            <>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                currentUser.role === "ADMIN" ? "bg-purple-600" : "bg-blue-600"
              }`}>
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-[11px] font-bold leading-none">{currentUser.name}</p>
                <p className="text-[9px] opacity-75 leading-none mt-0.5">
                  {currentUser.role === "ADMIN" ? "Owner Admin" : "Sourcing"}
                </p>
              </div>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
              <span className="text-xs font-bold">Đăng Nhập</span>
            </>
          )}
        </button>

        {/* Quick Ingest Modal */}
        {showQuickModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs">
            <div role="dialog" aria-modal="true" aria-labelledby="quick-import-title" className="flex min-h-[100dvh] w-screen flex-col bg-white p-5 shadow-2xl animate-in fade-in duration-150">
              <div className="mx-auto w-full max-w-2xl flex-1">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 id="quick-import-title" className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-orange-500" />
                  Nhập Nhanh Bằng Offer ID / Link 1688
                </h3>
                <button
                  onClick={() => setShowQuickModal(false)}
                  aria-label="Đóng"
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleQuickSubmit} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nhập ID hoặc Đường Dẫn Chi Tiết 1688
                  </label>
                  <input
                    type="text"
                    value={quickOfferId}
                    onChange={(e) => setQuickOfferId(e.target.value)}
                    placeholder="Ví dụ: 715421588882 hoặc https://detail.1688.com/offer/..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono"
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Hệ thống sẽ bóc tách thuộc tính, ma trận biến thể, dịch AI sang tiếng Việt và lưu về danh sách sản phẩm.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickModal(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-xs"
                  >
                    Bắt Đầu Đồng Bộ
                  </button>
                </div>
              </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
