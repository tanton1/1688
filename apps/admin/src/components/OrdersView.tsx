import React, { useState, useEffect } from "react";
import { CustomerOrder, OrderSourcingStatus } from "@hub1688/shared-types";
import { AdminApi } from "../services/api";
import {
  ShoppingBag,
  ExternalLink,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  Package,
  Truck,
  AlertCircle,
  RefreshCw,
  Search,
  SlidersHorizontal,
  ChevronRight,
  Send,
  PlusCircle
} from "lucide-react";

interface OrdersViewProps {
  onShowToast: (message: string, type?: "success" | "error") => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ onShowToast }) => {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const res = await (AdminApi as any).getOrders();
      setOrders(res.orders || []);
      setStats(res.stats || null);
    } catch (err: any) {
      onShowToast(err.message || "Lỗi khi tải danh sách đơn hàng", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: OrderSourcingStatus) => {
    setUpdatingId(orderId);
    try {
      await (AdminApi as any).updateOrderStatus(orderId, newStatus);
      setOrders(prev =>
        prev.map(o => (o.id === orderId ? { ...o, status: newStatus, updatedAt: new Date().toISOString() } : o))
      );
      onShowToast("Đã cập nhật trạng thái đặt hàng thành công!");
    } catch (err: any) {
      onShowToast(err.message || "Lỗi khi cập nhật trạng thái", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchNo = o.orderNumber.toLowerCase().includes(q);
      const matchCustomer = o.customerName.toLowerCase().includes(q);
      const matchPhone = o.customerPhone?.toLowerCase().includes(q);
      const matchItem = o.items.some(i => i.variantName.toLowerCase().includes(q) || i.skuCode.toLowerCase().includes(q));
      if (!matchNo && !matchCustomer && !matchPhone && !matchItem) return false;
    }
    return true;
  });

  const getStatusBadge = (status: OrderSourcingStatus) => {
    switch (status) {
      case "PENDING_SOURCING":
        return { label: "Chờ Đặt Xưởng 1688", className: "bg-rose-50 text-rose-700 border-rose-200" };
      case "ORDERED_1688":
        return { label: "Đã Đặt Xưởng 1688", className: "bg-amber-50 text-amber-700 border-amber-200" };
      case "IN_TRANSIT":
        return { label: "Đang Vận Chuyển TQ-VN", className: "bg-blue-50 text-blue-700 border-blue-200" };
      case "COMPLETED":
        return { label: "Hoàn Thành", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "CANCELLED":
        return { label: "Đã Hủy", className: "bg-slate-100 text-slate-600 border-slate-200" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-orange-600" />
            Trung Tâm Đơn Hàng & Mua Hộ Nguồn 1688 (Sourcing Assistant)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tiếp nhận đơn hàng tự động từ WooCommerce / Shopify, đối chiếu mã SKU và mở trực tiếp link xưởng 1688 để đặt hàng trong 1 cú nhấp.
          </p>
        </div>

        <button
          type="button"
          onClick={loadOrders}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-orange-600" : ""}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tổng Số Đơn Hàng</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{orders.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Từ WooCommerce & Shopify</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Đơn Chờ Đặt Xưởng</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center animate-pulse">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-600 mt-2">
            {orders.filter(o => o.status === "PENDING_SOURCING").length}
          </div>
          <div className="text-[11px] text-rose-700 mt-1 font-medium">Cần đặt hàng nhà máy ngay</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tổng Doanh Thu</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {orders.reduce((sum, o) => sum + o.totalAmountVND, 0).toLocaleString("vi-VN")}đ
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Tổng giá trị đơn khách đặt</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Lợi Nhuận Ước Tính</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-2">
            +{orders.reduce((sum, o) => sum + o.estimatedProfitVND, 0).toLocaleString("vi-VN")}đ
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 font-bold">
            Biên lợi nhuận ~{stats?.avgProfitMargin || 58}%
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo Mã đơn, Khách hàng, SĐT, Tên sản phẩm..."
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">Trạng thái:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium"
          >
            <option value="ALL">Tất Cả Đơn Hàng</option>
            <option value="PENDING_SOURCING">🔴 Chờ Đặt Xưởng 1688</option>
            <option value="ORDERED_1688">🟡 Đã Đặt Xưởng 1688</option>
            <option value="IN_TRANSIT">🔵 Đang Vận Chuyển TQ-VN</option>
            <option value="COMPLETED">🟢 Đã Hoàn Thành</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase text-[11px]">
                <th className="py-3 px-4">Đơn Hàng</th>
                <th className="py-3 px-4">Khách Hàng</th>
                <th className="py-3 px-4">Chi Tiết Sản Phẩm & Nguồn 1688</th>
                <th className="py-3 px-4 text-right">Doanh Thu / Lợi Nhuận</th>
                <th className="py-3 px-4 text-center">Trạng Thái Xử Lý</th>
                <th className="py-3 px-4 text-center">Tác Vụ Mua Hàng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map(order => {
                const badge = getStatusBadge(order.status);
                return (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Cột 1: Mã đơn & Kênh */}
                    <td className="py-3.5 px-4 align-top">
                      <span className="font-mono font-bold text-slate-900 block text-xs">
                        {order.orderNumber}
                      </span>
                      {order.platform === "STOREFRONT" ? (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200 inline-flex items-center gap-1 mt-1">
                          🛍️ Web Bán Hàng
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 inline-block mt-1">
                          {order.platform}
                        </span>
                      )}
                      {order.paymentMethod && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border block mt-1 w-fit ${
                          order.paymentMethod === "VIETQR"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {order.paymentMethod === "VIETQR" ? "QR Chuyển Khoản" : "Thu Hộ COD"}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 block mt-1">
                        {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                      </span>
                    </td>

                    {/* Cột 2: Khách hàng */}
                    <td className="py-3.5 px-4 align-top">
                      <p className="font-bold text-slate-900">{order.customerName}</p>
                      {order.customerPhone && (
                        <p className="text-slate-500 font-mono text-[11px] mt-0.5">{order.customerPhone}</p>
                      )}
                      {order.customerAddress && (
                        <p className="text-slate-500 text-[11px] mt-0.5 max-w-[200px] truncate" title={order.customerAddress}>
                          {order.customerAddress}
                        </p>
                      )}
                    </td>

                    {/* Cột 3: Chi tiết items */}
                    <td className="py-3.5 px-4 align-top space-y-2">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2.5">
                          {item.image && (
                            <img
                              src={item.image}
                              alt="thumb"
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                          )}
                          <div>
                            <p className="font-semibold text-slate-900 text-xs">{item.variantName}</p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              <span className="font-mono">{item.skuCode}</span>
                              <span>•</span>
                              <span>SL: <strong>x{item.quantity}</strong></span>
                              <span>•</span>
                              <span>Giá bán: {item.sellingPriceVND.toLocaleString("vi-VN")}đ</span>
                            </div>
                            {item.sourceProductId && (
                              <p className="text-[10px] text-orange-600 font-mono mt-0.5">
                                Xưởng 1688 Offer #{item.sourceProductId}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </td>

                    {/* Cột 4: Doanh thu & Lợi nhuận */}
                    <td className="py-3.5 px-4 align-top text-right">
                      <p className="font-bold text-slate-900 text-sm">
                        {order.totalAmountVND.toLocaleString("vi-VN")}đ
                      </p>
                      <p className="text-[11px] font-bold text-emerald-600 mt-0.5">
                        +{order.estimatedProfitVND.toLocaleString("vi-VN")}đ lời
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Vốn: {order.totalCostVND.toLocaleString("vi-VN")}đ
                      </p>
                    </td>

                    {/* Cột 5: Trạng thái & Dropdown chuyển */}
                    <td className="py-3.5 px-4 align-top text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.className}`}>
                        {badge.label}
                      </span>

                      <div className="mt-2">
                        <select
                          value={order.status}
                          disabled={updatingId === order.id}
                          onChange={(e) => handleUpdateStatus(order.id, e.target.value as OrderSourcingStatus)}
                          className="text-[11px] px-2 py-1 bg-slate-50 border border-slate-300 rounded-md font-semibold text-slate-700"
                        >
                          <option value="PENDING_SOURCING">Chờ Đặt Xưởng</option>
                          <option value="ORDERED_1688">Đã Đặt Xưởng 1688</option>
                          <option value="IN_TRANSIT">Đang Vận Chuyển</option>
                          <option value="COMPLETED">Đã Hoàn Thành</option>
                          <option value="CANCELLED">Đã Hủy</option>
                        </select>
                      </div>
                    </td>

                    {/* Cột 6: Nút Đặt hàng trên 1688 */}
                    <td className="py-3.5 px-4 align-top text-center">
                      {order.items[0]?.source1688Url ? (
                        <a
                          href={order.items[0].source1688Url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
                          title="Mở trực tiếp trang sản phẩm xưởng 1688"
                        >
                          <span>Mua Trên 1688</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400">Chưa có link</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Không tìm thấy đơn hàng nào phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
