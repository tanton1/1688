import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  PersonalizationField,
  PersonalizationImageValue,
  WebProduct,
  WebProductVariant
} from "@hub1688/shared-types";
import {
  getPersonalizationImageUrl,
  isPersonalizationFieldVisible,
  PersonalizationValidationResult,
  validatePersonalizationValues
} from "@hub1688/shared-utils";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Plus,
  Sparkles,
  Trash2
} from "lucide-react";
import { AdminApi } from "../services/api";
import { getVariantVisual } from "./VariantMockupPreview";
import { getCustomizationGuestSessionId, preparePersonalizationImage } from "./personalizationImage";

interface LiveCustomizerEngineProps {
  product: WebProduct;
  variant?: WebProductVariant;
  values: Record<string, any>;
  onChange: (newValues: Record<string, any>, renderedPreviewUrl?: string) => void;
  onValidationChange?: (result: PersonalizationValidationResult) => void;
  showValidation?: boolean;
  className?: string;
}

const loadCanvasImage = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error("IMAGE_LOAD_FAILED"));
  image.src = url;
});

const drawContainedImage = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  shape?: "RECT" | "CIRCLE",
  crop?: PersonalizationImageValue["crop"]
) => {
  context.save();
  if (shape === "CIRCLE") {
    context.beginPath();
    context.arc(x + width / 2, y + height / 2, Math.min(width, height) / 2, 0, Math.PI * 2);
    context.clip();
  }
  if (crop) {
    const ratio = Math.max(width / image.naturalWidth, height / image.naturalHeight) * Math.max(0.5, Math.min(3, crop.zoom || 1));
    const renderedWidth = image.naturalWidth * ratio;
    const renderedHeight = image.naturalHeight * ratio;
    context.translate(x + width / 2, y + height / 2);
    context.rotate((crop.rotation || 0) * Math.PI / 180);
    context.drawImage(image, -renderedWidth / 2 + (crop.x || 0) / 100 * width, -renderedHeight / 2 + (crop.y || 0) / 100 * height, renderedWidth, renderedHeight);
  } else {
    const ratio = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const renderedWidth = image.naturalWidth * ratio;
    const renderedHeight = image.naturalHeight * ratio;
    context.drawImage(image, x + (width - renderedWidth) / 2, y + (height - renderedHeight) / 2, renderedWidth, renderedHeight);
  }
  context.restore();
};

const canvasPlacement = (field: PersonalizationField, index: number, width: number, height: number, printAreas: Array<{ xPercent: number; yPercent: number; widthPercent: number; heightPercent: number; rotationDeg?: number; shape?: "RECT" | "CIRCLE" }> = []) => {
  const preview = field.preview || {};
  const area = printAreas.find(candidate => (candidate as any).fieldIds?.includes(field.id));
  const fallbackArea = printAreas[0];
  const defaultY = 32 + Math.min(index, 5) * 9;
  return {
    x: (area?.xPercent ?? preview.xPercent ?? fallbackArea?.xPercent ?? 22) / 100 * width,
    y: (area?.yPercent ?? preview.yPercent ?? fallbackArea?.yPercent ?? defaultY) / 100 * height,
    width: (area?.widthPercent ?? preview.widthPercent ?? fallbackArea?.widthPercent ?? 56) / 100 * width,
    height: (area?.heightPercent ?? preview.heightPercent ?? fallbackArea?.heightPercent ?? (field.type === "IMAGE_UPLOAD" ? 38 : 10)) / 100 * height,
    rotation: (area?.rotationDeg ?? preview.rotationDeg ?? fallbackArea?.rotationDeg ?? 0) * Math.PI / 180,
    shape: area?.shape || preview.shape || fallbackArea?.shape
  };
};

export const LiveCustomizerEngine: React.FC<LiveCustomizerEngineProps> = ({
  product,
  variant,
  values,
  onChange,
  onValidationChange,
  showValidation = false,
  className = ""
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onChangeRef = useRef(onChange);
  const validationChangeRef = useRef(onValidationChange);
  const valuesRef = useRef(values);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [uploadingFieldId, setUploadingFieldId] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [previewExportable, setPreviewExportable] = useState(true);
  const [cropFieldId, setCropFieldId] = useState<string | null>(null);

  const fields = useMemo(() => product.personalizationFields || [], [product.personalizationFields]);
  const printAreas = useMemo(() => product.customizerCanvas?.printAreas || [], [product.customizerCanvas]);
  const visibleFields = useMemo(
    () => fields.filter(field => isPersonalizationFieldVisible(field, values)),
    [fields, values]
  );
  const validation = useMemo(() => validatePersonalizationValues(fields, values), [fields, values]);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { validationChangeRef.current = onValidationChange; }, [onValidationChange]);
  useEffect(() => { valuesRef.current = values; }, [values]);
  useEffect(() => { validationChangeRef.current?.(validation); }, [validation]);

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setUploadErrors(current => ({ ...current, [fieldId]: "" }));
    onChangeRef.current({ ...valuesRef.current, [fieldId]: value });
  };

  const handleImageUpload = async (field: PersonalizationField, file?: File) => {
    if (!file) return;
    setTouched(current => ({ ...current, [field.id]: true }));
    setUploadingFieldId(field.id);
    setUploadErrors(current => ({ ...current, [field.id]: "" }));
    try {
      const prepared = await preparePersonalizationImage(file, field);
      const response = await AdminApi.uploadCustomizationImage({
        ...prepared,
        guestSessionId: getCustomizationGuestSessionId()
      });
      handleFieldChange(field.id, response.image);
    } catch (error: any) {
      setUploadErrors(current => ({
        ...current,
        [field.id]: error?.message || "Không thể tải ảnh lên, vui lòng thử lại"
      }));
    } finally {
      setUploadingFieldId(null);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    let cancelled = false;

    const render = async () => {
      const width = 1000;
      const height = 1000;
      canvas.width = width;
      canvas.height = height;
      const background = context.createRadialGradient(width * 0.35, height * 0.2, 40, width / 2, height / 2, width * 0.72);
      background.addColorStop(0, "#ffffff");
      background.addColorStop(0.55, "#f8fafc");
      background.addColorStop(1, "#e2e8f0");
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      const visual = getVariantVisual(product, variant);
      const baseUrl = product.customizerMockupTemplateUrl || (visual.type === "PLAIN" ? variant?.imageUrl : undefined) || product.primaryImage;
      let baseDrawn = false;
      if (baseUrl) {
        try {
          const base = await loadCanvasImage(baseUrl);
          if (cancelled) return;
          drawContainedImage(context, base, 25, 25, width - 50, height - 50);
          baseDrawn = true;
        } catch {
          // A remote supplier may block CORS. Keep an exportable neutral mockup.
        }
      }

      const configuredArea = printAreas[0];
      const printArea = {
        x: width * (configuredArea?.xPercent ?? 18) / 100,
        y: height * (configuredArea?.yPercent ?? 20) / 100,
        width: width * (configuredArea?.widthPercent ?? 64) / 100,
        height: height * (configuredArea?.heightPercent ?? 62) / 100
      };
      if (!baseDrawn) {
        context.fillStyle = "#ffffff";
        context.strokeStyle = "#cbd5e1";
        context.lineWidth = 3;
        context.beginPath();
        context.roundRect(printArea.x, printArea.y, printArea.width, printArea.height, 48);
        context.fill();
        context.stroke();
      }

      if (visual.type === "COLOR" && visual.colorHex) {
        context.save();
        context.globalAlpha = 0.52;
        context.globalCompositeOperation = "multiply";
        context.fillStyle = visual.colorHex;
        context.beginPath();
        context.roundRect(printArea.x, printArea.y, printArea.width, printArea.height, 36);
        context.fill();
        context.restore();
      }
      if (visual.type === "DESIGN" && visual.imageUrl) {
        try {
          const design = await loadCanvasImage(visual.imageUrl);
          if (cancelled) return;
          context.save();
          context.globalAlpha = 0.92;
          context.globalCompositeOperation = "multiply";
          drawContainedImage(context, design, printArea.x, printArea.y, printArea.width, printArea.height);
          context.restore();
        } catch {
          // Variant image remains available in the gallery even if supplier CORS blocks compositing.
        }
      }

      for (let index = 0; index < visibleFields.length; index += 1) {
        const field = visibleFields[index];
        const value = values[field.id];
        if (value === undefined || value === null || value === "" || value === false) continue;
        const placement = canvasPlacement(field, index, width, height, printAreas);
        context.save();
        context.translate(placement.x + placement.width / 2, placement.y + placement.height / 2);
        context.rotate(placement.rotation);
        context.translate(-placement.width / 2, -placement.height / 2);

        const option = field.options?.find(candidate => candidate.value === value);
        const assetUrl = field.type === "IMAGE_UPLOAD"
          ? getPersonalizationImageUrl(value)
          : (["ASSET_PICKER", "AVATAR_BUILDER", "PET_BUILDER"].includes(field.type) ? option?.previewAssetUrl || option?.thumbnail : undefined);
        if (assetUrl) {
          try {
            const asset = await loadCanvasImage(assetUrl);
            if (cancelled) return;
            drawContainedImage(context, asset, 0, 0, placement.width, placement.height, placement.shape, field.type === "IMAGE_UPLOAD" ? (value as PersonalizationImageValue)?.crop : undefined);
          } catch {
            // Do not prevent text and other layers from rendering.
          }
        } else if (field.type !== "CHECKBOX" && field.type !== "REPEAT_GROUP") {
          const text = option?.label || String(value);
          const fontSize = Math.max(18, (field.preview?.fontSizePercent || 3.2) / 100 * width);
          context.fillStyle = field.preview?.color || "#172033";
          context.font = `${field.preview?.fontWeight || "bold"} ${fontSize}px ${field.preview?.fontFamily || "Arial, sans-serif"}`;
          context.textAlign = field.preview?.textAlign || "center";
          context.textBaseline = "middle";
          const x = context.textAlign === "left" ? 0 : context.textAlign === "right" ? placement.width : placement.width / 2;
          context.fillText(text.slice(0, 160), x, placement.height / 2, placement.width);
        }
        context.restore();
      }

      context.fillStyle = "rgba(15, 23, 42, 0.72)";
      context.font = "600 20px Arial, sans-serif";
      context.textAlign = "center";
      context.fillText(visual.label, width / 2, height - 35, width - 80);

      try {
        const preview = canvas.toDataURL("image/jpeg", 0.9);
        if (!cancelled) {
          setPreviewExportable(true);
          onChangeRef.current(values, preview);
        }
      } catch {
        if (!cancelled) setPreviewExportable(false);
      }
    };

    void render();
    return () => { cancelled = true; };
  }, [product, variant, values, visibleFields, printAreas]);

  const renderField = (field: PersonalizationField) => {
    const value = values[field.id];
    const error = uploadErrors[field.id] || validation.errors[field.id];
    const showError = Boolean(error && (showValidation || touched[field.id]));
    const commonInput = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20";

    const label = (
      <div className="mb-1.5 flex items-start justify-between gap-3">
        <label htmlFor={`personalization-${field.id}`} className="text-xs font-bold text-slate-800">
          {field.label} {field.required && <span className="text-rose-600">*</span>}
        </label>
        {field.maxLength && typeof value === "string" && (
          <span className="shrink-0 text-[10px] font-semibold text-slate-400">{value.length}/{field.maxLength}</span>
        )}
      </div>
    );

    let control: React.ReactNode;
    if (field.type === "TEXTAREA") {
      control = <textarea id={`personalization-${field.id}`} value={String(value || "")} maxLength={field.maxLength} rows={3} placeholder={field.placeholder} onBlur={() => setTouched(current => ({ ...current, [field.id]: true }))} onChange={event => handleFieldChange(field.id, event.target.value)} className={`${commonInput} resize-y py-2.5`} />;
    } else if (field.type === "SELECT") {
      const visualOptions = (field.options || []).length > 0 && (field.options || []).length <= 12 && (field.options || []).some(option => option.previewAssetUrl || option.thumbnail);
      control = visualOptions
        ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{(field.options || []).map(option => { const selected = String(value ?? "") === String(option.value); return <button key={option.id} type="button" aria-pressed={selected} onClick={() => { setTouched(current => ({ ...current, [field.id]: true })); handleFieldChange(field.id, option.value); }} className={`overflow-hidden rounded-xl border text-left transition ${selected ? "border-orange-500 ring-2 ring-orange-500/20" : "border-slate-200 hover:border-orange-400"}`}>{option.previewAssetUrl || option.thumbnail ? <img src={option.previewAssetUrl || option.thumbnail} alt="" className="aspect-[4/3] w-full object-cover" /> : null}<span className="block px-2 py-2 text-[11px] font-bold text-slate-700">{option.label}</span>{option.priceDeltaVND ? <span className="block px-2 pb-2 text-[10px] font-semibold text-orange-600">{option.priceDeltaVND > 0 ? "+" : ""}{option.priceDeltaVND.toLocaleString("vi-VN")}đ</span> : null}</button>; })}</div>
        : <select id={`personalization-${field.id}`} value={String(value ?? "")} onBlur={() => setTouched(current => ({ ...current, [field.id]: true }))} onChange={event => handleFieldChange(field.id, event.target.value)} className={commonInput}><option value="">{field.placeholder || "Chọn một tùy chọn"}</option>{(field.options || []).map(option => <option key={option.id} value={option.value}>{option.label}{option.priceDeltaVND ? ` (+${option.priceDeltaVND.toLocaleString("vi-VN")}đ)` : ""}</option>)}</select>;
    } else if (field.type === "NUMBER") {
      control = <input id={`personalization-${field.id}`} type="number" min={field.min} max={field.max} value={value ?? ""} placeholder={field.placeholder} onBlur={() => setTouched(current => ({ ...current, [field.id]: true }))} onChange={event => handleFieldChange(field.id, event.target.value === "" ? "" : Number(event.target.value))} className={commonInput} />;
    } else if (field.type === "CHECKBOX") {
      control = <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700"><input id={`personalization-${field.id}`} type="checkbox" checked={Boolean(value)} onBlur={() => setTouched(current => ({ ...current, [field.id]: true }))} onChange={event => handleFieldChange(field.id, event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500" /><span>{field.placeholder || "Tôi xác nhận lựa chọn này"}</span></label>;
    } else if (field.type === "COLOR_SWATCH") {
      control = <div className="flex flex-wrap gap-2">{(field.options || []).map(option => { const selected = value === option.value; return <button key={option.id} type="button" title={option.label} aria-label={option.label} aria-pressed={selected} onClick={() => { setTouched(current => ({ ...current, [field.id]: true })); handleFieldChange(field.id, option.value); }} className={`relative h-11 w-11 rounded-full border-2 p-1 transition ${selected ? "border-orange-600 ring-2 ring-orange-500/20" : "border-slate-200"}`}><span className="block h-full w-full rounded-full border border-black/10" style={{ backgroundColor: option.value }} />{selected && <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />}</button>; })}</div>;
    } else if (["ASSET_PICKER", "AVATAR_BUILDER", "PET_BUILDER"].includes(field.type)) {
      control = <div className="grid grid-cols-3 gap-2">{(field.options || []).map(option => { const selected = value === option.value; return <button key={option.id} type="button" aria-label={option.label} aria-pressed={selected} onClick={() => { setTouched(current => ({ ...current, [field.id]: true })); handleFieldChange(field.id, option.value); }} className={`mc-focus-ring min-h-11 overflow-hidden rounded-xl border bg-white text-left transition active:scale-[0.98] ${selected ? "border-orange-500 ring-2 ring-orange-500/20" : "border-slate-200 hover:border-slate-400"}`}>{option.thumbnail || option.previewAssetUrl ? <img src={option.thumbnail || option.previewAssetUrl} alt="" className="aspect-square w-full object-cover" /> : <div className="grid aspect-square place-items-center bg-slate-50 text-xl">◇</div>}<span className="block truncate px-2 py-1.5 text-[10px] font-bold text-slate-700">{option.label}</span></button>; })}</div>;
    } else if (field.type === "IMAGE_UPLOAD") {
      const image = value as PersonalizationImageValue | undefined;
      control = <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3"><div className="flex items-center gap-3">{image?.url ? <button type="button" onClick={() => setCropFieldId(field.id)} className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white"><img src={image.url} alt="Ảnh đã tải" className="h-full w-full object-cover transition group-hover:scale-105" /><span className="absolute inset-x-0 bottom-0 bg-slate-950/75 py-1 text-[9px] font-bold text-white">Cắt ảnh</span></button> : <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-white text-slate-400 ring-1 ring-slate-200"><ImagePlus className="h-6 w-6" /></div>}<div className="min-w-0 flex-1"><label htmlFor={`personalization-${field.id}`} className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold ${uploadingFieldId === field.id ? "bg-slate-200 text-slate-500" : "bg-slate-900 text-white hover:bg-slate-800"}`}>{uploadingFieldId === field.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}{uploadingFieldId === field.id ? "Đang tải ảnh…" : image?.url ? "Đổi ảnh" : "Chọn ảnh từ máy"}</label><input id={`personalization-${field.id}`} type="file" accept={(field.accept || ["image/jpeg", "image/png", "image/webp"]).join(",")} disabled={uploadingFieldId === field.id} onChange={event => void handleImageUpload(field, event.target.files?.[0])} className="sr-only" />{image?.url && <button type="button" onClick={() => handleFieldChange(field.id, undefined)} className="ml-1 min-h-11 px-2 text-[11px] font-bold text-rose-600">Xóa</button>}</div></div><p className="mt-2 text-[10px] leading-4 text-slate-500">JPG/PNG/WebP · tối đa {field.maxFileSizeMB || 12}MB{field.minImageWidth ? ` · từ ${field.minImageWidth}px` : ""}. Nhấn “Cắt ảnh” để căn khuôn, phóng to hoặc xoay trước khi đặt hàng.</p></div>;
    } else if (field.type === "REPEAT_GROUP" && field.repeat) {
      const items = Array.isArray(value) ? value as Record<string, any>[] : [];
      control = <div className="space-y-2">{items.map((item, itemIndex) => <div key={itemIndex} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="mb-2 flex items-center justify-between"><span className="text-[11px] font-black text-slate-700">{field.repeat?.itemLabel || "Mục"} {itemIndex + 1}</span><button type="button" aria-label="Xóa mục" onClick={() => handleFieldChange(field.id, items.filter((_, index) => index !== itemIndex))} className="grid h-8 w-8 place-items-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button></div><div className="space-y-2">{field.repeat?.fields.filter(child => isPersonalizationFieldVisible(child, item)).map(child => <label key={child.id} className="block text-[11px] font-semibold text-slate-600">{child.label}{child.required && " *"}{child.type === "SELECT" ? <select value={item[child.id] ?? ""} onChange={event => { const next = [...items]; next[itemIndex] = { ...item, [child.id]: event.target.value }; handleFieldChange(field.id, next); }} className={`${commonInput} mt-1`}><option value="">Chọn</option>{(child.options || []).map(option => <option key={option.id} value={option.value}>{option.label}</option>)}</select> : <input type={child.type === "NUMBER" ? "number" : "text"} value={item[child.id] ?? ""} maxLength={child.maxLength} onChange={event => { const next = [...items]; next[itemIndex] = { ...item, [child.id]: child.type === "NUMBER" ? Number(event.target.value) : event.target.value }; handleFieldChange(field.id, next); }} className={`${commonInput} mt-1`} />}</label>)}</div></div>)}<button type="button" disabled={items.length >= field.repeat.maxItems} onClick={() => { setTouched(current => ({ ...current, [field.id]: true })); handleFieldChange(field.id, [...items, {}]); }} className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:border-orange-400 disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" /> Thêm {field.repeat.itemLabel?.toLowerCase() || "mục"} ({items.length}/{field.repeat.maxItems})</button></div>;
    } else {
      control = <input id={`personalization-${field.id}`} type="text" value={String(value || "")} maxLength={field.maxLength} placeholder={field.placeholder} onBlur={() => setTouched(current => ({ ...current, [field.id]: true }))} onChange={event => handleFieldChange(field.id, event.target.value)} className={commonInput} />;
    }

    return <div key={field.id} data-personalization-field={field.id}>{label}{control}{field.helpText && <p id={`personalization-help-${field.id}`} className="mt-1 text-[10px] leading-4 text-slate-500">{field.helpText}</p>}{showError && <p id={`personalization-error-${field.id}`} role="alert" className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}</p>}</div>;
  };

  const cropField = cropFieldId ? fields.find(field => field.id === cropFieldId) : undefined;
  const cropImage = cropField ? values[cropField.id] as PersonalizationImageValue | undefined : undefined;
  const crop = cropImage?.crop || { x: 0, y: 0, zoom: 1, rotation: 0 };
  const updateCrop = (updates: Partial<NonNullable<PersonalizationImageValue["crop"]>>) => {
    if (!cropField || !cropImage) return;
    handleFieldChange(cropField.id, { ...cropImage, crop: { ...crop, ...updates } });
  };

  return (
    <section id="product-personalizer" className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="border-b border-slate-200 bg-slate-950 px-4 py-3 text-white">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-orange-500"><Sparkles className="h-4 w-4" /></span><div><h3 className="text-sm font-black">Cá nhân hoá sản phẩm</h3><p className="text-[10px] text-slate-300">Xem trước trực tiếp · không cần đăng nhập</p></div></div>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${validation.valid ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-slate-200"}`}>{validation.completedRequired}/{validation.totalRequired} bắt buộc</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all" style={{ width: `${validation.totalRequired ? validation.completedRequired / validation.totalRequired * 100 : 100}%` }} /></div>
      </div>

      <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_210px]">
        <div className="max-h-[560px] space-y-4 overflow-y-auto p-4 sm:p-5">
          {visibleFields.length > 0 ? visibleFields.map(renderField) : <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Sản phẩm chưa có trường cá nhân hoá. Hãy cấu hình trong trang quản trị.</p>}
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[10px] leading-4 text-emerald-800"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Bản nháp được tự động lưu trên thiết bị. Ảnh sau khi chọn được tải lên kho riêng của cửa hàng.</span></div>
        </div>
        <div className="border-t border-slate-200 bg-slate-100 p-3 md:border-l md:border-t-0">
          <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">Bản xem trước</p>
          <canvas ref={canvasRef} className="aspect-square w-full rounded-xl border border-slate-200 bg-white object-contain shadow-sm" />
          <p className="mt-2 text-center text-[9px] leading-3 text-slate-500">Màu sắc thực tế có thể chênh lệch nhẹ khi in.{!previewExportable && " Nhà cung cấp ảnh đang chặn xuất preview, ảnh gốc vẫn được lưu."}</p>
        </div>
      </div>
      {cropField && cropImage?.url && <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label="Căn chỉnh ảnh cá nhân hóa"><div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl"><div className="mb-3 flex items-center justify-between"><div><h4 className="text-sm font-black text-slate-900">Căn chỉnh ảnh</h4><p className="text-[10px] text-slate-500">Ảnh sẽ được lưu cùng đơn hàng</p></div><button type="button" onClick={() => setCropFieldId(null)} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">Đóng</button></div><div className="relative mx-auto aspect-square max-h-[55vh] overflow-hidden rounded-xl bg-slate-100"><img src={cropImage.url} alt="Căn chỉnh" className="h-full w-full object-contain" style={{ transform: `translate(${crop.x}%, ${crop.y}%) scale(${crop.zoom}) rotate(${crop.rotation}deg)` }} /></div><div className="mt-4 grid gap-3"><label className="text-xs font-bold text-slate-700">Phóng to <input type="range" min="0.5" max="3" step="0.05" value={crop.zoom} onChange={event => updateCrop({ zoom: Number(event.target.value) })} className="mt-1 w-full accent-orange-600" /></label><label className="text-xs font-bold text-slate-700">Dịch ngang <input type="range" min="-50" max="50" value={crop.x} onChange={event => updateCrop({ x: Number(event.target.value) })} className="mt-1 w-full accent-orange-600" /></label><label className="text-xs font-bold text-slate-700">Dịch dọc <input type="range" min="-50" max="50" value={crop.y} onChange={event => updateCrop({ y: Number(event.target.value) })} className="mt-1 w-full accent-orange-600" /></label><label className="text-xs font-bold text-slate-700">Xoay <input type="range" min="-180" max="180" value={crop.rotation} onChange={event => updateCrop({ rotation: Number(event.target.value) })} className="mt-1 w-full accent-orange-600" /></label></div><button type="button" onClick={() => setCropFieldId(null)} className="mt-4 min-h-11 w-full rounded-xl bg-orange-600 text-xs font-black text-white hover:bg-orange-700">Áp dụng</button></div></div>}
    </section>
  );
};
