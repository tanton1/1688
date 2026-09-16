import React, { useState, useEffect } from "react";
import { WebProduct } from "@hub1688/shared-types";
import { AdminApi } from "../services/api";
import { useAccessibleDialog } from "../hooks/useAccessibleDialog";
import { ShopeePublishingPanel } from "./ShopeePublishingPanel";
import {
  Share2,
  Globe,
  ShoppingBag,
  Download,
  Send,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Layers,
  ArrowRight,
  Sliders
} from "lucide-react";

interface StoreConnectorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: WebProduct[];
  selectedProduct?: WebProduct | null;
  onShowToast: (message: string, type?: "success" | "error") => void;
}

type ConnectorTab = "WOOCOMMERCE" | "SHOPIFY" | "MARKETPLACE" | "TELEGRAM";

export const StoreConnectorsModal: React.FC<StoreConnectorsModalProps> = ({
  isOpen,
  onClose,
  products,
  selectedProduct,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<ConnectorTab>("WOOCOMMERCE");
  const [targetProductId, setTargetProductId] = useState<string>(
    selectedProduct?.id || (products.length > 0 ? products[0].id || "" : "")
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const dialogRef = useAccessibleDialog<HTMLDivElement>(isOpen, onClose);

  useEffect(() => {
    if (selectedProduct?.id) {
      setTargetProductId(selectedProduct.id);
    }
  }, [selectedProduct]);

  if (!isOpen) return null;

  const currentProduct = products.find(p => p.id === targetProductId) || selectedProduct || products[0];

  // Lưu cấu hình WooCommerce
  const handleSaveWC = () => {
    onShowToast("Thông tin xác thực WooCommerce được quản lý bằng biến môi trường trên máy chủ.");
  };

  // Đồng bộ WooCommerce
  const handleSyncWC = async () => {
    if (!currentProduct?.id) {
      onShowToast("Chưa chọn sản phẩm để đồng bộ", "error");
      return;
    }
    setIsProcessing(true);
    setLastResult(null);
    try {
      const res = await AdminApi.syncWooCommerce(currentProduct.id);
      setLastResult(res.result);
      if (res.success) {
        onShowToast("Đã đồng bộ sản phẩm lên WooCommerce thành công!");
      } else {
        onShowToast(`Đồng bộ thất bại: ${res.result?.errorMessage || res.result?.message}`, "error");
      }
    } catch (err: any) {
      onShowToast(err.message || "Lỗi đồng bộ WooCommerce", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Lưu cấu hình Shopify
  const handleSaveShopify = () => {
    onShowToast("Thông tin xác thực Shopify được quản lý bằng biến môi trường trên máy chủ.");
  };

  // Đồng bộ Shopify
  const handleSyncShopify = async () => {
    if (!currentProduct?.id) {
      onShowToast("Chưa chọn sản phẩm để đồng bộ", "error");
      return;
    }
    setIsProcessing(true);
    setLastResult(null);
    try {
      const res = await AdminApi.syncShopify(currentProduct.id);
      setLastResult(res.result);
      if (res.success) {
        onShowToast("Đã đẩy sản phẩm lên Shopify Store thành công!");
      } else {
        onShowToast(`Đồng bộ thất bại: ${res.result?.errorMessage || res.result?.message}`, "error");
      }
    } catch (err: any) {
      onShowToast(err.message || "Lỗi đồng bộ Shopify", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Xuất file CSV Shopee / TikTok Shop
  const handleExportCSV = async (platform: "SHOPEE" | "TIKTOK_SHOP") => {
    const productIds = products.map(p => p.id!).filter(Boolean);
    if (productIds.length === 0) {
      onShowToast("Chưa có sản phẩm nào trong hệ thống để xuất", "error");
      return;
    }

    setIsProcessing(true);
    try {
      const blob = await AdminApi.exportMarketplaceCSV(productIds, platform);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${platform.toLowerCase()}_bulk_export_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      onShowToast(`Đã xuất file CSV chuẩn sàn ${platform === "SHOPEE" ? "Shopee" : "TikTok Shop"}!`);
    } catch (err: any) {
      onShowToast(err.message || "Lỗi khi xuất CSV", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Test Telegram
  const handleTestTelegram = async () => {
    setIsProcessing(true);
    try {
      const res = await AdminApi.testTelegram();
      if (res.success) {
        onShowToast(`Kết nối Bot @${res.botUsername || res.botName} thành công!`);
      } else {
        onShowToast(`Lỗi kết nối: ${res.error}`, "error");
      }
    } catch (err: any) {
      onShowToast(err.message || "Lỗi kiểm tra Telegram", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Test gửi alert giá
  const handleSendTestPriceAlert = async () => {
    setIsProcessing(true);
    try {
      const res = await AdminApi.sendTelegramAlert(
        "CUSTOM",
        {
          message: "[TIN NHẮN KIỂM TRA] Kết nối Telegram của 1688 Listing Sync Hub đang hoạt động. Tin này không phải cảnh báo giá hoặc tồn kho thực tế."
        }
      );
      if (res.success) {
        onShowToast("Đã gửi tin nhắn kiểm tra tới Telegram!");
      } else {
        onShowToast(`Gửi thông báo thất bại: ${res.error}`, "error");
      }
    } catch (err: any) {
      onShowToast(err.message || "Lỗi gửi cảnh báo", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Kết nối kênh bán hàng" className="flex h-[100dvh] w-screen flex-col overflow-hidden border-0 bg-white shadow-2xl animate-in fade-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Kênh Đẩy Dữ Liệu Bán Hàng & Cảnh Báo (Omnichannel Hub)
              </h3>
              <p className="text-xs text-slate-500">
                Đăng trực tiếp lên Shopee, đồng bộ web bán hàng và quản lý dữ liệu đa kênh
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng kết nối kênh bán hàng"
            className="text-slate-400 hover:text-slate-600 text-base font-bold"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 gap-4 overflow-x-auto border-b border-slate-200 bg-slate-50 px-5">
          <button
            type="button"
            onClick={() => setActiveTab("WOOCOMMERCE")}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "WOOCOMMERCE"
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Globe className="w-4 h-4" />
            WooCommerce REST API
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("SHOPIFY")}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "SHOPIFY"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Shopify Admin API
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("MARKETPLACE")}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "MARKETPLACE"
                ? "border-amber-600 text-amber-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-4 h-4" />
            Shopee / TikTok Shop
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("TELEGRAM")}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "TELEGRAM"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Send className="w-4 h-4" />
            Cảnh Báo Telegram
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Target Product Selector for Single-product pushes */}
          {(activeTab === "WOOCOMMERCE" || activeTab === "SHOPIFY" || activeTab === "MARKETPLACE") && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sản phẩm đồng bộ:
              </label>
              <select
                value={targetProductId}
                onChange={(e) => setTargetProductId(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    [{p.skuCode}] {p.titleVI.slice(0, 70)} ({p.variants.length} SKU)
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab !== "MARKETPLACE" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900" role="note">
              Khóa kết nối chỉ được đọc từ biến môi trường phía máy chủ. Trình duyệt không nhận, gửi hoặc lưu các secret này.
            </div>
          )}

          {/* TAB 1: WooCommerce */}
          {activeTab === "WOOCOMMERCE" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Website URL WordPress (WooCommerce):
                </label>
                <input
                  type="text"
                  disabled
                  value=""
                  placeholder="WOOCOMMERCE_STORE_URL"
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Consumer Key (ck_...):
                  </label>
                  <input
                    type="password"
                    disabled
                    value=""
                    placeholder="WOOCOMMERCE_CONSUMER_KEY"
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Consumer Secret (cs_...):
                  </label>
                  <input
                    type="password"
                    disabled
                    value=""
                    placeholder="WOOCOMMERCE_CONSUMER_SECRET"
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-xs text-purple-900 space-y-1">
                <p className="font-bold">✨ Cơ chế đồng bộ WooCommerce:</p>
                <p>• Tự động tạo sản phẩm biến thể (Variable Product) với thuộc tính Màu sắc & Size.</p>
                <p>• Đồng bộ bộ ảnh chính, gallery và gán danh mục.</p>
                <p>• Tải ảnh lên Media Library WordPress chuẩn SEO Alt-tags.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveWC}
                  className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cách Cấu Hình Máy Chủ
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleSyncWC}
                  className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm flex items-center gap-1.5"
                >
                  {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                  Đẩy Lên WooCommerce Ngay
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Shopify */}
          {activeTab === "SHOPIFY" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Shopify Domain:
                </label>
                <input
                  type="text"
                  disabled
                  value=""
                  placeholder="SHOPIFY_SHOP_DOMAIN"
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Admin API Access Token (shpat_...):
                </label>
                <input
                  type="password"
                  disabled
                  value=""
                  placeholder="SHOPIFY_ACCESS_TOKEN"
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-900 space-y-1">
                <p className="font-bold">✨ Cơ chế đồng bộ Shopify:</p>
                <p>• Đẩy mô tả tiếng Anh hoặc tiếng Việt dưới dạng HTML.</p>
                <p>• Chỉ quy đổi VNĐ sang USD khi máy chủ có tỷ giá được cấu hình.</p>
                <p>• Đồng bộ biến thể Color, Size, SKU và tồn kho.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveShopify}
                  className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cách Cấu Hình Máy Chủ
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleSyncShopify}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5"
                >
                  {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShoppingBag className="w-3.5 h-3.5" />}
                  Đẩy Lên Shopify Ngay
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Marketplace publishing */}
          {activeTab === "MARKETPLACE" && (
            <div className="space-y-4">
              <ShopeePublishingPanel
                product={currentProduct}
                onShowToast={onShowToast}
                onExportCsv={() => void handleExportCSV("SHOPEE")}
              />

              <div className="flex flex-col gap-3 rounded-2xl bg-slate-950 p-4 text-white sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-xs font-black text-slate-950">TT</div>
                  <h4 className="text-sm font-black">TikTok Shop Connector</h4>
                  <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-400">
                    Adapter TikTok Shop sẽ dùng chung Channel Listing vừa triển khai. Trong lúc chờ tạo Custom App và scope, vẫn có thể xuất CSV dự phòng.
                  </p>
                </div>
                <button type="button" disabled={isProcessing} onClick={() => handleExportCSV("TIKTOK_SHOP")}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-slate-950 hover:bg-slate-100">
                  <Download className="h-4 w-4" /> Tải CSV TikTok Shop
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: Telegram Alerts */}
          {activeTab === "TELEGRAM" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telegram Bot Token:
                </label>
                <input
                  type="password"
                  disabled
                  value=""
                  placeholder="TELEGRAM_BOT_TOKEN"
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Tạo bot miễn phí bằng cách chat với @BotFather trên Telegram.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chat ID hoặc Kênh / Nhóm Tiếp Nhận (@channel_id hoặc số âm):
                </label>
                <input
                  type="text"
                  disabled
                  value=""
                  placeholder="TELEGRAM_CHAT_ID"
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-[11px] leading-relaxed text-blue-900">
                Hiện có thể kiểm tra kết nối và gửi cảnh báo mẫu. Cảnh báo giá/tồn kho tự động chỉ được bật sau khi crawler nguồn xác thực được triển khai.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleSendTestPriceAlert}
                  className="px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg"
                >
                  Gửi Thử Alert Mẫu
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleTestTelegram}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5"
                >
                  {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Kiểm Tra Kết Nối Telegram
                </button>
              </div>
            </div>
          )}

          {/* Sync Result Output Box */}
          {lastResult && (
            <div className={`p-3 rounded-xl border text-xs ${
              lastResult.status === "SUCCESS"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-rose-50 border-rose-200 text-rose-900"
            }`}>
              <div className="flex items-center gap-2 font-bold mb-1">
                {lastResult.status === "SUCCESS" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                )}
                <span>
                  {lastResult.status === "SUCCESS" ? "Đồng Bộ Thành Công!" : "Đồng Bộ Không Thành Công"}
                </span>
              </div>
              {lastResult.remoteUrl && (
                <p className="mt-1">
                  Đường dẫn:{" "}
                  <a
                    href={lastResult.remoteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-bold inline-flex items-center gap-1"
                  >
                    {lastResult.remoteUrl} <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              )}
              {lastResult.errorMessage && (
                <p className="text-rose-700 font-mono mt-1">{lastResult.errorMessage}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
