import React, { useState, useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";
import { WebProduct } from "@hub1688/shared-types";

interface StoreSocialProofPopupProps {
  products: WebProduct[];
}

interface FakeNotification {
  customerName: string;
  location: string;
  productTitle: string;
  productImage: string;
  timeAgo: string;
}

const SAMPLE_CUSTOMERS = [
  { name: "Chị Thùy Linh", location: "Hà Nội" },
  { name: "Anh Hoàng Nam", location: "TP. Hồ Chí Minh" },
  { name: "Bạn Minh Phương", location: "Đà Nẵng" },
  { name: "Chị Mai Anh", location: "Hải Phòng" },
  { name: "Anh Tuấn Kiệt", location: "Cần Thơ" },
  { name: "Cô Thanh Hằng", location: "Bình Dương" },
  { name: "Bạn Khánh Linh", location: "Quảng Ninh" }
];

const SAMPLE_TIMES = ["1 phút trước", "3 phút trước", "5 phút trước", "8 phút trước", "12 phút trước"];

export const StoreSocialProofPopup: React.FC<StoreSocialProofPopupProps> = ({ products }) => {
  const [currentNotification, setCurrentNotification] = useState<FakeNotification | null>(null);
  const [visible, setVisible] = useState(false);
  const [closedManually, setClosedManually] = useState(false);

  useEffect(() => {
    if (closedManually || !products || products.length === 0) return;

    // Show first popup after 4 seconds
    const initialTimer = setTimeout(() => {
      triggerRandomPopup();
    }, 4000);

    // Interval to cycle every 14 seconds
    const interval = setInterval(() => {
      triggerRandomPopup();
    }, 14000);

    function triggerRandomPopup() {
      if (closedManually) return;
      const randProd = products[Math.floor(Math.random() * products.length)];
      const randCust = SAMPLE_CUSTOMERS[Math.floor(Math.random() * SAMPLE_CUSTOMERS.length)];
      const randTime = SAMPLE_TIMES[Math.floor(Math.random() * SAMPLE_TIMES.length)];

      setCurrentNotification({
        customerName: randCust.name,
        location: randCust.location,
        productTitle: randProd.titleVI,
        productImage: randProd.primaryImage,
        timeAgo: randTime
      });

      setVisible(true);

      // Hide after 5 seconds
      setTimeout(() => {
        setVisible(false);
      }, 5500);
    }

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [products, closedManually]);

  if (!visible || !currentNotification) return null;

  return (
    <div className="fixed bottom-5 left-5 z-40 max-w-xs sm:max-w-sm bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 p-3 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <img
        src={currentNotification.productImage}
        alt={currentNotification.productTitle}
        className="w-13 h-13 rounded-xl object-cover border border-slate-100 shrink-0 shadow-sm"
      />
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-800">
          <span>{currentNotification.customerName}</span>
          <span className="text-slate-400 font-normal">({currentNotification.location})</span>
          <CheckCircle2 size={12} className="text-emerald-500 fill-emerald-50 shrink-0" />
        </div>
        <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5 font-medium">
          Vừa đặt: {currentNotification.productTitle}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-slate-400">{currentNotification.timeAgo}</span>
          <span className="text-[9px] text-orange-600 font-bold bg-orange-50 px-1.5 py-0.2 rounded-sm">Đã xác nhận</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          setClosedManually(true);
        }}
        className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100"
      >
        <X size={13} />
      </button>
    </div>
  );
};
