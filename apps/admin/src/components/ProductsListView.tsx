import React, { useState, useMemo } from "react";
import { WebProduct } from "@hub1688/shared-types";
import {
  Search,
  Filter,
  CheckCircle,
  Clock,
  ExternalLink,
  Lock,
  Unlock,
  Zap,
  MoreHorizontal,
  Trash2,
  Edit3,
  SlidersHorizontal,
  Layers,
  Sparkles,
  ArrowUpDown,
  LayoutGrid,
  List,
  Video,
  Globe,
  Store
} from "lucide-react";

interface ProductsListViewProps {
  products: WebProduct[];
  onSelectProduct: (product: WebProduct) => void;
  onPublishProduct: (id: string) => void;
  onDeleteProduct: (id: string) => void;
  onBulkPublish: (ids: string[]) => void;
  onBulkDelete: (ids: string[]) => void;
  onViewOnStore?: (product: WebProduct) => void;
}

export const ProductsListView: React.FC<ProductsListViewProps> = ({
  products,
  onSelectProduct,
  onPublishProduct,
  onDeleteProduct,
  onBulkPublish,
  onBulkDelete,
  onViewOnStore
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [qualityFilter, setQualityFilter] = useState("ALL");
  const [mediaFilter, setMediaFilter] = useState<"ALL" | "VIDEO_ONLY" | "NO_VIDEO">("ALL");
  const [sortBy, setSortBy] = useState("NEWEST");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Thu thập danh sách các danh mục duy nhất
  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.categoryName).filter(Boolean));
    return Array.from(set);
  }, [products]);

  // Bộ lọc và sắp xếp
  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        // Tìm kiếm (Tiêu đề tiếng Việt, Tiếng Anh, SKU, Offer ID, Shop)
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchTitleVI = p.titleVI?.toLowerCase().includes(q);
          const matchTitleEN = p.titleEN?.toLowerCase().includes(q);
          const matchSku = p.skuCode?.toLowerCase().includes(q);
          const matchOfferId = p.sourceProductId?.includes(q);
          const matchShop = p.supplierName?.toLowerCase().includes(q);
          if (!matchTitleVI && !matchTitleEN && !matchSku && !matchOfferId && !matchShop) return false;
        }

        // Lọc trạng thái
        if (statusFilter !== "ALL" && p.status !== statusFilter) return false;

        // Lọc danh mục
        if (categoryFilter !== "ALL" && p.categoryName !== categoryFilter) return false;

        // Lọc chất lượng
        if (qualityFilter === "HIGH" && (p.qualityScore || 0) < 80) return false;
        if (qualityFilter === "LOW" && (p.qualityScore || 0) >= 80) return false;

        // Lọc Media (Video)
        if (mediaFilter === "VIDEO_ONLY" && !p.videoUrl) return false;
        if (mediaFilter === "NO_VIDEO" && p.videoUrl) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "PRICE_ASC") return a.minPriceVND - b.minPriceVND;
        if (sortBy === "PRICE_DESC") return b.minPriceVND - a.minPriceVND;
        if (sortBy === "QUALITY_DESC") return (b.qualityScore || 0) - (a.qualityScore || 0);
        if (sortBy === "OLDEST") return new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime();
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      });
  }, [products, searchTerm, statusFilter, categoryFilter, qualityFilter, mediaFilter, sortBy]);

  // Chọn tất cả
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredProducts.map(p => p.id!));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên tiếng Việt/English, SKU, 1688 Offer ID, Tên shop..."
              className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto flex-wrap">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-2 px-2.5 border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PUBLISHED">Đang bán (Published)</option>
              <option value="DRAFT">Bản nháp (Draft)</option>
            </select>

            {/* Media Filter */}
            <select
              value={mediaFilter}
              onChange={(e) => setMediaFilter(e.target.value as any)}
              className="text-xs py-2 px-2.5 border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            >
              <option value="ALL">Mọi loại Media</option>
              <option value="VIDEO_ONLY">🎬 Có Video HD</option>
              <option value="NO_VIDEO">Chỉ có ảnh</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs py-2 px-2.5 border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            >
              <option value="ALL">Tất cả ngành hàng</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Quality Score Filter */}
            <select
              value={qualityFilter}
              onChange={(e) => setQualityFilter(e.target.value)}
              className="text-xs py-2 px-2.5 border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            >
              <option value="ALL">Mọi điểm chất lượng</option>
              <option value="HIGH">Đạt chuẩn (≥ 80 điểm)</option>
              <option value="LOW">Cần tối ưu (&lt; 80 điểm)</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs py-2 px-2.5 border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            >
              <option value="NEWEST">Mới nhất</option>
              <option value="OLDEST">Cũ nhất</option>
              <option value="PRICE_ASC">Giá tăng dần</option>
              <option value="PRICE_DESC">Giá giảm dần</option>
              <option value="QUALITY_DESC">Điểm chất lượng cao nhất</option>
            </select>

            {/* View Mode */}
            <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 shrink-0">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded ${viewMode === "table" ? "bg-white shadow-xs text-orange-600 font-bold" : "text-slate-400 hover:text-slate-600"}`}
                title="Dạng bảng chi tiết"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded ${viewMode === "grid" ? "bg-white shadow-xs text-orange-600 font-bold" : "text-slate-400 hover:text-slate-600"}`}
                title="Dạng lưới thẻ"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Thanh tác vụ hàng loạt (Bulk Actions Bar) */}
        {selectedIds.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2 flex items-center justify-between animate-in fade-in">
            <span className="text-xs font-bold text-orange-900">
              Đã chọn <span className="text-orange-600 underline">{selectedIds.length}</span> sản phẩm
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onBulkPublish(selectedIds);
                  setSelectedIds([]);
                }}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-xs flex items-center gap-1"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Đăng Bán Hàng Loạt
              </button>
              <button
                onClick={() => {
                  if (confirm(`Bạn có chắc muốn xóa ${selectedIds.length} sản phẩm đã chọn?`)) {
                    onBulkDelete(selectedIds);
                    setSelectedIds([]);
                  }
                }}
                className="px-3 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded text-xs font-bold shadow-xs flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa Hàng Loạt
              </button>
            </div>
          </div>
        )}

        {/* Web Bán Hàng Trực Tiếp Shortcut Bar */}
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-orange-50 border border-emerald-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-xs sm:text-sm text-slate-900">Web Bán Hàng Trực Tiếp (Storefront)</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {products.filter(p => p.status === "PUBLISHED").length} / {products.length} Đang Bán
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Khách mua hàng có thể đặt hàng trực tiếp, quét VietQR hoặc thanh toán COD</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {products.some(p => p.status !== "PUBLISHED") && (
              <button
                onClick={() => onBulkPublish(products.map(p => p.id!))}
                className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                title="Xuất bản tất cả sản phẩm sang trạng thái Đang Bán"
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Đăng Bán Tất Cả Lên Web</span>
              </button>
            )}

            {onViewOnStore && (
              <button
                onClick={() => onViewOnStore(products[0])}
                className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Store className="w-3.5 h-3.5" />
                <span>Mở Web Bán Hàng ↗</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Product Content: Table or Grid */}
      {viewMode === "table" ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold select-none">
                <tr>
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === filteredProducts.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-3.5 min-w-[280px]">Sản Phẩm & Nguồn 1688</th>
                  <th className="p-3.5 min-w-[120px]">Ngành Hàng & SKU</th>
                  <th className="p-3.5 min-w-[140px]">Giá Bán Web & Bậc Sỉ</th>
                  <th className="p-3.5 min-w-[110px]">Biến Thể & Kho</th>
                  <th className="p-3.5 min-w-[110px] text-center">Khóa Trường</th>
                  <th className="p-3.5 min-w-[90px] text-center">Chất Lượng</th>
                  <th className="p-3.5 min-w-[110px] text-center">Trạng Thái</th>
                  <th className="p-3.5 min-w-[100px] text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map(product => {
                  const isSelected = selectedIds.includes(product.id!);
                  const totalStock = product.variants.reduce((sum, v) => sum + v.stockQuantity, 0);
                  const activeVariants = product.variants.filter(v => v.selectedForSale).length;
                  const lowestCost = product.variants.length ? Math.min(...product.variants.map(v => v.costPriceVND)) : 0;
                  const margin = product.minPriceVND > 0 && lowestCost > 0
                    ? Math.round(((product.minPriceVND - lowestCost) / product.minPriceVND) * 100)
                    : null;

                  return (
                    <tr
                      key={product.id}
                      className={`hover:bg-slate-50/80 transition-colors ${isSelected ? "bg-orange-50/40" : ""}`}
                    >
                      {/* Checkbox */}
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(product.id!)}
                          className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                        />
                      </td>

                      {/* Info & Thumbnail */}
                      <td className="p-3.5">
                        <div className="flex items-start gap-3">
                          <div className="relative shrink-0">
                            <img
                              src={product.primaryImage || "https://placehold.co/80x80?text=No+Image"}
                              alt={product.titleVI}
                              className="w-14 h-14 rounded-lg object-cover border border-slate-200 cursor-pointer hover:opacity-90"
                              onClick={() => onSelectProduct(product)}
                            />
                            {product.galleryImages.length > 0 && (
                              <span className="absolute -bottom-1 -right-1 bg-slate-900/80 text-white text-[9px] font-bold px-1 rounded">
                                +{product.galleryImages.length}
                              </span>
                            )}
                            {product.videoUrl && (
                              <span className="absolute top-0 left-0 bg-purple-600/90 text-white text-[8px] font-extrabold px-1 py-0.5 rounded-br flex items-center gap-0.5 shadow-xs">
                                <Video className="w-2 h-2" /> MP4
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4
                                onClick={() => onSelectProduct(product)}
                                className="text-xs font-bold text-slate-900 hover:text-orange-600 cursor-pointer line-clamp-2 leading-relaxed"
                              >
                                {product.titleVI}
                              </h4>
                              {product.videoUrl && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 bg-purple-100 text-purple-700 rounded shrink-0">
                                  <Video className="w-2.5 h-2.5" /> Video
                                </span>
                              )}
                            </div>

                            {product.titleEN && (
                              <p className="text-[11px] text-blue-600 truncate max-w-md font-medium mt-0.5" title={product.titleEN}>
                                🇬🇧 {product.titleEN}
                              </p>
                            )}

                            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                              <span className="truncate max-w-[160px] text-slate-400 italic">
                                {product.titleVariants?.original || "N/A"}
                              </span>
                              <a
                                href={product.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-0.5 text-orange-600 hover:underline shrink-0 text-[10px]"
                                title="Mở trang gốc 1688"
                              >
                                1688 <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Ngành hàng & SKU */}
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-slate-800 text-xs">{product.skuCode}</div>
                        <span className="inline-block mt-1 bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded">
                          {product.categoryName}
                        </span>
                      </td>

                      {/* Giá bán & Bậc sỉ */}
                      <td className="p-3.5">
                        <div className="font-extrabold text-slate-900 text-xs">
                          {product.minPriceVND === product.maxPriceVND
                            ? `${product.minPriceVND.toLocaleString("vi-VN")}đ`
                            : `${product.minPriceVND.toLocaleString("vi-VN")}đ - ${product.maxPriceVND.toLocaleString("vi-VN")}đ`}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                            {margin === null ? "Margin —" : `Margin ${margin}%`}
                          </span>
                          {product.priceTiers && product.priceTiers.length > 0 && (
                            <span className="text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1 py-0.2 rounded" title="Có thang giá sỉ bậc thang">
                              {product.priceTiers.length} bậc sỉ
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Biến thể & Kho */}
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800">{activeVariants}/{product.variants.length} phân loại</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{totalStock.toLocaleString()} tồn kho</div>
                      </td>

                      {/* Khóa trường (Field Locks) */}
                      <td className="p-3.5 text-center">
                        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-md">
                          <span
                            title={product.isTitleLocked ? "Tiêu đề đã khóa" : "Tiêu đề mở"}
                            className={`p-0.5 rounded ${product.isTitleLocked ? "text-orange-600 font-bold" : "text-slate-300"}`}
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                          <span
                            title={product.isPriceAutoSync ? "Tự động đồng bộ giá" : "Không tự đồng bộ giá"}
                            className={`p-0.5 rounded ${product.isPriceAutoSync ? "text-blue-600" : "text-slate-300"}`}
                          >
                            <Zap className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </td>

                      {/* Quality Score & SEO */}
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            product.qualityScore >= 80
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          <Sparkles className="w-3 h-3" />
                          {product.qualityScore}/100
                        </span>
                        <div className="mt-1 flex justify-center">
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200"
                            title="Điểm tối ưu hóa SEO Google"
                          >
                            <Globe className="w-2.5 h-2.5" /> SEO {product.seo?.seoScore ?? "—"}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => onPublishProduct(product.id!)}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                            product.status === "PUBLISHED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                              : "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
                          }`}
                          title="Bấm để đổi trạng thái"
                        >
                          {product.status === "PUBLISHED" ? "ĐANG BÁN" : "BẢN NHÁP"}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {product.status === "PUBLISHED" && onViewOnStore && (
                            <button
                              onClick={() => onViewOnStore(product)}
                              className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                              title="Xem sản phẩm trên Web Bán Hàng Trực Tiếp"
                            >
                              <Store className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => onSelectProduct(product)}
                            className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                            title="Biên tập chi tiết & Ma trận SKU"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Bạn có chắc muốn xóa sản phẩm "${product.titleVI}"?`)) {
                                onDeleteProduct(product.id!);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="Xóa sản phẩm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-slate-400">
                      Không tìm thấy sản phẩm nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map(product => (
            <div
              key={product.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-square overflow-hidden bg-slate-100">
                  <img
                    src={product.primaryImage}
                    alt={product.titleVI}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                    onClick={() => onSelectProduct(product)}
                  />
                  <div className="absolute top-2 left-2 flex gap-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        product.status === "PUBLISHED" ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"
                      }`}
                    >
                      {product.status === "PUBLISHED" ? "ĐANG BÁN" : "BẢN NHÁP"}
                    </span>
                  </div>
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <span className="bg-slate-900/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      QS {product.qualityScore}
                    </span>
                    <span className="bg-emerald-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full" title="Điểm chuẩn SEO">
                      SEO {product.seo?.seoScore ?? "—"}
                    </span>
                  </div>
                  {product.videoUrl && (
                    <div className="absolute bottom-2 left-2 bg-purple-900/85 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-xs">
                      <Video className="w-3 h-3 text-purple-300" /> Video MP4
                    </div>
                  )}
                </div>

                <div className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-mono font-bold text-slate-700">{product.skuCode}</span>
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded">{product.categoryName}</span>
                  </div>

                  <h4
                    onClick={() => onSelectProduct(product)}
                    className="text-xs font-bold text-slate-900 hover:text-orange-600 line-clamp-2 cursor-pointer leading-snug"
                  >
                    {product.titleVI}
                  </h4>

                  {product.titleEN && (
                    <p className="text-[11px] text-blue-600 truncate font-medium">
                      🇬🇧 {product.titleEN}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-sm font-extrabold text-orange-600">
                      {product.minPriceVND.toLocaleString("vi-VN")}đ
                    </div>
                    {product.priceTiers && product.priceTiers.length > 0 && (
                      <span className="text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                        {product.priceTiers.length} bậc sỉ
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-3.5 pt-0 border-t border-slate-100 mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">{product.variants.length} biến thể</span>
                <div className="flex items-center gap-2">
                  {product.status === "PUBLISHED" && onViewOnStore && (
                    <button
                      onClick={() => onViewOnStore(product)}
                      className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 text-[11px]"
                      title="Xem trên Web Bán Hàng"
                    >
                      <Store className="w-3.5 h-3.5" />
                      <span>Xem Shop</span>
                    </button>
                  )}
                  <button
                    onClick={() => onSelectProduct(product)}
                    className="text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 text-[11px]"
                  >
                    Chi tiết & SKU →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
