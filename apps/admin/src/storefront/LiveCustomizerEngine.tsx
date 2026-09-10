import React, { useState, useEffect, useRef, useMemo } from "react";
import { WebProduct, PersonalizationField } from "@hub1688/shared-types";
import { Sparkles, Eye, Maximize2, X, RefreshCw, CheckCircle2 } from "lucide-react";

interface LiveCustomizerEngineProps {
  product: WebProduct;
  values: Record<string, any>;
  onChange: (newValues: Record<string, any>, renderedPreviewUrl?: string) => void;
  className?: string;
}

export const LiveCustomizerEngine: React.FC<LiveCustomizerEngineProps> = ({
  product,
  values,
  onChange,
  className = ""
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<"fields" | "preview">("fields");
  const [previewDataUrl, setPreviewDataUrl] = useState<string>("");

  const fields = useMemo(() => product.personalizationFields || [], [product]);

  // Handle individual field change
  const handleFieldChange = (fieldId: string, value: any) => {
    const updated = { ...values, [fieldId]: value };
    onChange(updated, previewDataUrl);
  };

  // Render the canvas artwork in real-time
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 600;
    const height = 600;
    canvas.width = width;
    canvas.height = height;

    // Background base
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, "#0f172a");
    bgGradient.addColorStop(1, "#1e293b");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Subtle grid/wood reflection
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    // Product Type Specific Mockup Rendering
    if (product.id?.includes("plaque") || product.categoryName.includes("Mica")) {
      renderAcrylicPlaque(ctx, width, height, values);
    } else if (product.id?.includes("tumbler") || product.categoryName.includes("Ly Giữ Nhiệt")) {
      renderTumbler(ctx, width, height, values);
    } else if (product.id?.includes("guitar") || product.id?.includes("ornament") || product.categoryName.includes("Treo")) {
      renderGuitarOrnament(ctx, width, height, values);
    } else if (product.id?.includes("pet") || product.categoryName.includes("Tưởng Nhớ")) {
      renderPetMemorial(ctx, width, height, values);
    } else {
      renderGenericCustomProduct(ctx, width, height, values, product);
    }

    // Watermark & Brand Badge
    ctx.font = "bold 11px sans-serif";
    ctx.fillStyle = "rgba(240, 103, 36, 0.85)";
    ctx.fillText("✨ MACORNER LIVE CUSTOMIZER", 20, 30);

    ctx.font = "9px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.fillText("Bản vẽ mô phỏng thành phẩm in thực tế • 100% Khắc/In Theo Yêu Cầu", 20, 46);

    try {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setPreviewDataUrl(dataUrl);
      onChange(values, dataUrl);
    } catch {
      // ignore security restrictions on canvas export
    }
  }, [product, values]);

  // Helper renderers for distinct POD products
  function renderAcrylicPlaque(ctx: CanvasRenderingContext2D, w: number, h: number, v: Record<string, any>) {
    // Glow effect from bottom base
    const lightGlow = ctx.createRadialGradient(w / 2, 490, 20, w / 2, 490, 250);
    lightGlow.addColorStop(0, "rgba(251, 191, 36, 0.5)");
    lightGlow.addColorStop(0.5, "rgba(245, 158, 11, 0.15)");
    lightGlow.addColorStop(1, "rgba(245, 158, 11, 0)");
    ctx.fillStyle = lightGlow;
    ctx.fillRect(0, 0, w, h);

    // Acrylic Plaque Shape (Glass effect)
    const px = 140;
    const py = 90;
    const pw = 320;
    const ph = 390;
    const rad = 24;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, rad);
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.stroke();

    // Inner bevel border
    ctx.beginPath();
    ctx.roundRect(px + 12, py + 12, pw - 24, ph - 24, rad - 8);
    ctx.strokeStyle = "rgba(251, 191, 36, 0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Heart Icon at top
    ctx.font = "28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#f59e0b";
    ctx.fillText("💖", w / 2, py + 55);

    // Title text
    const title = v["plaque_title"] || "Together Forever";
    ctx.font = "bold 22px serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(title, w / 2, py + 95);

    // Names
    const p1 = v["person_1"] || "Hoàng Nam";
    const p2 = v["person_2"] || "Khánh Linh";
    ctx.font = "italic bold 20px serif";
    ctx.fillStyle = "#fbbf24";
    ctx.fillText(`${p1}  &  ${p2}`, w / 2, py + 155);

    // Est Year
    const est = v["established_year"] || "Since 2019";
    ctx.font = "14px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fillText(`— ${est} —`, w / 2, py + 190);

    // Quote text wrapping
    const quote = v["dedication_quote"] || "Every love story is beautiful, but ours is my favorite.";
    ctx.font = "italic 13px serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    wrapText(ctx, `"${quote}"`, w / 2, py + 240, pw - 40, 20);

    // Glowing bottom line
    ctx.beginPath();
    ctx.moveTo(px + 40, py + ph - 30);
    ctx.lineTo(px + pw - 40, py + ph - 30);
    ctx.strokeStyle = "rgba(251, 191, 36, 0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    // Wooden Base at bottom
    const bx = 110;
    const by = 475;
    const bw = 380;
    const bh = 55;
    const woodGrad = ctx.createLinearGradient(bx, by, bx, by + bh);
    woodGrad.addColorStop(0, "#b45309");
    woodGrad.addColorStop(0.5, "#d97706");
    woodGrad.addColorStop(1, "#92400e");
    ctx.fillStyle = woodGrad;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 8);
    ctx.fill();
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 2;
    ctx.stroke();

    // LED slot glow on the wood
    ctx.fillStyle = "#fef3c7";
    ctx.beginPath();
    ctx.roundRect(px + 20, by + 4, pw - 40, 8, 4);
    ctx.fill();
  }

  function renderTumbler(ctx: CanvasRenderingContext2D, w: number, h: number, v: Record<string, any>) {
    // Tumbler cylinder
    const tx = 180;
    const ty = 90;
    const tw = 240;
    const th = 440;

    // Body metal gradient
    const metalGrad = ctx.createLinearGradient(tx, 0, tx + tw, 0);
    metalGrad.addColorStop(0, "#e2e8f0");
    metalGrad.addColorStop(0.3, "#ffffff");
    metalGrad.addColorStop(0.7, "#cbd5e1");
    metalGrad.addColorStop(1, "#94a3b8");

    ctx.fillStyle = metalGrad;
    ctx.beginPath();
    ctx.moveTo(tx + 20, ty);
    ctx.lineTo(tx + tw - 20, ty);
    ctx.lineTo(tx + tw, ty + th);
    ctx.lineTo(tx, ty + th);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Clear Lid
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath();
    ctx.roundRect(tx + 10, ty - 25, tw - 20, 25, [8, 8, 0, 0]);
    ctx.fill();
    ctx.stroke();

    // Artwork print area on tumbler
    const g1Name = v["girl1_name"] || "Mai Anh";
    const g2Name = v["girl2_name"] || "Phương Thảo";
    const g1Hair = v["girl1_hair"] || "Tóc Nâu Xoăn";
    const g2Hair = v["girl2_hair"] || "Tóc Vàng Đuôi Ngựa";
    const g1Drink = v["girl1_drink"] || "Ly Cà Phê";
    const quote = v["friendship_quote"] || "Side by side or miles apart, sisters will always be connected by heart";

    // Besties Illustration / Avatar Mockup
    ctx.textAlign = "center";
    ctx.font = "bold 18px serif";
    ctx.fillStyle = "#ea580c";
    ctx.fillText("💕 SOUL SISTERS 💕", w / 2, ty + 70);

    // Chibi avatars representation
    ctx.font = "40px sans-serif";
    ctx.fillText("👭", w / 2, ty + 130);

    ctx.font = "bold 15px sans-serif";
    ctx.fillStyle = "#0f172a";
    ctx.fillText(`${g1Name}  &  ${g2Name}`, w / 2, ty + 175);

    ctx.font = "11px sans-serif";
    ctx.fillStyle = "#475569";
    ctx.fillText(`(1) ${g1Hair} • ${g1Drink}`, w / 2, ty + 205);
    ctx.fillText(`(2) ${g2Hair}`, w / 2, ty + 225);

    // Divider
    ctx.beginPath();
    ctx.moveTo(tx + 40, ty + 245);
    ctx.lineTo(tx + tw - 40, ty + 245);
    ctx.strokeStyle = "#cbd5e1";
    ctx.stroke();

    // Quote
    ctx.font = "italic 11px serif";
    ctx.fillStyle = "#1e293b";
    wrapText(ctx, `"${quote}"`, w / 2, ty + 270, tw - 50, 16);
  }

  function renderGuitarOrnament(ctx: CanvasRenderingContext2D, w: number, h: number, v: Record<string, any>) {
    // Acrylic circle hanging
    const cx = w / 2;
    const cy = h / 2 + 10;
    const radius = 175;

    // Hanging string (gold)
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, 40);
    ctx.lineTo(cx, cy - radius);
    ctx.stroke();

    // Hanging ring
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(cx, cy - radius, 10, 0, Math.PI * 2);
    ctx.fill();

    // Clear acrylic disk
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Guitar illustration
    ctx.font = "68px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🎸", cx, cy - 20);

    const gName = v["guitarist_name"] || "Minh Tuấn";
    const gType = v["guitar_type"] || "Acoustic Sunburst Cổ Điển";
    const gYear = v["ornament_year"] || "2026";

    ctx.font = "bold 20px serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(gName.toUpperCase(), cx, cy + 50);

    ctx.font = "13px sans-serif";
    ctx.fillStyle = "#fbbf24";
    ctx.fillText(gType, cx, cy + 75);

    ctx.font = "bold 16px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.fillText(`★ ${gYear} ★`, cx, cy + 105);
  }

  function renderPetMemorial(ctx: CanvasRenderingContext2D, w: number, h: number, v: Record<string, any>) {
    const cx = w / 2;
    const cy = h / 2 - 20;

    // Soft warm memorial glow
    const memorialGlow = ctx.createRadialGradient(cx, cy, 30, cx, cy, 220);
    memorialGlow.addColorStop(0, "rgba(254, 243, 199, 0.35)");
    memorialGlow.addColorStop(1, "rgba(254, 243, 199, 0)");
    ctx.fillStyle = memorialGlow;
    ctx.fillRect(0, 0, w, h);

    // Memorial Plaque outline
    ctx.beginPath();
    ctx.roundRect(140, 100, 320, 380, 24);
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fill();
    ctx.strokeStyle = "rgba(251, 191, 36, 0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Halo & Wings
    ctx.textAlign = "center";
    ctx.font = "42px sans-serif";
    const hasWings = (v["angel_wings"] || "").includes("Có Cánh");
    if (hasWings) {
      ctx.fillText("🪽 😇 🪽", cx, 165);
    } else {
      ctx.fillText("🐾 ❤️ 🐾", cx, 165);
    }

    // Pet Silhouette
    ctx.font = "48px sans-serif";
    const isDog = (v["pet_breed"] || "").includes("Chó") || !(v["pet_breed"] || "").includes("Mèo");
    ctx.fillText(isDog ? "🐕" : "🐈", cx, 235);

    // Pet Name
    const pName = v["pet_name"] || "Milo";
    ctx.font = "bold 26px serif";
    ctx.fillStyle = "#fbbf24";
    ctx.fillText(pName, cx, 280);

    // Breed & Years
    const pBreed = v["pet_breed"] || "Corgi Mông Tròn";
    const pYears = v["pet_years"] || "2016 - 2025";
    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(pBreed, cx, 310);

    ctx.font = "13px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.fillText(`— ${pYears} —`, cx, 335);

    // Quote
    const pQuote = v["pet_quote"] || "You were my favorite hello and my hardest goodbye";
    ctx.font = "italic 12px serif";
    ctx.fillStyle = "#fef3c7";
    wrapText(ctx, `"${pQuote}"`, cx, 375, 270, 18);
  }

  function renderGenericCustomProduct(ctx: CanvasRenderingContext2D, w: number, h: number, v: Record<string, any>, p: WebProduct) {
    ctx.textAlign = "center";
    ctx.font = "bold 20px serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(p.titleVI.substring(0, 35) + "...", w / 2, 100);

    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#fbbf24";
    ctx.fillText("TÙY CHỈNH THEO YÊU CẦU", w / 2, 140);

    let y = 190;
    Object.entries(v).forEach(([k, val]) => {
      if (typeof val === "string" && val.trim()) {
        ctx.font = "bold 13px sans-serif";
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.fillText(k.toUpperCase(), w / 2, y);
        ctx.font = "16px serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(val, w / 2, y + 22);
        y += 50;
      }
    });
  }

  // Wrap text utility for canvas
  function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = text.split(" ");
    let line = "";
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + " ";
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }

  return (
    <div className={`bg-slate-900 rounded-2xl border border-slate-700/80 overflow-hidden shadow-xl ${className}`}>
      {/* Engine Header Bar */}
      <div className="bg-slate-800/90 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md">
            <Sparkles size={18} />
          </div>
          <div>
            <h4 className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
              Live Personalization Customizer
              <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                Macorner Engine
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Nhập thông tin & xem trước thành phẩm in thời gian thực (Live Preview)
            </p>
          </div>
        </div>

        {/* Tab switch on mobile */}
        <div className="flex sm:hidden items-center bg-slate-950 p-1 rounded-lg border border-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab("fields")}
            className={`px-3 py-1 rounded text-xs font-semibold ${activeTab === "fields" ? "bg-orange-500 text-white" : "text-slate-400"}`}
          >
            Tùy Biến
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`px-3 py-1 rounded text-xs font-semibold ${activeTab === "preview" ? "bg-orange-500 text-white" : "text-slate-400"}`}
          >
            Bản Vẽ
          </button>
        </div>
      </div>

      {/* Main Grid: Left Fields - Right Canvas */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-0">
        {/* Input Controls Column */}
        <div className={`p-4 sm:p-5 sm:col-span-7 space-y-4 max-h-[480px] overflow-y-auto ${activeTab === "preview" ? "hidden sm:block" : ""}`}>
          <div className="bg-orange-950/30 border border-orange-500/20 rounded-xl p-3 flex items-center justify-between text-xs text-orange-300">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 size={15} className="text-orange-400 shrink-0" />
              Thay đổi sẽ hiển thị ngay tức thì trên hình minh họa
            </span>
            <span className="text-[10px] bg-orange-500/30 px-1.5 py-0.5 rounded font-mono">100% Free Custom</span>
          </div>

          {fields.map((field) => (
            <div key={field.id} className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                <span>{field.label} {field.required && <span className="text-orange-400">*</span>}</span>
                {field.maxLength && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {String(values[field.id] || "").length}/{field.maxLength}
                  </span>
                )}
              </label>

              {field.type === "SELECT" && field.options && (
                <div className="grid grid-cols-1 gap-1.5">
                  {field.options.map((opt) => {
                    const isSelected = (values[field.id] || field.defaultValue) === opt.value;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleFieldChange(field.id, opt.value)}
                        className={`text-left px-3 py-2 rounded-xl text-xs border transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-orange-500/20 border-orange-500 text-white font-medium shadow-sm ring-1 ring-orange-500/30"
                            : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <CheckCircle2 size={14} className="text-orange-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {field.type === "TEXT" && (
                <input
                  type="text"
                  value={values[field.id] ?? field.defaultValue ?? ""}
                  maxLength={field.maxLength || 50}
                  placeholder={field.placeholder}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-medium"
                />
              )}

              {field.type === "TEXTAREA" && (
                <textarea
                  rows={2}
                  value={values[field.id] ?? field.defaultValue ?? ""}
                  maxLength={field.maxLength || 150}
                  placeholder={field.placeholder}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                />
              )}
            </div>
          ))}
        </div>

        {/* Live Canvas Mockup Column */}
        <div className={`p-4 sm:p-5 sm:col-span-5 bg-slate-950/60 border-t sm:border-t-0 sm:border-l border-slate-800 flex flex-col items-center justify-center relative ${activeTab === "fields" ? "hidden sm:flex" : ""}`}>
          <div className="w-full max-w-[260px] aspect-square rounded-2xl overflow-hidden border border-slate-700 shadow-2xl relative group">
            <canvas
              ref={canvasRef}
              className="w-full h-full object-contain bg-slate-900"
            />
            {/* Overlay Action */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setShowFullPreview(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-lg"
              >
                <Maximize2 size={13} /> Phóng To
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFullPreview(true)}
              className="text-xs text-orange-400 hover:text-orange-300 font-medium flex items-center gap-1"
            >
              <Eye size={13} /> Nhấn để xem ảnh phóng to
            </button>
          </div>
        </div>
      </div>

      {/* Full Resolution Preview Modal */}
      {showFullPreview && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Sparkles className="text-orange-400" size={16} />
                Bản Vẽ Thiết Kế Thành Phẩm (In Thực Tế)
              </h3>
              <button
                type="button"
                onClick={() => setShowFullPreview(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 flex items-center justify-center bg-slate-950">
              {previewDataUrl ? (
                <img
                  src={previewDataUrl}
                  alt="Customized preview"
                  className="max-h-[380px] w-auto rounded-xl shadow-2xl border border-slate-800"
                />
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
                  <RefreshCw className="animate-spin mr-2" size={16} /> Đang dựng mô hình...
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Ảnh này sẽ được đính kèm vào đơn hàng chuyển xưởng sản xuất
              </span>
              <button
                type="button"
                onClick={() => setShowFullPreview(false)}
                className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-4 py-2 rounded-xl"
              >
                Hoàn Tất & Tiếp Tục
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
