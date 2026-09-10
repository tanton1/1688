import React from "react";
import {
  X,
  Trash2,
  ShoppingBag,
  ArrowRight,
  Truck,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { StorefrontConfig } from "@hub1688/shared-types";

export interface CartItem {
  productId: string;
  skuCode: string;
  variantName: string;
  productTitle: string;
  image?: string;
  priceVND: number;
  quantity: number;
}

interface StoreCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (skuCode: string, qty: number) => void;
  onRemoveItem: (skuCode: string) => void;
  onClearCart: () => void;
  onOpenCheckout: () => void;
  config: StorefrontConfig;
}

export const StoreCartDrawer: React.FC<StoreCartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOpenCheckout,
  config
}) => {
  if (!isOpen) return null;

  const totalAmount = items.reduce((sum, item) => sum + item.priceVND * item.quantity, 0);
  const freeShipThreshold = config.freeShipThresholdVND || 500000;
  const isFreeShip = totalAmount >= freeShipThreshold;
  const diffToFreeShip = Math.max(0, freeShipThreshold - totalAmount);
  const progressPercent = Math.min(100, Math.round((totalAmount / freeShipThreshold) * 100));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-250">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Giỏ Hàng Của Bạn</h3>
                <p className="text-[11px] text-slate-500">{items.length} món đã chọn</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {items.length > 0 && (
                <button
                  onClick={onClearCart}
                  className="text-[11px] text-rose-600 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50 font-semibold"
                  title="Xóa toàn bộ giỏ"
                >
                  Xóa hết
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Freeship Progress Banner */}
          <div className="px-5 py-3 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <div className="flex items-center gap-1.5 text-orange-700">
                <Truck className="w-3.5 h-3.5" />
                <span>
                  {isFreeShip
                    ? "🎉 Chúc mừng! Bạn được MIỄN PHÍ VẬN CHUYỂN"
                    : `Mua thêm ${diffToFreeShip.toLocaleString("vi-VN")}đ để Freeship`}
                </span>
              </div>
              <span className="text-[10px] text-orange-600">{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-orange-200/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 divide-y divide-slate-100">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center text-orange-400">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">Giỏ hàng đang trống</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Hãy lựa chọn những sản phẩm ưng ý từ danh mục xưởng sỉ và thêm vào giỏ nhé!
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="mt-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Tiếp Tục Mua Sắm
                </button>
              </div>
            ) : (
              items.map((item, idx) => (
                <div key={idx} className="pt-4 first:pt-0 flex gap-3.5">
                  <img
                    src={item.image || "https://placehold.co/80x80?text=San+Pham"}
                    alt={item.productTitle}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                  />

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                        {item.productTitle}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Phân loại: <span className="text-orange-700 font-semibold">{item.variantName}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.skuCode, item.quantity - 1)}
                          className="px-2 py-0.5 hover:bg-slate-200 text-slate-600 font-bold text-xs"
                        >
                          -
                        </button>
                        <span className="px-2.5 py-0.5 font-bold text-xs bg-white text-slate-900 min-w-[24px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.skuCode, item.quantity + 1)}
                          className="px-2 py-0.5 hover:bg-slate-200 text-slate-600 font-bold text-xs"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">
                          {(item.priceVND * item.quantity).toLocaleString("vi-VN")}đ
                        </span>
                        <button
                          onClick={() => onRemoveItem(item.skuCode)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Xóa món"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout */}
          {items.length > 0 && (
            <div className="p-5 border-t border-slate-200 bg-slate-50/50 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Tạm tính ({items.reduce((s, i) => s + i.quantity, 0)} cái):</span>
                  <span className="font-semibold text-slate-900">{totalAmount.toLocaleString("vi-VN")}đ</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Phí vận chuyển:</span>
                  <span className="font-semibold text-emerald-600">
                    {isFreeShip ? "Miễn Phí (Freeship)" : "30.000đ"}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Tổng thanh toán:</span>
                  <span className="text-base text-orange-600">
                    {(totalAmount + (isFreeShip ? 0 : 30000)).toLocaleString("vi-VN")}đ
                  </span>
                </div>
              </div>

              <button
                onClick={onOpenCheckout}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
              >
                <span>Tiến Hành Đặt Hàng</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Hỗ trợ VietQR Quét Mã Ngân Hàng & COD Tận Nhà</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
