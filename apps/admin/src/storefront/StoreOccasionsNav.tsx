import React from "react";
import { Sparkles, Heart, Gift, Compass } from "lucide-react";

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
  { id: "for-pet-lovers", label: "Người Nuôi Chó Mèo", emoji: "🐾" },
  { id: "for-grandparents", label: "Ông Bà", emoji: "👵" }
];

export const StoreOccasionsNav: React.FC<StoreOccasionsNavProps> = ({
  activeOccasion,
  onSelectOccasion,
  activeRecipient,
  onSelectRecipient,
  totalProductsCount
}) => {
  return (
    <div className="bg-white border-y border-slate-200/80 shadow-xs mb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        {/* Row 1: Filter by Occasions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 shrink-0 uppercase tracking-wider">
            <Gift size={15} className="text-orange-600" />
            <span>Dịp Tặng Quà:</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {OCCASIONS_LIST.map((occ) => {
              const isActive = activeOccasion === occ.id;
              return (
                <button
                  key={occ.id}
                  type="button"
                  onClick={() => onSelectOccasion(occ.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-orange-600 text-white shadow-sm shadow-orange-500/30 ring-2 ring-orange-600/30"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                  }`}
                >
                  <span>{occ.emoji}</span>
                  <span>{occ.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Filter by Recipient */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pt-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 shrink-0 uppercase tracking-wider">
            <Heart size={15} className="text-rose-500" />
            <span>Người Nhận:</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {RECIPIENTS_LIST.map((rec) => {
              const isActive = activeRecipient === rec.id;
              return (
                <button
                  key={rec.id}
                  type="button"
                  onClick={() => onSelectRecipient(rec.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/30"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                  }`}
                >
                  <span>{rec.emoji}</span>
                  <span>{rec.label}</span>
                </button>
              );
            })}

            {(activeOccasion !== "all" || activeRecipient !== "all") && (
              <button
                type="button"
                onClick={() => {
                  onSelectOccasion("all");
                  onSelectRecipient("all");
                }}
                className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 underline px-2 shrink-0 ml-auto"
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
