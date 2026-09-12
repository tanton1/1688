import React, { useState } from "react";
import {
  CheckCircle2,
  Copy,
  Check,
  QrCode,
  Truck,
  Phone,
  ArrowRight,
  PackageCheck,
  Sparkles
} from "lucide-react";
import { CustomerOrder, StorefrontConfig } from "@hub1688/shared-types";
import { useAccessibleDialog } from "../hooks/useAccessibleDialog";

interface StoreOrderSuccessModalProps {
  isOpen: boolean;
  order: CustomerOrder | null;
  qrCodeUrl?: string;
  config: StorefrontConfig;
  onClose: () => void;
  onOpenTracker: (orderNumber: string) => void;
}

export const StoreOrderSuccessModal: React.FC<StoreOrderSuccessModalProps> = ({
  isOpen,
  order,
  qrCodeUrl,
  config,
  onClose,
  onOpenTracker
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const dialogRef = useAccessibleDialog<HTMLDivElement>(isOpen && Boolean(order), onClose);

  if (!isOpen || !order) return null;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isVietQR = order.paymentMethod === "VIETQR";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Đặt hàng thành công" className="relative flex min-h-[100dvh] w-screen flex-col overflow-hidden border-0 bg-white shadow-2xl text-slate-800">
        {/* Banner Success */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-6 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center mx-auto shadow-inner animate-in zoom-in">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-black tracking-tight">Đặt Hàng Thành Công!</h3>
          <p className="text-xs text-emerald-100">
            Cảm ơn bạn đã tin tưởng mua sắm. Mã đơn hàng của bạn là:
          </p>
          <div className="inline-block px-3 py-1 bg-white/20 rounded-full font-mono font-black text-sm tracking-wider backdrop-blur-xs">
            {order.orderNumber}
          </div>
        </div>

        <div className="mx-auto w-full max-w-3xl flex-1 space-y-5 overflow-y-auto p-6">
          {/* VietQR Payment Box */}
          {isVietQR && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-50 via-amber-50 to-white border-2 border-orange-300 space-y-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-orange-600" />
                <h4 className="text-xs font-black text-orange-950 uppercase tracking-wide">
                  Quét Mã VietQR Thanh Toán
                </h4>
              </div>

              {/* QR Image */}
              {qrCodeUrl && (
                <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-orange-200 shadow-xs">
                  <img
                    src={qrCodeUrl}
                    alt="VietQR Payment"
                    className="w-52 h-52 object-contain rounded-lg"
                  />
                  <p className="text-[10px] text-slate-500 mt-2 text-center">
                    Mở ứng dụng Ngân hàng hoặc Ví điện tử để quét mã thanh toán tự động
                  </p>
                </div>
              )}

              {/* Bank Details & Copy */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-orange-100">
                  <span className="text-slate-500">Ngân hàng:</span>
                  <span className="font-bold text-slate-800">{config.bankName}</span>
                </div>

                <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-orange-100">
                  <span className="text-slate-500">Số tài khoản:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-orange-700">{config.bankAccountNo}</span>
                    <button
                      onClick={() => handleCopy(config.bankAccountNo, "account")}
                      className="p-1 hover:bg-slate-100 rounded text-slate-500"
                      title="Sao chép STK"
                    >
                      {copiedField === "account" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-orange-100">
                  <span className="text-slate-500">Chủ tài khoản:</span>
                  <span className="font-bold text-slate-800 uppercase">{config.bankAccountName}</span>
                </div>

                <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-orange-100">
                  <span className="text-slate-500">Số tiền:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-orange-600">
                      {order.totalAmountVND.toLocaleString("vi-VN")}đ
                    </span>
                    <button
                      onClick={() => handleCopy(order.totalAmountVND.toString(), "amount")}
                      className="p-1 hover:bg-slate-100 rounded text-slate-500"
                      title="Sao chép số tiền"
                    >
                      {copiedField === "amount" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-orange-100">
                  <span className="text-slate-500">Nội dung CK:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-900">{order.orderNumber}</span>
                    <button
                      onClick={() => handleCopy(order.orderNumber, "memo")}
                      className="p-1 hover:bg-slate-100 rounded text-slate-500"
                      title="Sao chép nội dung"
                    >
                      {copiedField === "memo" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COD Notice */}
          {!isVietQR && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
              <Truck className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-slate-900">Phương thức: Thu tiền khi nhận hàng (COD)</p>
                <p className="text-slate-600 leading-relaxed">
                  Tổng tiền cần thanh toán cho bưu tá là:{" "}
                  <strong className="text-orange-600">{order.totalAmountVND.toLocaleString("vi-VN")}đ</strong>.
                  Vui lòng đối chiếu mã đơn và số tiền trước khi thanh toán.
                </p>
              </div>
            </div>
          )}

          {/* Recipient Details */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
            <p className="font-bold text-slate-800">Thông tin người nhận:</p>
            <p className="text-slate-600">
              {order.customerName} - <span className="font-mono">{order.customerPhone}</span>
            </p>
            <p className="text-slate-600 truncate" title={order.customerAddress}>
              {order.customerAddress}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => onOpenTracker(order.orderNumber)}
              className="w-full py-2.5 px-4 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Tra Cứu Tình Trạng Đơn Hàng Này</span>
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/25 flex items-center justify-center gap-1.5 transition-all"
            >
              <span>Tiếp Tục Mua Sắm</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
