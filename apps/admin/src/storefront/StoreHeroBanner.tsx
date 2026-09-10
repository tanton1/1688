import React from "react";
import { StorefrontConfig } from "@hub1688/shared-types";
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  BadgePercent,
  Sparkles,
  ArrowDownCircle,
  QrCode,
  Heart
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
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-orange-500/30">
      {/* Decorative Warm Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 left-10 w-72 h-72 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Main Hero Text */}
          <div className="lg:col-span-8 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <span>Xưởng Quà Tặng Cá Nhân Hóa & Trang Trí Nhà Cửa Chuẩn Macorner</span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              {config.bannerTitle || "Tự Do Cá Nhân Hóa Món Quà Độc Bản Cho Người Thân"}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
              {config.bannerSubtitle ||
                "Khắc tên, ngày kỷ niệm, tự chọn kiểu tóc, màu da và cún cưng trên Biển Mica Đèn LED, Ly Giữ Nhiệt, Đồ Treo Cây Thông. Xem trước bản vẽ thực tế 100% thời gian thực trước khi đặt hàng!"}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={onExploreClick}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs sm:text-sm shadow-xl shadow-orange-500/30 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <span>Khám Phá & Tùy Biến Quà Ngay</span>
                <ArrowDownCircle className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 text-xs text-slate-300 px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl backdrop-blur-xs">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>Quét mã VietQR chuyển khoản tự động Napas 247</span>
              </div>
            </div>
          </div>

          {/* Value Props Cards */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-1.5 hover:bg-white/10 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">Live Customizer</h4>
              <p className="text-[11px] text-slate-400">Xem trước bản vẽ in thực tế trong thời gian thực</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-1.5 hover:bg-white/10 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">Freeship Toàn Quốc</h4>
              <p className="text-[11px] text-slate-400">Miễn phí giao hàng đơn từ 500k hoặc mua từ 3 món</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-1.5 hover:bg-white/10 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <Heart className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">Ý Nghĩa & Bền Bỉ</h4>
              <p className="text-[11px] text-slate-400">In UV công nghệ Nhật Bản chống trầy, bền màu 10 năm</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-1.5 hover:bg-white/10 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <RotateCcw className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">Bảo Hành 30 Ngày</h4>
              <p className="text-[11px] text-slate-400">Cam kết hoàn tiền hoặc đổi mới 100% nếu có lỗi xưởng</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
