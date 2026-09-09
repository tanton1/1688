import React, { useState } from "react";
import { WebProduct, WebProductVariant } from "@hub1688/shared-types";
import {
  X,
  Save,
  CheckCircle,
  ExternalLink,
  Lock,
  Unlock,
  Zap,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Award,
  AlertCircle,
  Info,
  DollarSign
} from "lucide-react";

interface ProductDetailModalProps {
  product: WebProduct | null;
  onClose: () => void;
  onSave: (updatedProduct: WebProduct) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onSave
}) => {
  if (!product) return null;

  const [activeTab, setActiveTab] = useState<"content" | "variants" | "media" | "quality">("content");
  const [formData, setFormData] = useState<WebProduct>({ ...product });
  const [variants, setVariants] = useState<WebProductVariant[]>([...product.variants]);
  const [isSaving, setIsSaving] = useState(false);

  // Cập nhật trường thông tin cơ bản
  const handleFieldChange = (field: keyof WebProduct, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Cập nhật cờ khóa trường
  const handleLockToggle = (lockField: keyof WebProduct) => {
    setFormData(prev => ({ ...prev, [lockField]: !prev[lockField] }));
  };

  // Cập nhật biến thể
  const handleVariantChange = (index: number, field: keyof WebProductVariant, value: any) => {
    const next = [...variants];
    next[index] = { ...next[index], [field]: value };
    setVariants(next);

    // Tính lại min/max price
    const validPrices = next.filter(v => v.selectedForSale).map(v => v.sellingPriceVND);
    if (validPrices.length > 0) {
      setFormData(prev => ({
        ...prev,
        minPriceVND: Math.min(...validPrices),
        maxPriceVND: Math.max(...validPrices)
      }));
    }
  };

  // Bật/tắt bán variant
  const handleToggleVariantSale = (index: number) => {
    const next = [...variants];
    next[index] = { ...next[index], selectedForSale: !next[index].selectedForSale };
    setVariants(next);
  };

  const handleSave = () => {
    setIsSaving(true);
    const updated: WebProduct = {
      ...formData,
      variants,
      updatedAt: new Date().toISOString()
    };
    onSave(updated);
    setTimeout(() => {
      setIsSaving(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono text-xs bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded shrink-0">
              {formData.skuCode}
            </span>
            <h2 className="text-sm font-bold text-slate-900 truncate">
              {formData.titleVI}
            </h2>
            <a
              href={formData.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:underline shrink-0"
            >
              Mở 1688 gốc <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleFieldChange("status", formData.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED")}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                formData.status === "PUBLISHED"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                  : "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
              }`}
            >
              {formData.status === "PUBLISHED" ? "✓ Đang Bán" : "Chế Độ Bản Nháp"}
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Đang lưu..." : "Lưu Thay Đổi"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-200 bg-white select-none">
          <button
            onClick={() => setActiveTab("content")}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "content"
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Nội Dung & Khóa Trường
          </button>

          <button
            onClick={() => setActiveTab("variants")}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "variants"
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Ma Trận SKU ({variants.length})
          </button>

          <button
            onClick={() => setActiveTab("media")}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "media"
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Hình Ảnh ({formData.galleryImages.length + 1})
          </button>

          <button
            onClick={() => setActiveTab("quality")}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "quality"
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Chất Lượng Listing ({formData.qualityScore}/100)
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: NỘI DUNG & KHÓA TRƯỜNG */}
          {activeTab === "content" && (
            <div className="space-y-5">
              {/* Box Khóa Trường (Field Locks Control) */}
              <div className="bg-orange-50/60 border border-orange-200/80 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-orange-600" />
                    <h3 className="text-xs font-bold text-slate-900">
                      Cơ Chế Khóa Trường (Field-Level Locks)
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Ngăn chặn crawler tự động ghi đè nội dung bạn đã tối ưu thủ công
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                  {/* Lock 1: Tiêu đề */}
                  <label className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-orange-300">
                    <input
                      type="checkbox"
                      checked={formData.isTitleLocked}
                      onChange={() => handleLockToggle("isTitleLocked")}
                      className="rounded text-orange-600 focus:ring-orange-500"
                    />
                    <span className="font-semibold text-slate-700">Khóa Tiêu Đề</span>
                  </label>

                  {/* Lock 2: Mô tả */}
                  <label className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-orange-300">
                    <input
                      type="checkbox"
                      checked={formData.isDescLocked}
                      onChange={() => handleLockToggle("isDescLocked")}
                      className="rounded text-orange-600 focus:ring-orange-500"
                    />
                    <span className="font-semibold text-slate-700">Khóa Mô Tả</span>
                  </label>

                  {/* Lock 3: Hình ảnh */}
                  <label className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-orange-300">
                    <input
                      type="checkbox"
                      checked={formData.isImagesLocked}
                      onChange={() => handleLockToggle("isImagesLocked")}
                      className="rounded text-orange-600 focus:ring-orange-500"
                    />
                    <span className="font-semibold text-slate-700">Khóa Ảnh Media</span>
                  </label>

                  {/* Lock 4: Tự động đồng bộ giá */}
                  <label className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-orange-300">
                    <input
                      type="checkbox"
                      checked={formData.isPriceAutoSync}
                      onChange={() => handleLockToggle("isPriceAutoSync")}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-700">Tự Động Sync Giá</span>
                  </label>

                  {/* Lock 5: Tự động đồng bộ tồn kho */}
                  <label className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-orange-300">
                    <input
                      type="checkbox"
                      checked={formData.isStockAutoSync}
                      onChange={() => handleLockToggle("isStockAutoSync")}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-700">Tự Động Sync Kho</span>
                  </label>
                </div>
              </div>

              {/* Tiêu đề tiếng Việt & Gợi ý AI */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Tiêu Đề Sản Phẩm Tiếng Việt (Web & Sàn)
                </label>
                <input
                  type="text"
                  value={formData.titleVI}
                  onChange={(e) => handleFieldChange("titleVI", e.target.value)}
                  className="w-full text-xs font-semibold px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />

                {/* Các biến thể tiêu đề AI */}
                {formData.titleVariants && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                    <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-orange-500" />
                      Gợi ý tiêu đề AI E-Commerce (Nhấp để chọn nhanh):
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleFieldChange("titleVI", formData.titleVariants!.seo)}
                        className="px-2.5 py-1 bg-white hover:bg-orange-50 border border-slate-200 rounded text-slate-700 text-left text-[11px]"
                      >
                        <span className="font-bold text-orange-600">SEO:</span> {formData.titleVariants.seo}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFieldChange("titleVI", formData.titleVariants!.clean)}
                        className="px-2.5 py-1 bg-white hover:bg-orange-50 border border-slate-200 rounded text-slate-700 text-left text-[11px]"
                      >
                        <span className="font-bold text-blue-600">Tinh gọn:</span> {formData.titleVariants.clean}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Đối chiếu Tiêu đề gốc 1688 */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <span className="text-[11px] font-bold text-slate-500">Tiêu đề gốc tiếng Trung trên 1688:</span>
                <p className="font-mono text-slate-700">{formData.titleVariants?.original || "N/A"}</p>
                <div className="text-[11px] text-slate-500 pt-1">
                  Nhà cung cấp: <strong className="text-slate-800">{formData.supplierName}</strong>
                </div>
              </div>

              {/* Ngành hàng & Mô tả ngắn */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ngành Hàng / Danh Mục
                  </label>
                  <input
                    type="text"
                    value={formData.categoryName}
                    onChange={(e) => handleFieldChange("categoryName", e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mô Tả Ngắn (Highlight)
                  </label>
                  <input
                    type="text"
                    value={formData.shortDescVI || ""}
                    onChange={(e) => handleFieldChange("shortDescVI", e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Mô tả chi tiết HTML */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mô Tả Chi Tiết Sản Phẩm (HTML)
                </label>
                <textarea
                  rows={6}
                  value={formData.fullDescVI || ""}
                  onChange={(e) => handleFieldChange("fullDescVI", e.target.value)}
                  className="w-full text-xs font-mono p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                ></textarea>
              </div>
            </div>
          )}

          {/* TAB 2: MA TRẬN SKU & BIẾN THỂ */}
          {activeTab === "variants" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Tùy chỉnh giá bán, tồn kho và chọn lọc các biến thể cho phép bán trên website.
                </p>
                <span className="text-xs font-bold text-orange-600">
                  {variants.filter(v => v.selectedForSale).length}/{variants.length} phân loại được kích hoạt bán
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <tr>
                      <th className="p-3 w-12 text-center">Bán</th>
                      <th className="p-3">Phân Loại (Màu / Size)</th>
                      <th className="p-3">Giá Vốn VNĐ</th>
                      <th className="p-3">Giá Bán Web VNĐ</th>
                      <th className="p-3">Margin %</th>
                      <th className="p-3">Tồn Kho</th>
                      <th className="p-3 text-center">Nguồn 1688</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {variants.map((v, idx) => {
                      const margin = v.sellingPriceVND > 0
                        ? Math.round(((v.sellingPriceVND - v.costPriceVND) / v.sellingPriceVND) * 100)
                        : 0;

                      return (
                        <tr key={v.sourceSkuId} className={`hover:bg-slate-50 ${!v.selectedForSale ? "opacity-50 bg-slate-50/60" : ""}`}>
                          {/* Checkbox bán */}
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={v.selectedForSale}
                              onChange={() => handleToggleVariantSale(idx)}
                              className="rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                            />
                          </td>

                          {/* Màu & Size */}
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {v.imageUrl && (
                                <img
                                  src={v.imageUrl}
                                  alt=""
                                  className="w-8 h-8 rounded object-cover border border-slate-200"
                                />
                              )}
                              <div>
                                <div className="font-bold text-slate-800">{v.colorName || "Mặc định"}</div>
                                <div className="text-[11px] text-slate-500">{v.sizeName || "Freesize"}</div>
                              </div>
                            </div>
                          </td>

                          {/* Giá vốn */}
                          <td className="p-3 font-mono font-semibold text-slate-600">
                            {v.costPriceVND.toLocaleString("vi-VN")}đ
                          </td>

                          {/* Giá bán (Editable) */}
                          <td className="p-3">
                            <input
                              type="number"
                              step="1000"
                              value={v.sellingPriceVND}
                              onChange={(e) => handleVariantChange(idx, "sellingPriceVND", parseInt(e.target.value) || 0)}
                              className="w-28 text-xs font-bold text-slate-900 px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-orange-500"
                            />
                          </td>

                          {/* Margin % */}
                          <td className="p-3">
                            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${margin >= 35 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                              {margin}%
                            </span>
                          </td>

                          {/* Tồn kho (Editable) */}
                          <td className="p-3">
                            <input
                              type="number"
                              value={v.stockQuantity}
                              onChange={(e) => handleVariantChange(idx, "stockQuantity", parseInt(e.target.value) || 0)}
                              className="w-20 text-xs px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-orange-500"
                            />
                          </td>

                          {/* Nguồn 1688 */}
                          <td className="p-3 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.sourceAvailable ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                              {v.sourceAvailable ? "Còn hàng" : "Hết hàng"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: HÌNH ẢNH */}
          {activeTab === "media" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Toàn bộ hình ảnh gốc từ 1688 đã được đồng bộ. Bấm để chọn làm ảnh đại diện chính.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Ảnh chính */}
                <div className="relative rounded-xl border-2 border-orange-500 overflow-hidden group aspect-square">
                  <img
                    src={formData.primaryImage}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                    Ảnh Đại Diện
                  </span>
                </div>

                {/* Các ảnh gallery */}
                {formData.galleryImages.map((img, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      const newGallery = formData.galleryImages.filter((_, idx) => idx !== i);
                      newGallery.push(formData.primaryImage);
                      setFormData(prev => ({
                        ...prev,
                        primaryImage: img,
                        galleryImages: newGallery
                      }));
                    }}
                    className="relative rounded-xl border border-slate-200 overflow-hidden group aspect-square hover:border-orange-400 cursor-pointer transition-all"
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                      Đặt làm ảnh chính
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: CHẤT LƯỢNG LISTING */}
          {activeTab === "quality" && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 bg-orange-50/60 border border-orange-200 p-4 rounded-xl">
                <div className="w-16 h-16 rounded-full bg-orange-500 text-white flex items-center justify-center text-xl font-black">
                  {formData.qualityScore}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Điểm Sẵn Sàng Bán Hàng (Quality Readiness Score)
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Đánh giá theo 5 tiêu chuẩn khắt khe để đảm bảo tỷ lệ chuyển đổi cao khi chạy quảng cáo hoặc bán trên sàn.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 text-xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="font-semibold text-slate-800">Tiêu đề tiếng Việt tối ưu SEO (30 - 120 ký tự)</span>
                  </div>
                  <span className="font-bold text-emerald-600">+25 Điểm</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 text-xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="font-semibold text-slate-800">Bộ sưu tập hình ảnh đủ chuẩn (≥ 3 ảnh sắc nét)</span>
                  </div>
                  <span className="font-bold text-emerald-600">+20 Điểm</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 text-xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="font-semibold text-slate-800">Ma trận biến thể SKU đầy đủ giá và tồn kho</span>
                  </div>
                  <span className="font-bold text-emerald-600">+25 Điểm</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 text-xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="font-semibold text-slate-800">Biên lợi nhuận an toàn (Margin ≥ 35%)</span>
                  </div>
                  <span className="font-bold text-emerald-600">+20 Điểm</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
