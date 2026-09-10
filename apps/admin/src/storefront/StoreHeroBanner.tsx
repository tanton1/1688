import React from "react";
import { StorefrontConfig } from "@hub1688/shared-types";
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  BadgePercent,
  Sparkles,
  ArrowDownCircle,
  QrCode
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
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-orange-950 text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-orange-500/20">
      {/* Decorative Glow Elements */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 left-10 w-72 h-72 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Main Hero Text */}
          <div className="lg:col-span-8 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <span>Nền Tảng Cửa Hàng Bán Lẻ & Bán Sỉ Trực Tiếp</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {config.bannerTitle || "Khám Phá Nguồn Hàng Xưởng Sỉ Cao Cấp"}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
              {config.bannerSubtitle ||
                "Sản phẩm được tuyển chọn và kiểm định chất lượng nghiêm ngặt từ các xưởng sản xuất uy tín. Mua lẻ với giá sỉ, hỗ trợ giao hàng tận nơi và thanh toán QR thuận tiện."}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={onExploreClick}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-orange-500/30 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <span>Xem Sản Phẩm Ngay</span>
                <ArrowDownCircle className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 text-xs text-slate-400 px-3 py-2 bg-white/5 border border-white/10 rounded-xl backdrop-blur-xs">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>Quét mã VietQR chuyển khoản tự động</span>
              </div>
            </div>
          </div>

          {/* Quick Perks / Value Cards */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-1.5 hover:bg-white/10 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
                <BadgePercent className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">Giá Tận Gốc</h4>
              <p className="text-[11px] text-slate-400">Tiết kiệm 30-50% so với mua qua trung gian</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-1.5 hover:bg-white/10 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">Giao Toàn Quốc</h4>
              <p className="text-[11px] text-slate-400">Freeship đơn từ {config.freeShipThresholdVND ? `${(config.freeShipThresholdVND / 1000).toLocaleString()}k` : "500k"}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-1.5 hover:bg-white/10 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">Được Kiểm Tra</h4>
              <p className="text-[11px] text-slate-400">Đồng kiểm khi nhận hàng trước khi thanh toán</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-1.5 hover:bg-white/10 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <RotateCcw className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">Đổi Trả 7 Ngày</h4>
              <p className="text-[11px] text-slate-400">Hỗ trợ đổi size hoặc lỗi kỹ thuật do nhà sản xuất</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
