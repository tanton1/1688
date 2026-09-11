import React, { useEffect, useState } from "react";
import {
  X,
  CheckCircle2,
  QrCode,
  Truck,
  ShieldCheck,
  AlertCircle,
  CreditCard,
  Building2,
  Lock,
  ArrowRight
} from "lucide-react";
import { StorefrontConfig, StorefrontCheckoutRequest, CustomerOrder } from "@hub1688/shared-types";
import { calculateStorefrontPricing } from "@hub1688/shared-utils";
import { CartItem } from "./StoreCartDrawer";
import { AdminApi } from "../services/api";
import { useAccessibleDialog } from "../hooks/useAccessibleDialog";

interface StoreCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  config: StorefrontConfig;
  appliedDiscountCode?: string;
  onOrderSuccess: (order: CustomerOrder, qrCodeUrl?: string) => void;
  onShowToast: (msg: string, type?: "success" | "error") => void;
}

export const StoreCheckoutModal: React.FC<StoreCheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  config,
  appliedDiscountCode = "",
  onOrderSuccess,
  onShowToast
}) => {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"VIETQR" | "COD">("COD");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const dialogRef = useAccessibleDialog<HTMLDivElement>(isOpen, onClose);

  const bankTransferAvailable = Boolean(config.bankName && config.bankAccountNo && config.bankAccountName);
  useEffect(() => {
    if (!bankTransferAvailable && paymentMethod === "VIETQR") setPaymentMethod("COD");
  }, [bankTransferAvailable, paymentMethod]);

  if (!isOpen) return null;

  const totalAmount = items.reduce((sum, item) => sum + item.priceVND * item.quantity, 0);
  const normalizedDiscountCode = appliedDiscountCode.trim().toUpperCase();
  const pricing = calculateStorefrontPricing(totalAmount, config, normalizedDiscountCode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!customerName.trim()) {
      setFormError("Vui lòng nhập họ và tên người nhận");
      return;
    }

    const phoneClean = customerPhone.replace(/\D/g, "");
    if (phoneClean.length < 9 || phoneClean.length > 11) {
      setFormError("Số điện thoại không hợp lệ (cần từ 9 - 11 chữ số)");
      return;
    }

    if (!customerAddress.trim() || customerAddress.trim().length < 8) {
      setFormError("Vui lòng cung cấp địa chỉ giao hàng chi tiết (Số nhà, Tên đường, Quận/Huyện, Tỉnh/TP)");
      return;
    }

    setIsSubmitting(true);
    try {
      const checkoutPayload: StorefrontCheckoutRequest = {
        customerName: customerName.trim(),
        customerPhone: phoneClean,
        customerAddress: customerAddress.trim(),
        note: note.trim() || undefined,
        paymentMethod,
        discountCode: appliedDiscountCode || undefined,
        giftAddonsSelected: Array.from(new Set(items.flatMap(item => item.giftAddonsSelected || []))),
        items: items.map(item => ({
          productId: item.productId,
          skuCode: item.skuCode,
          sourceSkuId: item.sourceSkuId,
          variantName: `${item.productTitle} (${item.variantName})`,
          quantity: item.quantity,
          sellingPriceVND: item.priceVND,
          image: item.customizedPreviewUrl || item.image,
          customizationData: item.customizationData,
          customizedPreviewUrl: item.customizedPreviewUrl,
          customizationId: item.customizationId,
          customizationSchemaVersion: item.customizationSchemaVersion,
          giftAddonsSelected: item.giftAddonsSelected
        }))
      };

      const res = await AdminApi.checkoutStoreOrder(checkoutPayload);
      if (res.success && res.order) {
        onOrderSuccess(res.order, res.qrCodeUrl);
      } else {
        throw new Error(res.message || "Không thể khởi tạo đơn hàng");
      }
    } catch (err: any) {
      console.error("Lỗi đặt hàng:", err);
      setFormError(err.message || "Đặt hàng thất bại. Vui lòng kiểm tra lại thông tin");
      onShowToast(err.message || "Lỗi tạo đơn hàng", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Thanh toán đơn hàng" className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Thông Tin Đặt Hàng & Thanh Toán</h3>
              <p className="text-[11px] text-slate-500">Giá, mã ưu đãi và tồn kho được máy chủ xác minh khi tạo đơn</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng thanh toán"
            className="w-11 h-11 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 inline-flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {formError && (
            <div role="alert" aria-live="assertive" className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* 1. Thông tin người nhận */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-orange-600 text-white flex items-center justify-center text-[10px]">1</span>
              Thông Tin Người Nhận Hàng
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="checkout-customer-name" className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên người nhận <span className="text-rose-500">*</span>
                </label>
                <input
                  id="checkout-customer-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A…"
                  className="w-full min-h-11 text-xs px-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
                  required
                />
              </div>

              <div>
                <label htmlFor="checkout-customer-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                  Số điện thoại nhận hàng <span className="text-rose-500">*</span>
                </label>
                <input
                  id="checkout-customer-phone"
                  name="tel"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Ví dụ: 0912345678…"
                  className="w-full min-h-11 text-xs px-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="checkout-customer-address" className="block text-xs font-semibold text-slate-700 mb-1">
                Địa chỉ giao hàng chi tiết <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="checkout-customer-address"
                name="street-address"
                autoComplete="street-address"
                rows={2}
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Số nhà, tên ngõ, tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố…"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
                required
              />
            </div>

            <div>
              <label htmlFor="checkout-note" className="block text-xs font-semibold text-slate-700 mb-1">
                Ghi chú giao hàng (Tùy chọn)
              </label>
              <input
                id="checkout-note"
                name="note"
                type="text"
                autoComplete="off"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi đến 15 phút…"
                className="w-full min-h-11 text-xs px-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
              />
            </div>
          </div>

          {/* 2. Phương thức thanh toán */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-orange-600 text-white flex items-center justify-center text-[10px]">2</span>
              Phương Thức Thanh Toán
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option VietQR */}
              {bankTransferAvailable && <label
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between relative ${
                  paymentMethod === "VIETQR"
                    ? "border-orange-500 bg-orange-50/50 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="VIETQR"
                    checked={paymentMethod === "VIETQR"}
                    onChange={() => setPaymentMethod("VIETQR")}
                    className="mt-0.5 text-orange-600 focus:ring-orange-500"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">Quét Mã VietQR</span>
                      <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-1.5 py-0.2 rounded">
                        Khuyên Dùng
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Quét bằng ứng dụng ngân hàng hỗ trợ VietQR. Mã QR điền sẵn tài khoản, số tiền và nội dung chuyển khoản.
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-2 text-[10px] text-emerald-700 font-semibold">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Mã QR tự động điền STK & Số tiền</span>
                </div>
              </label>}

              {/* Option COD */}
              <label
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between relative ${
                  paymentMethod === "COD"
                    ? "border-orange-500 bg-orange-50/50 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="COD"
                    checked={paymentMethod === "COD"}
                    onChange={() => setPaymentMethod("COD")}
                    className="mt-0.5 text-orange-600 focus:ring-orange-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900">Thanh Toán Khi Nhận Hàng (COD)</span>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Thanh toán tiền mặt cho đơn vị vận chuyển khi đơn hàng được giao tới địa chỉ nhận.
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-2 text-[10px] text-slate-600 font-semibold">
                  <Truck className="w-3.5 h-3.5 text-orange-500" />
                  <span>Không cần chuyển khoản trước</span>
                </div>
              </label>
            </div>
          </div>

          {/* 3. Tóm tắt giỏ hàng & Chi phí */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Đơn Hàng ({items.length} mặt hàng)</span>
              {appliedDiscountCode && <span className="text-[11px] text-emerald-600 font-semibold">Mã {normalizedDiscountCode}</span>}
            </h4>

            <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-200/50 text-xs">
              {items.map((it, idx) => (
                <div key={idx} className="pt-1.5 first:pt-0 flex justify-between items-center text-[11px]">
                  <span className="text-slate-700 truncate max-w-[280px]">
                    {it.quantity}x {it.productTitle} ({it.variantName})
                  </span>
                  <span className="font-semibold text-slate-900 shrink-0">
                    {(it.priceVND * it.quantity).toLocaleString("vi-VN")}đ
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Tiền hàng:</span>
                <span className="font-semibold">{totalAmount.toLocaleString("vi-VN")}đ</span>
              </div>
              {pricing.discountAmountVND > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Giảm giá:</span>
                  <span className="font-semibold">-{pricing.discountAmountVND.toLocaleString("vi-VN")}đ</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Phí vận chuyển:</span>
                <span className="font-semibold text-emerald-600">
                  {pricing.freeShipping ? "Miễn phí (Freeship)" : `${pricing.shippingFeeVND.toLocaleString("vi-VN")}đ`}
                </span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t border-slate-200">
                <span>Tổng cộng phải trả:</span>
                <span className="text-base text-orange-600">
                  {pricing.finalTotalVND.toLocaleString("vi-VN")}đ
                </span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm text-white flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 transition-all active:scale-98 cursor-pointer ${
                isSubmitting
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang Khởi Tạo Đơn Hàng...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>
                    Xác Nhận Đặt Hàng ({pricing.finalTotalVND.toLocaleString("vi-VN")}đ)
                  </span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
            <p className="text-center text-[10px] text-slate-400 mt-2">
              Tổng tiền cuối cùng trong phản hồi tạo đơn là số tiền cần thanh toán.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
