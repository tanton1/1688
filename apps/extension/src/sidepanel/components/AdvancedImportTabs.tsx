import React, { useState } from "react";
import { TranslationMode, WebProductVariant, PricingBreakdown } from "@hub1688/shared-types";
import { TranslationSelector } from "./TranslationSelector.js";
import { SkuMatrixTable } from "./SkuMatrixTable.js";
import { PricingSimulator } from "./PricingSimulator.js";
import { QualityScoreBadge } from "./QualityScoreBadge.js";
import { Layers, CheckCircle } from "lucide-react";

interface AdvancedImportTabsProps {
  variants: WebProductVariant[];
  pricingBreakdown: PricingBreakdown;
  multiplier: number;
  onMultiplierChange: (m: number) => void;
  selectedMode: TranslationMode;
  onSelectMode: (mode: TranslationMode) => void;
  onToggleVariant: (id: string) => void;
  onPriceChange: (id: string, price: number) => void;
  onPublish: (autoPublish: boolean) => void;
  importing: boolean;
}

export const AdvancedImportTabs: React.FC<AdvancedImportTabsProps> = ({
  variants,
  pricingBreakdown,
  multiplier,
  onMultiplierChange,
  selectedMode,
  onSelectMode,
  onToggleVariant,
  onPriceChange,
  onPublish,
  importing
}) => {
  const [activeTab, setActiveTab] = useState<"TRANSLATION" | "SKU" | "PRICING">("TRANSLATION");

  return (
    <div className="space-y-3">
      <QualityScoreBadge />

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 bg-white rounded-lg p-1 space-x-1 shadow-sm">
        <button
          onClick={() => setActiveTab("TRANSLATION")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
            activeTab === "TRANSLATION"
              ? "bg-orange-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Nội dung AI
        </button>
        <button
          onClick={() => setActiveTab("SKU")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
            activeTab === "SKU"
              ? "bg-orange-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Ma trận SKU
        </button>
        <button
          onClick={() => setActiveTab("PRICING")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
            activeTab === "PRICING"
              ? "bg-orange-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Định giá
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "TRANSLATION" && (
        <TranslationSelector
          selectedMode={selectedMode}
          onSelectMode={onSelectMode}
        />
      )}

      {activeTab === "SKU" && (
        <SkuMatrixTable
          variants={variants}
          onToggleVariant={onToggleVariant}
          onPriceChange={onPriceChange}
        />
      )}

      {activeTab === "PRICING" && (
        <PricingSimulator
          breakdown={pricingBreakdown}
          multiplier={multiplier}
          onMultiplierChange={onMultiplierChange}
        />
      )}

      {/* Publish Actions */}
      <div className="pt-2 flex gap-2">
        <button
          onClick={() => onPublish(false)}
          disabled={importing}
          className="flex-1 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-bold text-xs py-2.5 rounded-lg shadow-sm"
        >
          LƯU VÀO DRAFT
        </button>
        <button
          onClick={() => onPublish(true)}
          disabled={importing}
          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs py-2.5 rounded-lg shadow-md shadow-orange-500/20"
        >
          ĐĂNG BÁN NGAY
        </button>
      </div>
    </div>
  );
};
