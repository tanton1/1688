import React, { useState } from "react";
import { AdminTab } from "./Sidebar";
import {
  Search,
  PlusCircle,
  ExternalLink,
  RefreshCw,
  Globe,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface HeaderProps {
  currentTab: AdminTab;
  backendUrl: string;
  onRefresh: () => void;
  isRefreshing: boolean;
  onQuickImport: (offerId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  backendUrl,
  onRefresh,
  isRefreshing,
  onQuickImport
}) => {
  const [quickOfferId, setQuickOfferId] = useState("");
  const [showQuickModal, setShowQuickModal] = useState(false);

  const getTabTitle = (tab: AdminTab) => {
    switch (tab) {
      case "DASHBOARD":
        return { title: "Tổng Quan Hệ Thống", subtitle: "Báo cáo số liệu đồng bộ, sức khỏe listing và cảnh báo biến động" };
      case "PRODUCTS":
        return { title: "Quản Lý Sản Phẩm Đồng Bộ", subtitle: "Danh sách sản phẩm từ 1688, kiểm soát khóa trường và ma trận SKU" };
      case "DIFFS":
        return { title: "Trung Tâm Xử Lý Chênh Lệch (Diff)", subtitle: "Theo dõi & duyệt biến động giá, tồn kho từ nguồn 1688 Trung Quốc" };
      case "PRICING":
        return { title: "Cấu Hình Quy Tắc Định Giá", subtitle: "Công thức tính giá vốn VNĐ, tỷ giá tệ NDT và mô phỏng giá bán tự động" };
      case "GLOSSARY":
        return { title: "Từ Điển Thuật Ngữ E-Commerce", subtitle: "Quy chuẩn dịch thuật chuyên ngành thời trang & phụ kiện" };
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
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      <div>
        <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
          {title}
        </h1>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          title="Làm mới dữ liệu từ máy chủ"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-orange-600" : ""}`} />
          <span>{isRefreshing ? "Đang tải..." : "Làm mới"}</span>
        </button>

        {/* Quick Ingest Button */}
        <button
          onClick={() => setShowQuickModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-lg shadow-sm shadow-orange-500/30 transition-all"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Kéo Nhanh Từ 1688</span>
        </button>

        {/* Quick Ingest Modal */}
        {showQuickModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-orange-500" />
                  Nhập Nhanh Bằng Offer ID / Link 1688
                </h3>
                <button
                  onClick={() => setShowQuickModal(false)}
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
        )}
      </div>
    </header>
  );
};
