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
import { CheckCircle, Zap, SlidersHorizontal, Loader2, Video, Globe, Play, Search, AlertCircle } from "lucide-react";
import { apiFetch } from "../shared/config.js";

export const App: React.FC = () => {
  const { product, loading, error, currentUrl, refresh, extractByCustomUrl } = useProductExtractor();
  const [inputUrl, setInputUrl] = useState<string>("");
  const [importMode, setImportMode] = useState<"QUICK" | "ADVANCED">("QUICK");
  const [advancedTab, setAdvancedTab] = useState<"PREVIEW" | "TRANSLATION" | "SKU" | "PRICING">("PREVIEW");
  const [translationMode, setTranslationMode] = useState<TranslationMode>("ECOMMERCE");
  const [targetLanguage, setTargetLanguage] = useState<"vi" | "en">("vi");
  const [multiplier, setMultiplier] = useState<number>(2.2);
  const [importing, setImporting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Tự động điền link của tab web đang xem vào thanh URL để người dùng dễ kiểm soát
  React.useEffect(() => {
    if (currentUrl && (!inputUrl || inputUrl.startsWith("http"))) {
      setInputUrl(currentUrl);
    }
  }, [currentUrl]);

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

    const platform = product.sourcePlatform || "1688";
    const normalized: Normalized1688Product = {
      sourcePlatform: platform,
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
      variants: variants.map(v => {
        const skuItem = product.skuMap
          ? (product.skuMap[v.sourceSkuId] || Object.values(product.skuMap).find(item => item.skuId === v.sourceSkuId || item.specId === v.sourceSkuId))
          : undefined;
        const priceCNY = skuItem?.priceCNY && skuItem.priceCNY > 0
          ? skuItem.priceCNY
          : (v.costPriceVND && v.costPriceVND > 0 ? Math.round((v.costPriceVND / 3800) * 10) / 10 : product.prices.minPriceCNY);

        return {
          sourceSkuId: v.sourceSkuId,
          colorCN: v.colorName,
          sizeCN: v.sizeName,
          colorVI: v.colorName,
          sizeVI: v.sizeName,
          priceCNY: priceCNY > 0 ? priceCNY : product.prices.minPriceCNY,
          stock: v.stockQuantity,
          imageUrl: v.imageUrl
        };
      }),
      description: {
        images: product.descriptionImages || []
      },
      rawSnapshot: product
    };

    try {
      const res = await apiFetch("/api/v1/import/single", {
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
      if (res.ok && data.product) {
        const title = targetLanguage === "en" ? (data.product.titleEN || data.product.titleVI) : data.product.titleVI;
        setSuccessMessage(
          autoPublish
            ? `✓ Đã đăng bán thành công: ${title}`
            : `✓ Đã lưu thành công vào DRAFT: ${title}`
        );

        // 1. Lưu bản sao vào chrome.storage.local của Extension
        if (typeof chrome !== "undefined" && chrome.storage?.local) {
          chrome.storage.local.get(["hub1688_persisted_products"], (store) => {
            const list = Array.isArray(store?.hub1688_persisted_products) ? store.hub1688_persisted_products : [];
            const nextList = [data.product, ...list.filter((p: any) => p.id !== data.product.id)];
            chrome.storage.local.set({ hub1688_persisted_products: nextList });
          });
        }

        // 2. Gửi cập nhật trực tiếp tới các tab Admin Hub 1688 đang mở để lưu LocalStorage
        if (typeof chrome !== "undefined" && chrome.tabs) {
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
              if (tab.id && (tab.url?.includes("vercel.app") || tab.url?.includes("localhost:5173") || tab.url?.includes("localhost:3000"))) {
                chrome.scripting?.executeScript({
                  target: { tabId: tab.id },
                  func: (newProd) => {
                    try {
                      const current = JSON.parse(localStorage.getItem("hub1688_persisted_products") || "[]");
                      const updated = [newProd, ...current.filter((p: any) => p.id !== newProd.id)];
                      localStorage.setItem("hub1688_persisted_products", JSON.stringify(updated));
                      window.dispatchEvent(new Event("storage"));
                    } catch {}
                  },
                  args: [data.product]
                }).catch(() => {});
              }
            });
          });
        }
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
        {/* Quick URL Input Bar: Cho phép dán bất kỳ link sản phẩm nào (Macorner, Shopee, Taobao, 1688...) */}
        <div className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-gray-700">
            <span className="flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-orange-500" />
              Dán Link Sản Phẩm (Macorner, 1688, Web...):
            </span>
          </div>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://macorner.co/products/... hoặc link bất kỳ"
              className="flex-1 text-[11px] px-2.5 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 font-mono"
              onKeyDown={(e) => {
                if (e.key === "Enter" && inputUrl) {
                  extractByCustomUrl(inputUrl);
                }
              }}
            />
            <button
              onClick={() => {
                if (inputUrl) extractByCustomUrl(inputUrl);
              }}
              disabled={loading}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs disabled:opacity-50"
            >
              Quét
            </button>
          </div>
        </div>

        {/* Thông báo lỗi / Hướng dẫn nếu chưa nhận diện được */}
        {error && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-900">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
              <span>Lưu ý nhận diện:</span>
            </div>
            <p className="text-[11px] leading-relaxed">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-2 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
            <p className="text-xs font-medium">Đang nhận diện và bóc tách thông số sản phẩm...</p>
          </div>
        ) : !product ? (
          <div className="p-6 bg-white rounded-xl border border-gray-200 text-center space-y-2">
            <p className="text-sm font-semibold text-gray-700">Chưa nhận diện được sản phẩm</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              Vui lòng mở một trang <strong>chi tiết sản phẩm</strong> (ví dụ: macorner.co/products/...) hoặc dán đường dẫn sản phẩm vào ô tìm kiếm bên trên rồi bấm "Quét".
            </p>
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
                onPreview={() => {
                  setAdvancedTab("PREVIEW");
                  setImportMode("ADVANCED");
                }}
                importing={importing}
              />
            ) : (
              <AdvancedImportTabs
                product={product}
                initialTab={advancedTab}
                translationMode={translationMode}
                onTranslationModeChange={setTranslationMode}
                targetLanguage={targetLanguage}
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
