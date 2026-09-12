import React, { useState, useEffect } from "react";
import {
  SourcePlatform,
  ClonePreviewResponse,
  SupportedPlatformInfo,
  WebProduct,
  BatchCloneItemResult,
  VisualSourcingMatch
} from "@hub1688/shared-types";
import { AdminApi } from "../services/api";
import { useAccessibleDialog } from "../hooks/useAccessibleDialog";
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
  DollarSign,
  Search,
  Factory,
  ListPlus,
  Play
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
  // Modal Mode: Single URL vs. Batch Queue
  const [activeTab, setActiveTab] = useState<"SINGLE" | "BATCH">("SINGLE");

  // Common State
  const [platforms, setPlatforms] = useState<SupportedPlatformInfo[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<SourcePlatform>("TAOBAO");
  const [autoPublish, setAutoPublish] = useState<boolean>(false);
  const [editableCategory, setEditableCategory] = useState<string>("Thời trang & Phụ kiện");

  // Single URL Mode State
  const [urlInput, setUrlInput] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isCloning, setIsCloning] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<ClonePreviewResponse | null>(null);
  const [editableTitle, setEditableTitle] = useState<string>("");

  // Visual Sourcing State
  const [visualMatches, setVisualMatches] = useState<VisualSourcingMatch[] | null>(null);
  const [isLoadingVisual, setIsLoadingVisual] = useState<boolean>(false);

  // Batch Mode State
  const [batchUrlsInput, setBatchUrlsInput] = useState<string>("");
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; percent: number }>({
    current: 0,
    total: 0,
    percent: 0
  });
  const [batchResults, setBatchResults] = useState<BatchCloneItemResult[] | null>(null);
  const dialogRef = useAccessibleDialog<HTMLDivElement>(isOpen, onClose);

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
        if (activeTab === "SINGLE") {
          setUrlInput(text.trim());
        } else {
          setBatchUrlsInput(prev => (prev ? `${prev}\n${text.trim()}` : text.trim()));
        }
        onShowToast("Đã dán từ Clipboard", "success");
      }
    } catch {
      onShowToast("Không thể đọc từ Clipboard. Vui lòng dán thủ công.", "error");
    }
  };

  // Phân tích 1 sản phẩm (Single Analyze)
  const handleAnalyze = async (overrideUrl?: string, overridePlat?: SourcePlatform) => {
    const targetUrl = (overrideUrl || urlInput).trim();
    if (!targetUrl) {
      onShowToast("Vui lòng nhập đường link sản phẩm", "error");
      return;
    }

    setIsAnalyzing(true);
    setPreviewData(null);
    setVisualMatches(null);

    try {
      const res = await AdminApi.previewCloneProduct(targetUrl, overridePlat || selectedPlatform);
      if (res.success && res.preview) {
        setPreviewData(res.preview);
        setEditableTitle(res.preview.translatedTitleVI);
        setEditableCategory(res.preview.categorySuggested || "Thời trang & Phụ kiện");
        setSelectedPlatform(res.preview.sourcePlatform);
        onShowToast(
          res.preview.extractionStatus === "LIVE"
            ? `Đã xác minh dữ liệu trực tiếp từ ${res.preview.sourcePlatform}`
            : `Đã tạo bản xem trước ${res.preview.extractionStatus.toLowerCase()}; chưa thể nhập vào kho`,
          res.preview.extractionStatus === "LIVE" ? "success" : "error"
        );
      }
    } catch (err: any) {
      onShowToast(err.message || "Lỗi khi phân tích URL sản phẩm", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Clone 1 sản phẩm
  const handleExecuteClone = async (openEditor: boolean = true) => {
    const targetUrl = urlInput.trim() || previewData?.sourceUrl;
    if (!targetUrl) {
      onShowToast("Không có URL sản phẩm để clone", "error");
      return;
    }
    if (!previewData || previewData.extractionStatus !== "LIVE" || previewData.isDemo) {
      onShowToast("Chỉ dữ liệu LIVE đã xác minh mới được nhập vào kho sản phẩm", "error");
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

  // Tìm nguồn xưởng 1688 bằng hình ảnh (Visual Sourcing)
  const handleFind1688Factory = async () => {
    if (!previewData) return;
    setIsLoadingVisual(true);
    try {
      const res = await AdminApi.getVisualSourcingMatches({
        imageUrl: previewData.primaryImage,
        title: previewData.translatedTitleVI,
        currentSellingPriceVND: previewData.estimatedSellingPriceVND
      });

      if (res.success && res.matches) {
        setVisualMatches(res.matches);
        onShowToast(res.mode === "DEMO"
          ? "Chế độ Demo: kết quả xưởng là dữ liệu mô phỏng, không dùng để đặt hàng."
          : `Đã tìm thấy ${res.matches.length} xưởng 1688 nguồn sản xuất tương đồng!`, "success");
      }
    } catch (err: any) {
      onShowToast(err.message || "Không thể tìm kiếm xưởng 1688", "error");
    } finally {
      setIsLoadingVisual(false);
    }
  };

  // Nạp danh sách URLs mẫu cho Batch Mode
  const handleLoadSampleBatchUrls = () => {
    const sampleBatch = [
      "https://item.taobao.com/item.htm?id=681928471928",
      "https://shopee.vn/product/12345678/987654321",
      "https://shop.tiktok.com/view/product/1729384918294",
      "https://www.aliexpress.com/item/1005004819283746.html",
      "https://detail.tmall.com/item.htm?id=712938491024"
    ].join("\n");
    setBatchUrlsInput(sampleBatch);
    onShowToast("Đã nạp 5 link mẫu từ 5 sàn khác nhau", "success");
  };

  // Bắt đầu chạy Batch Clone
  const handleStartBatchClone = async () => {
    const urls = batchUrlsInput
      .split("\n")
      .map(l => l.trim())
      .filter(l => l.startsWith("http://") || l.startsWith("https://"));

    if (urls.length === 0) {
      onShowToast("Vui lòng nhập ít nhất 1 đường link hợp lệ (bắt đầu bằng http:// hoặc https://)", "error");
      return;
    }

    setIsBatchProcessing(true);
    setBatchResults(null);
    setBatchProgress({ current: 0, total: urls.length, percent: 0 });

    try {
      // Mô phỏng tiến trình mượt mà
      const progressTimer = setInterval(() => {
        setBatchProgress(prev => {
          if (prev.current < prev.total - 1) {
            const next = prev.current + 1;
            return { current: next, total: prev.total, percent: Math.round((next / prev.total) * 100) };
          }
          return prev;
        });
      }, 700);

      const res = await AdminApi.batchCloneProducts({
        urls,
        categoryName: editableCategory,
        autoPublish
      });

      clearInterval(progressTimer);
      setBatchProgress({ current: urls.length, total: urls.length, percent: 100 });

      if (res.success) {
        setBatchResults(res.results);
        onShowToast(res.message, "success");
        // Nếu có sản phẩm thành công đầu tiên, thông báo cho cha
        const firstSuccess = res.results.find(r => r.success && r.product);
        if (firstSuccess && firstSuccess.product) {
          onProductCreated(firstSuccess.product);
        }
      }
    } catch (err: any) {
      onShowToast(err.message || "Lỗi trong quá trình clone hàng loạt", "error");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const detectedBatchCount = batchUrlsInput
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.startsWith("http://") || l.startsWith("https://")).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="clone-modal-title" className="relative flex h-[100dvh] w-screen flex-col overflow-hidden border-0 bg-slate-900 shadow-2xl text-slate-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 id="clone-modal-title" className="text-lg font-bold text-white tracking-wide">
                  Clone Sản Phẩm Đa Nền Tảng
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30">
                  Universal AI Scraper + Visual Sourcing
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Bóc tách tự động từ Taobao, Tmall, Shopee, TikTok Shop, AliExpress và bất kỳ website nào
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/80">
            <button
              type="button"
              onClick={() => setActiveTab("SINGLE")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                activeTab === "SINGLE"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Nhập Từng Link</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("BATCH")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                activeTab === "BATCH"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ListPlus className="w-3.5 h-3.5" />
              <span>Clone Hàng Loạt (Batch)</span>
            </button>
          </div>

          <button
            onClick={onClose}
            aria-label="Đóng cửa sổ clone sản phẩm"
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-3"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ========================================================================= */}
          {/* TAB 1: SINGLE URL CLONE & VISUAL SOURCING                                  */}
          {/* ========================================================================= */}
          {activeTab === "SINGLE" && (
            <div className="space-y-6">
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
                  <div className="grid grid-cols-4 overflow-hidden rounded-xl border border-slate-700 bg-slate-950/60" aria-label="Quy trình nhập sản phẩm">
                    {["Nguồn", "Chuẩn hóa", "Duyệt", autoPublish ? "Đăng bán" : "Lưu nháp"].map((step, index) => (
                      <div key={step} className={`px-2 py-2.5 text-center text-[10px] font-bold border-r last:border-r-0 border-slate-700 ${index < 2 ? "text-emerald-300 bg-emerald-500/10" : index === 2 ? "text-amber-300 bg-amber-500/10" : "text-slate-400"}`}>
                        <span className="block text-[9px] opacity-70 mb-0.5">{index + 1}</span>{step}
                      </div>
                    ))}
                  </div>
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

                    <div className="flex items-center space-x-3">
                      {/* Visual Sourcing Button */}
                      <button
                        type="button"
                        disabled={isLoadingVisual || previewData.estimatedSellingPriceVND <= 0}
                        onClick={handleFind1688Factory}
                        className="px-3 py-1 text-xs font-bold text-amber-300 bg-amber-950/60 hover:bg-amber-900/80 disabled:opacity-50 disabled:cursor-not-allowed border border-amber-500/40 rounded-lg shadow-sm flex items-center space-x-1.5 transition-all"
                        title={previewData.estimatedSellingPriceVND > 0 ? "Tìm nguồn 1688 bằng hình ảnh" : "Cần xác minh giá bán VND trước khi tìm nguồn"}
                      >
                        {isLoadingVisual ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Factory className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span>Tìm Xưởng Gốc 1688</span>
                      </button>

                      <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Mức đủ dữ liệu: {previewData.qualityScorePreview}/100
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-bold rounded border ${previewData.extractionStatus === "LIVE" ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" : previewData.extractionStatus === "DEMO" ? "bg-amber-500/10 text-amber-300 border-amber-500/30" : "bg-rose-500/10 text-rose-300 border-rose-500/30"}`}>
                        {previewData.extractionStatus} · {Math.round(previewData.confidence * 100)}%
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

                  {(previewData.warnings.length > 0 || previewData.provenance.length > 0) && (
                    <div className="grid gap-2 sm:grid-cols-2 text-[11px]">
                      <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-3">
                        <div className="font-bold text-slate-300 mb-1">Nguồn dữ liệu</div>
                        <ul className="space-y-1 text-slate-400">{previewData.provenance.map(item => <li key={item}>• {item}</li>)}</ul>
                      </div>
                      <div className={`rounded-lg border p-3 ${previewData.warnings.length ? "border-amber-700/60 bg-amber-950/30" : "border-slate-700 bg-slate-950/50"}`}>
                        <div className="font-bold text-slate-300 mb-1">Cảnh báo kiểm duyệt</div>
                        {previewData.warnings.length ? <ul className="space-y-1 text-amber-300">{previewData.warnings.map(item => <li key={item}>• {item}</li>)}</ul> : <span className="text-emerald-400">Không có cảnh báo.</span>}
                      </div>
                    </div>
                  )}

                  {/* Visual Sourcing Results Box */}
                  {visualMatches && visualMatches.length > 0 && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 space-y-3 animate-fadeIn">
                      {visualMatches.some(match => match.isDemo) && (
                        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200" role="note">
                          Chế độ Demo — kết quả xưởng, giá và độ tương đồng là dữ liệu mô phỏng.
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Factory className="w-4 h-4 text-amber-400" />
                          <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                            Gợi Ý Xưởng Nguồn 1688 Tương Đồng (Tăng Biên Lợi Nhuận)
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Giá bán: <strong className="text-emerald-400">{previewData.estimatedSellingPriceVND > 0 ? `${previewData.estimatedSellingPriceVND.toLocaleString("vi-VN")} ₫` : "Chưa xác định"}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {visualMatches.map((m, idx) => (
                          <div key={idx} className="p-3 bg-slate-900/80 border border-slate-700/80 rounded-xl space-y-2 hover:border-amber-500/50 transition-all">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-200 line-clamp-1">{m.shopName}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                                {m.isDemo ? "DEMO" : `Khớp ${m.similarityScore}%`}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 line-clamp-2">{m.titleVI}</div>
                            
                            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                              <div>
                                <div className="text-[10px] text-slate-500">Giá xưởng gốc</div>
                                <div className="text-xs font-bold text-amber-400">
                                  ¥{m.factoryPriceCNY} ({m.factoryPriceVND.toLocaleString("vi-VN")} ₫)
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-[10px] text-slate-500">Biên lãi mới</div>
                                <div className="text-xs font-bold text-emerald-400">+{m.estimatedMarginWith1688}%</div>
                              </div>
                            </div>

                            <a
                              href={m.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-1.5 px-2.5 text-[11px] font-semibold text-center rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center space-x-1"
                            >
                              <span>Mở xưởng 1688</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
                            {previewData.estimatedCostVND > 0 ? `${previewData.estimatedCostVND.toLocaleString("vi-VN")} ₫` : "Chưa xác định"}
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] text-slate-400 flex items-center justify-between">
                            <span>Giá bán niêm yết</span>
                            {previewData.estimatedMarginPercent > 0 && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                                +{previewData.estimatedMarginPercent}%
                              </span>
                            )}
                          </div>
                          <div className="text-base font-bold text-emerald-400 mt-0.5">
                            {previewData.estimatedSellingPriceVND > 0 ? `${previewData.estimatedSellingPriceVND.toLocaleString("vi-VN")} ₫` : "Chưa xác định"}
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
                                  {v.priceVND > 0 ? `${v.priceVND.toLocaleString("vi-VN")} ₫` : "Chưa xác định"}
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
          )}

          {/* ========================================================================= */}
          {/* TAB 2: BATCH URL CLONER (HÀNG LOẠT QUA QUEUE)                              */}
          {/* ========================================================================= */}
          {activeTab === "BATCH" && (
            <div className="space-y-5 animate-fadeIn">
              <div className="bg-slate-800/50 border border-slate-700/70 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <ListPlus className="w-4 h-4 text-indigo-400" />
                      <span>Nhập Hàng Loạt Bằng Danh Sách URL (Tối đa 50 link)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Dán danh sách các đường link sản phẩm từ Taobao, Shopee, TikTok Shop, AliExpress (mỗi link 1 dòng)
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleLoadSampleBatchUrls}
                      className="px-3 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white border border-slate-600/50 flex items-center space-x-1.5 transition-colors"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Thử 5 Link Mẫu</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePasteClipboard}
                      className="px-3 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-xs font-semibold text-indigo-300 hover:text-white border border-slate-600/50 flex items-center space-x-1.5 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Dán từ Clipboard</span>
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    rows={7}
                    value={batchUrlsInput}
                    onChange={e => setBatchUrlsInput(e.target.value)}
                    placeholder={`https://item.taobao.com/item.htm?id=681928471928\nhttps://shopee.vn/product/12345678/987654321\nhttps://shop.tiktok.com/view/product/1729384918294`}
                    className="w-full p-3.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="absolute right-3 bottom-3 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-400">
                    {detectedBatchCount} link phát hiện
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Danh mục áp dụng chung:
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
                      id="autoPublishBatchCheck"
                      checked={autoPublish}
                      onChange={e => setAutoPublish(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500"
                    />
                    <label htmlFor="autoPublishBatchCheck" className="text-xs text-slate-300 cursor-pointer">
                      Tự động xuất bản lên Web sau khi clone
                    </label>
                  </div>
                </div>

                {/* Progress Bar */}
                {isBatchProcessing && (
                  <div className="space-y-2 pt-2 border-t border-slate-700/60 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-indigo-400 font-semibold flex items-center space-x-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang xử lý đa luồng ngầm... ({batchProgress.current}/{batchProgress.total})</span>
                      </span>
                      <span className="font-bold text-slate-200">{batchProgress.percent}%</span>
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden border border-slate-700">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-300 rounded-full"
                        style={{ width: `${batchProgress.percent}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    disabled={isBatchProcessing || detectedBatchCount === 0}
                    onClick={handleStartBatchClone}
                    className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 flex items-center space-x-2 transition-all"
                  >
                    {isBatchProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang thực thi hàng loạt...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-white" />
                        <span>Bắt Đầu Clone {detectedBatchCount > 0 ? `(${detectedBatchCount} link)` : ""}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Batch Results Table */}
              {batchResults && (
                <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-700/80 pb-2.5">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Kết Quả Thực Thi Hàng Loạt ({batchResults.length} sản phẩm)
                    </span>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">
                        Thành công: {batchResults.filter(r => r.success).length}
                      </span>
                      {batchResults.some(r => !r.success) && (
                        <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 font-semibold">
                          Thất bại: {batchResults.filter(r => !r.success).length}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto border border-slate-800 rounded-lg">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                        <tr>
                          <th className="p-2.5">Trạng thái</th>
                          <th className="p-2.5">Nền tảng</th>
                          <th className="p-2.5">Tên sản phẩm</th>
                          <th className="p-2.5 text-right">Giá bán (VNĐ)</th>
                          <th className="p-2.5 text-center">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                        {batchResults.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/50">
                            <td className="p-2.5">
                              {item.success ? (
                                <span className="inline-flex items-center space-x-1 text-emerald-400 font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Đã Lưu</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 text-red-400 font-medium" title={item.error}>
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>Lỗi</span>
                                </span>
                              )}
                            </td>

                            <td className="p-2.5">
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-slate-300 border border-slate-700">
                                {item.sourcePlatform || "WEB"}
                              </span>
                            </td>

                            <td className="p-2.5 font-medium text-slate-200 max-w-xs truncate">
                              {item.product?.titleVI || item.url}
                            </td>

                            <td className="p-2.5 text-right font-bold text-emerald-400">
                              {item.product ? `${item.product.minPriceVND.toLocaleString("vi-VN")} ₫` : "—"}
                            </td>

                            <td className="p-2.5 text-center">
                              {item.product && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onProductCreated(item.product!);
                                    onClose();
                                  }}
                                  className="px-2.5 py-1 text-[11px] rounded bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white transition-colors"
                                >
                                  Mở xem
                                </button>
                              )}
                            </td>
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
            aria-label="Đóng cửa sổ clone sản phẩm"
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Đóng
            </button>

            {activeTab === "SINGLE" && previewData && (
              <>
                <button
                  type="button"
                  disabled={isCloning || previewData.extractionStatus !== "LIVE" || previewData.isDemo}
                  onClick={() => handleExecuteClone(false)}
                  className="px-4 py-2 text-xs font-medium text-indigo-300 hover:text-indigo-200 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-700/50 rounded-lg transition-colors flex items-center space-x-1.5"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Lưu Bản Nháp</span>
                </button>

                <button
                  type="button"
                  disabled={isCloning || previewData.extractionStatus !== "LIVE" || previewData.isDemo}
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
