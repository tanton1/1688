import React, { useState, useRef, useEffect } from "react";
import { WebProduct } from "@hub1688/shared-types";
import { useAccessibleDialog } from "../hooks/useAccessibleDialog";
import {
  Sparkles,
  Download,
  CheckCircle,
  Image as ImageIcon,
  Flame,
  Truck,
  ShieldCheck,
  Languages,
  Type,
  Table,
  Sliders,
  Ruler,
  Eraser,
  Wand2,
  Check,
  Copy
} from "lucide-react";

export type FrameTemplateId = "FREESHIP_XTRA" | "FLASH_SALE" | "VERIFIED_MALL" | "LUXURY_MINIMAL";
export type StudioMode = "TRANSLATE" | "FRAME";
export type TranslateToolType = "SIZE_CHART" | "BADGE_REPLACER" | "INPAINT_TEXT";
export type TargetLanguage = "VI" | "EN";

interface BannerFrameStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: WebProduct | null;
  onApplyNewPrimaryImage: (newImageUrl: string) => void;
  onApplyEditedImage?: (originalImageUrl: string, newImageUrl: string) => void;
  onShowToast: (message: string, type?: "success" | "error") => void;
  initialSelectedImage?: string;
  initialMode?: StudioMode;
}

// Bảng size mẫu thông minh cho thời trang
interface SizeRow {
  size: string;
  bust: number; // Vòng ngực (cm)
  length: number; // Chiều dài (cm)
  shoulder: number; // Rộng vai (cm)
  weightJin: string; // Cân nặng gốc 1688 (斤)
  weightKg: string; // Cân nặng quy đổi chuẩn (kg)
}

const DEFAULT_SIZE_ROWS: SizeRow[] = [
  { size: "S", bust: 88, length: 62, shoulder: 37, weightJin: "80-95 斤", weightKg: "40-47 kg" },
  { size: "M", bust: 92, length: 64, shoulder: 38.5, weightJin: "96-110 斤", weightKg: "48-55 kg" },
  { size: "L", bust: 96, length: 66, shoulder: 40, weightJin: "111-125 斤", weightKg: "55-62 kg" },
  { size: "XL", bust: 100, length: 68, shoulder: 41.5, weightJin: "126-140 斤", weightKg: "63-70 kg" },
  { size: "2XL", bust: 104, length: 70, shoulder: 43, weightJin: "141-155 斤", weightKg: "70-77 kg" }
];

// Tem mác tiếng Trung phổ biến trên ảnh 1688 / Taobao và bản dịch tương ứng
const CHINESE_BADGE_PRESETS = [
  {
    id: "HOT_SALE",
    cnText: "爆款热销",
    textVI: "🔥 SẢN PHẨM BÁN CHẠY",
    textEN: "🔥 BEST SELLER ITEM",
    bgColor: "#e11d48",
    textColor: "#ffffff"
  },
  {
    id: "FREESHIP",
    cnText: "全国包邮",
    textVI: "🚚 MIỄN PHÍ VẬN CHUYỂN",
    textEN: "🚚 FREE SHIPPING",
    bgColor: "#059669",
    textColor: "#ffffff"
  },
  {
    id: "FACTORY_DIRECT",
    cnText: "源头厂家直销",
    textVI: "🏭 GIÁ SỈ TẬN XƯỞNG 1688",
    textEN: "🏭 1688 FACTORY DIRECT",
    bgColor: "#2563eb",
    textColor: "#ffffff"
  },
  {
    id: "PREMIUM_MATERIAL",
    cnText: "100% 桑蚕丝/纯棉",
    textVI: "✨ 100% CHẤT LIỆU CAO CẤP",
    textEN: "✨ 100% PREMIUM QUALITY",
    bgColor: "#d97706",
    textColor: "#ffffff"
  },
  {
    id: "AUTHENTIC_MALL",
    cnText: "正品保障 假一赔十",
    textVI: "🛡️ CHÍNH HÃNG - ĐỔI TRẢ 7 NGÀY",
    textEN: "🛡️ 100% AUTHENTIC GUARANTEE",
    bgColor: "#4f46e5",
    textColor: "#ffffff"
  },
  {
    id: "NEW_ARRIVAL",
    cnText: "2026 春装首发",
    textVI: "⭐ HÀNG MỚI VỀ 2026",
    textEN: "⭐ NEW ARRIVAL 2026",
    bgColor: "#ea580c",
    textColor: "#ffffff"
  }
];

export const BannerFrameStudioModal: React.FC<BannerFrameStudioModalProps> = ({
  isOpen,
  onClose,
  product,
  onApplyNewPrimaryImage,
  onApplyEditedImage,
  onShowToast,
  initialSelectedImage,
  initialMode = "TRANSLATE"
}) => {
  const dialogRef = useAccessibleDialog<HTMLDivElement>(isOpen && Boolean(product), onClose);
  // Mode chính: Dịch chữ trên ảnh vs Đóng khung promo
  const [studioMode, setStudioMode] = useState<StudioMode>(initialMode);

  // Tab dịch ảnh
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>("VI");
  const [translateTool, setTranslateTool] = useState<TranslateToolType>("SIZE_CHART");

  // State công cụ 1: Bảng size
  const [sizeRows, setSizeRows] = useState<SizeRow[]>(DEFAULT_SIZE_ROWS);
  const [sizeTableTitle, setSizeTableTitle] = useState("BẢNG QUY ĐỔI KÍCH CỠ CHUẨN (SIZE GUIDE)");
  const [sizeTableTheme, setSizeTableTheme] = useState<"LIGHT" | "DARK" | "ORANGE">("LIGHT");
  const [sizeTablePosition, setSizeTablePosition] = useState<"BOTTOM" | "CENTER" | "TOP">("BOTTOM");

  // State công cụ 2: Tem mác tiếng Trung
  const [selectedBadgePreset, setSelectedBadgePreset] = useState(CHINESE_BADGE_PRESETS[0]);
  const [customBadgeText, setCustomBadgeText] = useState(CHINESE_BADGE_PRESETS[0].textVI);
  const [badgePosition, setBadgePosition] = useState<"TOP_LEFT" | "TOP_RIGHT" | "BOTTOM_LEFT" | "BOTTOM_RIGHT">("TOP_LEFT");

  // State công cụ 3: Che vùng & gõ chữ tùy biến (Inpaint Box)
  const [inpaintX, setInpaintX] = useState(10); // %
  const [inpaintY, setInpaintY] = useState(15); // %
  const [inpaintWidth, setInpaintWidth] = useState(80); // %
  const [inpaintHeight, setInpaintHeight] = useState(12); // %
  const [inpaintBgColor, setInpaintBgColor] = useState("#FFFFFF");
  const [inpaintTextColor, setInpaintTextColor] = useState("#1E293B");
  const [inpaintText, setInpaintText] = useState("HÀNG THIẾT KẾ CAO CẤP CHÍNH HÃNG");
  const [inpaintFontSize, setInpaintFontSize] = useState(24);

  // State Frame Mode
  const [selectedTemplate, setSelectedTemplate] = useState<FrameTemplateId>("FREESHIP_XTRA");
  const [badgeText, setBadgeText] = useState("FREESHIP XTRA");
  const [discountText, setDiscountText] = useState("-45%");
  const [shopBrandText, setShopBrandText] = useState("XƯỞNG CHÍNH HÃNG");

  // Ảnh đang chọn để chỉnh sửa
  const [selectedImageSrc, setSelectedImageSrc] = useState(product?.primaryImage || "");
  const [isApplying, setIsApplying] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Khởi tạo khi mở modal
  useEffect(() => {
    if (initialMode) setStudioMode(initialMode);
    if (initialSelectedImage) {
      setSelectedImageSrc(initialSelectedImage);
    } else if (product?.primaryImage) {
      setSelectedImageSrc(product.primaryImage);
    }
  }, [isOpen, initialSelectedImage, initialMode, product]);

  // Đổi ngôn ngữ đích -> Cập nhật tiêu đề bảng size & badge text
  useEffect(() => {
    if (targetLanguage === "VI") {
      setSizeTableTitle("BẢNG QUY ĐỔI KÍCH CỠ CHUẨN (SIZE GUIDE)");
      setCustomBadgeText(selectedBadgePreset.textVI);
    } else {
      setSizeTableTitle("OFFICIAL SIZE CHART & FIT GUIDE");
      setCustomBadgeText(selectedBadgePreset.textEN);
    }
  }, [targetLanguage, selectedBadgePreset]);

  // Cập nhật text mặc định theo từng template khung viền
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

  // Render Canvas chính
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
      // Xác định tỉ lệ ảnh gốc
      const originalW = img.naturalWidth || 800;
      const originalH = img.naturalHeight || 800;

      // Chuẩn hóa chiều rộng 800px, chiều cao theo đúng tỷ lệ gốc (rất quan trọng cho ảnh chi tiết dài 800x1200)
      const targetW = 800;
      const targetH = studioMode === "FRAME"
        ? 800 // Khung viền khuyến mại luôn chuẩn vuông 800x800
        : Math.round((targetW * originalH) / originalW) || 800;

      canvas.width = targetW;
      canvas.height = targetH;

      // 1. Vẽ ảnh sản phẩm gốc
      ctx.drawImage(img, 0, 0, targetW, targetH);

      // ==========================================
      // CHẾ ĐỘ 1: DỊCH CHỮ TRÊN ẢNH (AI IMAGE TRANSLATOR)
      // ==========================================
      if (studioMode === "TRANSLATE") {
        // CÔNG CỤ A: BẢNG SIZE CHUẨN (SIZE CHART)
        if (translateTool === "SIZE_CHART") {
          const tableW = targetW - 60;
          const rowH = 42;
          const headerH = 50;
          const titleH = 46;
          const tableH = titleH + headerH + sizeRows.length * rowH + 34; // Tổng chiều cao bảng
          const tableX = 30;

          let tableY = targetH - tableH - 30; // Mặc định ở dưới đáy
          if (sizeTablePosition === "TOP") tableY = 30;
          if (sizeTablePosition === "CENTER") tableY = Math.max(20, (targetH - tableH) / 2);

          // Nền bóng mờ của card bảng
          ctx.save();
          ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
          ctx.shadowBlur = 24;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 8;

          // Màu nền bảng
          if (sizeTableTheme === "LIGHT") {
            ctx.fillStyle = "#ffffff";
          } else if (sizeTableTheme === "DARK") {
            ctx.fillStyle = "rgba(15, 23, 42, 0.96)";
          } else {
            ctx.fillStyle = "rgba(255, 247, 237, 0.98)";
          }

          ctx.beginPath();
          ctx.roundRect(tableX, tableY, tableW, tableH, 18);
          ctx.fill();
          ctx.restore();

          // Viền ngoài bảng
          ctx.lineWidth = 2;
          ctx.strokeStyle = sizeTableTheme === "LIGHT" ? "#e2e8f0" : (sizeTableTheme === "DARK" ? "#334155" : "#fdba74");
          ctx.stroke();

          // Tiêu đề bảng
          ctx.fillStyle = sizeTableTheme === "DARK" ? "#f8fafc" : "#0f172a";
          ctx.font = "bold 20px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`📏 ${sizeTableTitle}`, targetW / 2, tableY + 32);

          // Subtitle quy đổi đơn vị 1 斤 = 0.5 kg
          ctx.fillStyle = sizeTableTheme === "DARK" ? "#94a3b8" : "#64748b";
          ctx.font = "italic 11px sans-serif";
          ctx.fillText(
            targetLanguage === "VI"
              ? "★ Tự động quy đổi đơn vị Trung Quốc 1 斤 = 0.5 kg chuẩn để người mua chọn size chính xác"
              : "★ Automatically converted Chinese unit (1 Jin = 0.5 kg) for accurate international fit",
            targetW / 2,
            tableY + 48
          );

          // Header cột bảng
          const headerY = tableY + 60;
          ctx.fillStyle = sizeTableTheme === "DARK" ? "#1e293b" : (sizeTableTheme === "LIGHT" ? "#f1f5f9" : "#ffedd5");
          ctx.fillRect(tableX + 12, headerY, tableW - 24, 38);

          const colWidths = [85, 120, 120, 120, 180];
          const colStarts = [
            tableX + 20,
            tableX + 105,
            tableX + 225,
            tableX + 345,
            tableX + 465
          ];

          const headers = targetLanguage === "VI"
            ? ["SIZE", "NGỰC (cm)", "DÀI ÁO (cm)", "RỘNG VAI (cm)", "CÂN NẶNG (kg)"]
            : ["SIZE", "BUST (cm)", "LENGTH (cm)", "SHOULDER (cm)", "WEIGHT (kg)"];

          ctx.fillStyle = sizeTableTheme === "DARK" ? "#cbd5e1" : "#334155";
          ctx.font = "bold 13px sans-serif";
          ctx.textAlign = "center";

          headers.forEach((h, i) => {
            ctx.fillText(h, colStarts[i] + colWidths[i] / 2, headerY + 24);
          });

          // Vẽ từng hàng dữ liệu bảng size
          sizeRows.forEach((row, rowIdx) => {
            const currentY = headerY + 38 + rowIdx * rowH;

            // Kẻ sọc so le mờ
            if (rowIdx % 2 === 1) {
              ctx.fillStyle = sizeTableTheme === "DARK" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
              ctx.fillRect(tableX + 12, currentY, tableW - 24, rowH);
            }

            // Đường gạch ngang mờ
            ctx.strokeStyle = sizeTableTheme === "DARK" ? "#334155" : "#e2e8f0";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(tableX + 12, currentY + rowH);
            ctx.lineTo(tableX + tableW - 12, currentY + rowH);
            ctx.stroke();

            // Cột Size (In đậm, có khung badge nhỏ)
            ctx.fillStyle = "#ea580c";
            ctx.font = "bold 15px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(row.size, colStarts[0] + colWidths[0] / 2, currentY + 26);

            // Các cột thông số
            ctx.fillStyle = sizeTableTheme === "DARK" ? "#f1f5f9" : "#1e293b";
            ctx.font = "500 14px sans-serif";
            ctx.fillText(`${row.bust}`, colStarts[1] + colWidths[1] / 2, currentY + 26);
            ctx.fillText(`${row.length}`, colStarts[2] + colWidths[2] / 2, currentY + 26);
            ctx.fillText(`${row.shoulder}`, colStarts[3] + colWidths[3] / 2, currentY + 26);

            // Cột cân nặng kg (nổi bật)
            ctx.fillStyle = "#16a34a";
            ctx.font = "bold 14px sans-serif";
            ctx.fillText(`${row.weightKg}`, colStarts[4] + colWidths[4] / 2, currentY + 26);
          });
        }

        // CÔNG CỤ B: XÓA & THAY THẾ TEM MÁC TIẾNG TRUNG
        if (translateTool === "BADGE_REPLACER") {
          const badgeW = 340;
          const badgeH = 68;
          let bx = 30;
          let by = 30;

          if (badgePosition === "TOP_RIGHT") {
            bx = targetW - badgeW - 30;
            by = 30;
          } else if (badgePosition === "BOTTOM_LEFT") {
            bx = 30;
            by = targetH - badgeH - 30;
          } else if (badgePosition === "BOTTOM_RIGHT") {
            bx = targetW - badgeW - 30;
            by = targetH - badgeH - 30;
          }

          // Vẽ hộp che tem tiếng Trung và đặt tem tiếng Việt/tiếng Anh
          ctx.save();
          ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
          ctx.shadowBlur = 18;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 6;

          // Nền Badge gradient
          const grad = ctx.createLinearGradient(bx, by, bx + badgeW, by + badgeH);
          grad.addColorStop(0, selectedBadgePreset.bgColor);
          grad.addColorStop(1, "#111827");
          ctx.fillStyle = grad;

          ctx.beginPath();
          ctx.roundRect(bx, by, badgeW, badgeH, 14);
          ctx.fill();
          ctx.restore();

          // Viền vàng kim tuyến nổi
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = "#fef08a";
          ctx.stroke();

          // Nội dung chữ tiếng Việt / Anh
          ctx.fillStyle = selectedBadgePreset.textColor || "#ffffff";
          ctx.font = "bold 20px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(customBadgeText, bx + badgeW / 2, by + badgeH / 2 + 7);
        }

        // CÔNG CỤ C: CHE VÙNG & GÕ CHỮ TÙY BIẾN (INPAINT BOX)
        if (translateTool === "INPAINT_TEXT") {
          const boxX = (inpaintX / 100) * targetW;
          const boxY = (inpaintY / 100) * targetH;
          const boxW = (inpaintWidth / 100) * targetW;
          const boxH = (inpaintHeight / 100) * targetH;

          // Vẽ hộp che đè lên vùng chữ tiếng Trung
          ctx.save();
          ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
          ctx.shadowBlur = 12;

          ctx.fillStyle = inpaintBgColor;
          ctx.beginPath();
          ctx.roundRect(boxX, boxY, boxW, boxH, 10);
          ctx.fill();
          ctx.restore();

          // Viền mảnh
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = "rgba(0,0,0,0.1)";
          ctx.stroke();

          // Gõ chữ mới lên trên
          if (inpaintText) {
            ctx.fillStyle = inpaintTextColor;
            ctx.font = `bold ${inpaintFontSize}px sans-serif`;
            ctx.textAlign = "center";
            ctx.fillText(inpaintText, boxX + boxW / 2, boxY + boxH / 2 + inpaintFontSize / 3);
          }
        }
      }

      // ==========================================
      // CHẾ ĐỘ 2: ĐÓNG KHUNG VIỀN PROMO (FRAME STUDIO)
      // ==========================================
      if (studioMode === "FRAME") {
        const size = 800;

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
          // Viền Trắng Bo Góc
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
      }
    };
  }, [
    isOpen,
    selectedImageSrc,
    studioMode,
    targetLanguage,
    translateTool,
    sizeRows,
    sizeTableTitle,
    sizeTableTheme,
    sizeTablePosition,
    selectedBadgePreset,
    customBadgeText,
    badgePosition,
    inpaintX,
    inpaintY,
    inpaintWidth,
    inpaintHeight,
    inpaintBgColor,
    inpaintTextColor,
    inpaintText,
    inpaintFontSize,
    selectedTemplate,
    badgeText,
    discountText,
    shopBrandText
  ]);

  if (!isOpen || !product) return null;

  // Tải ảnh PNG về máy
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `translated_${product.skuCode}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onShowToast("Đã tải ảnh đã xử lý về máy tính thành công!");
  };

  // Áp dụng làm ảnh chính sản phẩm
  const handleApplyAsPrimary = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsApplying(true);
    try {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      onApplyNewPrimaryImage(dataUrl);
      onShowToast("Đã cập nhật ảnh làm ảnh đại diện sản phẩm!");
      onClose();
    } catch (err: any) {
      onShowToast("Lỗi khi áp dụng ảnh", "error");
    } finally {
      setIsApplying(false);
    }
  };

  // Áp dụng thay thế trực tiếp ảnh đang chọn (Gallery / Detail image)
  const handleApplyToCurrentSlot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsApplying(true);
    try {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      if (onApplyEditedImage) {
        onApplyEditedImage(selectedImageSrc, dataUrl);
      } else {
        onApplyNewPrimaryImage(dataUrl);
      }
      onShowToast("Đã thay thế ảnh đã dịch vào danh sách ảnh sản phẩm thành công!");
      onClose();
    } catch (err: any) {
      onShowToast("Lỗi khi cập nhật ảnh", "error");
    } finally {
      setIsApplying(false);
    }
  };

  // Danh sách ảnh tổng hợp có nhãn
  const primaryImg = product.primaryImage;
  const galleryImgs = product.galleryImages || [];
  const detailImgs = product.detailImages || [];

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Xưởng xử lý ảnh sản phẩm" className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full flex flex-col max-h-[94vh] border border-slate-200 animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                Image Studio & AI Dịch Chữ Trên Ảnh
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                  v2.5 Pro
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Dịch bảng size (尺码表), thay thế tem mác tiếng Trung sang Tiếng Việt/Anh & Đóng khung viền bán hàng
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setStudioMode("TRANSLATE")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
                studioMode === "TRANSLATE"
                  ? "bg-white text-orange-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Languages className="w-4 h-4" />
              AI Dịch Chữ & Bảng Size
            </button>
            <button
              type="button"
              onClick={() => setStudioMode("FRAME")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
                studioMode === "FRAME"
                  ? "bg-white text-orange-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Khung Viền Promo
            </button>
            <button
              onClick={onClose}
              aria-label="Đóng xưởng xử lý ảnh"
              className="ml-2 text-slate-400 hover:text-slate-600 text-base font-bold px-2"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* CỘT TRÁI (5 CỘT): Live Canvas Preview & Bộ Chọn Ảnh Nguồn */}
          <div className="lg:col-span-5 flex flex-col items-center bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <div className="relative shadow-xl rounded-xl overflow-hidden w-full max-w-[360px] aspect-square bg-white flex items-center justify-center border border-slate-200">
              <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
            </div>

            {/* Chọn ngôn ngữ đích nếu ở mode Dịch */}
            {studioMode === "TRANSLATE" && (
              <div className="w-full mt-3.5 bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Languages className="w-4 h-4 text-orange-600" />
                  Ngôn ngữ đích:
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTargetLanguage("VI")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                      targetLanguage === "VI"
                        ? "bg-orange-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    🇻🇳 Tiếng Việt
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetLanguage("EN")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                      targetLanguage === "EN"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    🇬🇧 English
                  </button>
                </div>
              </div>
            )}

            {/* Bộ Chọn Ảnh Nguồn (Ảnh chính, Gallery, Ảnh Chi Tiết Dài / Bảng Size) */}
            <div className="w-full mt-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Chọn ảnh muốn chỉnh sửa ({galleryImgs.length + detailImgs.length + 1} ảnh):
                </span>
                <span className="text-[10px] text-slate-500">
                  Hỗ trợ ảnh bìa & ảnh dải dài bảng size
                </span>
              </div>

              {/* Danh sách ảnh cuộn ngang */}
              <div className="flex gap-2 overflow-x-auto pb-2 pt-1">
                {/* 1. Ảnh chính */}
                {primaryImg && (
                  <button
                    type="button"
                    onClick={() => setSelectedImageSrc(primaryImg)}
                    className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                      selectedImageSrc === primaryImg
                        ? "border-orange-600 ring-2 ring-orange-500/20 shadow-md"
                        : "border-slate-200 opacity-70 hover:opacity-100"
                    }`}
                    title="Ảnh đại diện chính"
                  >
                    <img src={primaryImg} alt="primary" className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 inset-x-0 bg-orange-600 text-white text-[8px] font-bold text-center py-0.5">
                      Ảnh Chính
                    </span>
                  </button>
                )}

                {/* 2. Ảnh Gallery */}
                {galleryImgs.map((img, idx) => (
                  <button
                    key={`gal-${idx}`}
                    type="button"
                    onClick={() => setSelectedImageSrc(img)}
                    className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                      selectedImageSrc === img
                        ? "border-orange-600 ring-2 ring-orange-500/20 shadow-md"
                        : "border-slate-200 opacity-70 hover:opacity-100"
                    }`}
                    title={`Ảnh Gallery #${idx + 1}`}
                  >
                    <img src={img} alt={`gal-${idx}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 inset-x-0 bg-slate-800/80 text-white text-[8px] font-medium text-center py-0.5">
                      Gal #{idx + 1}
                    </span>
                  </button>
                ))}

                {/* 3. Ảnh Chi Tiết Bán Hàng Dài (Bảng size) */}
                {detailImgs.map((img, idx) => (
                  <button
                    key={`det-${idx}`}
                    type="button"
                    onClick={() => setSelectedImageSrc(img)}
                    className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                      selectedImageSrc === img
                        ? "border-emerald-600 ring-2 ring-emerald-500/20 shadow-md"
                        : "border-emerald-200 opacity-70 hover:opacity-100"
                    }`}
                    title={`Ảnh chi tiết / Bảng size #${idx + 1}`}
                  >
                    <img src={img} alt={`det-${idx}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 inset-x-0 bg-emerald-700 text-white text-[8px] font-bold text-center py-0.5">
                      Size #{idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (7 CỘT): Bộ Điều Khiển Tính Năng */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            {/* 1. NẾU Ở CHẾ ĐỘ DỊCH ẢNH (TRANSLATE MODE) */}
            {studioMode === "TRANSLATE" && (
              <div className="space-y-4">
                {/* 3 Công cụ dịch ảnh */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTranslateTool("SIZE_CHART")}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      translateTool === "SIZE_CHART"
                        ? "bg-orange-50 border-orange-500 ring-2 ring-orange-500/20 text-orange-950"
                        : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Ruler className="w-4 h-4 text-orange-600" />
                      <span className="text-xs font-bold">1. Bảng Size Chuẩn</span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Dịch 尺码表, quy đổi 1 斤 = 0.5 kg
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTranslateTool("BADGE_REPLACER")}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      translateTool === "BADGE_REPLACER"
                        ? "bg-orange-50 border-orange-500 ring-2 ring-orange-500/20 text-orange-950"
                        : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Wand2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold">2. Thay Tem Mác</span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Đè chữ 爆款, 包邮, 厂家直销
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTranslateTool("INPAINT_TEXT")}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      translateTool === "INPAINT_TEXT"
                        ? "bg-orange-50 border-orange-500 ring-2 ring-orange-500/20 text-orange-950"
                        : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Type className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold">3. Che Chữ Tùy Biến</span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Hộp che nền & gõ chữ tự do
                    </span>
                  </button>
                </div>

                {/* CHI TIẾT CÔNG CỤ 1: BẢNG SIZE CHUẨN */}
                {translateTool === "SIZE_CHART" && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Table className="w-3.5 h-3.5 text-orange-600" />
                        Tùy Biến Bảng Size Thông Số ({targetLanguage === "VI" ? "Tiếng Việt" : "English"}):
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">Vị trí:</span>
                        <select
                          value={sizeTablePosition}
                          onChange={(e) => setSizeTablePosition(e.target.value as any)}
                          className="text-xs px-2 py-1 bg-white border border-slate-300 rounded-md font-semibold"
                        >
                          <option value="BOTTOM">Đáy ảnh (Dưới)</option>
                          <option value="CENTER">Giữa ảnh (Center)</option>
                          <option value="TOP">Đỉnh ảnh (Trên)</option>
                        </select>

                        <select
                          value={sizeTableTheme}
                          onChange={(e) => setSizeTableTheme(e.target.value as any)}
                          className="text-xs px-2 py-1 bg-white border border-slate-300 rounded-md font-semibold"
                        >
                          <option value="LIGHT">Nền Trắng Sáng</option>
                          <option value="DARK">Nền Đen Luxury</option>
                          <option value="ORANGE">Nền Cam Pastel</option>
                        </select>
                      </div>
                    </div>

                    {/* Bảng chỉnh sửa nhanh các dòng size */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white max-h-48 overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 border-b border-slate-200 font-semibold text-slate-600">
                          <tr>
                            <th className="p-1.5 w-14 text-center">Size</th>
                            <th className="p-1.5">Ngực (cm)</th>
                            <th className="p-1.5">Dài (cm)</th>
                            <th className="p-1.5">Vai (cm)</th>
                            <th className="p-1.5">Cân nặng (kg)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sizeRows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-1 text-center font-bold text-orange-600">
                                <input
                                  type="text"
                                  value={row.size}
                                  onChange={(e) => {
                                    const next = [...sizeRows];
                                    next[idx].size = e.target.value;
                                    setSizeRows(next);
                                  }}
                                  className="w-10 text-center font-bold text-xs border border-slate-200 rounded p-0.5"
                                />
                              </td>
                              <td className="p-1">
                                <input
                                  type="number"
                                  value={row.bust}
                                  onChange={(e) => {
                                    const next = [...sizeRows];
                                    next[idx].bust = parseInt(e.target.value) || 0;
                                    setSizeRows(next);
                                  }}
                                  className="w-14 text-xs border border-slate-200 rounded p-0.5"
                                />
                              </td>
                              <td className="p-1">
                                <input
                                  type="number"
                                  value={row.length}
                                  onChange={(e) => {
                                    const next = [...sizeRows];
                                    next[idx].length = parseInt(e.target.value) || 0;
                                    setSizeRows(next);
                                  }}
                                  className="w-14 text-xs border border-slate-200 rounded p-0.5"
                                />
                              </td>
                              <td className="p-1">
                                <input
                                  type="number"
                                  value={row.shoulder}
                                  onChange={(e) => {
                                    const next = [...sizeRows];
                                    next[idx].shoulder = parseFloat(e.target.value) || 0;
                                    setSizeRows(next);
                                  }}
                                  className="w-14 text-xs border border-slate-200 rounded p-0.5"
                                />
                              </td>
                              <td className="p-1">
                                <input
                                  type="text"
                                  value={row.weightKg}
                                  onChange={(e) => {
                                    const next = [...sizeRows];
                                    next[idx].weightKg = e.target.value;
                                    setSizeRows(next);
                                  }}
                                  className="w-20 font-bold text-emerald-700 text-xs border border-slate-200 rounded p-0.5"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <p className="text-[11px] text-slate-500 italic">
                      💡 Mẹo: Bảng size được render đè trực tiếp lên bảng size tiếng Trung gốc trên ảnh, chữ to rõ nét để khách hàng trên điện thoại dễ đọc.
                    </p>
                  </div>
                )}

                {/* CHI TIẾT CÔNG CỤ 2: THAY TEM MÁC TIẾNG TRUNG */}
                {translateTool === "BADGE_REPLACER" && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <label className="block text-xs font-bold text-slate-800">
                      Chọn Tem Mác Tiếng Trung Muốn Thay Thế (Chinese Badge Presets):
                    </label>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {CHINESE_BADGE_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setSelectedBadgePreset(preset);
                            setCustomBadgeText(targetLanguage === "VI" ? preset.textVI : preset.textEN);
                          }}
                          className={`p-2.5 rounded-lg border text-left transition-all ${
                            selectedBadgePreset.id === preset.id
                              ? "bg-white border-orange-500 ring-2 ring-orange-500/20 shadow-xs"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <span className="text-[10px] text-slate-400 font-mono block">
                            Chữ gốc: {preset.cnText}
                          </span>
                          <span className="text-xs font-bold text-slate-800 block truncate mt-0.5">
                            {targetLanguage === "VI" ? preset.textVI : preset.textEN}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Nội dung tem hiển thị:
                        </label>
                        <input
                          type="text"
                          value={customBadgeText}
                          onChange={(e) => setCustomBadgeText(e.target.value)}
                          className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Vị trí dán tem:
                        </label>
                        <select
                          value={badgePosition}
                          onChange={(e) => setBadgePosition(e.target.value as any)}
                          className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="TOP_LEFT">Góc Trên - Bên Trái</option>
                          <option value="TOP_RIGHT">Góc Trên - Bên Phải</option>
                          <option value="BOTTOM_LEFT">Góc Dưới - Bên Trái</option>
                          <option value="BOTTOM_RIGHT">Góc Dưới - Bên Phải</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* CHI TIẾT CÔNG CỤ 3: CHE VÙNG & GÕ CHỮ TÙY BIẾN */}
                {translateTool === "INPAINT_TEXT" && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <label className="block text-xs font-bold text-slate-800">
                      Hộp Che Vùng Tiếng Trung & Gõ Chữ Mới (Smart Inpaint Box):
                    </label>

                    <div className="space-y-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Nội dung chữ tiếng Việt / Anh đè lên:
                        </label>
                        <input
                          type="text"
                          value={inpaintText}
                          onChange={(e) => setInpaintText(e.target.value)}
                          placeholder="Nhập chữ tiếng Việt hoặc tiếng Anh..."
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      {/* Tùy chỉnh màu nền che và màu chữ */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Màu nền che:</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={inpaintBgColor}
                              onChange={(e) => setInpaintBgColor(e.target.value)}
                              className="w-7 h-7 rounded border border-slate-300 cursor-pointer"
                            />
                            <span className="text-[11px] font-mono">{inpaintBgColor}</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Màu chữ:</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={inpaintTextColor}
                              onChange={(e) => setInpaintTextColor(e.target.value)}
                              className="w-7 h-7 rounded border border-slate-300 cursor-pointer"
                            />
                            <span className="text-[11px] font-mono">{inpaintTextColor}</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Cỡ chữ (px):</label>
                          <input
                            type="number"
                            min="12"
                            max="48"
                            value={inpaintFontSize}
                            onChange={(e) => setInpaintFontSize(parseInt(e.target.value) || 20)}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Chiều cao (%):</label>
                          <input
                            type="number"
                            min="5"
                            max="50"
                            value={inpaintHeight}
                            onChange={(e) => setInpaintHeight(parseInt(e.target.value) || 12)}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                          />
                        </div>
                      </div>

                      {/* Thanh trượt vị trí X, Y */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                            <span>Vị trí ngang (X):</span>
                            <span className="font-mono">{inpaintX}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="80"
                            value={inpaintX}
                            onChange={(e) => setInpaintX(parseInt(e.target.value))}
                            className="w-full accent-orange-600 cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                            <span>Vị trí dọc (Y):</span>
                            <span className="font-mono">{inpaintY}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="85"
                            value={inpaintY}
                            onChange={(e) => setInpaintY(parseInt(e.target.value))}
                            className="w-full accent-orange-600 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. NẾU Ở CHẾ ĐỘ ĐÓNG KHUNG PROMO (FRAME MODE) */}
            {studioMode === "FRAME" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-2">
                    Chọn Mẫu Khung Viền Thương Mại (Frames):
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

                <div className="space-y-3 pt-1">
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
              </div>
            )}

            {/* Action Buttons Đa Năng */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={handleDownload}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <Download className="w-4 h-4" />
                Tải Ảnh PNG Về Máy
              </button>

              {/* Nút 1: Áp dụng thay thế ảnh đang chọn (Gallery hoặc Bảng size) */}
              <button
                type="button"
                disabled={isApplying}
                onClick={handleApplyToCurrentSlot}
                className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-all"
                title="Thay thế ảnh vừa dịch vào vị trí ảnh này trong sản phẩm"
              >
                <Check className="w-4 h-4" />
                {isApplying ? "Đang lưu..." : "Lưu & Cập Nhật Ảnh Này"}
              </button>

              {/* Nút 2: Áp dụng làm ảnh bìa chính */}
              <button
                type="button"
                disabled={isApplying}
                onClick={handleApplyAsPrimary}
                className="px-4 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 flex items-center justify-center gap-1.5 transition-all"
                title="Đặt ảnh đã xử lý này làm ảnh bìa chính (Avatar) của sản phẩm"
              >
                <CheckCircle className="w-4 h-4" />
                {isApplying ? "Đang áp dụng..." : "Đặt Làm Ảnh Bìa Chính"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
