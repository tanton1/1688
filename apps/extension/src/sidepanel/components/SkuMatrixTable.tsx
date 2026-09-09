import React from "react";
import { WebProductVariant } from "@hub1688/shared-types";

interface SkuMatrixTableProps {
  variants: WebProductVariant[];
  onToggleVariant: (sourceSkuId: string) => void;
  onPriceChange: (sourceSkuId: string, newPrice: number) => void;
}

export const SkuMatrixTable: React.FC<SkuMatrixTableProps> = ({
  variants,
  onToggleVariant,
  onPriceChange
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="font-semibold text-gray-700">Ma trận biến thể ({variants.length} SKU)</span>
        <span>Mapped with SourceSkuId</span>
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
            {variants.map((v) => (
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
                  <div>{v.colorName || "Mặc định"}</div>
                  <div className="text-[10px] text-gray-400 font-mono">Size {v.sizeName || "Tiêu chuẩn"}</div>
                </td>
                <td className="p-2 text-gray-500">
                  {v.costPriceVND.toLocaleString("vi-VN")}đ
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    value={v.sellingPriceVND}
                    onChange={(e) => onPriceChange(v.sourceSkuId, parseInt(e.target.value) || 0)}
                    disabled={!v.selectedForSale}
                    className="w-20 px-1.5 py-0.5 border border-gray-200 rounded font-semibold text-orange-600 focus:outline-none focus:border-orange-500"
                  />
                </td>
                <td className="p-2 text-right font-medium text-gray-600">
                  {v.stockQuantity}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
