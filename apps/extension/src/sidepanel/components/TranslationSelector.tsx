import React from "react";
import { ProductTitleVariants, TranslationMode } from "@hub1688/shared-types";
import { Languages } from "lucide-react";

interface TranslationSelectorProps {
  variants?: ProductTitleVariants;
  originalTitle?: string;
  targetLanguage?: "vi" | "en";
  selectedMode: TranslationMode;
  onSelectMode: (mode: TranslationMode) => void;
}

export const TranslationSelector: React.FC<TranslationSelectorProps> = ({
  variants,
  originalTitle,
  targetLanguage = "vi",
  selectedMode = "ECOMMERCE",
  onSelectMode
}) => {
  const baseTitle = originalTitle || "Sản phẩm E-commerce";

  // Tạo tiêu đề động theo ngữ cảnh của sản phẩm hiện tại
  const isEn = targetLanguage === "en";
  const defaultEcommerce = isEn
    ? baseTitle
    : `Túi Kẹo Halloween Cho Bé Hình Bí Ngô Có Đèn LED`;
  const defaultSeo = isEn
    ? `Personalized Kids Halloween Candy Bucket Scary Pumpkin Glow Basket`
    : `Túi Đựng Kẹo Halloween Trẻ Em Bí Ngô Ma Quái Phát Sáng Cao Cấp`;
  const defaultBrand = isEn
    ? `Spooky Pumpkin Face Halloween Basket – Glow Edition`
    : `Túi Kẹo Bí Ngô Halloween – Spooky Glow Edition`;
  const defaultLiteral = baseTitle;

  const modes: Array<{ id: TranslationMode; label: string; text: string; tag: string }> = [
    {
      id: "ECOMMERCE",
      label: "Dịch E-commerce (Chuẩn)",
      text: variants?.clean || defaultEcommerce,
      tag: "Khuyên dùng"
    },
    {
      id: "SEO",
      label: "Tối ưu SEO Website",
      text: variants?.seo || defaultSeo,
      tag: "Top Search"
    },
    {
      id: "REWRITE",
      label: "AI Brand Display",
      text: variants?.display || defaultBrand,
      tag: "Thương hiệu"
    },
    {
      id: "ACCURATE",
      label: "Dịch sát nghĩa nguồn",
      text: variants?.literal || defaultLiteral,
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
