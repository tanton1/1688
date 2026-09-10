import React from "react";
import { Gift, Heart, Sparkles, RotateCcw } from "lucide-react";

export interface StoreOccasionsNavProps {
  activeOccasion: string;
  onSelectOccasion: (occ: string) => void;
  activeRecipient: string;
  onSelectRecipient: (rec: string) => void;
  totalProductsCount: number;
}

export const OCCASIONS_LIST = [
  { id: "all", label: "Tất Cả Dịp", emoji: "✨" },
  { id: "christmas", label: "Giáng Sinh (Noel)", emoji: "🎄" },
  { id: "anniversary", label: "Kỷ Niệm & Ngày Cưới", emoji: "💍" },
  { id: "valentines", label: "Valentine & Tình Yêu", emoji: "💘" },
  { id: "mothers-day", label: "Ngày Của Mẹ", emoji: "🌸" },
  { id: "fathers-day", label: "Ngày Của Cha", emoji: "👔" },
  { id: "birthday", label: "Sinh Nhật", emoji: "🎂" },
  { id: "memorial", label: "Tưởng Nhớ & Tri Ân", emoji: "🕊️" }
];

export const RECIPIENTS_LIST = [
  { id: "all", label: "Mọi Người", emoji: "🎁" },
  { id: "for-mom", label: "Tặng Mẹ", emoji: "👩" },
  { id: "for-dad", label: "Tặng Bố", emoji: "👨" },
  { id: "for-besties", label: "Bạn Thân (Soul Sisters)", emoji: "👭" },
  { id: "for-couples", label: "Cặp Đôi / Vợ Chồng", emoji: "💑" },
  { id: "for-pet-lovers", label: "Người Yêu Chó Mèo", emoji: "🐾" },
  { id: "for-grandparents", label: "Ông Bà", emoji: "👵" }
];

export const StoreOccasionsNav: React.FC<StoreOccasionsNavProps> = ({
  activeOccasion,
  onSelectOccasion,
  activeRecipient,
  onSelectRecipient,
  totalProductsCount
}) => {
  const isFiltering = activeOccasion !== "all" || activeRecipient !== "all";

  return (
    <div id="store-occasions-section" className="bg-white border-y border-stone-200/80 shadow-xs mb-6 sm:mb-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-3.5 space-y-2.5 sm:space-y-3">
        {/* Row 1: Filter by Occasions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 pb-2.5 border-b border-stone-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 shrink-0 uppercase tracking-wider">
            <Gift size={15} className="text-orange-600" />
            <span>Dịp Tặng Quà:</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
            {OCCASIONS_LIST.map((occ) => {
              const isActive = activeOccasion === occ.id;
              return (
                <button
                  key={occ.id}
                  type="button"
                  onClick={() => onSelectOccasion(occ.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
                    isActive
                      ? "bg-orange-600 text-white shadow-md shadow-orange-600/25 ring-2 ring-orange-600/30"
                      : "bg-stone-100 text-stone-600 hover:bg-orange-50 hover:text-orange-700"
                  }`}
                >
                  <span className="text-sm">{occ.emoji}</span>
                  <span>{occ.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Filter by Recipient */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-1.5 text-xs font-bold text-stone-800 shrink-0 uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <Heart size={15} className="text-rose-500" />
              <span>Người Nhận:</span>
            </div>

            {isFiltering && (
              <button
                type="button"
                onClick={() => {
                  onSelectOccasion("all");
                  onSelectRecipient("all");
                }}
                className="sm:hidden inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 px-2 py-0.5 rounded-full bg-orange-50"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đặt lại</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
            {RECIPIENTS_LIST.map((rec) => {
              const isActive = activeRecipient === rec.id;
              return (
                <button
                  key={rec.id}
                  type="button"
                  onClick={() => onSelectRecipient(rec.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
                    isActive
                      ? "bg-stone-900 text-white shadow-md ring-2 ring-stone-900/30"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900"
                  }`}
                >
                  <span className="text-sm">{rec.emoji}</span>
                  <span>{rec.label}</span>
                </button>
              );
            })}

            {isFiltering && (
              <button
                type="button"
                onClick={() => {
                  onSelectOccasion("all");
                  onSelectRecipient("all");
                }}
                className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 underline px-3 py-1 shrink-0 ml-auto transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại bộ lọc</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
