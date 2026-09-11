import React from "react";
import { StorefrontConfig } from "@hub1688/shared-types";
import { ArrowDown, ArrowUpRight, Check, Sparkles, Truck } from "lucide-react";

interface StoreHeroBannerProps {
  config: StorefrontConfig;
  onExploreClick: () => void;
}

export const StoreHeroBanner: React.FC<StoreHeroBannerProps> = ({ config, onExploreClick }) => {
  return (
    <section className="relative overflow-hidden bg-[var(--mc-color-surface-base)] text-[var(--mc-color-text-tertiary)]" aria-labelledby="store-hero-title">
      <div className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-[var(--mc-color-accent)]/15 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-12 bottom-0 h-96 w-96 rounded-full bg-[var(--mc-color-surface-muted)]/80 blur-3xl" aria-hidden="true" />

      <div className="mc-content-width relative mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/75">
            <Sparkles className="h-3.5 w-3.5 text-[var(--mc-color-accent)]" aria-hidden="true" />
            <span>Macorner · thiết kế theo câu chuyện của bạn</span>
          </div>
          <h1 id="store-hero-title" className="max-w-[13ch] text-4xl font-semibold leading-[1.08] tracking-[-0.055em] text-white sm:text-5xl lg:text-6xl">
            {config.bannerTitle || "Một món quà, một câu chuyện riêng."}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/65 sm:text-lg">
            {config.bannerSubtitle || "Chọn một thiết kế bạn yêu thích, thêm tên và kỷ niệm. Chúng tôi hoàn thiện món quà dành riêng cho người quan trọng."}
          </p>

          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={onExploreClick} className="mc-focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--mc-color-accent)] px-6 text-sm font-bold text-white transition-colors hover:bg-[var(--mc-color-accent-strong)] active:translate-y-px">
              Khám phá bộ sưu tập
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </button>
            <a href="#store-occasions-section" className="mc-focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/25 px-5 text-sm font-semibold text-white transition-colors hover:border-white/70 hover:bg-white/10">
              Tìm theo dịp tặng
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>

          <div className="mt-10 grid max-w-lg grid-cols-2 gap-x-6 gap-y-4 border-t border-white/15 pt-5 text-sm text-white/75 sm:grid-cols-3">
            <div className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--mc-color-accent)]" aria-hidden="true" /><span>Cá nhân hóa theo yêu cầu</span></div>
            <div className="flex items-start gap-2"><Truck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--mc-color-accent)]" aria-hidden="true" /><span>Giao hàng tận nơi</span></div>
            <div className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--mc-color-accent)]" aria-hidden="true" /><span>Kiểm tra trước khi gửi</span></div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[520px] lg:justify-self-end">
          <div className="relative aspect-[4/5] rotate-2 overflow-hidden rounded-[28px] border border-white/15 bg-[var(--mc-color-surface-subtle)] shadow-[var(--mc-shadow-lift)]">
            <img src="https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=900&auto=format&fit=crop&q=85" alt="Bảng mica đèn LED cá nhân hóa trong không gian ấm áp" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3 text-white">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/65">Made for your people</p>
                <p className="mt-1 text-xl font-semibold tracking-tight">Giữ lại điều đáng nhớ.</p>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--mc-color-accent)]"><ArrowUpRight className="h-4 w-4" aria-hidden="true" /></span>
            </div>
          </div>
          <div className="absolute -bottom-4 -left-3 rounded-2xl border border-[var(--mc-color-border-default)] bg-[var(--mc-color-surface-strong)] px-4 py-3 text-[var(--mc-color-text-primary)] shadow-[var(--mc-shadow-soft)] sm:-left-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--mc-color-text-secondary)]">Personalized</p>
            <p className="mt-0.5 text-sm font-bold">Tạo riêng cho bạn</p>
          </div>
          <div className="absolute -right-2 top-8 rounded-full bg-[var(--mc-color-accent)] px-3 py-2 text-xs font-bold text-white shadow-lg sm:-right-5">Quà có ý nghĩa ✦</div>
        </div>
      </div>
    </section>
  );
};
