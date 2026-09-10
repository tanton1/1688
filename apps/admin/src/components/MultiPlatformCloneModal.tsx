import React, { useState, useEffect } from "react";
import {
  SourcePlatform,
  ClonePreviewResponse,
  SupportedPlatformInfo,
  WebProduct
} from "@hub1688/shared-types";
import { AdminApi } from "../services/api";
import {
  Globe,
  Sparkles,
  Link2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  ExternalLink,
  Layers,
  ArrowRight,
  TrendingUp,
  Tag,
  ShieldCheck,
  Zap,
  ShoppingBag,
  Sliders,
  DollarSign
} from "lucide-react";

interface MultiPlatformCloneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: (product: WebProduct) => void;
  onShowToast: (message: string, type?: "success" | "error") => void;
}

export const MultiPlatformCloneModal: React.FC<MultiPlatformCloneModalProps> = ({
  isOpen,
  onClose,
  onProductCreated,
  onShowToast
}) => {
  const [platforms, setPlatforms] = useState<SupportedPlatformInfo[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<SourcePlatform>("TAOBAO");
  const [urlInput, setUrlInput] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isCloning, setIsCloning] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<ClonePreviewResponse | null>(null);
  const [editableTitle, setEditableTitle] = useState<string>("");
  const [editableCategory, setEditableCategory] = useState<string>("Thời trang & Phụ kiện");
  const [autoPublish, setAutoPublish] = useState<boolean>(false);

  // Tải danh sách các nền tảng khi mở modal
  useEffect(() => {
    if (!isOpen) return;
    AdminApi.getSupportedClonePlatforms()
      .then(res => {
        if (res.success && res.platforms) {
          setPlatforms(res.platforms);
        }
      })
      .catch(err => {
        console.warn("Không thể tải danh sách platforms:", err);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectPlatform = (plat: SupportedPlatformInfo) => {
    setSelectedPlatform(plat.id);
  };

  const handleApplySampleUrl = (sampleUrl: string, platId: SourcePlatform) => {
    setSelectedPlatform(platId);
    setUrlInput(sampleUrl);
    handleAnalyze(sampleUrl, platId);
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrlInput(text.trim());
        onShowToast("Đã dán URL từ Clipboard", "success");
      }
    } catch {
      onShowToast("Không thể đọc từ Clipboard. Vui lòng dán thủ công.", "error");
    }
  };

  const handleAnalyze = async (overrideUrl?: string, overridePlat?: SourcePlatform) => {
    const targetUrl = (overrideUrl || urlInput).trim();
    if (!targetUrl) {
      onShowToast("Vui lòng nhập đường link sản phẩm", "error");
      return;
    }

    setIsAnalyzing(true);
    setPreviewData(null);

    try {
      const res = await AdminApi.previewCloneProduct(targetUrl, overridePlat || selectedPlatform);
      if (res.success && res.preview) {
        setPreviewData(res.preview);
        setEditableTitle(res.preview.translatedTitleVI);
        setEditableCategory(res.preview.categorySuggested || "Thời trang & Phụ kiện");
        setSelectedPlatform(res.preview.sourcePlatform);
        onShowToast(`Phân tích thành công sản phẩm từ ${res.preview.sourcePlatform}!`, "success");
      }
    } catch (err: any) {
      onShowToast(err.message || "Lỗi khi phân tích URL sản phẩm", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExecuteClone = async (openEditor: boolean = true) => {
    const targetUrl = urlInput.trim() || previewData?.sourceUrl;
    if (!targetUrl) {
      onShowToast("Không có URL sản phẩm để clone", "error");
      return;
    }

    setIsCloning(true);
    try {
      const res = await AdminApi.executeCloneProduct({
        url: targetUrl,
        platform: selectedPlatform,
        customTitle: editableTitle,
        categoryName: editableCategory,
        autoPublish
      });

      if (res.success && res.product) {
        onShowToast(res.message, "success");
        onProductCreated(res.product);
        if (openEditor) {
          onClose();
        }
      }
    } catch (err: any) {
      onShowToast(err.message || "Lỗi khi clone sản phẩm", "error");
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Clone Sản Phẩm Đa Nền Tảng
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30">
                  Universal AI Scraper
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Bóc tách dữ liệu từ Taobao, Tmall, Shopee, TikTok Shop, AliExpress và bất kỳ website nào
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* 1. Platform Selector Pills */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
              Chọn hoặc Nhận diện Sàn nguồn:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {platforms.map(plat => {
                const isSelected = selectedPlatform === plat.id;
                return (
                  <button
                    key={plat.id}
                    type="button"
                    onClick={() => handleSelectPlatform(plat)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                      isSelected
                        ? "bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-500/20 ring-1 ring-indigo-500/50"
                        : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    <span className="text-xl mb-1">{plat.icon}</span>
                    <span className="text-xs font-medium leading-tight line-clamp-1">{plat.name}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">{plat.defaultCurrency}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. URL Input Bar */}
          <div className="bg-slate-800/50 border border-slate-700/70 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Link2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Đường dẫn sản phẩm (Product URL / ID):</span>
              </label>

              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 hover:underline"
              >
                <Copy className="w-3 h-3" />
                <span>Dán từ Clipboard</span>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAnalyze()}
                  placeholder="Dán link sản phẩm (vd: https://item.taobao.com/item.htm?id=681928471928 hoặc shopee.vn/...)"
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {urlInput && (
                  <button
                    type="button"
                    onClick={() => setUrlInput("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="button"
                disabled={isAnalyzing || !urlInput.trim()}
                onClick={() => handleAnalyze()}
                className="px-5 py-2.5 rounded-lg font-medium text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg shadow-indigo-500/20"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang bóc tách...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Phân Tích & Xem Trước</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Presets / Test Samples */}
            <div className="pt-2 border-t border-slate-700/50 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium mr-1 flex items-center space-x-1">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>Thử nghiệm nhanh URL mẫu:</span>
              </span>
              {platforms.map(plat => (
                <button
                  key={plat.id}
                  type="button"
                  onClick={() => handleApplySampleUrl(plat.sampleUrl, plat.id)}
                  className="px-2.5 py-1 text-[11px] rounded-md bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600/50 transition-colors flex items-center space-x-1"
                >
                  <span>{plat.icon}</span>
                  <span>{plat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Live Preview Card */}
          {previewData && (
            <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-5 space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-700/70 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1">
                    <span>{platforms.find(p => p.id === previewData.sourcePlatform)?.icon || "🌐"}</span>
                    <span>{previewData.sourcePlatform}</span>
                  </span>
                  <span className="text-xs text-slate-400">ID: {previewData.sourceProductId}</span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-slate-400">Shop: <strong className="text-slate-200">{previewData.supplierName}</strong></span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Chất lượng: {previewData.qualityScorePreview}/100
                  </span>
                  <a
                    href={previewData.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 hover:underline"
                  >
                    <span>Xem link gốc</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Product Images Preview */}
                <div className="space-y-2.5">
                  <div className="aspect-square rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shadow-inner">
                    <img
                      src={previewData.primaryImage}
                      alt={previewData.originalTitle}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {previewData.galleryImages.length > 0 && (
                    <div className="grid grid-cols-4 gap-1.5">
                      {previewData.galleryImages.slice(0, 4).map((img, idx) => (
                        <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-slate-900 border border-slate-800">
                          <img src={img} alt={`thumb-${idx}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Information & Translation */}
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Tiêu đề dịch tự động sang Tiếng Việt (Có thể chỉnh sửa):
                    </label>
                    <textarea
                      rows={2}
                      value={editableTitle}
                      onChange={e => setEditableTitle(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {previewData.originalTitle !== editableTitle && (
                    <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1">
                      <div className="font-medium text-slate-300">Tiêu đề gốc ({previewData.currency}):</div>
                      <div className="line-clamp-2 italic text-slate-400">{previewData.originalTitle}</div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Danh mục sản phẩm:
                      </label>
                      <input
                        type="text"
                        value={editableCategory}
                        onChange={e => setEditableCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-5">
                      <input
                        type="checkbox"
                        id="autoPublishCheck"
                        checked={autoPublish}
                        onChange={e => setAutoPublish(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500"
                      />
                      <label htmlFor="autoPublishCheck" className="text-xs text-slate-300 cursor-pointer">
                        Đăng công khai ngay (Publish to Catalog)
                      </label>
                    </div>
                  </div>

                  {/* Financial Breakdown & Margin */}
                  <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div>
                      <div className="text-[11px] text-slate-400">Giá gốc ({previewData.currency})</div>
                      <div className="text-base font-bold text-slate-200 mt-0.5">
                        {previewData.currency === "CNY" ? `¥${previewData.originalPriceMin}` : previewData.currency === "USD" ? `$${previewData.originalPriceMin}` : `${previewData.originalPriceMin.toLocaleString("vi-VN")} ₫`}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-400">Giá vốn quy đổi (VNĐ)</div>
                      <div className="text-base font-bold text-amber-400 mt-0.5">
                        {previewData.estimatedCostVND.toLocaleString("vi-VN")} ₫
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-400 flex items-center justify-between">
                        <span>Giá bán niêm yết</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                          +{previewData.estimatedMarginPercent}%
                        </span>
                      </div>
                      <div className="text-base font-bold text-emerald-400 mt-0.5">
                        {previewData.estimatedSellingPriceVND.toLocaleString("vi-VN")} ₫
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Variants Breakdown Table */}
              {previewData.variants.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Biến thể sản phẩm ({previewData.variants.length} SKUs):</span>
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-lg">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                        <tr>
                          <th className="p-2.5">Ảnh</th>
                          <th className="p-2.5">Mã SKU</th>
                          <th className="p-2.5">Tên / Phân loại</th>
                          <th className="p-2.5 text-right">Giá bán (VNĐ)</th>
                          <th className="p-2.5 text-right">Tồn kho</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                        {previewData.variants.map((v, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40">
                            <td className="p-2">
                              <img
                                src={v.imageUrl || previewData.primaryImage}
                                alt={v.name}
                                className="w-7 h-7 object-cover rounded border border-slate-700"
                              />
                            </td>
                            <td className="p-2 font-mono text-slate-400 text-[11px]">{v.skuId}</td>
                            <td className="p-2 font-medium text-slate-200">{v.nameVI || v.name}</td>
                            <td className="p-2 text-right font-semibold text-emerald-400">
                              {v.priceVND.toLocaleString("vi-VN")} ₫
                            </td>
                            <td className="p-2 text-right text-slate-400">{v.stock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Tự động tạo trọn gói SEO, Schema.org và tính toán biên lợi nhuận an toàn</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Đóng
            </button>

            {previewData && (
              <>
                <button
                  type="button"
                  disabled={isCloning}
                  onClick={() => handleExecuteClone(false)}
                  className="px-4 py-2 text-xs font-medium text-indigo-300 hover:text-indigo-200 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-700/50 rounded-lg transition-colors flex items-center space-x-1.5"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Lưu Bản Nháp</span>
                </button>

                <button
                  type="button"
                  disabled={isCloning}
                  onClick={() => handleExecuteClone(true)}
                  className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg shadow-lg shadow-emerald-600/20 flex items-center space-x-2 transition-all"
                >
                  {isCloning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu vào kho...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Clone & Mở Trình Biên Tập</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
