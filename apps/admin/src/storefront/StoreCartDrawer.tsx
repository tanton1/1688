import React, { useState } from "react";
import {
  X,
  Trash2,
  ShoppingBag,
  ArrowRight,
  Truck,
  Sparkles,
  ShieldCheck,
  Tag
} from "lucide-react";
import { StorefrontConfig } from "@hub1688/shared-types";
import { calculateStorefrontPricing } from "@hub1688/shared-utils";
import { useAccessibleDialog } from "../hooks/useAccessibleDialog";

const formatCustomizationValue = (value: unknown): string => {
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (Array.isArray(value)) return `${value.length} mục`;
  if (value && typeof value === "object" && typeof (value as { url?: unknown }).url === "string") return "Ảnh đã tải";
  return String(value ?? "");
};

export interface CartItem {
  productId: string;
  skuCode: string;
  sourceSkuId: string;
  variantName: string;
  productTitle: string;
  image?: string;
  priceVND: number;
  quantity: number;
  maxQuantity: number;
  customizationData?: Record<string, any>;
  customizedPreviewUrl?: string;
  customizationId?: string;
  customizationSchemaVersion?: number;
  giftAddonsSelected?: string[];
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
  appliedDiscountCode?: string;
  onApplyDiscountCode?: (code: string) => void;
}

export const StoreCartDrawer: React.FC<StoreCartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOpenCheckout,
  config,
  appliedDiscountCode = "",
  onApplyDiscountCode
}) => {
  const [couponInput, setCouponInput] = useState(appliedDiscountCode);
  const [couponMsg, setCouponMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const dialogRef = useAccessibleDialog<HTMLDivElement>(isOpen, onClose);

  if (!isOpen) return null;

  const rawSubtotal = items.reduce((sum, item) => sum + item.priceVND * item.quantity, 0);

  const upperCode = appliedDiscountCode.trim().toUpperCase();
  const pricing = calculateStorefrontPricing(rawSubtotal, config, upperCode);
  const freeShipThreshold = Math.max(0, config.freeShipThresholdVND);
  const diffToFreeShip = Math.max(0, freeShipThreshold - rawSubtotal);
  const progressPercent = freeShipThreshold > 0
    ? Math.min(100, Math.round((rawSubtotal / freeShipThreshold) * 100))
    : 0;
  const activeDiscountRules = (config.discountRules || []).filter(rule => rule.active);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    const testCode = couponInput.trim().toUpperCase();
    const candidate = calculateStorefrontPricing(rawSubtotal, config, testCode);
    if (candidate.couponValid) {
      setCouponMsg({ text: `Áp dụng mã ${testCode} thành công! 🎉`, isError: false });
      onApplyDiscountCode?.(testCode);
    } else {
      setCouponMsg({ text: "Mã ưu đãi không hợp lệ hoặc đã hết hạn", isError: true });
      onApplyDiscountCode?.("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Đóng giỏ hàng"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Giỏ hàng"
          className="w-screen max-w-full sm:max-w-md bg-white shadow-2xl flex flex-col border-l border-stone-200 animate-in slide-in-from-right duration-250"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-stone-900 flex items-center gap-1.5">
                  Giỏ Hàng Của Bạn
                  <span className="bg-orange-100 text-orange-700 text-[10px] font-black px-1.5 py-0.5 rounded-md border border-orange-200">
                    CRAFT CART
                  </span>
                </h3>
                <p className="text-[11px] text-stone-500 font-medium">{items.length} món quà đã chọn</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={onClearCart}
                  className="min-h-11 px-3 text-[11px] text-rose-600 hover:text-rose-700 rounded-lg hover:bg-rose-50 font-bold cursor-pointer"
                  title="Xóa toàn bộ giỏ"
                >
                  Xóa hết
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng giỏ hàng"
                className="w-11 h-11 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer inline-flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Freeship Progress Banner */}
          {(freeShipThreshold > 0 || pricing.freeShipping) && <div className="px-4 sm:px-5 py-3 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border-b border-orange-100">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <div className="flex items-center gap-1.5 text-orange-800">
                <Truck className="w-3.5 h-3.5 text-orange-600" />
                <span>
                  {pricing.freeShipping
                    ? "🎉 Tuyệt vời! Bạn được MIỄN PHÍ VẬN CHUYỂN"
                    : `Mua thêm ${diffToFreeShip.toLocaleString("vi-VN")}đ để Freeship`}
                </span>
              </div>
              <span className="text-[10px] font-black text-orange-600">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-orange-200/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>}

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 divide-y divide-stone-100">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center text-orange-400 shadow-inner">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-stone-800">Giỏ hàng đang trống</h4>
                  <p className="text-xs text-stone-400 mt-1 max-w-xs">
                    Hãy khám phá và tùy biến những món quà ý nghĩa để thêm vào giỏ nhé!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-2 px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/20 cursor-pointer"
                >
                  Tiếp Tục Mua Sắm
                </button>
              </div>
            ) : (
              items.map((item, idx) => (
                <div key={idx} className="pt-4 first:pt-0 flex gap-3">
                  {/* Thumbnail */}
                  <div className="relative shrink-0">
                    {item.customizedPreviewUrl || item.image ? (
                      <img
                        src={item.customizedPreviewUrl || item.image}
                        alt={item.productTitle}
                        width={72}
                        height={72}
                        className="w-[72px] h-[72px] rounded-xl object-cover border border-stone-200 shadow-xs"
                      />
                    ) : (
                      <div className="w-[72px] h-[72px] rounded-xl border border-stone-200 bg-stone-100 text-stone-400 flex items-center justify-center" aria-label="Sản phẩm chưa có ảnh">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                    )}
                    {item.customizedPreviewUrl && (
                      <span className="absolute -bottom-1 -right-1 bg-orange-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full shadow-xs flex items-center gap-0.5">
                        <Sparkles size={8} /> Custom
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-stone-900 line-clamp-1">
                        {item.productTitle}
                      </h4>
                      <p className="text-[11px] text-stone-500 font-medium mt-0.5">
                        Phân loại: <span className="text-stone-800 font-bold">{item.variantName}</span>
                      </p>

                      {/* Display Customization Details if any */}
                      {item.customizationData && Object.keys(item.customizationData).length > 0 && (
                        <div className="mt-1 p-1.5 rounded-lg bg-orange-50/80 border border-orange-200/70 text-[10px] space-y-0.5 text-orange-950">
                          {Object.entries(item.customizationData).slice(0, 3).map(([k, val]) => (
                            <div key={k} className="flex items-center gap-1 truncate">
                              <span className="font-bold text-orange-800 shrink-0">
                                {k.replace(/_/g, " ").toUpperCase()}:
                              </span>
                              <span className="truncate">{formatCustomizationValue(val)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-stone-300 rounded-lg overflow-hidden bg-stone-50">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.skuCode, item.quantity - 1)}
                          aria-label={`Giảm số lượng ${item.productTitle}`}
                          className="w-11 h-11 hover:bg-stone-200 text-stone-700 font-bold text-base cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-2.5 py-0.5 font-bold text-xs bg-white text-stone-900 min-w-[24px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.skuCode, item.quantity + 1)}
                          disabled={item.quantity >= item.maxQuantity}
                          aria-label={`Tăng số lượng ${item.productTitle}`}
                          className="w-11 h-11 hover:bg-stone-200 text-stone-700 font-bold text-base cursor-pointer disabled:text-stone-300 disabled:cursor-not-allowed"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-orange-600">
                          {(item.priceVND * item.quantity).toLocaleString("vi-VN")}đ
                        </span>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.skuCode)}
                          aria-label={`Xóa ${item.productTitle} khỏi giỏ hàng`}
                          className="w-11 h-11 text-stone-400 hover:text-rose-600 rounded transition-colors cursor-pointer inline-flex items-center justify-center"
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
            <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50/70 space-y-3 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
              {/* Coupon Code Input */}
              {activeDiscountRules.length > 0 && <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <div className="relative flex-1">
                  <label htmlFor="storefront-coupon" className="sr-only">Mã ưu đãi</label>
                  <Tag size={13} className="absolute left-3 top-2.5 text-stone-400" />
                  <input
                    id="storefront-coupon"
                    name="discountCode"
                    type="text"
                    autoComplete="off"
                    placeholder="Nhập mã ưu đãi…"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    className="w-full min-h-11 pl-8 pr-3 bg-white border border-stone-300 rounded-xl text-xs text-stone-800 placeholder-stone-400 focus:border-orange-500 font-bold uppercase"
                  />
                </div>
                <button
                  type="submit"
                  className="min-h-11 px-3.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                >
                  Áp Dụng
                </button>
              </form>}

              {couponMsg && (
                <p role={couponMsg.isError ? "alert" : "status"} className={`text-[11px] font-bold ${couponMsg.isError ? "text-rose-600" : "text-emerald-600"}`}>
                  {couponMsg.text}
                </p>
              )}

              <div className="space-y-1 text-xs pt-1">
                <div className="flex justify-between text-stone-500">
                  <span>Tạm tính ({items.reduce((s, i) => s + i.quantity, 0)} món):</span>
                  <span className="font-bold text-stone-900">{rawSubtotal.toLocaleString("vi-VN")}đ</span>
                </div>

                {pricing.discountAmountVND > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Mã ưu đãi ({upperCode}):</span>
                    <span>-{pricing.discountAmountVND.toLocaleString("vi-VN")}đ</span>
                  </div>
                )}

                <div className="flex justify-between text-stone-500">
                  <span>Phí vận chuyển:</span>
                  <span className="font-bold text-emerald-600">
                    {pricing.freeShipping ? "Miễn Phí (Freeship)" : `${pricing.shippingFeeVND.toLocaleString("vi-VN")}đ`}
                  </span>
                </div>

                <div className="flex justify-between text-sm font-black text-stone-900 pt-2 border-t border-stone-200">
                  <span>Tổng thanh toán:</span>
                  <span className="text-base font-black text-orange-600">
                    {pricing.finalTotalVND.toLocaleString("vi-VN")}đ
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenCheckout}
                className="w-full py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
              >
                <span>Tiến Hành Đặt Hàng Ngay</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-stone-500 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Giá và tồn kho sẽ được máy chủ xác minh khi tạo đơn</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
