import React, { useState } from "react";
import { useProductExtractor } from "./hooks/useProductExtractor.js";
import { Header } from "./components/Header.js";
import { QuickImportCard } from "./components/QuickImportCard.js";
import { AdvancedImportTabs } from "./components/AdvancedImportTabs.js";
import {
  TranslationMode,
  WebProductVariant,
  PricingBreakdown,
  Normalized1688Product
} from "@hub1688/shared-types";
import {
  calculateSellingPrice,
  DEFAULT_PRICING_RULE,
  generateCartesianCombinations
} from "@hub1688/shared-utils";
import { CheckCircle, Zap, SlidersHorizontal, Loader2, Video, Globe, Play } from "lucide-react";
import { getApiBaseUrl } from "../shared/config.js";

export const App: React.FC = () => {
  const { product, loading, refresh } = useProductExtractor();
  const [importMode, setImportMode] = useState<"QUICK" | "ADVANCED">("QUICK");
  const [translationMode, setTranslationMode] = useState<TranslationMode>("ECOMMERCE");
  const [targetLanguage, setTargetLanguage] = useState<"vi" | "en">("vi");
  const [multiplier, setMultiplier] = useState<number>(2.2);
  const [importing, setImporting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Khởi tạo variants và pricing breakdown
  const rule = { ...DEFAULT_PRICING_RULE, multiplier };
  const initialVariants = product ? generateCartesianCombinations(product.skuProps, product.skuMap, rule) : [];
  const [variants, setVariants] = useState<WebProductVariant[]>(initialVariants);

  // Cập nhật khi product thay đổi
  React.useEffect(() => {
    if (product) {
      setVariants(generateCartesianCombinations(product.skuProps, product.skuMap, rule));
    }
  }, [product, multiplier]);

  const pricingBreakdown: PricingBreakdown = calculateSellingPrice(
    product ? product.prices.minPriceCNY : 32.0,
    rule
  );

  const handleToggleVariant = (sourceSkuId: string) => {
    setVariants(prev =>
      prev.map(v => (v.sourceSkuId === sourceSkuId ? { ...v, selectedForSale: !v.selectedForSale } : v))
    );
  };

  const handlePriceChange = (sourceSkuId: string, newPrice: number) => {
    setVariants(prev =>
      prev.map(v => (v.sourceSkuId === sourceSkuId ? { ...v, sellingPriceVND: newPrice } : v))
    );
  };

  const executeImport = async (autoPublish: boolean = false) => {
    if (!product) return;
    setImporting(true);
    setSuccessMessage(null);

    const normalized: Normalized1688Product = {
      sourcePlatform: "1688",
      sourceProductId: product.offerId,
      sourceUrl: product.sourceUrl,
      supplier: product.shop,
      moq: product.moq,
      titleCN: product.title,
      cleanedTitleCN: product.title,
      price: {
        currency: "CNY",
        min: product.prices.minPriceCNY,
        max: product.prices.maxPriceCNY
      },
      media: {
        images: product.images,
        videoUrl: product.videoUrl
      },
      attributes: (product.attributes || []).map(a => ({ keyCN: a.nameCN, valueCN: a.valueCN })),
      variants: variants.map(v => ({
        sourceSkuId: v.sourceSkuId,
        colorCN: v.colorName,
        sizeCN: v.sizeName,
        priceCNY: product.prices.minPriceCNY,
        stock: v.stockQuantity
      })),
      description: {
        images: product.descriptionImages || []
      },
      rawSnapshot: product
    };

    try {
      const baseUrl = await getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/v1/import/single`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          normalized,
          settings: {
            targetLanguage,
            translationMode,
            autoPublish,
            copyDescriptionImages: true,
            selectedSkuIds: variants.filter(v => v.selectedForSale).map(v => v.sourceSkuId)
          }
        })
      });

      const data = await res.json();
      if (res.ok) {
        const title = targetLanguage === "en" ? (data.product.titleEN || data.product.titleVI) : data.product.titleVI;
        setSuccessMessage(
          autoPublish
            ? `✓ Đã đăng bán thành công: ${title}`
            : `✓ Đã lưu thành công vào DRAFT: ${title}`
        );
      } else {
        setSuccessMessage(`⚠ ${data.message || "Lỗi khi đồng bộ về website"}`);
      }
    } catch (err: any) {
      setSuccessMessage(`⚠ Lỗi mạng: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans text-gray-800">
      <Header shop={product?.shop} onRefresh={refresh} loading={loading} />

      <main className="p-3.5 space-y-3 flex-1">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-2 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
            <p className="text-xs font-medium">Đang nhận diện sản phẩm 1688...</p>
          </div>
        ) : !product ? (
          <div className="p-6 bg-white rounded-xl border border-gray-200 text-center space-y-2">
            <p className="text-sm font-semibold text-gray-700">Chưa nhận diện được sản phẩm</p>
            <p className="text-xs text-gray-400">Vui lòng mở một trang chi tiết 1688 (detail.1688.com/offer/...)</p>
          </div>
        ) : (
          <>
            {/* Language & Mode Control Bar */}
            <div className="flex items-center justify-between gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex items-center gap-1 text-[11px] font-bold text-gray-600">
                <Globe className="w-3.5 h-3.5 text-orange-500" />
                <span>Ngôn ngữ:</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTargetLanguage("vi")}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                    targetLanguage === "vi"
                      ? "bg-orange-600 text-white shadow-xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  🇻🇳 Tiếng Việt
                </button>
                <button
                  type="button"
                  onClick={() => setTargetLanguage("en")}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                    targetLanguage === "en"
                      ? "bg-orange-600 text-white shadow-xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  🇬🇧 English
                </button>
              </div>
            </div>

            {/* Video preview banner if video exists */}
            {product.videoUrl && (
              <div className="bg-slate-900 rounded-xl overflow-hidden shadow-sm border border-slate-800">
                <div className="p-2 px-3 bg-slate-950 flex items-center justify-between text-xs text-white">
                  <span className="font-bold flex items-center gap-1.5 text-orange-400 text-[11px]">
                    <Video className="w-3.5 h-3.5" />
                    Phát hiện Video 1688
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold">Sẵn sàng đồng bộ</span>
                </div>
                <video
                  src={product.videoUrl}
                  controls
                  poster={product.images[0]}
                  className="w-full h-36 object-cover bg-black"
                />
              </div>
            )}

            {/* Mode switch tabs */}
            <div className="grid grid-cols-2 bg-gray-200/80 p-0.5 rounded-lg text-xs font-bold">
              <button
                onClick={() => setImportMode("QUICK")}
                className={`flex items-center justify-center space-x-1 py-1.5 rounded-md transition-all ${
                  importMode === "QUICK"
                    ? "bg-white text-orange-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>NHẬP NHANH (1-CLICK)</span>
              </button>
              <button
                onClick={() => setImportMode("ADVANCED")}
                className={`flex items-center justify-center space-x-1 py-1.5 rounded-md transition-all ${
                  importMode === "ADVANCED"
                    ? "bg-white text-orange-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>TÙY CHỌN NÂNG CAO</span>
              </button>
            </div>

            {/* Notification message */}
            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-medium flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* View rendering */}
            {importMode === "QUICK" ? (
              <QuickImportCard
                product={product}
                onImport={(opts) => executeImport(false)}
                onPreview={() => setImportMode("ADVANCED")}
                importing={importing}
              />
            ) : (
              <AdvancedImportTabs
                product={product}
                translationMode={translationMode}
                onTranslationModeChange={setTranslationMode}
                pricingBreakdown={pricingBreakdown}
                multiplier={multiplier}
                onMultiplierChange={setMultiplier}
                variants={variants}
                onToggleVariant={handleToggleVariant}
                onPriceChange={handlePriceChange}
                onSaveDraft={() => executeImport(false)}
                onPublishDirect={() => executeImport(true)}
                importing={importing}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};
