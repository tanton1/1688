import React, { useState } from "react";
import { Check, ArrowRight, Eye, ShoppingCart, Loader2 } from "lucide-react";
import { Raw1688Product } from "@hub1688/shared-types";

interface QuickImportCardProps {
  product: Raw1688Product;
  onImport: (settings: any) => Promise<void>;
  onPreview: () => void;
  importing: boolean;
}

export const QuickImportCard: React.FC<QuickImportCardProps> = ({
  product,
  onImport,
  onPreview,
  importing
}) => {
  const [options, setOptions] = useState({
    translate: true,
    seoOptimize: true,
    copyImages: true,
    copyDescription: true,
    copySku: true,
    autoPricing: true
  });

  const uniqueSkuIds = new Set(Object.values(product.skuMap || {}).map(item => item.skuId));
  const skuCount = uniqueSkuIds.size;
  const uniqueSkuItems = [...new Map(Object.values(product.skuMap || {}).map(item => [item.skuId, item])).values()];
  const variantImages = uniqueSkuItems.map(item => item.imageUrl).filter((url): url is string => Boolean(url));
  const totalStock = [...uniqueSkuIds].reduce((sum, skuId) => {
    const item = Object.values(product.skuMap || {}).find(candidate => candidate.skuId === skuId);
    return sum + (item?.stock || 0);
  }, 0);

  const handleToggle = (key: keyof typeof options) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Product snapshot info */}
      <div className="p-4 flex space-x-3 bg-gray-50 border-b border-gray-100">
        <img
          src={product.images[0]}
          alt="1688 thumbnail"
          className="w-20 h-20 object-cover rounded-lg border border-gray-200 shadow-sm flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-snug">
            {product.title}
          </p>
          <div className="mt-1.5 flex items-baseline space-x-2">
            <span className="text-base font-black text-orange-600">
              ¥{product.prices.minPriceCNY.toFixed(2)} – ¥{product.prices.maxPriceCNY.toFixed(2)}
            </span>
          </div>
          <div className="mt-1 flex items-center space-x-3 text-[11px] text-gray-500 font-medium">
            <span>{skuCount} SKU</span>
            <span>•</span>
            <span>Ảnh var: {variantImages.length}/{skuCount}</span>
            <span>•</span>
            <span>Tồn: {totalStock.toLocaleString()}</span>
            <span>•</span>
            <span>MOQ: {product.moq}</span>
          </div>
        </div>
      </div>

      {variantImages.length > 0 && (
        <div className="flex items-center gap-1.5 border-b border-gray-100 bg-white px-4 py-2">
          <span className="mr-1 text-[10px] font-semibold text-gray-500">Ảnh biến thể</span>
          {variantImages.slice(0, 8).map((imageUrl, index) => (
            <img key={`${imageUrl}-${index}`} src={imageUrl} alt="" className="h-7 w-7 rounded border border-gray-200 object-cover" />
          ))}
          {variantImages.length > 8 && <span className="text-[10px] text-gray-500">+{variantImages.length - 8}</span>}
        </div>
      )}

      {/* Sync configuration checkboxes */}
      <div className="p-4 space-y-2.5">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
          Cấu hình đồng bộ nhanh & Tối ưu SEO
        </h3>

        {[
          { key: "translate", label: "Dịch song ngữ (VI/EN) chuẩn E-commerce" },
          { key: "seoOptimize", label: "Tối ưu từ khóa SEO, Thẻ ALT ảnh & FAQ Schema" },
          { key: "copyImages", label: "Đồng bộ Album ảnh sắc nét & Video HD" },
          { key: "copyDescription", label: "Tái cấu trúc mô tả H1-H3 & JSON-LD" },
          { key: "copySku", label: "Tổ hợp ma trận biến thể SKU" },
          { key: "autoPricing", label: "Tự tính giá bán lẻ & thang giá sỉ bậc thang" }
        ].map((item) => (
          <label
            key={item.key}
            onClick={() => handleToggle(item.key as any)}
            className="flex items-center space-x-2.5 text-xs text-gray-700 cursor-pointer select-none group"
          >
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                options[item.key as keyof typeof options]
                  ? "bg-orange-600 border-orange-600 text-white"
                  : "border-gray-300 group-hover:border-orange-500"
              }`}
            >
              {options[item.key as keyof typeof options] && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
            <span className="font-medium">{item.label}</span>
          </label>
        ))}
      </div>

      {/* Action buttons */}
      <div className="p-4 pt-1 bg-gray-50 border-t border-gray-100 flex flex-col gap-2">
        <button
          onClick={() => onImport(options)}
          disabled={importing}
          className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold text-sm py-2.5 px-4 rounded-lg shadow-md shadow-orange-500/20 flex items-center justify-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {importing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang đồng bộ về web...</span>
            </>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4" />
              <span>ĐỒNG BỘ VỀ WEB (1-CLICK)</span>
            </>
          )}
        </button>

        <button
          onClick={onPreview}
          disabled={importing}
          className="w-full bg-white hover:bg-gray-100 text-gray-700 font-semibold text-xs py-2 px-4 rounded-lg border border-gray-300 flex items-center justify-center space-x-1.5 transition-colors"
        >
          <Eye className="w-3.5 h-3.5 text-gray-500" />
          <span>XEM TRƯỚC SẢN PHẨM</span>
        </button>
      </div>
    </div>
  );
};
