import React, { useState, useEffect } from "react";
import {
  X,
  Search,
  PackageCheck,
  Truck,
  Clock,
  CheckCircle2,
  AlertCircle,
  QrCode
} from "lucide-react";
import { CustomerOrder, OrderSourcingStatus } from "@hub1688/shared-types";
import { AdminApi } from "../services/api";
import { useAccessibleDialog } from "../hooks/useAccessibleDialog";

interface StoreOrderTrackerModalProps {
  isOpen: boolean;
  initialQuery?: string;
  onClose: () => void;
}

export const StoreOrderTrackerModal: React.FC<StoreOrderTrackerModalProps> = ({
  isOpen,
  initialQuery = "",
  onClose
}) => {
  const [orderNumber, setOrderNumber] = useState(initialQuery);
  const [customerPhone, setCustomerPhone] = useState("");
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const dialogRef = useAccessibleDialog<HTMLDivElement>(isOpen, onClose);

  useEffect(() => {
    if (initialQuery) setOrderNumber(initialQuery);
  }, [initialQuery]);

  if (!isOpen) return null;

  const performSearch = async () => {
    if (!orderNumber.trim() || !customerPhone.trim()) return;
    setIsLoading(true);
    setErrorMessage("");
    setSearched(true);
    try {
      const res = await AdminApi.trackStoreOrder(orderNumber.trim(), customerPhone.trim());
      setOrders(res.orders || []);
    } catch (err: any) {
      setOrders([]);
      setErrorMessage(err.message || "Không tìm thấy thông tin đơn hàng");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };

  const getStatusInfo = (status: OrderSourcingStatus) => {
    switch (status) {
      case "PENDING_SOURCING":
        return { label: "Đã Tiếp Nhận Đơn - Chờ Xử Lý", color: "text-amber-600 bg-amber-50 border-amber-200" };
      case "ORDERED_1688":
        return { label: "Đang Chuẩn Bị Hàng Từ Xưởng", color: "text-blue-600 bg-blue-50 border-blue-200" };
      case "IN_TRANSIT":
        return { label: "Đang Vận Chuyển Về Kho VN", color: "text-indigo-600 bg-indigo-50 border-indigo-200" };
      case "COMPLETED":
        return { label: "Đã Giao Hàng Thành Công", color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
      case "CANCELLED":
        return { label: "Đơn Hàng Đã Hủy", color: "text-slate-600 bg-slate-100 border-slate-200" };
      default:
        return { label: status, color: "text-slate-600 bg-slate-100 border-slate-200" };
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200" role="presentation">
      <div ref={dialogRef} tabIndex={-1} className="relative bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="order-tracker-title">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 id="order-tracker-title" className="font-bold text-sm text-slate-900">Tra Cứu Tình Trạng Đơn Hàng</h3>
              <p className="text-[11px] text-slate-500">Xác minh bằng mã đơn và số điện thoại người nhận</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng tra cứu đơn hàng"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Search Box */}
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="relative">
              <label htmlFor="tracking-order-number" className="block text-[11px] font-bold text-slate-700 mb-1.5">Mã đơn hàng</label>
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 bottom-3" />
              <input
                id="tracking-order-number"
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Ví dụ: HUB-819230"
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
              />
            </div>
            <div>
              <label htmlFor="tracking-phone" className="block text-[11px] font-bold text-slate-700 mb-1.5">Số điện thoại nhận hàng</label>
              <input id="tracking-phone" type="tel" autoComplete="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Ví dụ: 0912345678" className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-hidden" />
            </div>
            <button
              type="submit"
              disabled={isLoading || !orderNumber.trim() || !customerPhone.trim()}
              className="w-full justify-center px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all disabled:bg-slate-300 flex items-center gap-1.5"
            >
              {isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Tra Cứu</span>
              )}
            </button>
          </form>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Results List */}
          {searched && !isLoading && orders.length === 0 && !errorMessage && (
            <div className="text-center py-8 text-slate-400 space-y-2">
              <PackageCheck className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs">Không tìm thấy đơn hàng khớp với thông tin xác minh.</p>
            </div>
          )}

          {orders.map(order => {
            const statusBadge = getStatusInfo(order.status);
            return (
              <div key={order.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono font-black text-xs text-slate-900 block">
                      {order.orderNumber}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(order.createdAt).toLocaleString("vi-VN")}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusBadge.color}`}>
                    {statusBadge.label}
                  </span>
                </div>

                <div className="text-xs space-y-1 bg-white p-3 rounded-xl border border-slate-100">
                  <p className="text-slate-700">
                    <strong>Người nhận:</strong> {order.customerName} ({order.customerPhone})
                  </p>
                  <p className="text-slate-500 text-[11px] truncate">
                    <strong>Địa chỉ:</strong> {order.customerAddress}
                  </p>
                  <p className="text-slate-700">
                    <strong>Hình thức:</strong> {order.paymentMethod === "VIETQR" ? "Quét mã VietQR" : "Thanh toán khi nhận (COD)"}
                  </p>
                </div>

                {/* Items */}
                <div className="space-y-1.5 divide-y divide-slate-100">
                  {order.items.map((it, idx) => (
                    <div key={idx} className="pt-1.5 first:pt-0 flex justify-between text-xs">
                      <span className="text-slate-700 truncate max-w-[280px]">
                        {it.quantity}x {it.variantName}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {(it.sellingPriceVND * it.quantity).toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Tổng thanh toán:</span>
                  <span className="font-black text-orange-600 text-sm">
                    {order.totalAmountVND.toLocaleString("vi-VN")}đ
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
