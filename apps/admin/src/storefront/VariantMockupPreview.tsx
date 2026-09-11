import React, { useMemo } from "react";
import { WebProduct, WebProductVariant } from "@hub1688/shared-types";
import { Layers, Palette } from "lucide-react";

interface VariantMockupPreviewProps {
  product: WebProduct;
  variant?: WebProductVariant;
  className?: string;
}

type VariantVisual = {
  type: "DESIGN" | "COLOR" | "PLAIN";
  imageUrl?: string;
  colorHex?: string;
  label: string;
};

const MOCKUP_VISUAL_TYPE_KEY = "__mockupVisualType";
const MOCKUP_COLOR_HEX_KEY = "__mockupColorHex";

const COLOR_ALIASES: Array<[RegExp, string]> = [
  [/đen|black|黑|黑色/i, "#1f2937"],
  [/trắng|white|白|白色/i, "#f8fafc"],
  [/đỏ|red|红|红色/i, "#dc2626"],
  [/cam|orange|橙/i, "#f97316"],
  [/vàng|yellow|gold|黄|金/i, "#f5c451"],
  [/xanh lá|green|绿/i, "#22c55e"],
  [/xanh dương|blue|navy|蓝/i, "#2563eb"],
  [/xanh da trời|sky/i, "#38bdf8"],
  [/tím|purple|violet|紫/i, "#8b5cf6"],
  [/hồng|pink|rose|粉/i, "#f472b6"],
  [/nâu|brown|咖|棕/i, "#a16207"],
  [/xám|gray|grey|灰/i, "#94a3b8"],
  [/be|kem|cream|beige/i, "#e7d5b3"
  ]
];

const normalizeUrl = (value?: string): string => (value || "").split("?")[0].replace(/\/$/, "");

function findColorHex(value: string): string | undefined {
  const explicitHex = value.match(/#[0-9a-f]{6}\b/i)?.[0];
  if (explicitHex) return explicitHex;
  return COLOR_ALIASES.find(([pattern]) => pattern.test(value))?.[1];
}

function getVariantVisual(product: WebProduct, variant?: WebProductVariant): VariantVisual {
  const label = variant
    ? ([variant.colorName, variant.sizeName].filter(Boolean).join(" - ") || "Phân loại mặc định")
    : "Chọn biến thể để xem design / màu";
  if (!variant) return { type: "PLAIN", label };

  const explicitConfig = product.seo?.variantMockupVisuals?.[variant.sourceSkuId];
  const explicitType = explicitConfig?.type || variant.specDetails?.[MOCKUP_VISUAL_TYPE_KEY]?.toUpperCase();
  const variantImage = normalizeUrl(variant.imageUrl);
  const nonDesignUrls = new Set([
    normalizeUrl(product.primaryImage),
    normalizeUrl(product.customizerMockupTemplateUrl)
  ].filter(Boolean));
  const hasDistinctVariantImage = Boolean(variant.imageUrl && !nonDesignUrls.has(variantImage));

  if (explicitType === "DESIGN") return { type: "DESIGN", imageUrl: variant.imageUrl, label };
  if (explicitType === "PLAIN") return { type: "PLAIN", label };

  const colorText = [variant.colorName, variant.colorNameEN, ...Object.entries(variant.specDetails || {})
    .filter(([key]) => /color|màu|颜色/i.test(key))
    .map(([, value]) => value)].filter(Boolean).join(" ");
  const explicitColorHex = explicitConfig?.colorHex || variant.specDetails?.[MOCKUP_COLOR_HEX_KEY];
  if (explicitType === "COLOR") {
    return { type: "COLOR", colorHex: findColorHex(`${explicitColorHex || ""} ${colorText}`) || "#f8fafc", label };
  }

  const colorHex = findColorHex(colorText);
  if (colorHex) return { type: "COLOR", colorHex, label };

  if (hasDistinctVariantImage) {
    return { type: "DESIGN", imageUrl: variant.imageUrl, label };
  }
  return { type: "PLAIN", label };
}

export const VariantMockupPreview: React.FC<VariantMockupPreviewProps> = ({ product, variant, className = "" }) => {
  const visual = useMemo(() => getVariantVisual(product, variant), [product, variant]);
  const configuredBase = product.customizerMockupTemplateUrl || undefined;
  const isCupLike = /ly|cốc|bình|tumbler|mug|chai/i.test(`${product.categoryName} ${product.titleVI}`);
  const isWearable = /áo|shirt|hoodie|sweatshirt|thời trang/i.test(`${product.categoryName} ${product.titleVI}`);
  const silhouetteClass = isCupLike
    ? "h-[72%] w-[42%] rounded-[22%_22%_14%_14%]"
    : isWearable
      ? "h-[70%] w-[62%] rounded-[20%_20%_12%_12%]"
      : "h-[66%] w-[70%] rounded-[11%]";

  return (
    <div className={`relative isolate flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_30%_18%,#ffffff_0,#f8fafc_45%,#e2e8f0_100%)] ${className}`}>
      {configuredBase ? (
        <img src={configuredBase} alt="Mockup nền trơn" className="absolute inset-0 h-full w-full object-contain p-3" />
      ) : (
        <div className={`relative z-10 flex items-center justify-center border border-slate-200 bg-white shadow-[0_24px_55px_rgba(15,23,42,0.22)] ${silhouetteClass}`}>
          <div className="absolute inset-x-[12%] top-[14%] flex h-[58%] items-center justify-center overflow-hidden rounded-[8%] border border-slate-200/80 bg-slate-50">
            {visual.type === "COLOR" && <div className="absolute inset-0 opacity-90" style={{ backgroundColor: visual.colorHex }} />}
            {visual.type === "DESIGN" && visual.imageUrl && <img src={visual.imageUrl} alt={`Design ${visual.label}`} className="absolute inset-0 h-full w-full object-contain mix-blend-multiply" />}
            {visual.type === "DESIGN" && !visual.imageUrl && <span className="px-3 text-center text-[10px] font-semibold text-amber-600">Chưa gắn ảnh design cho SKU</span>}
            {visual.type === "PLAIN" && <span className="px-3 text-center text-[10px] font-semibold text-slate-400">Vùng hiển thị thiết kế</span>}
          </div>
          {isCupLike && <div className="absolute -right-[18%] top-[17%] h-[31%] w-[28%] rounded-r-full border-4 border-slate-200 bg-transparent" />}
          {isWearable && <div className="absolute inset-x-[20%] bottom-[8%] h-2 rounded-full bg-slate-200/80" />}
        </div>
      )}

      {configuredBase && (
        <div className="absolute inset-[22%_16%_20%] z-10 overflow-hidden rounded-[8%] border border-white/70 bg-white/5 shadow-inner">
          {visual.type === "COLOR" && <div className="absolute inset-0 opacity-65 mix-blend-multiply" style={{ backgroundColor: visual.colorHex }} />}
          {visual.type === "DESIGN" && visual.imageUrl && <img src={visual.imageUrl} alt={`Design ${visual.label}`} className="absolute inset-0 h-full w-full object-contain mix-blend-multiply" />}
          {visual.type === "DESIGN" && !visual.imageUrl && <span className="absolute inset-0 grid place-items-center px-3 text-center text-[10px] font-semibold text-amber-700">Chưa gắn ảnh design cho SKU</span>}
          {visual.type === "PLAIN" && <span className="absolute inset-0 grid place-items-center px-3 text-center text-[10px] font-semibold text-slate-500">Vùng hiển thị thiết kế</span>}
        </div>
      )}

      <div className="absolute left-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/90 px-2.5 py-1 text-[10px] font-bold text-slate-700 shadow-sm backdrop-blur">
        {visual.type === "DESIGN" ? <Layers className="h-3.5 w-3.5 text-orange-600" /> : <Palette className="h-3.5 w-3.5 text-orange-600" />}
        {visual.type === "DESIGN" ? "Design biến thể" : visual.type === "COLOR" ? "Màu biến thể" : "Mockup nền trơn"}
      </div>
      <div className="absolute bottom-3 left-3 right-3 z-20 truncate rounded-lg bg-slate-950/70 px-2.5 py-1.5 text-center text-[10px] font-bold text-white backdrop-blur">
        {visual.label}
      </div>
    </div>
  );
};

export { getVariantVisual, MOCKUP_VISUAL_TYPE_KEY, MOCKUP_COLOR_HEX_KEY };
