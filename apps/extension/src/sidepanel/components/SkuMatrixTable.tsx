import React from "react";
import { WebProductVariant } from "@hub1688/shared-types";

interface SkuMatrixTableProps {
  variants: WebProductVariant[];
  onToggleVariant: (sourceSkuId: string) => void;
  onPriceChange: (sourceSkuId: string, newPrice: number) => void;
}

export const SkuMatrixTable: React.FC<SkuMatrixTableProps> = ({
  variants = [],
  onToggleVariant,
  onPriceChange
}) => {
  if (!variants || variants.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center text-xs text-gray-500">
        Sản phẩm đơn (1 phân loại tiêu chuẩn). Bạn có thể bấm Đăng bán hoặc Lưu Draft trực tiếp.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="font-semibold text-gray-700">Ma trận biến thể ({variants.length} SKU)</span>
        <span>{variants.filter(v => v.selectedForSale).length} được chọn</span>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
        <table className="w-full text-[11px] text-left">
          <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 sticky top-0">
            <tr>
              <th className="p-2 w-6"></th>
              <th className="p-2">Phân loại</th>
              <th className="p-2">Giá vốn</th>
              <th className="p-2">Giá bán</th>
              <th className="p-2 text-right">Tồn</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {variants.map((v) => {
              const safeCost = typeof v.costPriceVND === "number" && !isNaN(v.costPriceVND) ? v.costPriceVND : 120000;
              const safeSelling = typeof v.sellingPriceVND === "number" && !isNaN(v.sellingPriceVND) ? v.sellingPriceVND : 250000;

              return (
                <tr
                  key={v.sourceSkuId}
                  className={`hover:bg-gray-50 transition-colors ${
                    !v.selectedForSale ? "opacity-40 bg-gray-50" : ""
                  }`}
                >
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={v.selectedForSale}
                      onChange={() => onToggleVariant(v.sourceSkuId)}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                  </td>
                  <td className="p-2 font-medium text-gray-800">
                    <div className="flex items-center gap-1.5">
                      {v.imageUrl && (
                        <img
                          src={v.imageUrl}
                          alt=""
                          className="w-6 h-6 object-cover rounded border border-gray-200 flex-shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="truncate max-w-[140px]" title={v.colorName || "Mặc định"}>
                          {v.colorName || "Mặc định"}
                        </div>
                        {v.sizeName && v.sizeName !== "Tiêu chuẩn" && v.sizeName !== "" && (
                          <div className="text-[10px] text-gray-500 font-mono truncate max-w-[140px]" title={v.sizeName}>
                            {/^(?:[x|2-5]?s|[x|2-5]?l|m|freesize)$/i.test(v.sizeName.trim())
                              ? `Size ${v.sizeName}`
                              : v.sizeName}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-2 text-gray-500 font-mono">
                    {safeCost.toLocaleString("vi-VN")}đ
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      value={safeSelling}
                      onChange={(e) => onPriceChange(v.sourceSkuId, parseInt(e.target.value) || 0)}
                      disabled={!v.selectedForSale}
                      className="w-20 px-1.5 py-0.5 border border-gray-200 rounded font-semibold text-orange-600 focus:outline-none focus:border-orange-500 font-mono text-[11px]"
                    />
                  </td>
                  <td className="p-2 text-right font-medium text-gray-600">
                    {v.stockQuantity ?? 100}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
