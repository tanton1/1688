import React from "react";
import { ProductTitleVariants, TranslationMode } from "@hub1688/shared-types";
import { Languages } from "lucide-react";

interface TranslationSelectorProps {
  variants?: ProductTitleVariants;
  selectedMode: TranslationMode;
  onSelectMode: (mode: TranslationMode) => void;
}

export const TranslationSelector: React.FC<TranslationSelectorProps> = ({
  variants,
  selectedMode,
  onSelectMode
}) => {
  const modes: Array<{ id: TranslationMode; label: string; text?: string; tag: string }> = [
    {
      id: "ECOMMERCE",
      label: "Dịch E-commerce (Chuẩn)",
      text: variants?.clean || "Quần Legging Nữ Cạp Cao Nhanh Khô Thoáng Khí",
      tag: "Khuyên dùng"
    },
    {
      id: "SEO",
      label: "Tối ưu SEO Website",
      text: variants?.seo || "Quần Legging Nữ Cạp Cao Co Giãn Nhanh Khô Tập Gym Yoga Mẫu Mới",
      tag: "Top Search"
    },
    {
      id: "REWRITE",
      label: "AI Brand Display",
      text: variants?.display || "Legging Nữ Cạp Cao – SculptFit Training Series",
      tag: "Thương hiệu"
    },
    {
      id: "ACCURATE",
      label: "Dịch sát nghĩa 1688",
      text: variants?.literal || "Quần tập yoga nữ mùa hè mẫu mới cạp cao co giãn nhanh khô",
      tag: "Gốc"
    }
  ];

  return (
    <div className="space-y-2.5">
      <div className="flex items-center space-x-1.5 text-xs text-gray-700 font-bold uppercase tracking-wider">
        <Languages className="w-3.5 h-3.5 text-orange-600" />
        <span>Chọn tiêu đề sản phẩm AI</span>
      </div>

      <div className="space-y-2">
        {modes.map((m) => (
          <div
            key={m.id}
            onClick={() => onSelectMode(m.id)}
            className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
              selectedMode === m.id
                ? "border-orange-500 bg-orange-50/50 shadow-sm"
                : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-gray-900">{m.label}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                {m.tag}
              </span>
            </div>
            <p className="text-gray-700 leading-snug">{m.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
