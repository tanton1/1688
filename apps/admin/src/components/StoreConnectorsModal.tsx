import React, { useState, useEffect } from "react";
import { WebProduct, WooCommerceConfig, ShopifyConfig, TelegramAlertConfig } from "@hub1688/shared-types";
import { AdminApi } from "../services/api";
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

  // WooCommerce State
  const [wcConfig, setWcConfig] = useState<WooCommerceConfig>(() => {
    const saved = sessionStorage.getItem("hub1688_wc_config");
    return saved
      ? JSON.parse(saved)
      : { storeUrl: "https://shopdemo.vn", consumerKey: "", consumerSecret: "" };
  });

  // Shopify State
  const [shopifyConfig, setShopifyConfig] = useState<ShopifyConfig>(() => {
    const saved = sessionStorage.getItem("hub1688_shopify_config");
    return saved
      ? JSON.parse(saved)
      : { shopDomain: "mystore.myshopify.com", accessToken: "" };
  });

  // Telegram State
  const [telegramConfig, setTelegramConfig] = useState<TelegramAlertConfig>(() => {
    const saved = sessionStorage.getItem("hub1688_telegram_config");
    return saved
      ? JSON.parse(saved)
      : { botToken: "", chatId: "", enabled: true, alertOnPriceRise: true, alertOnOutOfStock: true };
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  useEffect(() => {
    if (selectedProduct?.id) {
      setTargetProductId(selectedProduct.id);
    }
  }, [selectedProduct]);

  if (!isOpen) return null;

  const currentProduct = products.find(p => p.id === targetProductId) || selectedProduct || products[0];

  // Lưu cấu hình WooCommerce
  const handleSaveWC = () => {
    sessionStorage.setItem("hub1688_wc_config", JSON.stringify(wcConfig));
    onShowToast("Đã lưu thông tin cấu hình WooCommerce!");
  };

  // Đồng bộ WooCommerce
  const handleSyncWC = async () => {
    if (!currentProduct?.id) {
      onShowToast("Chưa chọn sản phẩm để đồng bộ", "error");
      return;
    }
    if (!wcConfig.storeUrl || !wcConfig.consumerKey || !wcConfig.consumerSecret) {
      onShowToast("Vui lòng điền đủ Store URL, Consumer Key và Secret", "error");
      return;
    }

    setIsProcessing(true);
    setLastResult(null);
    try {
      handleSaveWC();
      const res = await AdminApi.syncWooCommerce(currentProduct.id, {
        ...wcConfig,
        siteUrl: wcConfig.storeUrl
      });
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
    sessionStorage.setItem("hub1688_shopify_config", JSON.stringify(shopifyConfig));
    onShowToast("Đã lưu thông tin cấu hình Shopify!");
  };

  // Đồng bộ Shopify
  const handleSyncShopify = async () => {
    if (!currentProduct?.id) {
      onShowToast("Chưa chọn sản phẩm để đồng bộ", "error");
      return;
    }
    if (!shopifyConfig.shopDomain || !shopifyConfig.accessToken) {
      onShowToast("Vui lòng điền đủ Shop Domain và Admin Access Token", "error");
      return;
    }

    setIsProcessing(true);
    setLastResult(null);
    try {
      handleSaveShopify();
      const res = await AdminApi.syncShopify(currentProduct.id, shopifyConfig);
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
    if (!telegramConfig.botToken || !telegramConfig.chatId) {
      onShowToast("Vui lòng nhập Bot Token và Chat ID Telegram", "error");
      return;
    }

    setIsProcessing(true);
    try {
      sessionStorage.setItem("hub1688_telegram_config", JSON.stringify(telegramConfig));
      const res = await AdminApi.testTelegram(telegramConfig.botToken, telegramConfig.chatId);
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
    if (!telegramConfig.botToken || !telegramConfig.chatId) {
      onShowToast("Vui lòng nhập Bot Token và Chat ID Telegram", "error");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await AdminApi.sendTelegramAlert(
        telegramConfig.botToken,
        telegramConfig.chatId,
        "PRICE_CHANGE",
        {
          productTitle: currentProduct ? currentProduct.titleVI : "Váy Đầm Nữ Thiết Kế 1688",
          skuCode: currentProduct ? currentProduct.skuCode : "SP-1688-DEMO",
          oldPriceCNY: 28,
          newPriceCNY: 34.5,
          oldPriceVND: 110000,
          newPriceVND: 135000,
          sourceUrl: currentProduct?.sourceUrl
        }
      );
      if (res.success) {
        onShowToast("Đã gửi thông báo biến động giá mẫu tới Telegram!");
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] border border-slate-200 animate-in fade-in zoom-in duration-150">
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
                Đồng bộ 1-Click lên WooCommerce, Shopify, xuất CSV Shopee/TikTok & cảnh báo Telegram
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-base font-bold"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 gap-4">
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
            <Download className="w-4 h-4" />
            Xuất CSV Sàn TMĐT
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
          {(activeTab === "WOOCOMMERCE" || activeTab === "SHOPIFY") && (
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

          {/* TAB 1: WooCommerce */}
          {activeTab === "WOOCOMMERCE" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Website URL WordPress (WooCommerce):
                </label>
                <input
                  type="text"
                  value={wcConfig.storeUrl}
                  onChange={(e) => setWcConfig({ ...wcConfig, storeUrl: e.target.value })}
                  placeholder="https://myshop.vn"
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
                    value={wcConfig.consumerKey}
                    onChange={(e) => setWcConfig({ ...wcConfig, consumerKey: e.target.value })}
                    placeholder="ck_xxxxxxxxxxxxxxxx"
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Consumer Secret (cs_...):
                  </label>
                  <input
                    type="password"
                    value={wcConfig.consumerSecret}
                    onChange={(e) => setWcConfig({ ...wcConfig, consumerSecret: e.target.value })}
                    placeholder="cs_xxxxxxxxxxxxxxxx"
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
                  Lưu Cấu Hình
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
                  value={shopifyConfig.shopDomain}
                  onChange={(e) => setShopifyConfig({ ...shopifyConfig, shopDomain: e.target.value })}
                  placeholder="my-fashion-store.myshopify.com"
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Admin API Access Token (shpat_...):
                </label>
                <input
                  type="password"
                  value={shopifyConfig.accessToken}
                  onChange={(e) => setShopifyConfig({ ...shopifyConfig, accessToken: e.target.value })}
                  placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-900 space-y-1">
                <p className="font-bold">✨ Cơ chế đồng bộ Shopify:</p>
                <p>• Đẩy thông tin mô tả tiếng Anh hoặc tiếng Việt chuẩn Rich-HTML.</p>
                <p>• Quy đổi giá VNĐ sang USD tự động cho thị trường Dropshipping quốc tế.</p>
                <p>• Đồng bộ biến thể Color, Size, SKU và tồn kho.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveShopify}
                  className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Lưu Cấu Hình
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

          {/* TAB 3: Marketplace CSV */}
          {activeTab === "MARKETPLACE" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Xuất trọn gói toàn bộ danh sách sản phẩm ({products.length} sản phẩm) thành file CSV định dạng chuẩn, sẵn sàng tải lên mục Đăng Hàng Loạt (Mass Upload) trên Kênh Người Bán.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {/* Shopee Box */}
                <div className="p-4 bg-orange-50/60 border border-orange-200 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-orange-500 text-white font-bold flex items-center justify-center text-xs mb-2">
                      S
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">Shopee Seller Center</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      File CSV mã hóa UTF-8 BOM, chứa đầy đủ Phân loại 1 (Màu), Phân loại 2 (Size), Giá bán lẻ, Kho và URL ảnh.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleExportCSV("SHOPEE")}
                    className="mt-4 w-full py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Tải File CSV Shopee
                  </button>
                </div>

                {/* TikTok Shop Box */}
                <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-white text-slate-900 font-bold flex items-center justify-center text-xs mb-2">
                      TT
                    </div>
                    <h4 className="font-bold text-sm text-white">TikTok Shop Seller Center</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      File mẫu đăng sản phẩm hàng loạt TikTok Shop, chuẩn hóa tên tiếng Việt/Anh và ảnh thumbnail.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleExportCSV("TIKTOK_SHOP")}
                    className="mt-4 w-full py-2 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-xl shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Tải File CSV TikTok Shop
                  </button>
                </div>
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
                  type="text"
                  value={telegramConfig.botToken}
                  onChange={(e) => setTelegramConfig({ ...telegramConfig, botToken: e.target.value })}
                  placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
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
                  value={telegramConfig.chatId}
                  onChange={(e) => setTelegramConfig({ ...telegramConfig, chatId: e.target.value })}
                  placeholder="-1001234567890 hoặc @my_1688_alerts"
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={telegramConfig.alertOnPriceRise}
                    onChange={(e) => setTelegramConfig({ ...telegramConfig, alertOnPriceRise: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Tự động bắn tin nhắn khi giá nhập 1688 tăng so với giá lưu hệ thống</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={telegramConfig.alertOnOutOfStock}
                    onChange={(e) => setTelegramConfig({ ...telegramConfig, alertOnOutOfStock: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Tự động cảnh báo khi xưởng 1688 hết hàng biến thể hoặc ngừng bán</span>
                </label>
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
