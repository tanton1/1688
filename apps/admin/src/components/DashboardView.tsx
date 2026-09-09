import React from "react";
import { WebProduct, ProductDiffSummary } from "@hub1688/shared-types";
import {
  Package,
  CheckCircle,
  Clock,
  AlertTriangle,
  Award,
  ArrowUpRight,
  TrendingUp,
  Store,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { AdminTab } from "./Sidebar";

interface DashboardViewProps {
  products: WebProduct[];
  diffLogs: ProductDiffSummary[];
  onNavigateTab: (tab: AdminTab) => void;
  onSelectProduct: (product: WebProduct) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  diffLogs,
  onNavigateTab,
  onSelectProduct
}) => {
  const totalProducts = products.length;
  const publishedProducts = products.filter(p => p.status === "PUBLISHED");
  const draftProducts = products.filter(p => p.status === "DRAFT");
  const criticalDiffs = diffLogs.filter(d => d.hasPriceChange || d.hasUnavailableSku);

  const avgQuality = totalProducts > 0
    ? Math.round(products.reduce((acc, p) => acc + (p.qualityScore || 0), 0) / totalProducts)
    : 0;

  // Tính tổng số biến thể và tồn kho
  const totalVariants = products.reduce((acc, p) => acc + p.variants.length, 0);
  const totalStock = products.reduce((acc, p) => acc + p.variants.reduce((s, v) => s + v.stockQuantity, 0), 0);

  // Phân bổ danh mục
  const categoryStats: Record<string, number> = {};
  products.forEach(p => {
    const cat = p.categoryName || "Khác";
    categoryStats[cat] = (categoryStats[cat] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Banner chào mừng & trạng thái vận hành */}
      <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 rounded-2xl p-6 text-white shadow-lg shadow-orange-500/15 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 backdrop-blur-xs text-white mb-2">
            <Sparkles className="w-3.5 h-3.5" /> 1688 LISTING SYNC HUB v1.0
          </span>
          <h2 className="text-xl font-extrabold tracking-tight">
            Trung Tâm Điều Hành Đồng Bộ & Bán Hàng 1688
          </h2>
          <p className="text-orange-100 text-xs mt-1.5 leading-relaxed">
            Hệ thống đang tự động theo dõi biến động giá NDT, bóc tách ma trận phân loại SKU, chống ghi đè dữ liệu thủ công và sẵn sàng đẩy sản phẩm lên các kênh bán hàng.
          </p>

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => onNavigateTab("PRODUCTS")}
              className="px-4 py-2 bg-white text-orange-600 rounded-lg text-xs font-bold shadow-md hover:bg-orange-50 transition-colors flex items-center gap-1.5"
            >
              <Package className="w-4 h-4" />
              Xem {totalProducts} Sản Phẩm
            </button>
            {diffLogs.length > 0 && (
              <button
                onClick={() => onNavigateTab("DIFFS")}
                className="px-4 py-2 bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-xs text-white rounded-lg text-xs font-bold border border-white/20 transition-colors flex items-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4 text-amber-300" />
                Xử Lý {diffLogs.length} Cảnh Báo Lệch
              </button>
            )}
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-white/10 to-transparent pointer-events-none"></div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Tổng sản phẩm */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tổng Sản Phẩm</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{totalProducts}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>{totalVariants} biến thể</span> • <span>{totalStock.toLocaleString()} tồn kho</span>
          </div>
        </div>

        {/* Card 2: Đang bán (Published) */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Đang Bán Trên Web</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-2">{publishedProducts.length}</div>
          <div className="text-[11px] text-emerald-700 mt-1 font-medium">
            {totalProducts > 0 ? Math.round((publishedProducts.length / totalProducts) * 100) : 0}% danh mục sẵn sàng
          </div>
        </div>

        {/* Card 3: Bản nháp (Drafts) */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Bản Nháp Cần Duyệt</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-600 mt-2">{draftProducts.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Cần rà soát trước khi xuất bản
          </div>
        </div>

        {/* Card 4: Cảnh báo lệch (Diffs) */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Cảnh Báo Lệch 1688</span>
            <div className={`w-8 h-8 rounded-lg ${diffLogs.length > 0 ? "bg-rose-50 text-rose-600 animate-pulse" : "bg-slate-50 text-slate-400"} flex items-center justify-center`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-extrabold mt-2 ${diffLogs.length > 0 ? "text-rose-600" : "text-slate-900"}`}>
            {diffLogs.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {criticalDiffs.length} cảnh báo giá/hết hàng
          </div>
        </div>

        {/* Card 5: Điểm chất lượng trung bình */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Điểm Chất Lượng TB</span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-orange-600 mt-2">{avgQuality}<span className="text-sm font-normal text-slate-400">/100</span></div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${avgQuality >= 80 ? "bg-emerald-500" : avgQuality >= 60 ? "bg-amber-500" : "bg-rose-500"}`}
              style={{ width: `${avgQuality}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Cảnh báo lệch & Danh sách sản phẩm mới */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột trái & giữa: Sản phẩm mới đồng bộ gần đây */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-orange-500" />
              <h3 className="font-bold text-sm text-slate-900">Sản Phẩm Vừa Đồng Bộ Gần Đây</h3>
            </div>
            <button
              onClick={() => onNavigateTab("PRODUCTS")}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-0.5"
            >
              <span>Xem tất cả</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {products.slice(0, 4).map(product => (
              <div
                key={product.id}
                onClick={() => onSelectProduct(product)}
                className="p-3.5 hover:bg-slate-50/80 transition-colors cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={product.primaryImage || "https://placehold.co/80x80?text=No+Image"}
                    alt={product.titleVI}
                    className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate hover:text-orange-600">
                      {product.titleVI}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                      <span className="font-mono text-slate-600 font-semibold">{product.skuCode}</span>
                      <span>•</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{product.categoryName}</span>
                      <span>•</span>
                      <span>{product.variants.length} phân loại</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-slate-900">
                    {product.minPriceVND.toLocaleString("vi-VN")}đ
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        product.status === "PUBLISHED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {product.status === "PUBLISHED" ? "ĐANG BÁN" : "BẢN NHÁP"}
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold">
                      QS {product.qualityScore}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {products.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                Chưa có sản phẩm nào. Hãy mở Chrome Extension trên trang 1688 để bắt đầu đồng bộ!
              </div>
            )}
          </div>
        </div>

        {/* Cột phải: Cảnh báo lệch & Phân bổ danh mục */}
        <div className="space-y-6">
          {/* Box Cảnh báo lệch (Diffs Alert) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/40">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <h3 className="font-bold text-sm text-slate-900">Biến Động Cần Chú Ý</h3>
              </div>
              <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">
                {diffLogs.length} mục
              </span>
            </div>

            <div className="p-3 space-y-2.5">
              {diffLogs.map((log, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-100/60 transition-colors text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between font-semibold text-slate-900">
                    <span className="truncate max-w-[180px]">{log.productTitle}</span>
                    <span className="text-[10px] text-slate-400">1688 #{log.sourceProductId.slice(-4)}</span>
                  </div>

                  {log.changes.map((change, cIdx) => (
                    <div key={cIdx} className="text-[11px] text-slate-600 flex items-start gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${change.severity === "CRITICAL" ? "bg-rose-500" : "bg-amber-500"}`}></span>
                      <div>
                        <span className="font-semibold text-slate-800">
                          {change.fieldName === "price" ? "Biến động giá:" : "Tồn kho/Biến thể:"}
                        </span>{" "}
                        <span className="text-rose-600 font-medium">{String(change.newValue)}</span>
                      </div>
                    </div>
                  ))}

                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => onNavigateTab("DIFFS")}
                      className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                    >
                      Duyệt thay đổi <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}

              {diffLogs.length === 0 && (
                <div className="py-6 text-center text-slate-400 text-xs">
                  <ShieldCheck className="w-8 h-8 mx-auto text-emerald-400 mb-1.5" />
                  Mọi sản phẩm đều đồng bộ hoàn hảo với 1688!
                </div>
              )}
            </div>
          </div>

          {/* Box Phân bổ danh mục */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
            <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
              <Store className="w-4 h-4 text-orange-500" />
              Phân Bổ Theo Ngành Hàng
            </h3>

            <div className="space-y-2 text-xs">
              {Object.entries(categoryStats).map(([cat, count]) => {
                const percent = Math.round((count / totalProducts) * 100);
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-slate-700 mb-1">
                      <span className="font-medium">{cat}</span>
                      <span className="font-bold">{count} sp ({percent}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
