import React from "react";
import { PricingBreakdown } from "@hub1688/shared-types";
import { DollarSign, AlertCircle } from "lucide-react";

interface PricingSimulatorProps {
  breakdown: PricingBreakdown;
  multiplier: number;
  onMultiplierChange: (val: number) => void;
}

export const PricingSimulator: React.FC<PricingSimulatorProps> = ({
  breakdown,
  multiplier = 2.2,
  onMultiplierChange
}) => {
  const marginPercent = typeof breakdown?.marginPercent === "number" && !isNaN(breakdown.marginPercent) ? breakdown.marginPercent : 48;
  const costCNY = typeof breakdown?.costCNY === "number" && !isNaN(breakdown.costCNY) ? breakdown.costCNY : 30;
  const costVND = typeof breakdown?.costVND === "number" && !isNaN(breakdown.costVND) ? breakdown.costVND : 114000;
  const chinaShipVND = typeof breakdown?.chinaShipVND === "number" && !isNaN(breakdown.chinaShipVND) ? breakdown.chinaShipVND : 12000;
  const intlShipVND = typeof breakdown?.intlShipVND === "number" && !isNaN(breakdown.intlShipVND) ? breakdown.intlShipVND : 15000;
  const totalCostVND = typeof breakdown?.totalCostVND === "number" && !isNaN(breakdown.totalCostVND) ? breakdown.totalCostVND : 141000;
  const grossProfitVND = typeof breakdown?.grossProfitVND === "number" && !isNaN(breakdown.grossProfitVND) ? breakdown.grossProfitVND : 115000;
  const finalSellingPriceVND = typeof breakdown?.finalSellingPriceVND === "number" && !isNaN(breakdown.finalSellingPriceVND) ? breakdown.finalSellingPriceVND : 256000;

  return (
    <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          <span>Pricing Engine Simulator</span>
        </div>
        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
          Biên lãi: {marginPercent}%
        </span>
      </div>

      {/* Breakdown stats */}
      <div className="grid grid-cols-2 gap-2 text-[11px] bg-gray-50 p-2.5 rounded-lg border border-gray-100">
        <div>
          <span className="text-gray-500">Giá gốc nguồn:</span>
          <div className="font-semibold text-gray-800">¥{costCNY.toFixed(2)} ({costVND.toLocaleString("vi-VN")}đ)</div>
        </div>
        <div>
          <span className="text-gray-500">Phí VC (Nội địa + QT):</span>
          <div className="font-semibold text-gray-800">{(chinaShipVND + intlShipVND).toLocaleString("vi-VN")}đ</div>
        </div>
        <div>
          <span className="text-gray-500">Tổng giá vốn:</span>
          <div className="font-semibold text-gray-900">{totalCostVND.toLocaleString("vi-VN")}đ</div>
        </div>
        <div>
          <span className="text-gray-500">Lợi nhuận gộp:</span>
          <div className="font-bold text-emerald-600">+{grossProfitVND.toLocaleString("vi-VN")}đ</div>
        </div>
      </div>

      {/* Multiplier control */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-gray-600 font-medium">Hệ số nhân Margin (Multiplier):</span>
          <span className="font-bold text-orange-600">x{(multiplier || 2.2).toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="1.2"
          max="3.5"
          step="0.1"
          value={multiplier || 2.2}
          onChange={(e) => onMultiplierChange(parseFloat(e.target.value) || 2.2)}
          className="w-full accent-orange-600 cursor-pointer"
        />
      </div>

      {/* Final selling price */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-xs font-bold text-gray-700">Giá bán lẻ đề xuất (đã làm tròn):</span>
        <span className="text-base font-black text-orange-600">
          {finalSellingPriceVND.toLocaleString("vi-VN")}đ
        </span>
      </div>

      {breakdown?.isLowMarginWarning && (
        <div className="flex items-center space-x-1.5 text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Biên lợi nhuận thấp hơn mức an toàn 35%</span>
        </div>
      )}
    </div>
  );
};
