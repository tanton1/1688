import React from "react";
import { StorefrontConfig } from "@hub1688/shared-types";
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  ArrowDownCircle,
  QrCode,
  Heart,
  Palette,
  CheckCircle2,
  Award
} from "lucide-react";

interface StoreHeroBannerProps {
  config: StorefrontConfig;
  onExploreClick: () => void;
}

export const StoreHeroBanner: React.FC<StoreHeroBannerProps> = ({
  config,
  onExploreClick
}) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#FFFDF8] via-[#FAF4EA] to-[#FFF3E8] border-b border-orange-200/70 py-8 sm:py-14 px-4 sm:px-6 lg:px-8">
      {/* Decorative Warm Ambient Glows */}
      <div className="absolute -top-16 -right-16 w-80 h-80 sm:w-96 sm:h-96 bg-orange-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-12 w-72 h-72 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
          {/* Main Hero Copy */}
          <div className="lg:col-span-7 space-y-3.5 sm:space-y-4 text-center lg:text-left">
            {/* Friendly Kicker Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100/80 border border-orange-200 text-orange-800 text-[11px] sm:text-xs font-bold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-orange-600 animate-pulse" />
              <span>Xưởng Quà Tặng & Đồ Decor Cá Nhân Hóa Chuẩn Macorner</span>
            </div>

            {/* Headline */}
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-stone-900 tracking-tight leading-[1.18]">
              {config.bannerTitle || "Tự Do Cá Nhân Hóa Món Quà Độc Bản Cho Người Yêu Thương"}
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm lg:text-base text-stone-600 max-w-2xl leading-relaxed mx-auto lg:mx-0">
              {config.bannerSubtitle ||
                "Tự tay điền tên, chọn kiểu tóc, màu áo và thú cưng yêu thích trên Biển Mica Đèn LED, Ly Giữ Nhiệt, Đồ Treo Cây Thông. Trình xem trước 100% thời gian thực giúp bạn an tâm trước khi đặt hàng!"}
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-2.5 sm:gap-3.5">
              <button
                onClick={onExploreClick}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-xs sm:text-sm shadow-xl shadow-orange-600/25 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <span>Khám Phá & Tùy Biến Quà Ngay</span>
                <ArrowDownCircle className="w-4 h-4" />
              </button>

              <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs text-stone-700 px-3.5 py-2.5 bg-white/80 border border-stone-200/80 rounded-2xl shadow-xs backdrop-blur-xs">
                <QrCode className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Quét mã VietQR chuyển khoản tự động Napas 24/7</span>
              </div>
            </div>
          </div>

          {/* Value Proposition Cards (Friendly illustrated badges) */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-2.5 sm:gap-3.5 pt-2 lg:pt-0">
            {/* Card 1 */}
            <div className="p-3 sm:p-4 rounded-2xl bg-white/90 border border-orange-100/90 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-2 shadow-xs">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-stone-900 mb-0.5">Live Preview</h4>
                <p className="text-[11px] text-stone-500 leading-snug">
                  Xem trước bản vẽ in thực tế tức thì trước khi đặt hàng
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-3 sm:p-4 rounded-2xl bg-white/90 border border-emerald-100/90 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2 shadow-xs">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-stone-900 mb-0.5">Freeship Toàn Quốc</h4>
                <p className="text-[11px] text-stone-500 leading-snug">
                  Miễn phí giao hàng cho đơn từ 500k hoặc mua từ 2 món
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="p-3 sm:p-4 rounded-2xl bg-white/90 border border-rose-100/90 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-2 shadow-xs">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-stone-900 mb-0.5">In UV Nhật Bản</h4>
                <p className="text-[11px] text-stone-500 leading-snug">
                  Mực in nano an toàn sức khỏe, chống trầy, bền màu 10 năm
                </p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="p-3 sm:p-4 rounded-2xl bg-white/90 border border-amber-100/90 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-2 shadow-xs">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-stone-900 mb-0.5">Đổi Trả 30 Ngày</h4>
                <p className="text-[11px] text-stone-500 leading-snug">
                  Hoàn tiền hoặc đổi mới 100% nếu có lỗi từ xưởng sản xuất
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
