import React, { useState, useRef, useEffect } from "react";
import { WebProduct } from "@hub1688/shared-types";
import {
  Sparkles,
  Download,
  Check,
  CheckCircle,
  Image as ImageIcon,
  Sliders,
  Tag,
  Flame,
  Truck,
  ShieldCheck,
  Zap,
  Save
} from "lucide-react";

interface BannerFrameStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: WebProduct | null;
  onApplyNewPrimaryImage: (newImageUrl: string) => void;
  onShowToast: (message: string, type?: "success" | "error") => void;
}

export type FrameTemplateId = "FREESHIP_XTRA" | "FLASH_SALE" | "VERIFIED_MALL" | "LUXURY_MINIMAL";

export const BannerFrameStudioModal: React.FC<BannerFrameStudioModalProps> = ({
  isOpen,
  onClose,
  product,
  onApplyNewPrimaryImage,
  onShowToast
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<FrameTemplateId>("FREESHIP_XTRA");
  const [badgeText, setBadgeText] = useState("FREESHIP XTRA");
  const [discountText, setDiscountText] = useState("-45%");
  const [shopBrandText, setShopBrandText] = useState("XƯỞNG CHÍNH HÃNG");
  const [selectedImageSrc, setSelectedImageSrc] = useState(product?.primaryImage || "");
  const [isApplying, setIsApplying] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (product?.primaryImage) {
      setSelectedImageSrc(product.primaryImage);
    }
  }, [product]);

  // Cập nhật text mặc định theo từng template
  useEffect(() => {
    if (selectedTemplate === "FREESHIP_XTRA") {
      setBadgeText("FREESHIP XTRA");
      setDiscountText("-40%");
      setShopBrandText("MALL CHÍNH HÃNG");
    } else if (selectedTemplate === "FLASH_SALE") {
      setBadgeText("⚡ FLASH SALE 2026");
      setDiscountText("-50%");
      setShopBrandText("GIÁ HỦY DIỆT");
    } else if (selectedTemplate === "VERIFIED_MALL") {
      setBadgeText("KIỂM ĐỊNH 100%");
      setDiscountText("GIÁ GỐC 1688");
      setShopBrandText("ĐỔI TRẢ 7 NGÀY");
    } else if (selectedTemplate === "LUXURY_MINIMAL") {
      setBadgeText("NEW ARRIVAL");
      setDiscountText("PREMIUM");
      setShopBrandText("EXCLUSIVE");
    }
  }, [selectedTemplate]);

  // Render canvas frame
  useEffect(() => {
    if (!isOpen || !selectedImageSrc) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = selectedImageSrc;

    img.onload = () => {
      const size = 800; // 800x800 chuẩn ảnh vuông Shopee / TikTok Shop
      canvas.width = size;
      canvas.height = size;

      // 1. Vẽ ảnh gốc sản phẩm
      ctx.drawImage(img, 0, 0, size, size);

      // 2. Vẽ viền khung theo template
      if (selectedTemplate === "FREESHIP_XTRA") {
        // Viền đỏ cam Shopee
        ctx.lineWidth = 24;
        ctx.strokeStyle = "#ee4d2d";
        ctx.strokeRect(12, 12, size - 24, size - 24);

        // Header banner trên cùng
        const grad = ctx.createLinearGradient(0, 0, size, 0);
        grad.addColorStop(0, "#ee4d2d");
        grad.addColorStop(1, "#ff7337");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, 70);

        // Chữ thương hiệu trên cùng
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 26px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`★ ${shopBrandText} ★`, size / 2, 45);

        // Badge Freeship Xtra góc trái dưới
        ctx.fillStyle = "#00bfa5";
        ctx.beginPath();
        ctx.roundRect(24, size - 110, 260, 65, 12);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`🚚 ${badgeText}`, 40, size - 68);

        // Badge Giảm giá góc phải trên
        if (discountText) {
          ctx.fillStyle = "#ffd839";
          ctx.beginPath();
          ctx.roundRect(size - 160, 85, 136, 65, 12);
          ctx.fill();
          ctx.fillStyle = "#d0011b";
          ctx.font = "extrabold 30px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(discountText, size - 92, 130);
        }
      } else if (selectedTemplate === "FLASH_SALE") {
        // Viền Cam Neon Flash Sale
        ctx.lineWidth = 28;
        ctx.strokeStyle = "#ff4500";
        ctx.strokeRect(14, 14, size - 28, size - 28);

        // Banner đáy
        ctx.fillStyle = "#ff4500";
        ctx.fillRect(0, size - 90, size, 90);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 34px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`🔥 ${badgeText} 🔥`, size / 2, size - 35);

        // Badge giảm giá vàng góc trên
        ctx.fillStyle = "#ffcc00";
        ctx.beginPath();
        ctx.roundRect(24, 24, 180, 75, 16);
        ctx.fill();
        ctx.fillStyle = "#000000";
        ctx.font = "extrabold 36px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(discountText, 114, 75);
      } else if (selectedTemplate === "VERIFIED_MALL") {
        // Viền Xanh Navy Luxury
        ctx.lineWidth = 22;
        ctx.strokeStyle = "#1e3a8a";
        ctx.strokeRect(11, 11, size - 22, size - 22);

        // Badge góc trái
        ctx.fillStyle = "#1e3a8a";
        ctx.beginPath();
        ctx.roundRect(24, 24, 280, 60, 10);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 22px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`🛡️ ${badgeText}`, 40, 62);

        // Badge góc phải đáy
        ctx.fillStyle = "#d97706";
        ctx.beginPath();
        ctx.roundRect(size - 280, size - 85, 256, 60, 10);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 22px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`✨ ${shopBrandText}`, size - 152, size - 48);
      } else if (selectedTemplate === "LUXURY_MINIMAL") {
        // Viền Trắng Tinh Tế Bo Góc
        ctx.lineWidth = 16;
        ctx.strokeStyle = "#ffffff";
        ctx.strokeRect(8, 8, size - 16, size - 16);

        // Tag thanh lịch giữa đáy
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.beginPath();
        ctx.roundRect(size / 2 - 160, size - 80, 320, 55, 28);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "600 20px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`• ${badgeText} •`, size / 2, size - 45);
      }
    };
  }, [isOpen, selectedImageSrc, selectedTemplate, badgeText, discountText, shopBrandText]);

  if (!isOpen || !product) return null;

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `framed_${product.skuCode}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onShowToast("Đã tải ảnh đóng khung về máy tính thành công!");
  };

  const handleApplyAsPrimary = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsApplying(true);
    try {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      onApplyNewPrimaryImage(dataUrl);
      onShowToast("Đã áp dụng ảnh đóng khung làm ảnh đại diện sản phẩm!");
      onClose();
    } catch (err: any) {
      onShowToast("Lỗi khi áp dụng ảnh", "error");
    } finally {
      setIsApplying(false);
    }
  };

  const allImages = [
    product.primaryImage,
    ...(product.galleryImages || []),
    ...(product.detailImages || [])
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] border border-slate-200 animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                E-Commerce Banner & Frame Studio (Khung Viền Khuyến Mại)
              </h3>
              <p className="text-xs text-slate-500">
                Tự động đóng khung viền Shopee Mall, Flash Sale, Freeship Xtra để tăng tỷ lệ nhấp chuột (CTR)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-base font-bold">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cột trái: Live Canvas Preview */}
          <div className="flex flex-col items-center justify-center bg-slate-100 rounded-2xl p-4 border border-slate-200">
            <div className="relative shadow-xl rounded-xl overflow-hidden max-w-[360px] w-full aspect-square bg-white">
              <canvas ref={canvasRef} className="w-full h-full object-contain" />
            </div>
            <p className="text-[11px] text-slate-500 mt-3">
              Kích thước chuẩn: 800 x 800 px (Chuẩn tỉ lệ 1:1 Shopee, TikTok Shop, Lazada)
            </p>

            {/* Thư viện chọn ảnh gốc */}
            <div className="w-full mt-4">
              <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                Chọn ảnh gốc từ album ({allImages.length} ảnh):
              </span>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {allImages.slice(0, 8).map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageSrc(img)}
                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                      selectedImageSrc === img ? "border-orange-600 ring-2 ring-orange-500/20" : "border-slate-200 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="thumb" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cột phải: Bộ tùy chỉnh Template & Badges */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                1. Chọn Mẫu Khung Viền Thương Mại (Frames):
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  {
                    id: "FREESHIP_XTRA",
                    name: "Freeship Xtra",
                    desc: "Viền đỏ cam phong cách Shopee Mall",
                    icon: <Truck className="w-4 h-4 text-orange-600" />
                  },
                  {
                    id: "FLASH_SALE",
                    name: "Flash Sale Neon",
                    desc: "Khung cam rực lửa, tăng click",
                    icon: <Flame className="w-4 h-4 text-rose-600" />
                  },
                  {
                    id: "VERIFIED_MALL",
                    name: "Xưởng 1688 Kiểm Định",
                    desc: "Viền xanh navy sang trọng, uy tín",
                    icon: <ShieldCheck className="w-4 h-4 text-blue-600" />
                  },
                  {
                    id: "LUXURY_MINIMAL",
                    name: "Minimalist Cao Cấp",
                    desc: "Viền trắng thanh lịch phong cách Hàn Quốc",
                    icon: <Sparkles className="w-4 h-4 text-slate-800" />
                  }
                ].map(tmpl => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setSelectedTemplate(tmpl.id as FrameTemplateId)}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      selectedTemplate === tmpl.id
                        ? "bg-orange-50/60 border-orange-500 ring-2 ring-orange-500/20"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {tmpl.icon}
                      <span className="text-xs font-bold text-slate-900">{tmpl.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">{tmpl.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-800">
                2. Tùy Chỉnh Nội Dung Huy Hiệu (Badges):
              </label>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Huy hiệu chính (Badge 1):
                </label>
                <input
                  type="text"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  placeholder="FREESHIP XTRA hoặc FLASH SALE"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Huy hiệu giảm giá:
                  </label>
                  <input
                    type="text"
                    value={discountText}
                    onChange={(e) => setDiscountText(e.target.value)}
                    placeholder="-45% hoặc GIẢM 50K"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Thương hiệu / Tagline:
                  </label>
                  <input
                    type="text"
                    value={shopBrandText}
                    onChange={(e) => setShopBrandText(e.target.value)}
                    placeholder="MALL CHÍNH HÃNG"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5 justify-end">
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <Download className="w-4 h-4" />
                Tải Ảnh PNG Về Máy
              </button>

              <button
                type="button"
                disabled={isApplying}
                onClick={handleApplyAsPrimary}
                className="px-4 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 flex items-center justify-center gap-1.5 transition-all"
              >
                <CheckCircle className="w-4 h-4" />
                {isApplying ? "Đang áp dụng..." : "Áp Dụng Làm Ảnh Đại Diện Mới"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
