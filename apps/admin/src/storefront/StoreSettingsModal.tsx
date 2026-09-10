import React, { useState, useEffect } from "react";
import {
  X,
  Store,
  QrCode,
  Truck,
  Phone,
  Building2,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { StorefrontConfig } from "@hub1688/shared-types";
import { AdminApi } from "../services/api";
import { useAccessibleDialog } from "../hooks/useAccessibleDialog";

interface StoreSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string, type?: "success" | "error") => void;
}

export const StoreSettingsModal: React.FC<StoreSettingsModalProps> = ({
  isOpen,
  onClose,
  onShowToast
}) => {
  const [formData, setFormData] = useState<StorefrontConfig>({
    storeName: "1688 SYNC STORE",
    tagline: "Hàng xưởng sỉ cao cấp - Giá tận gốc",
    hotline: "0988.888.888",
    zaloUrl: "https://zalo.me",
    address: "Hà Nội, Việt Nam",
    freeShipThresholdVND: 500000,
    bankName: "MBBank (Ngân Hàng Quân Đội)",
    bankAccountNo: "888899991688",
    bankAccountName: "CHU CUA HANG 1688",
    bannerTitle: "Khám Phá Nguồn Hàng Xưởng Sỉ Cao Cấp",
    bannerSubtitle: "Sản phẩm được tuyển chọn và kiểm định chất lượng nghiêm ngặt từ các xưởng sản xuất uy tín."
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const dialogRef = useAccessibleDialog<HTMLDivElement>(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      AdminApi.getStoreInfo()
        .then(res => {
          if (res.config) setFormData(res.config);
        })
        .catch(err => {
          console.warn("Could not fetch store info:", err);
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await AdminApi.updateStoreSettings(formData);
      onShowToast("Đã lưu cấu hình Cửa Hàng Trực Tiếp thành công!");
      onClose();
    } catch (err: any) {
      onShowToast(err.message || "Lỗi lưu cấu hình cửa hàng", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Cấu hình cửa hàng" className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Cấu Hình Web Bán Hàng Trực Tiếp (Storefront)</h3>
              <p className="text-[11px] text-slate-500">Thiết lập thông tin thương hiệu, hotline và tài khoản VietQR tự động</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng cấu hình cửa hàng"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Section 1: Thông tin thương hiệu */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-orange-500" />
              1. Thông Tin Cửa Hàng & Hotline
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tên Cửa Hàng / Brand</label>
                <input
                  type="text"
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hotline CSKH / Đặt Hàng</label>
                <input
                  type="text"
                  value={formData.hotline}
                  onChange={(e) => setFormData({ ...formData, hotline: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Khẩu Hiệu (Tagline)</label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Link Chat Zalo Tư Vấn</label>
                <input
                  type="text"
                  value={formData.zaloUrl || ""}
                  onChange={(e) => setFormData({ ...formData, zaloUrl: e.target.value })}
                  placeholder="https://zalo.me/0988888888"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Địa Chỉ Kho / Cửa Hàng</label>
              <input
                type="text"
                value={formData.address || ""}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Ví dụ: Tòa nhà 1688, Cầu Giấy, Hà Nội"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
              />
            </div>
          </div>

          {/* Section 2: Tài khoản VietQR */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-emerald-600" />
              2. Tài Khoản Ngân Hàng Tích Hợp VietQR Napas 247
            </h4>
            <p className="text-[11px] text-slate-500">
              Khách hàng khi chọn thanh toán Chuyển Khoản sẽ quét mã VietQR để thanh toán tự động đúng STK và số tiền.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ngân Hàng (Bank Name)</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="MBBank, VCB, Techcombank..."
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số Tài Khoản</label>
                <input
                  type="text"
                  value={formData.bankAccountNo}
                  onChange={(e) => setFormData({ ...formData, bankAccountNo: e.target.value })}
                  placeholder="Ví dụ: 888899991688"
                  className="w-full text-xs font-mono px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tên Chủ Tài Khoản</label>
                <input
                  type="text"
                  value={formData.bankAccountName}
                  onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                  placeholder="NGUYEN VAN A"
                  className="w-full text-xs uppercase px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 3: Vận chuyển & Freeship */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              3. Chính Sách Giao Hàng & Freeship
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ngưỡng Đơn Hàng Được Miễn Phí Vận Chuyển (VNĐ)
              </label>
              <input
                type="number"
                value={formData.freeShipThresholdVND}
                onChange={(e) => setFormData({ ...formData, freeShipThresholdVND: Number(e.target.value) || 0 })}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Mặc định 500.000đ. Đơn hàng đạt từ mức này trở lên sẽ được miễn phí vận chuyển.
              </p>
            </div>
          </div>

          {/* Section 4: Banner */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              4. Nội Dung Banner Khuyến Mãi Đầu Trang
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tiêu Đề Banner</label>
              <input
                type="text"
                value={formData.bannerTitle || ""}
                onChange={(e) => setFormData({ ...formData, bannerTitle: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nội Dung Chi Tiết Banner</label>
              <textarea
                rows={2}
                value={formData.bannerSubtitle || ""}
                onChange={(e) => setFormData({ ...formData, bannerSubtitle: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
              />
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all disabled:bg-slate-300"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Lưu Cấu Hình</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
