import React from "react";
import { Gift, Heart, RotateCcw } from "lucide-react";

export interface StoreOccasionsNavProps {
  activeOccasion: string;
  onSelectOccasion: (occ: string) => void;
  activeRecipient: string;
  onSelectRecipient: (rec: string) => void;
  totalProductsCount: number;
}

export const OCCASIONS_LIST = [
  { id: "all", label: "Tất cả dịp", emoji: "✦" },
  { id: "christmas", label: "Giáng sinh", emoji: "✧" },
  { id: "anniversary", label: "Kỷ niệm", emoji: "♡" },
  { id: "valentines", label: "Tình yêu", emoji: "♥" },
  { id: "mothers-day", label: "Tặng mẹ", emoji: "❀" },
  { id: "fathers-day", label: "Tặng bố", emoji: "⌁" },
  { id: "birthday", label: "Sinh nhật", emoji: "✳" },
  { id: "memorial", label: "Tưởng nhớ", emoji: "⊹" }
];

export const RECIPIENTS_LIST = [
  { id: "all", label: "Mọi người", emoji: "✦" },
  { id: "for-mom", label: "Mẹ", emoji: "♡" },
  { id: "for-dad", label: "Bố", emoji: "◇" },
  { id: "for-besties", label: "Bạn thân", emoji: "✧" },
  { id: "for-couples", label: "Cặp đôi", emoji: "♥" },
  { id: "for-pet-lovers", label: "Yêu thú cưng", emoji: "•" },
  { id: "for-grandparents", label: "Ông bà", emoji: "❀" }
];

export const StoreOccasionsNav: React.FC<StoreOccasionsNavProps> = ({ activeOccasion, onSelectOccasion, activeRecipient, onSelectRecipient, totalProductsCount }) => {
  const isFiltering = activeOccasion !== "all" || activeRecipient !== "all";
  const reset = () => { onSelectOccasion("all"); onSelectRecipient("all"); };
  const optionClass = (active: boolean) => `mc-focus-ring inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors active:scale-[.98] ${active ? "border-[var(--mc-color-surface-base)] bg-[var(--mc-color-surface-base)] text-white" : "border-[var(--mc-color-border-default)]/15 bg-[var(--mc-color-surface-canvas)] text-[var(--mc-color-text-secondary)] hover:border-[var(--mc-color-accent)]/50 hover:text-[var(--mc-color-accent-strong)]"}`;

  return (
    <section id="store-occasions-section" className="border-b border-[var(--mc-color-border-default)]/12 bg-[var(--mc-color-surface-strong)]" aria-label="Bộ lọc quà tặng">
      <div className="mc-content-width mx-auto px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="mc-eyebrow">Tìm đúng món quà</p>
              <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[var(--mc-color-text-primary)]">Chọn theo dịp hoặc người nhận</h2>
            </div>
            <span className="hidden text-xs text-[var(--mc-color-text-secondary)] sm:block">{totalProductsCount} thiết kế đang có sẵn</span>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex w-24 shrink-0 items-center gap-1.5 pt-2 text-xs font-bold text-[var(--mc-color-text-primary)]"><Gift className="h-4 w-4 text-[var(--mc-color-accent)]" aria-hidden="true" /><span>Dịp tặng</span></div>
            <div className="mc-no-scrollbar flex min-w-0 gap-2 overflow-x-auto pb-1">{OCCASIONS_LIST.map((occasion) => { const active = activeOccasion === occasion.id; return <button key={occasion.id} type="button" aria-pressed={active} onClick={() => onSelectOccasion(occasion.id)} className={optionClass(active)}><span aria-hidden="true">{occasion.emoji}</span>{occasion.label}</button>; })}</div>
          </div>

          <div className="flex items-start gap-3 border-t border-[var(--mc-color-border-default)]/10 pt-4">
            <div className="flex w-24 shrink-0 items-center gap-1.5 pt-2 text-xs font-bold text-[var(--mc-color-text-primary)]"><Heart className="h-4 w-4 text-[var(--mc-color-accent)]" aria-hidden="true" /><span>Người nhận</span></div>
            <div className="mc-no-scrollbar flex min-w-0 gap-2 overflow-x-auto pb-1">{RECIPIENTS_LIST.map((recipient) => { const active = activeRecipient === recipient.id; return <button key={recipient.id} type="button" aria-pressed={active} onClick={() => onSelectRecipient(recipient.id)} className={optionClass(active)}><span aria-hidden="true">{recipient.emoji}</span>{recipient.label}</button>; })}</div>
          </div>

          {isFiltering && <button type="button" onClick={reset} className="mc-focus-ring inline-flex w-fit items-center gap-1.5 rounded-full border border-[var(--mc-color-accent)]/25 px-3 py-1.5 text-xs font-bold text-[var(--mc-color-accent-strong)] transition-colors hover:bg-[var(--mc-color-accent)]/10"><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />Đặt lại bộ lọc</button>}
        </div>
      </div>
    </section>
  );
};
