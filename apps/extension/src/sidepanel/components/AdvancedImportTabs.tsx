import React, { useState, useEffect } from "react";
import { TranslationMode, WebProductVariant, PricingBreakdown, Raw1688Product, VisualSourcingMatch, ProductTemplate } from "@hub1688/shared-types";
import {
  buildShopifyCSV,
  buildWooCommerceCSV,
  buildHaravanCSV,
  buildMarketplaceCSV,
  convertRawProductToExportable
} from "@hub1688/shared-utils";
import { apiFetch } from "../../shared/config.js";
import { TranslationSelector } from "./TranslationSelector.js";
import { SkuMatrixTable } from "./SkuMatrixTable.js";
import { PricingSimulator } from "./PricingSimulator.js";
import { QualityScoreBadge } from "./QualityScoreBadge.js";
import {
  Eye,
  FileText,
  Grid,
  DollarSign,
  Loader2,
  Sparkles,
  Download,
  Search,
  Languages,
  ExternalLink,
  CheckCircle2,
  X,
  ChevronDown,
  LayoutTemplate,
  Check
} from "lucide-react";

const SOURCE_CURRENCY_SYMBOL: Record<string, string> = {
  CNY: "¥",
  USD: "$",
  VND: "₫",
  EUR: "€",
  GBP: "£",
  CAD: "CA$",
  AUD: "A$",
  JPY: "¥",
  INR: "₹",
  BRL: "R$",
  MXN: "MX$",
  SEK: "kr",
  PLN: "zł",
  SGD: "S$",
  AED: "AED ",
  SAR: "SAR ",
  TRY: "₺"
};

const formatSourcePrice = (price: number | undefined, currency: string | undefined) => {
  if (!price || price <= 0) return "Chưa xác minh";
  const symbol = SOURCE_CURRENCY_SYMBOL[currency || ""] || `${currency || ""} `;
  return `${symbol}${price.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}`;
};

export interface AdvancedImportTabsProps {
  product?: Raw1688Product | null;
  initialTab?: "PREVIEW" | "TRANSLATION" | "SKU" | "PRICING";
  variants: WebProductVariant[];
  pricingBreakdown: PricingBreakdown;
  multiplier: number;
  onMultiplierChange: (m: number) => void;
  translationMode?: TranslationMode;
  selectedMode?: TranslationMode;
  onTranslationModeChange?: (mode: TranslationMode) => void;
  onSelectMode?: (mode: TranslationMode) => void;
  targetLanguage?: "vi" | "en";
  onToggleVariant: (id: string) => void;
  onPriceChange: (id: string, price: number) => void;
  onSaveDraft?: () => void;
  onPublishDirect?: () => void;
  onPublish?: (autoPublish: boolean) => void;
  importing: boolean;
}

export const AdvancedImportTabs: React.FC<AdvancedImportTabsProps> = ({
  product,
  initialTab = "PREVIEW",
  variants = [],
  pricingBreakdown,
  multiplier = 2.2,
  onMultiplierChange,
  translationMode,
  selectedMode,
  onTranslationModeChange,
  onSelectMode,
  targetLanguage = "vi",
  onToggleVariant,
  onPriceChange,
  onSaveDraft,
  onPublishDirect,
  onPublish,
  importing
}) => {
  const [activeTab, setActiveTab] = useState<"PREVIEW" | "TRANSLATION" | "SKU" | "PRICING">(initialTab);
  const [activeImage, setActiveImage] = useState<string>(product?.images?.[0] || "");

  // Đồng bộ chế độ dịch linh hoạt từ props
  const effectiveMode = translationMode || selectedMode || "ECOMMERCE";
  const handleSelectMode = (mode: TranslationMode) => {
    if (onTranslationModeChange) onTranslationModeChange(mode);
    if (onSelectMode) onSelectMode(mode);
  };

  const handlePublishAction = (autoPublish: boolean) => {
    if (autoPublish) {
      if (onPublishDirect) onPublishDirect();
      else if (onPublish) onPublish(true);
    } else {
      if (onSaveDraft) onSaveDraft();
      else if (onPublish) onPublish(false);
    }
  };

  // Omnichannel CSV Export State
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string>("");

  // 1688 Visual Sourcing State
  const [showSourcingModal, setShowSourcingModal] = useState<boolean>(false);
  const [loadingSourcing, setLoadingSourcing] = useState<boolean>(false);
  const [sourcingMatches, setSourcingMatches] = useState<VisualSourcingMatch[]>([]);
  const [sourcingError, setSourcingError] = useState<string>("");

  // AI Image OCR & Translation State
  const [showOcrModal, setShowOcrModal] = useState<boolean>(false);
  const [loadingOcr, setLoadingOcr] = useState<boolean>(false);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [ocrError, setOcrError] = useState<string>("");

  // Product Templates State
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ProductTemplate | null>(null);
  const [customTitle, setCustomTitle] = useState<string>("");
  const [appliedTemplateMsg, setAppliedTemplateMsg] = useState<string>("");

  useEffect(() => {
    async function loadTemplates() {
      try {
        const res = await apiFetch("/api/v1/templates");
        const data = (await res.json()) as any;
        if (data?.templates && data.templates.length > 0) {
          setTemplates(data.templates);
          const def = data.templates.find((t: any) => t.isDefault) || data.templates[0];
          setSelectedTemplate(def);
        }
      } catch (e) {
        console.warn("Could not load templates in extension:", e);
      }
    }
    loadTemplates();
  }, []);

  const handleApplyTemplate = (tpl: ProductTemplate) => {
    setSelectedTemplate(tpl);
    const baseTitle = product?.title || "";
    const clean = baseTitle.replace(/^\[[^\]]+\]\s*/, "").replace(/\s*-[^-]+$/, "").trim();
    const prefix = tpl.content?.titlePrefix ? `${tpl.content.titlePrefix} ` : "";
    const suffix = tpl.content?.titleSuffix ? ` ${tpl.content.titleSuffix}` : "";
    const formatted = `${prefix}${clean || baseTitle}${suffix}`.trim();
    setCustomTitle(formatted);
    setAppliedTemplateMsg(`Đã áp dụng mẫu "${tpl.name}"!`);
    setTimeout(() => setAppliedTemplateMsg(""), 3000);
  };

  /**
   * Xuất file CSV chuẩn từng sàn TMĐT (Shopify, WooCommerce, Haravan, TikTok Shop, Shopee)
   */
  const handleExportCSV = (platform: "SHOPIFY" | "WOOCOMMERCE" | "HARAVAN" | "TIKTOK_SHOP" | "SHOPEE") => {
    if (!product) return;
    try {
      const exportable = convertRawProductToExportable(product, variants, "Sản phẩm");
      let csvData = "";
      let filename = "";

      switch (platform) {
        case "SHOPIFY":
          csvData = buildShopifyCSV([exportable]);
          filename = `shopify_products_${Date.now()}.csv`;
          break;
        case "WOOCOMMERCE":
          csvData = buildWooCommerceCSV([exportable]);
          filename = `woocommerce_products_${Date.now()}.csv`;
          break;
        case "HARAVAN":
          csvData = buildHaravanCSV([exportable]);
          filename = `haravan_products_${Date.now()}.csv`;
          break;
        case "TIKTOK_SHOP":
          csvData = buildMarketplaceCSV([exportable], "TIKTOK_SHOP");
          filename = `tiktok_shop_products_${Date.now()}.csv`;
          break;
        case "SHOPEE":
        default:
          csvData = buildMarketplaceCSV([exportable], "SHOPEE");
          filename = `shopee_products_${Date.now()}.csv`;
          break;
      }

      // Download file kèm UTF-8 BOM chống lỗi font tiếng Việt
      const blob = new Blob(["\uFEFF" + csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccessMsg(`Đã tải file CSV cho ${platform} thành công!`);
      setShowExportMenu(false);
      setTimeout(() => setExportSuccessMsg(""), 3000);
    } catch (e: any) {
      alert("Lỗi xuất file CSV: " + e.message);
    }
  };

  /**
   * Tìm xưởng nguồn 1688 giá gốc bằng hình ảnh sản phẩm (Visual Sourcing)
   */
  const handleFind1688Suppliers = async () => {
    setLoadingSourcing(true);
    setShowSourcingModal(true);
    setSourcingMatches([]);
    setSourcingError("");
    try {
      const currentImg = activeImage || product?.images?.[0] || "";
      if (!/^https?:\/\//i.test(currentImg)) throw new Error("Ảnh sản phẩm không có URL công khai hợp lệ");
      const res = await apiFetch("/api/v1/clone/visual-sourcing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: currentImg,
          title: product?.title,
          currentSellingPriceVND: pricingBreakdown?.finalSellingPriceVND
        })
      });
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
      if (data?.matches && data.matches.length > 0) {
        setSourcingMatches(data.matches);
      } else {
        throw new Error("Không tìm thấy xưởng phù hợp");
      }
    } catch (err: any) {
      setSourcingMatches([]);
      setSourcingError(err?.message || "Không thể tìm xưởng từ dữ liệu hiện tại");
    } finally {
      setLoadingSourcing(false);
    }
  };

  /**
   * Dịch chữ tiếng Trung trên ảnh sản phẩm bằng AI Vision
   */
  const handleTranslateImageText = async () => {
    setLoadingOcr(true);
    setShowOcrModal(true);
    setOcrResult(null);
    setOcrError("");
    try {
      const currentImg = activeImage || product?.images?.[0] || "";
      if (!/^https?:\/\//i.test(currentImg)) throw new Error("Ảnh sản phẩm không có URL công khai hợp lệ");
      const res = await apiFetch("/api/v1/ai/translate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: currentImg })
      });
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
      setOcrResult(data);
    } catch (err: any) {
      setOcrResult(null);
      setOcrError(err?.message || "Không thể nhận diện chữ trên ảnh");
    } finally {
      setLoadingOcr(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Thông báo xuất file thành công */}
      {exportSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11px] font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{exportSuccessMsg}</span>
        </div>
      )}

      {/* Tab Navigation: 4 Tab rõ ràng & chuyên nghiệp */}
      <div className="grid grid-cols-4 bg-white rounded-lg p-1 gap-1 border border-gray-200 shadow-2xs text-[11px] font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("PREVIEW")}
          className={`flex items-center justify-center gap-1 py-1.5 rounded-md transition-all ${
            activeTab === "PREVIEW"
              ? "bg-orange-600 text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Eye className="w-3 h-3" />
          <span>Xem trước</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("TRANSLATION")}
          className={`flex items-center justify-center gap-1 py-1.5 rounded-md transition-all ${
            activeTab === "TRANSLATION"
              ? "bg-orange-600 text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <FileText className="w-3 h-3" />
          <span>Nội dung AI</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("SKU")}
          className={`flex items-center justify-center gap-1 py-1.5 rounded-md transition-all ${
            activeTab === "SKU"
              ? "bg-orange-600 text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Grid className="w-3 h-3" />
          <span>SKU ({variants.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("PRICING")}
          className={`flex items-center justify-center gap-1 py-1.5 rounded-md transition-all ${
            activeTab === "PRICING"
              ? "bg-orange-600 text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <DollarSign className="w-3 h-3" />
          <span>Định giá</span>
        </button>
      </div>

      {/* 1. TAB XEM TRƯỚC SẢN PHẨM (PREVIEW TRỰC QUAN ĐẦY ĐỦ) */}
      {activeTab === "PREVIEW" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden space-y-3 p-3.5">
          {/* Main image & gallery preview */}
          <div className="space-y-2">
            <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-gray-50 border border-gray-200 flex items-center justify-center">
              {(activeImage || product?.images?.[0]) ? (
                <img
                  src={activeImage || product?.images?.[0]}
                  alt={product?.title || "Product Preview"}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xs font-semibold text-gray-500">Chưa trích xuất được ảnh thật</span>
              )}
              <span className="absolute top-2 left-2 bg-black/75 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                {product?.sourcePlatform || "E-Commerce"}
              </span>

              {/* Action Toolbar on Top of Image */}
              <div className="absolute bottom-2 left-2 right-2 flex gap-1.5 justify-center">
                <button
                  type="button"
                  onClick={handleFind1688Suppliers}
                  className="bg-orange-600/90 hover:bg-orange-600 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-md shadow-md backdrop-blur-xs flex items-center gap-1 transition-transform active:scale-95"
                  title="Tìm xưởng sản xuất gốc trên 1688 với giá sỉ rẻ hơn 40-60%"
                >
                  <Search className="w-3 h-3" />
                  <span>Tìm Xưởng 1688</span>
                </button>

                <button
                  type="button"
                  onClick={handleTranslateImageText}
                  className="bg-purple-600/90 hover:bg-purple-600 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-md shadow-md backdrop-blur-xs flex items-center gap-1 transition-transform active:scale-95"
                  title="Dịch chữ tiếng Trung trên ảnh sang tiếng Việt bằng AI Vision"
                >
                  <Languages className="w-3 h-3" />
                  <span>Dịch Chữ Ảnh AI</span>
                </button>
              </div>
            </div>

            {/* Thumbnail carousel */}
            {product?.images && product.images.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImage(img)}
                    className={`relative w-11 h-11 rounded-md overflow-hidden border-2 flex-shrink-0 transition-all ${
                      (activeImage || product.images[0]) === img
                        ? "border-orange-600 ring-1 ring-orange-600"
                        : "border-gray-200 hover:border-gray-400 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Template Presets Selector */}
          {templates.length > 0 && (
            <div className="p-2.5 bg-indigo-50/70 rounded-xl border border-indigo-200/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-indigo-900 flex items-center gap-1">
                  <LayoutTemplate className="w-3.5 h-3.5 text-indigo-600" />
                  Mẫu Đăng Bán (Template):
                </span>
                {appliedTemplateMsg && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    {appliedTemplateMsg}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <select
                  value={selectedTemplate?.id || ""}
                  onChange={(e) => {
                    const found = templates.find(t => t.id === e.target.value);
                    if (found) handleApplyTemplate(found);
                  }}
                  className="flex-1 px-2 py-1.5 bg-white border border-indigo-200 rounded-lg text-[11px] font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {templates.map(tpl => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({tpl.categoryName})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => selectedTemplate && handleApplyTemplate(selectedTemplate)}
                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold shrink-0 transition-colors"
                >
                  Áp Dụng
                </button>
              </div>

              {selectedTemplate?.content?.titlePrefix && (
                <div className="text-[10px] text-indigo-700 truncate">
                  Tiền tố: <span className="font-bold">{selectedTemplate.content.titlePrefix}</span> | Hậu tố: <span className="font-bold">{selectedTemplate.content.titleSuffix || "—"}</span>
                </div>
              )}
            </div>
          )}

          {/* Product Title Preview */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded uppercase">
              {targetLanguage === "en" ? "English Store Title" : "Tiêu đề bán hàng (VI)"}
            </span>
            <h2 className="text-xs font-bold text-gray-900 leading-snug">
              {customTitle || product?.title || "Đang tải tiêu đề sản phẩm..."}
            </h2>
          </div>

          {/* Price & Margin Card */}
          <div className="p-2.5 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-gray-500 font-medium block">Giá bán lẻ đề xuất trên Web</span>
              <span className="text-base font-black text-orange-600">
                {pricingBreakdown?.finalSellingPriceVND > 0
                  ? `${pricingBreakdown.finalSellingPriceVND.toLocaleString("vi-VN")}đ`
                  : "Chưa tính giá"}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-500 font-medium block">Giá gốc nguồn</span>
              <span className="text-xs font-bold text-gray-700">
                {formatSourcePrice(product?.originalPriceMin, product?.originalCurrency)}
                {product?.originalPriceMax && product.originalPriceMax > (product.originalPriceMin || 0)
                  ? ` – ${formatSourcePrice(product.originalPriceMax, product.originalCurrency)}`
                  : ""}
              </span>
              <div className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                Lãi {pricingBreakdown?.marginPercent >= 0 ? `${pricingBreakdown.marginPercent}%` : "chưa tính"}
              </div>
            </div>
          </div>

          {/* Variants Quick Preview */}
          {variants.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-gray-700">
                Phân loại SKU ({variants.filter(v => v.selectedForSale).length}/{variants.length} đã chọn):
              </span>
              <div className="flex flex-wrap gap-1">
                {variants.map((v) => (
                  <span
                    key={v.sourceSkuId}
                    className={`text-[10px] px-2 py-0.5 rounded border font-medium ${
                      v.selectedForSale
                        ? "bg-white border-orange-400 text-orange-700 font-semibold shadow-2xs"
                        : "bg-gray-100 border-gray-200 text-gray-400 line-through"
                    }`}
                  >
                    {v.colorName} {v.sizeName !== "Tiêu chuẩn" ? `(${v.sizeName})` : ""}: {v.sellingPriceVND > 0 ? `${v.sellingPriceVND.toLocaleString("vi-VN")}đ` : "Chưa tính giá"}
                  </span>
                ))}
              </div>
            </div>
          )}

          {product?.optionGroups && product.optionGroups.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-amber-100">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-gray-700">Lựa chọn nguồn phát hiện được:</span>
                <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                  Cần xác minh SKU
                </span>
              </div>
              <div className="space-y-1">
                {product.optionGroups.map(group => (
                  <div key={group.id} className="rounded-lg border border-gray-100 bg-gray-50/70 p-1.5">
                    <div className="text-[10px] font-semibold text-gray-600 mb-1">{group.name}</div>
                    <div className="flex flex-wrap gap-1">
                      {group.values.slice(0, 24).map(value => (
                        <span key={value.id} className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] text-gray-700">
                          {value.imageUrl && <img src={value.imageUrl} alt="" className="h-4 w-4 rounded object-cover" />}
                          {value.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attributes */}
          {product?.attributes && product.attributes.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-gray-100">
              <span className="text-[11px] font-bold text-gray-700">Thông số kỹ thuật:</span>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                {product.attributes.slice(0, 4).map((attr, idx) => (
                  <div key={idx} className="bg-gray-50 p-1.5 rounded border border-gray-100">
                    <span className="text-gray-400 block">{attr.nameCN}</span>
                    <span className="font-semibold text-gray-800 truncate block">{attr.valueCN}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. TAB NỘI DUNG AI */}
      {activeTab === "TRANSLATION" && (
        <TranslationSelector
          originalTitle={product?.title}
          targetLanguage={targetLanguage}
          selectedMode={effectiveMode}
          onSelectMode={handleSelectMode}
        />
      )}

      {/* 3. TAB MA TRẬN SKU */}
      {activeTab === "SKU" && (
        <SkuMatrixTable
          variants={variants}
          onToggleVariant={onToggleVariant}
          onPriceChange={onPriceChange}
        />
      )}

      {/* 4. TAB ĐỊNH GIÁ & MARGIN */}
      {activeTab === "PRICING" && (
        <PricingSimulator
          breakdown={pricingBreakdown}
          multiplier={multiplier}
          onMultiplierChange={onMultiplierChange}
        />
      )}

      {/* Action Buttons: Đăng bán ngay & Lưu vào draft */}
      <div className="pt-2 flex gap-2">
        <button
          type="button"
          onClick={() => handlePublishAction(false)}
          disabled={importing}
          className="flex-1 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-bold text-xs py-2.5 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
        >
          {importing ? (
            <span className="flex items-center justify-center gap-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Đang lưu...
            </span>
          ) : (
            "LƯU VÀO DRAFT"
          )}
        </button>

        <button
          type="button"
          onClick={() => handlePublishAction(true)}
          disabled={importing}
          className="flex-1 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold text-xs py-2.5 rounded-lg shadow-md shadow-orange-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {importing ? (
            <span className="flex items-center justify-center gap-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Đang đăng...
            </span>
          ) : (
            "ĐĂNG BÁN NGAY"
          )}
        </button>
      </div>

      {/* Nút Xuất File CSV Chuẩn Sàn TMĐT */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowExportMenu(!showExportMenu)}
          className="w-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-xs"
        >
          <Download className="w-3.5 h-3.5 text-emerald-600" />
          <span>XUẤT FILE CSV SÀN (Shopify / Woo / Haravan / TikTok)</span>
          <ChevronDown className={`w-3.5 h-3.5 text-emerald-600 transition-transform ${showExportMenu ? "rotate-180" : ""}`} />
        </button>

        {showExportMenu && (
          <div className="mt-1.5 p-2 bg-white border border-gray-200 rounded-lg shadow-lg text-xs space-y-1 z-30">
            <div className="text-[10.5px] font-bold text-gray-500 px-2 py-1 uppercase">
              Chọn định dạng sàn thương mại:
            </div>
            <button
              type="button"
              onClick={() => handleExportCSV("SHOPIFY")}
              className="w-full text-left px-2.5 py-1.5 hover:bg-emerald-50 text-gray-800 font-medium rounded flex items-center justify-between transition-colors"
            >
              <span>🛒 <strong>Shopify CSV</strong> (Chuẩn Quốc Tế)</span>
              <span className="text-[10px] text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">Tự động mapping SKU</span>
            </button>
            <button
              type="button"
              onClick={() => handleExportCSV("WOOCOMMERCE")}
              className="w-full text-left px-2.5 py-1.5 hover:bg-purple-50 text-gray-800 font-medium rounded flex items-center justify-between transition-colors"
            >
              <span>🏪 <strong>WooCommerce CSV</strong> (WordPress)</span>
              <span className="text-[10px] text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">Variable Products</span>
            </button>
            <button
              type="button"
              onClick={() => handleExportCSV("HARAVAN")}
              className="w-full text-left px-2.5 py-1.5 hover:bg-blue-50 text-gray-800 font-medium rounded flex items-center justify-between transition-colors"
            >
              <span>🏬 <strong>Haravan CSV</strong> (Việt Nam)</span>
              <span className="text-[10px] text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">Bản dịch tiếng Việt</span>
            </button>
            <button
              type="button"
              onClick={() => handleExportCSV("TIKTOK_SHOP")}
              className="w-full text-left px-2.5 py-1.5 hover:bg-gray-100 text-gray-800 font-medium rounded flex items-center justify-between transition-colors"
            >
              <span>🎵 <strong>TikTok Shop CSV</strong> (Bulk Upload)</span>
              <span className="text-[10px] text-gray-600 bg-gray-200 px-1.5 py-0.5 rounded">Chuẩn TikTok Seller</span>
            </button>
            <button
              type="button"
              onClick={() => handleExportCSV("SHOPEE")}
              className="w-full text-left px-2.5 py-1.5 hover:bg-orange-50 text-gray-800 font-medium rounded flex items-center justify-between transition-colors"
            >
              <span>🛍️ <strong>Shopee CSV</strong> (Hàng Loạt)</span>
              <span className="text-[10px] text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">Kênh Người Bán</span>
            </button>
          </div>
        )}
      </div>

      {/* MODAL 1: TÌM XƯỞNG NGUỒN 1688 (VISUAL SOURCING) */}
      {showSourcingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-xl max-w-sm w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-gray-200">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Search className="w-4 h-4" />
                <span>Nguồn Xưởng Gốc 1688 Tương Đồng</span>
              </div>
              <button
                onClick={() => setShowSourcingModal(false)}
                aria-label="Đóng kết quả tìm xưởng"
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3.5 overflow-y-auto space-y-3 flex-1 text-xs">
              {loadingSourcing ? (
                <div className="py-12 text-center space-y-2 text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-orange-600" />
                  <p className="font-semibold">Đang dùng AI quét kho xưởng 1688...</p>
                  <p className="text-[10px] text-gray-400">Phân tích hình ảnh, vật liệu và định giá sỉ xưởng gốc</p>
                </div>
              ) : sourcingError ? (
                <div className="py-8 px-3 text-center text-rose-700 bg-rose-50 border border-rose-200 rounded-lg" role="alert">
                  {sourcingError}
                </div>
              ) : sourcingMatches.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  Không có kết quả đã xác minh.
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className={`text-[11px] p-2 rounded-lg border ${sourcingMatches.some(match => match.isDemo) ? "text-amber-900 bg-amber-50 border-amber-300" : "text-gray-600 bg-orange-50 border-orange-200"}`} role="note">
                    {sourcingMatches.some(match => match.isDemo)
                      ? "Chế độ Demo — các xưởng, giá và độ tương đồng bên dưới là dữ liệu mô phỏng; không dùng để đặt hàng."
                      : <>💡 Đã tìm thấy <strong>{sourcingMatches.length} xưởng sản xuất gốc</strong> đã xác minh:</>}
                  </div>

                  {sourcingMatches.map((m, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-gray-200 bg-gray-50 hover:border-orange-300 transition-all space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-gray-900 leading-tight">
                          {m.titleVI}
                        </div>
                        <span className="text-[9.5px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded flex-shrink-0">
                          {m.isDemo ? "DEMO" : `${m.similarityScore}% khớp`}
                        </span>
                      </div>

                      <div className="text-[10.5px] text-gray-600 flex items-center justify-between">
                        <span>🏭 {m.shopName}</span>
                        <span className="text-gray-400">📍 {m.location}</span>
                      </div>

                      <div className="pt-1 flex items-center justify-between border-t border-gray-200">
                        <div>
                          <span className="text-[10px] text-gray-500 block">Giá sỉ xưởng 1688:</span>
                          <span className="text-xs font-black text-orange-600">
                            ¥{m.factoryPriceCNY} (~{m.factoryPriceVND.toLocaleString("vi-VN")}đ)
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-gray-500 block">Biên lãi dự kiến:</span>
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                            +{m.estimatedMarginWith1688}%
                          </span>
                        </div>
                      </div>

                      <div className="pt-1 flex justify-end">
                        <a
                          href={m.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-[10px] px-2.5 py-1 rounded flex items-center gap-1 shadow-xs"
                        >
                          <span>Mở Link Xưởng 1688</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-2.5 bg-gray-50 border-t border-gray-200 text-right">
              <button
                onClick={() => setShowSourcingModal(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs px-4 py-1.5 rounded-lg"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DỊCH CHỮ TRÊN ẢNH BẰNG AI VISION */}
      {showOcrModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-xl max-w-sm w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-gray-200">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Languages className="w-4 h-4" />
                <span>AI Vision OCR: Dịch Chữ Trên Ảnh</span>
              </div>
              <button
                onClick={() => setShowOcrModal(false)}
                aria-label="Đóng kết quả OCR"
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3.5 overflow-y-auto space-y-3 flex-1 text-xs">
              {loadingOcr ? (
                <div className="py-12 text-center space-y-2 text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-600" />
                  <p className="font-semibold">AI đang quét và dịch chữ tiếng Trung trên ảnh...</p>
                  <p className="text-[10px] text-gray-400">Tự động nhận diện chữ banner, nhãn mác, slogan xưởng</p>
                </div>
              ) : ocrError ? (
                <div className="py-8 px-3 text-center text-rose-700 bg-rose-50 border border-rose-200 rounded-lg" role="alert">
                  {ocrError}
                </div>
              ) : !ocrResult?.items || ocrResult.items.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  Không phát hiện thấy chữ tiếng Trung trên ảnh này.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {ocrResult.summaryVI && (
                    <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg text-purple-900 text-[11px] leading-relaxed">
                      📝 <strong>Ý nghĩa tổng quan:</strong> {ocrResult.summaryVI}
                    </div>
                  )}

                  <div className="space-y-2">
                    {ocrResult.items.map((it: any, idx: number) => (
                      <div key={idx} className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-gray-500 text-[10px] bg-gray-200 px-1.5 py-0.5 rounded">
                            Chữ gốc: {it.textCN}
                          </span>
                          {it.position && (
                            <span className="text-[9px] text-gray-400">{it.position}</span>
                          )}
                        </div>
                        <div className="font-bold text-gray-900 text-[11.5px] text-emerald-800">
                          🇻🇳 Dịch: {it.textVI}
                        </div>
                        {it.textEN && (
                          <div className="text-[10.5px] text-gray-600 italic">
                            🇬🇧 EN: {it.textEN}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-2.5 bg-gray-50 border-t border-gray-200 text-right">
              <button
                onClick={() => setShowOcrModal(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs px-4 py-1.5 rounded-lg"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
