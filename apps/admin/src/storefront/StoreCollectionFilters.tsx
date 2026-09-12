import React from "react";
import { Check, Filter, X } from "lucide-react";
import { useAccessibleDialog } from "../hooks/useAccessibleDialog";

export interface StoreCollectionFiltersProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  activeOccasion: string;
  onOccasionChange: (value: string) => void;
  activeRecipient: string;
  onRecipientChange: (value: string) => void;
  personalizedOnly: boolean;
  onPersonalizedChange: (value: boolean) => void;
  priceBand: "ALL" | "UNDER_300K" | "UNDER_500K" | "OVER_500K";
  onPriceBandChange: (value: StoreCollectionFiltersProps["priceBand"]) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const occasionOptions = [
  ["all", "Tất cả dịp"],
  ["christmas", "Giáng sinh"],
  ["birthday", "Sinh nhật"],
  ["anniversary", "Kỷ niệm"],
  ["memorial", "Tưởng niệm"],
  ["mothers-day", "Tặng mẹ"],
  ["fathers-day", "Tặng bố"]
] as const;

const recipientOptions = [
  ["all", "Tất cả đối tượng"],
  ["for-mom", "Cho mẹ"],
  ["for-dad", "Cho bố"],
  ["for-couples", "Cho cặp đôi"],
  ["for-besties", "Cho bạn thân"],
  ["for-pet-lovers", "Cho người yêu thú cưng"],
  ["for-grandparents", "Cho ông bà"]
] as const;

const priceOptions = [
  ["ALL", "Mọi mức giá"],
  ["UNDER_300K", "Dưới 300.000đ"],
  ["UNDER_500K", "Dưới 500.000đ"],
  ["OVER_500K", "Từ 500.000đ"]
] as const;

const optionButton = (selected: boolean) => `mc-focus-ring flex min-h-10 w-full items-center justify-between rounded-xl px-3 text-left text-xs font-semibold transition-colors ${
  selected
    ? "bg-[var(--mc-color-surface-base)] text-white"
    : "text-[var(--mc-color-text-primary)] hover:bg-[var(--mc-color-surface-subtle)]"
}`;

export const StoreCollectionFilters: React.FC<StoreCollectionFiltersProps> = (props) => {
  const mobileDialogRef = useAccessibleDialog<HTMLElement>(props.mobileOpen, props.onMobileClose);
  const content = (
    <div className="space-y-5">
      <FilterSection title="Bộ sưu tập">
        <FilterButton selected={props.selectedCategory === "ALL"} onClick={() => props.onCategoryChange("ALL")}>Tất cả sản phẩm</FilterButton>
        {props.categories.map(category => (
          <FilterButton key={category} selected={props.selectedCategory === category} onClick={() => props.onCategoryChange(category)}>
            {category}
          </FilterButton>
        ))}
      </FilterSection>

      <FilterSection title="Khoảng giá">
        {priceOptions.map(([value, label]) => (
          <FilterButton key={value} selected={props.priceBand === value} onClick={() => props.onPriceBandChange(value)}>{label}</FilterButton>
        ))}
      </FilterSection>

      <FilterSection title="Theo dịp tặng">
        {occasionOptions.map(([value, label]) => (
          <FilterButton key={value} selected={props.activeOccasion === value} onClick={() => props.onOccasionChange(value)}>{label}</FilterButton>
        ))}
      </FilterSection>

      <FilterSection title="Theo đối tượng">
        {recipientOptions.map(([value, label]) => (
          <FilterButton key={value} selected={props.activeRecipient === value} onClick={() => props.onRecipientChange(value)}>{label}</FilterButton>
        ))}
      </FilterSection>

      <label className="mc-focus-ring flex min-h-11 cursor-pointer items-center justify-between rounded-xl border border-[var(--mc-color-border-default)]/15 bg-[var(--mc-color-surface-strong)] px-3 text-xs font-semibold text-[var(--mc-color-text-primary)]">
        <span className="flex items-center gap-2"><span className={`grid h-4 w-4 place-items-center rounded border ${props.personalizedOnly ? "border-[var(--mc-color-accent)] bg-[var(--mc-color-accent)] text-white" : "border-[var(--mc-color-border-default)]/35"}`}>{props.personalizedOnly && <Check className="h-3 w-3" aria-hidden="true" />}</span>Có thể cá nhân hóa</span>
        <input type="checkbox" checked={props.personalizedOnly} onChange={event => props.onPersonalizedChange(event.target.checked)} className="sr-only" />
      </label>
    </div>
  );

  return (
    <>
      <aside className="hidden w-56 shrink-0 rounded-2xl border border-[var(--mc-color-border-default)]/15 bg-[var(--mc-color-surface-strong)] p-4 lg:block" aria-label="Bộ lọc sản phẩm">
        <div className="mb-4 flex items-center gap-2 border-b border-[var(--mc-color-border-default)]/10 pb-3 text-sm font-black text-[var(--mc-color-text-primary)]"><Filter className="h-4 w-4 text-[var(--mc-color-accent)]" aria-hidden="true" />Bộ lọc</div>
        {content}
      </aside>

      {props.mobileOpen && (
        <div className="fixed inset-0 z-50 bg-[var(--mc-color-surface-base)]/60 lg:hidden" role="presentation">
          <button type="button" className="absolute inset-0 h-full w-full cursor-default" aria-label="Đóng bộ lọc" onClick={props.onMobileClose} />
          <section ref={mobileDialogRef} tabIndex={-1} className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-3xl bg-[var(--mc-color-surface-strong)] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-2xl" role="dialog" aria-modal="true" aria-label="Bộ lọc sản phẩm">
            <div className="mb-5 flex items-center justify-between"><div className="flex items-center gap-2 text-base font-black"><Filter className="h-4 w-4 text-[var(--mc-color-accent)]" aria-hidden="true" />Bộ lọc</div><button type="button" onClick={props.onMobileClose} className="mc-focus-ring grid h-11 w-11 place-items-center rounded-full hover:bg-[var(--mc-color-surface-subtle)]" aria-label="Đóng bộ lọc"><X className="h-5 w-5" /></button></div>
            {content}
            <button type="button" onClick={props.onMobileClose} className="mc-focus-ring mt-6 min-h-12 w-full rounded-xl bg-[var(--mc-color-surface-base)] text-sm font-black text-white">Xem sản phẩm</button>
          </section>
        </div>
      )}
    </>
  );
};

const FilterSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-1.5">
    <h3 className="px-2 text-[11px] font-black uppercase tracking-[0.08em] text-[var(--mc-color-text-secondary)]">{title}</h3>
    <div className="space-y-1">{children}</div>
  </section>
);

const FilterButton: React.FC<{ selected: boolean; onClick: () => void; children: React.ReactNode }> = ({ selected, onClick, children }) => (
  <button type="button" aria-pressed={selected} onClick={onClick} className={optionButton(selected)}>
    <span className="truncate">{children}</span>
    {selected && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
  </button>
);
