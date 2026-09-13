import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  PersonalizationField,
  PersonalizationFieldType,
  PersonalizationOptionItem,
  PersonalizationCanvas,
  PersonalizationPrintArea,
  PersonalizationCanvasLayer,
  PersonalizationListingIdea,
  WebProductVariant
} from "@hub1688/shared-types";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Plus,
  Settings2,
  Trash2
} from "lucide-react";

interface PersonalizationBuilderProps {
  enabled: boolean;
  mockupUrl?: string;
  fields: PersonalizationField[];
  canvas?: PersonalizationCanvas;
  previewImageUrl?: string;
  variants?: WebProductVariant[];
  onEnabledChange: (enabled: boolean) => void;
  onMockupUrlChange: (url: string) => void;
  onFieldsChange: (fields: PersonalizationField[]) => void;
  onCanvasChange: (canvas: PersonalizationCanvas | undefined) => void;
}

const FIELD_TYPES: Array<{ value: PersonalizationFieldType; label: string }> = [
  { value: "TEXT", label: "Văn bản ngắn" },
  { value: "TEXTAREA", label: "Lời nhắn dài" },
  { value: "SELECT", label: "Danh sách chọn" },
  { value: "ASSET_PICKER", label: "Thư viện design" },
  { value: "AVATAR_BUILDER", label: "Tạo avatar nhiều lớp" },
  { value: "PET_BUILDER", label: "Tạo thú cưng nhiều lớp" },
  { value: "COLOR_SWATCH", label: "Bảng màu" },
  { value: "IMAGE_UPLOAD", label: "Khách tải ảnh" },
  { value: "NUMBER", label: "Số" },
  { value: "CHECKBOX", label: "Xác nhận" },
  { value: "REPEAT_GROUP", label: "Nhóm lặp (người/thú cưng)" }
];

const newId = (prefix: string): string => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
const supportsOptions = (type: PersonalizationFieldType) => ["SELECT", "ASSET_PICKER", "COLOR_SWATCH", "AVATAR_BUILDER", "PET_BUILDER"].includes(type);

const createField = (): PersonalizationField => ({
  id: newId("field"),
  label: "Trường tùy biến mới",
  type: "TEXT",
  required: true,
  maxLength: 30,
  step: "1. Nội dung",
  preview: { xPercent: 22, yPercent: 42, widthPercent: 56, heightPercent: 10, fontSizePercent: 3.2, color: "#172033", textAlign: "center", fontWeight: "bold" }
});

const createOption = (type: PersonalizationFieldType): PersonalizationOptionItem => ({
  id: newId("option"),
  label: "Tùy chọn mới",
  value: type === "COLOR_SWATCH" ? "#f97316" : newId("value")
});

const nextFieldsFallback = (fields: PersonalizationField[]): PersonalizationField[] => fields;
const EMPTY_VARIANTS: WebProductVariant[] = [];
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const NumberInput = ({ label, value, onChange, min = 0, max = 100 }: { label: string; value?: number; onChange: (value: number | undefined) => void; min?: number; max?: number }) => (
  <label className="block text-[10px] font-bold text-slate-500">
    {label}
    <input type="number" aria-label={label} min={min} max={max} value={value ?? ""} onChange={event => onChange(event.target.value === "" ? undefined : Number(event.target.value))} className="mc-focus-ring mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-800 outline-none focus:border-orange-500" />
  </label>
);

export const PersonalizationBuilder: React.FC<PersonalizationBuilderProps> = ({
  enabled,
  mockupUrl,
  fields,
  canvas,
  previewImageUrl,
  variants = EMPTY_VARIANTS,
  onEnabledChange,
  onMockupUrlChange,
  onFieldsChange,
  onCanvasChange
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(fields[0]?.id || null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(canvas?.printAreas?.[0]?.id || null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(canvas?.scenes?.[0]?.id || null);
  const [selectedPreviewSkuId, setSelectedPreviewSkuId] = useState<string>(variants.find(variant => variant.selectedForSale)?.sourceSkuId || variants[0]?.sourceSkuId || "");
  const dragRef = useRef<{ id: string; startX: number; startY: number; x: number; y: number; rect: DOMRect } | null>(null);
  const resizeRef = useRef<{ id: string; startX: number; startY: number; x: number; y: number; width: number; height: number; rect: DOMRect } | null>(null);

  const patchField = (index: number, updates: Partial<PersonalizationField>) => {
    const next = [...fields];
    next[index] = { ...next[index], ...updates };
    onFieldsChange(next);
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    onFieldsChange(next);
  };

  const patchOption = (fieldIndex: number, optionIndex: number, updates: Partial<PersonalizationOptionItem>) => {
    const options = [...(fields[fieldIndex].options || [])];
    options[optionIndex] = { ...options[optionIndex], ...updates };
    patchField(fieldIndex, { options });
  };
  const printAreas = canvas?.printAreas || [];
  const scenes = canvas?.scenes || [];
  const activeSceneId = selectedSceneId && scenes.some(scene => scene.id === selectedSceneId) ? selectedSceneId : scenes[0]?.id;
  const activeScene = scenes.find(scene => scene.id === activeSceneId);
  const saleVariants = useMemo(() => variants.filter(variant => variant.selectedForSale), [variants]);
  const previewVariants = useMemo(() => saleVariants.length ? saleVariants : variants, [saleVariants, variants]);
  const selectedPreviewVariant = previewVariants.find(variant => variant.sourceSkuId === selectedPreviewSkuId) || previewVariants[0];
  const activeMockupUrl = (selectedPreviewVariant ? activeScene?.variantMockupUrls?.[selectedPreviewVariant.sourceSkuId] : undefined) || activeScene?.mockupUrl || mockupUrl || previewImageUrl;
  const canvasWarnings = useMemo(() => {
    const areaIds = new Set(printAreas.map(area => area.id));
    const fieldIds = new Set(fields.map(field => field.id));
    const warnings: string[] = [];
    printAreas.forEach(area => {
      if (area.xPercent + area.widthPercent > 100 || area.yPercent + area.heightPercent > 100) {
        warnings.push(`${area.label || area.id}: vùng in vượt khỏi khung mockup`);
      }
    });
    (canvas?.layers || []).forEach(layer => {
      if (!areaIds.has(layer.printAreaId)) warnings.push(`${layer.label || layer.id}: chưa gắn vùng in`);
      if (layer.source === "FIELD" && (!layer.fieldId || !fieldIds.has(layer.fieldId))) warnings.push(`${layer.label || layer.id}: chưa gắn field`);
    });
    return Array.from(new Set(warnings));
  }, [canvas?.layers, fields, printAreas]);

  useEffect(() => {
    if (previewVariants.length && !previewVariants.some(variant => variant.sourceSkuId === selectedPreviewSkuId)) {
      setSelectedPreviewSkuId(previewVariants[0].sourceSkuId);
    }
  }, [previewVariants, selectedPreviewSkuId]);

  const patchScene = (sceneIndex: number, updates: Partial<NonNullable<PersonalizationCanvas["scenes"]>[number]>) => {
    const nextScenes = [...scenes];
    nextScenes[sceneIndex] = { ...nextScenes[sceneIndex], ...updates };
    onCanvasChange({ ...(canvas || {}), scenes: nextScenes, printAreas });
  };
  const patchSceneVariantUrl = (sceneIndex: number, skuId: string, url?: string) => {
    const scene = scenes[sceneIndex];
    if (!scene) return;
    const variantMockupUrls = { ...(scene.variantMockupUrls || {}) };
    if (url) variantMockupUrls[skuId] = url;
    else delete variantMockupUrls[skuId];
    patchScene(sceneIndex, { variantMockupUrls });
  };
  const patchArea = (areaIndex: number, updates: Partial<PersonalizationPrintArea>) => {
    const next = [...printAreas];
    next[areaIndex] = { ...next[areaIndex], ...updates };
    onCanvasChange({ ...(canvas || {}), printAreas: next });
  };
  const removeArea = (areaIndex: number) => {
    const area = printAreas[areaIndex];
    if (!area) return;
    const nextAreas = printAreas.filter((_, index) => index !== areaIndex);
    const nextLayers = (canvas?.layers || []).filter(layer => layer.printAreaId !== area.id);
    onCanvasChange({ ...(canvas || {}), printAreas: nextAreas, layers: nextLayers });
    if (selectedAreaId === area.id) setSelectedAreaId(nextAreas[0]?.id || null);
  };
  const patchLayer = (layerIndex: number, updates: Partial<PersonalizationCanvasLayer>) => {
    const layers = [...(canvas?.layers || [])];
    layers[layerIndex] = { ...layers[layerIndex], ...updates };
    onCanvasChange({ ...(canvas || {}), printAreas, layers });
  };
  const addLayer = () => {
    const areaId = printAreas[0]?.id;
    if (!areaId) return;
    const fieldId = fields[0]?.id;
    const layer: PersonalizationCanvasLayer = { id: newId("layer"), label: "Lớp mới", source: fieldId ? "FIELD" : "VARIANT_DESIGN", fieldId, printAreaId: areaId, sceneId: activeSceneId, zIndex: (canvas?.layers || []).length };
    onCanvasChange({ ...(canvas || {}), printAreas, layers: [...(canvas?.layers || []), layer] });
  };
  const applySceneToLayers = (sceneId: string) => {
    const layers = (canvas?.layers || []).map(layer => ({ ...layer, sceneId: sceneId || undefined }));
    onCanvasChange({ ...(canvas || {}), printAreas, layers });
  };
  const removeScene = (sceneIndex: number) => {
    const scene = scenes[sceneIndex];
    if (!scene) return;
    const nextScenes = scenes.filter((_, index) => index !== sceneIndex);
    const removedAreaIds = new Set(printAreas.filter(area => area.sceneId === scene.id).map(area => area.id));
    const nextAreas = printAreas.filter(area => area.sceneId !== scene.id);
    const nextLayers = (canvas?.layers || []).filter(layer => layer.sceneId !== scene.id && !removedAreaIds.has(layer.printAreaId));
    onCanvasChange({ ...(canvas || {}), scenes: nextScenes, printAreas: nextAreas, layers: nextLayers });
    setSelectedSceneId(nextScenes[0]?.id || null);
    if (selectedAreaId && removedAreaIds.has(selectedAreaId)) setSelectedAreaId(nextAreas[0]?.id || null);
  };
  const applyIdeaPreset = (idea: PersonalizationListingIdea) => {
    const ok = !fields.length || typeof window === "undefined" || window.confirm("Áp dụng preset sẽ thay thế các trường cá nhân hóa hiện tại. Tiếp tục?");
    if (!ok) return;
    const areaId = printAreas[0]?.id || newId("area");
    const area = printAreas[0] || { id: areaId, label: "Mặt trước", xPercent: 18, yPercent: 20, widthPercent: 64, heightPercent: 62, shape: "RECT" as const };
    const textArea = { id: newId("area"), label: "Tên / chữ", xPercent: 18, yPercent: 77, widthPercent: 64, heightPercent: 13, shape: "RECT" as const, fit: "CONTAIN" as const };
    const make = (id: string, label: string, type: PersonalizationFieldType, extra: Partial<PersonalizationField> = {}): PersonalizationField => ({ id, label, type, required: true, step: `${fields.length + 1}. ${label}`, ...extra });
    const nextFields: PersonalizationField[] = idea === "PHOTO_GIFT"
      ? [make("photo", "Ảnh khách hàng", "IMAGE_UPLOAD", { minImageWidth: 800, minImageHeight: 800, helpText: "Ảnh vuông, rõ mặt; bạn có thể căn chỉnh sau khi tải lên" }), make("name", "Tên người nhận", "TEXT", { maxLength: 30, preview: { fontSizePercent: 3.2, textAlign: "center", fontWeight: "bold" } })]
      : idea === "DESIGN_CHOICE"
        ? [make("design", "Chọn design", "ASSET_PICKER", { options: [createOption("ASSET_PICKER")] }), make("name", "Tên hiển thị", "TEXT", { maxLength: 30 })]
        : idea === "NAME_TEXT"
          ? [make("name", "Tên / chữ in", "TEXT", { maxLength: 30, allowedPattern: "^[\\p{L} 0-9.'-]+$" })]
          : idea === "AVATAR" || idea === "PET"
            ? [make("character", idea === "AVATAR" ? "Chọn nhân vật" : "Chọn thú cưng", idea === "AVATAR" ? "AVATAR_BUILDER" : "PET_BUILDER", { options: [createOption(idea === "AVATAR" ? "AVATAR_BUILDER" : "PET_BUILDER")] }), make("name", "Tên", "TEXT", { maxLength: 24 })]
            : idea === "MULTI_PERSON"
              ? [make("people", "Nhân vật", "REPEAT_GROUP", { repeat: { minItems: 1, maxItems: 6, itemLabel: "Người", fields: [{ id: "name", label: "Tên", type: "TEXT", required: true, maxLength: 24 }] } })]
              : nextFieldsFallback(fields);
    const normalizedFields = nextFields.map((field, index) => ({ ...field, step: `${index + 1}. ${field.label}` }));
    const useTextArea = ["PHOTO_GIFT", "DESIGN_CHOICE", "AVATAR", "PET"].includes(idea) && normalizedFields.some(field => field.id === "name");
    const presetAreas = [area, ...(useTextArea ? [textArea] : [])];
    const presetAreaForField = (field: PersonalizationField) => field.id === "name" && useTextArea ? textArea.id : areaId;
    onFieldsChange(normalizedFields);
    setExpandedId(normalizedFields[0]?.id || null);
    setSelectedAreaId(areaId);
    onCanvasChange({ ...(canvas || {}), idea, printAreas: presetAreas, layers: normalizedFields.map((field, index) => ({ id: newId("layer"), label: field.label, source: "FIELD" as const, fieldId: field.id, printAreaId: presetAreaForField(field), zIndex: index })) });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(380px,520px)] lg:items-start">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-950"><Settings2 className="h-4 w-4 text-orange-600" /> Trình thiết kế cá nhân hoá</h3>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">Tách phân loại vật lý khỏi nội dung khách nhập. Các trường bắt buộc được kiểm tra cả trên storefront và máy chủ.</p>
            </div>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700">
              <input type="checkbox" aria-label="Bật cá nhân hoá" checked={enabled} onChange={event => onEnabledChange(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500" />
              Bật cá nhân hoá
            </label>
          </div>
          <label htmlFor="personalization-mockup-url" className="mt-4 block text-xs font-bold text-slate-700">URL mockup nền trơn</label>
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]"><label className="text-[10px] font-bold text-slate-500">Ý tưởng listing<select value={canvas?.idea || "CUSTOM"} onChange={event => applyIdeaPreset(event.target.value as PersonalizationListingIdea)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs"><option value="PHOTO_GIFT">Quà kèm ảnh khách</option><option value="DESIGN_CHOICE">Chọn design</option><option value="NAME_TEXT">Tên / chữ in</option><option value="AVATAR">Avatar nhiều lớp</option><option value="PET">Chân dung thú cưng</option><option value="MULTI_PERSON">Nhiều người / thú cưng</option><option value="CUSTOM">Tùy chỉnh thủ công</option></select></label><div className="flex items-end"><span className="rounded-lg bg-slate-950 px-2.5 py-2 text-[10px] font-bold text-white">Preset theo listing</span></div></div>
          <div className="mt-1.5 flex items-center gap-2">
            <ImageIcon className="h-4 w-4 shrink-0 text-slate-400" />
            <input id="personalization-mockup-url" type="url" value={mockupUrl || ""} onChange={event => onMockupUrlChange(event.target.value)} placeholder="https://.../mockup-tron.png" className="mc-focus-ring min-h-11 w-full rounded-xl border border-slate-300 px-3 text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" />
          </div>
          <p className="mt-1.5 text-[10px] text-slate-500">Khuyến nghị PNG/JPG vuông, nền sạch và vùng in nằm ở trung tâm. Design của SKU và dữ liệu khách sẽ được chồng lên mockup này.</p>
          <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[10px] leading-4 text-slate-500"><strong className="text-slate-700">Quy ước tọa độ:</strong> X/Y là điểm bắt đầu tính từ góc trên trái; Rộng/Cao là phần trăm khung mockup. Dùng <strong className="text-orange-700">COVER</strong> khi ảnh cần lấp kín vùng, <strong className="text-orange-700">CONTAIN</strong> khi cần giữ nguyên tỉ lệ.</p>
          {canvasWarnings.length > 0 && <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-900" role="status"><strong className="font-extrabold">Cần kiểm tra trước khi lưu:</strong><ul className="mt-1 list-disc space-y-0.5 pl-4">{canvasWarnings.slice(0, 4).map(warning => <li key={warning}>{warning}</li>)}</ul>{canvasWarnings.length > 4 && <p className="mt-1 text-amber-800/80">+ {canvasWarnings.length - 4} cảnh báo khác</p>}</div>}
          {selectedAreaId && printAreas.some(area => area.id === selectedAreaId) && (() => {
            const selectedAreaIndex = printAreas.findIndex(area => area.id === selectedAreaId);
            const selectedArea = selectedAreaIndex >= 0 ? printAreas[selectedAreaIndex] : undefined;
            if (!selectedArea) return null;
            const updateSelectedArea = (updates: Partial<PersonalizationPrintArea>) => patchArea(selectedAreaIndex, updates);
            return <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-4">
              <label className="text-[10px] font-bold text-slate-500">Hình dạng<select value={selectedArea.shape || "RECT"} onChange={event => updateSelectedArea({ shape: event.target.value as "RECT" | "CIRCLE" })} className="mt-1 min-h-9 w-full rounded border border-slate-300 px-2 text-[10px]"><option value="RECT">Chữ nhật</option><option value="CIRCLE">Tròn</option></select></label>
              <label className="text-[10px] font-bold text-slate-500">Cách vừa ảnh<select value={selectedArea.fit || "CONTAIN"} onChange={event => updateSelectedArea({ fit: event.target.value as "CONTAIN" | "COVER" })} className="mt-1 min-h-9 w-full rounded border border-slate-300 px-2 text-[10px]"><option value="CONTAIN">Không cắt</option><option value="COVER">Lấp đầy vùng</option></select></label>
              <NumberInput label="An toàn in (%)" value={selectedArea.safeZonePercent || 0} min={0} max={45} onChange={value => updateSelectedArea({ safeZonePercent: value || 0 })} />
              <NumberInput label="Xoay (độ)" value={selectedArea.rotationDeg || 0} min={-180} max={180} onChange={value => updateSelectedArea({ rotationDeg: value || 0 })} />
            </div>;
          })()}
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="mb-2 flex items-center justify-between"><div><span className="text-[11px] font-extrabold text-slate-800">Mặt preview / scene</span><p className="mt-0.5 text-[10px] text-slate-500">Mỗi mặt có mockup riêng; có thể thay ảnh theo từng SKU.</p></div><button type="button" onClick={() => { const nextScene = { id: newId("scene"), label: `Mặt ${((canvas?.scenes || []).length || 0) + 1}`, mockupUrl }; onCanvasChange({ ...(canvas || {}), scenes: [...(canvas?.scenes || []), nextScene], printAreas }); setSelectedSceneId(nextScene.id); }} className="text-[10px] font-bold text-orange-700">+ Thêm mặt</button></div>{scenes.length === 0 ? <p className="text-[10px] text-slate-500">Có thể thêm mặt trước, mặt sau hoặc góc lifestyle; mỗi mặt có mockup và vùng in riêng.</p> : <div className="space-y-2">{scenes.map((scene, sceneIndex) => <div key={scene.id} className={`rounded-lg p-2 ${activeSceneId === scene.id ? "bg-orange-50 ring-1 ring-orange-200" : "bg-white"}`}><div className="grid gap-2 sm:grid-cols-[120px_1fr_auto]"><input value={scene.label} onFocus={() => setSelectedSceneId(scene.id)} onChange={event => patchScene(sceneIndex, { label: event.target.value })} className="min-h-9 rounded border border-slate-300 px-2 text-[10px]" /><input aria-label={`URL mockup ${scene.label}`} value={scene.mockupUrl || ""} onFocus={() => setSelectedSceneId(scene.id)} onChange={event => patchScene(sceneIndex, { mockupUrl: event.target.value })} placeholder="URL mockup mặt này" className="min-h-9 rounded border border-slate-300 px-2 text-[10px]" /><button type="button" onClick={() => removeScene(sceneIndex)} className="text-[10px] font-bold text-rose-600">Xóa</button></div>{previewVariants.length > 0 && <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2"><div className="mb-1 flex items-center justify-between"><span className="text-[10px] font-extrabold text-slate-700">Mockup theo SKU</span><span className="text-[9px] text-slate-400">Để trống = dùng mockup mặt</span></div><div className="space-y-1.5">{previewVariants.map(variant => { const variantUrl = scene.variantMockupUrls?.[variant.sourceSkuId] || ""; return <div key={variant.sourceSkuId} className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_1fr_auto]"><span className="truncate self-center text-[10px] font-semibold text-slate-600" title={variant.sourceSkuId}>{variant.colorName || variant.sizeName || variant.sourceSkuId}</span><input aria-label={`Mockup SKU ${variant.sourceSkuId} ở ${scene.label}`} value={variantUrl} onChange={event => patchSceneVariantUrl(sceneIndex, variant.sourceSkuId, event.target.value)} placeholder="URL ảnh mockup SKU" className="min-h-8 rounded border border-slate-300 px-2 text-[10px]" /><button type="button" disabled={!variant.imageUrl} onClick={() => patchSceneVariantUrl(sceneIndex, variant.sourceSkuId, variant.imageUrl)} className="min-h-8 rounded border border-slate-200 px-2 text-[9px] font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40">Dùng ảnh SKU</button></div>; })}</div></div>}</div>)}</div>}</div>
          <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50/60 p-3"><div className="mb-2 flex items-center justify-between"><span className="text-[11px] font-extrabold text-orange-950">Vùng in trên mockup</span><button type="button" onClick={() => { const area = { id: newId("area"), label: `Vùng ${printAreas.length + 1}`, xPercent: 18, yPercent: 20, widthPercent: 64, heightPercent: 62, shape: "RECT" as const, sceneId: activeSceneId }; onCanvasChange({ ...(canvas || {}), printAreas: [...printAreas, area] }); setSelectedAreaId(area.id); }} className="text-[10px] font-bold text-orange-700">+ Thêm vùng</button></div>{printAreas.length === 0 ? <p className="text-[10px] text-orange-900/70">Đang dùng vùng mặc định. Thêm vùng để căn nhiều mặt in hoặc chỉ định field cụ thể.</p> : <div className="space-y-2">{printAreas.map((area, areaIndex) => <div key={area.id} className="grid gap-2 rounded-lg bg-white p-2 sm:grid-cols-[1fr_repeat(4,70px)_auto]"><input value={area.label || ""} onFocus={() => setSelectedAreaId(area.id)} onChange={event => patchArea(areaIndex, { label: event.target.value })} placeholder="Tên vùng" className="min-h-9 rounded border border-slate-300 px-2 text-[10px]" />{(["xPercent", "yPercent", "widthPercent", "heightPercent"] as const).map(key => <input key={key} type="number" min={0} max={100} value={area[key]} onFocus={() => setSelectedAreaId(area.id)} onChange={event => patchArea(areaIndex, { [key]: clamp(Number(event.target.value), key === "widthPercent" || key === "heightPercent" ? 1 : 0, 100) })} aria-label={key} className="min-h-9 rounded border border-slate-300 px-2 text-[10px]" />)}<button type="button" onClick={() => removeArea(areaIndex)} className="text-[10px] font-bold text-rose-600">Xóa</button></div>)}</div>}</div>
          {printAreas.length > 0 && <div className="mt-3 rounded-xl border border-orange-200 bg-white p-3"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div><span className="text-[11px] font-extrabold text-slate-800">Binding nhanh theo vùng</span><p className="text-[10px] text-slate-500">Field được chọn sẽ chỉ render trong vùng này; bỏ chọn để dùng vùng mặc định.</p></div><div className="flex gap-1.5"><select aria-label="Chọn vùng để gán field" value={selectedAreaId || printAreas[0]?.id || ""} onChange={event => setSelectedAreaId(event.target.value)} className="min-h-9 max-w-[150px] rounded-lg border border-slate-300 bg-white px-2 text-[10px]"><option value="">Chọn vùng</option>{printAreas.map(area => <option key={area.id} value={area.id}>{area.label || area.id}</option>)}</select>{scenes.length > 0 && <select aria-label="Chọn scene cho vùng" value={printAreas.find(area => area.id === (selectedAreaId || printAreas[0]?.id))?.sceneId || ""} onChange={event => { const areaIndex = printAreas.findIndex(area => area.id === (selectedAreaId || printAreas[0]?.id)); if (areaIndex >= 0) patchArea(areaIndex, { sceneId: event.target.value || undefined }); }} className="min-h-9 max-w-[130px] rounded-lg border border-slate-300 bg-white px-2 text-[10px]"><option value="">Tất cả mặt</option>{scenes.map(scene => <option key={scene.id} value={scene.id}>{scene.label}</option>)}</select>}</div></div>{(() => { const bindingAreaIndex = printAreas.findIndex(area => area.id === (selectedAreaId || printAreas[0]?.id)); const bindingArea = bindingAreaIndex >= 0 ? printAreas[bindingAreaIndex] : undefined; if (!bindingArea) return null; return <div className="flex flex-wrap gap-1.5">{fields.map(field => { const checked = (bindingArea.fieldIds || []).includes(field.id); return <label key={field.id} className={`inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-full border px-2.5 text-[10px] font-semibold ${checked ? "border-orange-300 bg-orange-50 text-orange-800" : "border-slate-200 bg-slate-50 text-slate-500"}`}><input type="checkbox" checked={checked} onChange={event => { const nextIds = new Set(bindingArea.fieldIds || []); if (event.target.checked) nextIds.add(field.id); else nextIds.delete(field.id); patchArea(bindingAreaIndex, { fieldIds: [...nextIds] }); }} className="h-3 w-3 rounded border-slate-300 text-orange-600" />{field.label}</label>; })}</div>; })()}</div>}
        </div>
        <div className="space-y-4 lg:sticky lg:top-4">
        {previewVariants.length > 0 && <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-3"><div className="flex items-center justify-between gap-2"><div><span className="text-[11px] font-extrabold text-orange-950">SKU preview</span><p className="mt-0.5 text-[10px] text-orange-900/70">Chọn SKU để kiểm tra mockup và ảnh biến thể.</p></div><select aria-label="SKU xem trước" value={selectedPreviewVariant?.sourceSkuId || selectedPreviewSkuId} onChange={event => setSelectedPreviewSkuId(event.target.value)} className="min-h-9 max-w-[170px] rounded-lg border border-orange-200 bg-white px-2 text-[10px] font-semibold text-slate-700">{previewVariants.map(variant => <option key={variant.sourceSkuId} value={variant.sourceSkuId}>{variant.colorName || variant.sizeName || variant.sourceSkuId}</option>)}</select></div>{selectedPreviewVariant?.imageUrl && <p className="mt-2 truncate text-[9px] text-slate-500" title={selectedPreviewVariant.imageUrl}>Ảnh SKU: {selectedPreviewVariant.imageUrl}</p>}</div>}
        {scenes.length > 0 && <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-center justify-between gap-2"><div><span className="text-[11px] font-extrabold text-slate-800">Scene của lớp</span><p className="mt-0.5 text-[10px] text-slate-500">Áp dụng scene hiện tại cho toàn bộ lớp hiển thị.</p></div><select aria-label="Gán scene cho tất cả lớp" defaultValue="" onChange={event => applySceneToLayers(event.target.value)} disabled={!(canvas?.layers || []).length} className="min-h-9 max-w-[145px] rounded-lg border border-slate-300 bg-white px-2 text-[10px]"><option value="">Tất cả mặt</option>{scenes.map(scene => <option key={scene.id} value={scene.id}>{scene.label}</option>)}</select></div></div>}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between"><div><span className="text-[11px] font-extrabold text-slate-800">Lớp hiển thị</span><p className="mt-0.5 text-[10px] text-slate-500">Nền SKU → design → ảnh/chữ khách.</p></div><button type="button" onClick={addLayer} disabled={!printAreas.length} className="text-[10px] font-bold text-orange-700 disabled:opacity-40">+ Thêm lớp</button></div>
          {(canvas?.layers || []).length === 0 ? <p className="text-[10px] text-slate-500">Preset sẽ tạo sẵn lớp design/ảnh khách. Bạn có thể thêm lớp variant hoặc field để kiểm soát thứ tự chồng.</p> : <div className="space-y-2">{(canvas?.layers || []).map((layer, layerIndex) => <div key={layer.id} className="rounded-lg border border-slate-200 bg-white p-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <input value={layer.label || ""} onChange={event => patchLayer(layerIndex, { label: event.target.value })} placeholder="Tên lớp" className="min-h-9 rounded border border-slate-300 px-2 text-[10px]" />
              <select aria-label={`Nguồn của ${layer.label || "lớp"}`} value={layer.source} onChange={event => patchLayer(layerIndex, { source: event.target.value as PersonalizationCanvasLayer["source"], fieldId: event.target.value === "FIELD" ? layer.fieldId || fields[0]?.id : undefined })} className="min-h-9 rounded border border-slate-300 px-2 text-[10px]"><option value="FIELD">Field (ảnh/chữ)</option><option value="VARIANT_DESIGN">Design SKU</option><option value="VARIANT_COLOR">Màu SKU</option></select>
              {layer.source === "FIELD" ? <select aria-label={`Field của ${layer.label || "lớp"}`} value={layer.fieldId || ""} onChange={event => patchLayer(layerIndex, { fieldId: event.target.value })} className="min-h-9 rounded border border-slate-300 px-2 text-[10px]"><option value="">Chọn field</option>{fields.map(field => <option key={field.id} value={field.id}>{field.label}</option>)}</select> : <span className="grid min-h-9 place-items-center rounded bg-slate-50 text-[10px] text-slate-500">Theo variant đang chọn</span>}
              <select aria-label={`Vùng in của ${layer.label || "lớp"}`} value={layer.printAreaId} onChange={event => patchLayer(layerIndex, { printAreaId: event.target.value })} className="min-h-9 rounded border border-slate-300 px-2 text-[10px]"><option value="">Chọn vùng</option>{printAreas.map(area => <option key={area.id} value={area.id}>{area.label || area.id}</option>)}</select>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <label className="text-[9px] font-bold text-slate-500">Thứ tự<input type="number" min={-100} max={100} value={layer.zIndex} onChange={event => patchLayer(layerIndex, { zIndex: Number(event.target.value) })} className="mt-1 min-h-8 w-full rounded border border-slate-300 px-2 text-[10px]" /></label>
              <label className="text-[9px] font-bold text-slate-500">Độ mờ ({Math.round((layer.opacity ?? 1) * 100)}%)<input type="range" min={0} max={100} value={Math.round((layer.opacity ?? 1) * 100)} onChange={event => patchLayer(layerIndex, { opacity: Number(event.target.value) / 100 })} className="mt-1 h-8 w-full accent-orange-600" /></label>
              <label className="text-[9px] font-bold text-slate-500">Hòa trộn<select value={layer.blendMode || "NORMAL"} onChange={event => patchLayer(layerIndex, { blendMode: event.target.value as PersonalizationCanvasLayer["blendMode"] })} className="mt-1 min-h-8 w-full rounded border border-slate-300 px-1 text-[10px]"><option value="NORMAL">Bình thường</option><option value="MULTIPLY">Multiply</option><option value="SCREEN">Screen</option><option value="OVERLAY">Overlay</option></select></label>
              <label className="text-[9px] font-bold text-slate-500">Khớp vùng<select value={layer.fit || "CONTAIN"} onChange={event => patchLayer(layerIndex, { fit: event.target.value as PersonalizationCanvasLayer["fit"] })} className="mt-1 min-h-8 w-full rounded border border-slate-300 px-1 text-[10px]"><option value="CONTAIN">Không cắt</option><option value="COVER">Lấp đầy</option></select></label>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2"><select aria-label={`Scene của ${layer.label || "lớp"}`} value={layer.sceneId || ""} onChange={event => patchLayer(layerIndex, { sceneId: event.target.value || undefined })} className="min-h-8 min-w-0 flex-1 rounded border border-slate-300 px-2 text-[10px]"><option value="">Tất cả mặt</option>{scenes.map(scene => <option key={scene.id} value={scene.id}>{scene.label}</option>)}</select><button type="button" onClick={() => onCanvasChange({ ...(canvas || {}), printAreas, layers: (canvas?.layers || []).filter((_, index) => index !== layerIndex) })} className="min-h-8 rounded-lg px-2 text-[10px] font-bold text-rose-600 hover:bg-rose-50">Xóa lớp</button></div>
          </div>)}</div>}
        </div>
        {scenes.length > 0 && <div className="flex gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5">{scenes.map(scene => <button key={scene.id} type="button" onClick={() => setSelectedSceneId(scene.id)} className={`min-h-9 shrink-0 rounded-lg px-2.5 text-[10px] font-bold transition ${activeSceneId === scene.id ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{scene.label}</button>)}</div>}
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner touch-none" onPointerMove={event => { const drag = dragRef.current; const resize = resizeRef.current; const rect = event.currentTarget.getBoundingClientRect(); const targetId = drag?.id || resize?.id; const areaIndex = targetId ? printAreas.findIndex(area => area.id === targetId) : -1; if (areaIndex < 0) return; if (drag) { const dx = (event.clientX - drag.startX) / drag.rect.width * 100; const dy = (event.clientY - drag.startY) / drag.rect.height * 100; patchArea(areaIndex, { xPercent: clamp(drag.x + dx, 0, 100 - printAreas[areaIndex].widthPercent), yPercent: clamp(drag.y + dy, 0, 100 - printAreas[areaIndex].heightPercent) }); } else if (resize) { const dx = (event.clientX - resize.startX) / rect.width * 100; const dy = (event.clientY - resize.startY) / rect.height * 100; patchArea(areaIndex, { widthPercent: clamp(resize.width + dx, 5, 100 - resize.x), heightPercent: clamp(resize.height + dy, 5, 100 - resize.y) }); } }} onPointerUp={() => { dragRef.current = null; resizeRef.current = null; }} onPointerCancel={() => { dragRef.current = null; resizeRef.current = null; }} onPointerLeave={event => { if (event.buttons === 0) { dragRef.current = null; resizeRef.current = null; } }}>
          <div className="absolute left-3 right-3 top-3 z-10 flex items-center justify-between rounded-lg bg-slate-950/80 px-2.5 py-2 text-[10px] font-bold text-white"><span>{activeScene?.label || "Preview mockup"}</span><span className="text-slate-300">{printAreas.filter(area => !area.sceneId || area.sceneId === activeSceneId).length} vùng</span></div>
          {activeMockupUrl ? <img src={activeMockupUrl} alt="Xem trước mockup" className="absolute inset-0 h-full w-full object-contain p-2" /> : <div className="absolute inset-0 grid place-items-center p-6 text-center text-xs text-slate-400">Thêm URL mockup nền trơn để xem trước vùng thiết kế.</div>}
          {printAreas.filter(area => !area.sceneId || area.sceneId === activeSceneId).map(area => <button key={area.id} type="button" aria-label={`Chọn ${area.label || "vùng in"}`} onClick={() => setSelectedAreaId(area.id)} onPointerDown={event => { const rect = event.currentTarget.parentElement?.getBoundingClientRect(); if (!rect) return; event.preventDefault(); setSelectedAreaId(area.id); dragRef.current = { id: area.id, startX: event.clientX, startY: event.clientY, x: area.xPercent, y: area.yPercent, rect }; event.currentTarget.setPointerCapture(event.pointerId); }} className={`group absolute rounded-xl border-2 border-dashed transition ${selectedAreaId === area.id ? "border-orange-600 bg-orange-300/20 shadow-[0_0_0_3px_rgba(234,88,12,0.2)]" : "border-orange-500/70 bg-orange-100/10"}`} style={{ left: `${area.xPercent}%`, top: `${area.yPercent}%`, width: `${area.widthPercent}%`, height: `${area.heightPercent}%`, transform: `rotate(${area.rotationDeg || 0}deg)`, borderRadius: area.shape === "CIRCLE" ? "999px" : undefined }}><span className="absolute -top-5 left-0 rounded bg-slate-950/80 px-1.5 py-0.5 text-[9px] font-bold text-white">{area.label || "Vùng in"}</span>{selectedAreaId === area.id && <span role="presentation" onPointerDown={event => { event.stopPropagation(); event.preventDefault(); const rect = event.currentTarget.parentElement?.parentElement?.getBoundingClientRect(); if (!rect) return; event.currentTarget.setPointerCapture(event.pointerId); resizeRef.current = { id: area.id, startX: event.clientX, startY: event.clientY, x: area.xPercent, y: area.yPercent, width: area.widthPercent, height: area.heightPercent, rect }; }} className="absolute -bottom-2 -right-2 h-4 w-4 cursor-se-resize rounded-full border-2 border-white bg-orange-600 shadow" />}{selectedAreaId === area.id && (area.safeZonePercent || 0) > 0 && <span aria-hidden="true" className="pointer-events-none absolute border border-dotted border-emerald-600/90" style={{ inset: `${area.safeZonePercent}%`, borderRadius: area.shape === "CIRCLE" ? "999px" : "8px" }} />}</button>)}
          {!printAreas.length && <div className="pointer-events-none absolute left-[18%] top-[20%] h-[62%] w-[64%] rounded-xl border-2 border-dashed border-orange-500/50" />}
          <span className="absolute bottom-2 left-2 rounded-md bg-slate-950/75 px-2 py-1 text-[9px] font-bold text-white">Kéo vùng để căn vị trí · chọn field ở danh sách</span>
        </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div><h3 className="text-sm font-extrabold text-slate-950">Các bước khách cần hoàn thành</h3><p className="mt-0.5 text-[10px] text-slate-500">{fields.length} trường · kéo thứ tự bằng nút lên/xuống</p></div>
          <button type="button" onClick={() => { const field = createField(); onFieldsChange([...fields, field]); setExpandedId(field.id); }} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-orange-600 px-3 text-xs font-bold text-white hover:bg-orange-700"><Plus className="h-4 w-4" /> Thêm trường</button>
        </div>

        <div className="space-y-3 p-4">
          {fields.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-xs text-slate-500">Chưa có trường nào. Thêm trường tên, ảnh, design hoặc màu để bắt đầu.</div>}
          {fields.map((field, index) => {
            const expanded = expandedId === field.id;
            return (
              <article key={field.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-2.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-900 text-[10px] font-black text-white">{index + 1}</span>
                  <button type="button" aria-expanded={expanded} aria-controls={`personalization-field-panel-${field.id}`} onClick={() => setExpandedId(expanded ? null : field.id)} className="mc-focus-ring flex min-h-11 min-w-0 flex-1 items-center justify-between gap-3 text-left"><span className="min-w-0"><span className="block truncate text-xs font-extrabold text-slate-900">{field.label}</span><span className="text-[10px] font-semibold text-slate-500">{FIELD_TYPES.find(item => item.value === field.type)?.label || field.type}{field.required ? " · bắt buộc" : ""}</span></span>{expanded ? <ChevronUp className="h-4 w-4 text-slate-400" aria-hidden="true" /> : <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />}</button>
                  <button type="button" onClick={() => moveField(index, -1)} disabled={index === 0} aria-label="Đưa lên" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-white disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => moveField(index, 1)} disabled={index === fields.length - 1} aria-label="Đưa xuống" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-white disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => onFieldsChange(fields.filter((_, fieldIndex) => fieldIndex !== index))} aria-label="Xóa trường" className="grid h-9 w-9 place-items-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>

                {expanded && (
                  <div id={`personalization-field-panel-${field.id}`} className="space-y-4 border-t border-slate-200 p-4">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="text-[10px] font-bold text-slate-500 lg:col-span-2">Nhãn hiển thị<input value={field.label} onChange={event => patchField(index, { label: event.target.value })} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-2 text-xs text-slate-800" /></label>
                      <label className="text-[10px] font-bold text-slate-500">Loại trường<select value={field.type} onChange={event => { const type = event.target.value as PersonalizationFieldType; patchField(index, { type, options: supportsOptions(type) ? field.options || [createOption(type)] : undefined, repeat: type === "REPEAT_GROUP" ? field.repeat || { minItems: 1, maxItems: 6, itemLabel: "Nhân vật", fields: [{ id: newId("child"), label: "Tên", type: "TEXT", required: true }] } : undefined }); }} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs">{FIELD_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
                      <label className="text-[10px] font-bold text-slate-500">Nhóm/bước<input value={field.step || ""} onChange={event => patchField(index, { step: event.target.value })} placeholder="1. Chọn design" className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-2 text-xs" /></label>
                      <label className="text-[10px] font-bold text-slate-500 lg:col-span-2">Gợi ý trong ô<input value={field.placeholder || ""} onChange={event => patchField(index, { placeholder: event.target.value })} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-2 text-xs" /></label>
                      <label className="text-[10px] font-bold text-slate-500 lg:col-span-2">Trợ giúp cho khách<input value={field.helpText || ""} onChange={event => patchField(index, { helpText: event.target.value })} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-2 text-xs" /></label>
                      {(["TEXT", "TEXTAREA"].includes(field.type)) && <><label className="text-[10px] font-bold text-slate-500">Regex cho phép<input value={field.allowedPattern || ""} onChange={event => patchField(index, { allowedPattern: event.target.value || undefined })} placeholder="^[\\p{L} 0-9.'-]+$" className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-2 text-xs" /></label><label className="text-[10px] font-bold text-slate-500">Bộ ký tự cho phép<input value={field.allowedCharacters || ""} onChange={event => patchField(index, { allowedCharacters: event.target.value || undefined })} placeholder="A-Z a-z 0-9" className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-2 text-xs" /></label></>}
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2"><span className="text-[10px] font-extrabold text-slate-700">Nhiều điều kiện (ALL / ANY)</span><button type="button" onClick={() => { const first = field.visibleWhen || field.conditions?.rules?.[0]; patchField(index, { conditions: { mode: field.conditions?.mode || "ALL", rules: field.conditions?.rules?.length ? field.conditions.rules : first ? [first] : [] }, visibleWhen: undefined }); }} className="text-[10px] font-bold text-orange-600">{field.conditions ? "Đang bật" : "Bật nâng cao"}</button></div>
                      {field.conditions && <div className="space-y-2"><select value={field.conditions.mode} onChange={event => patchField(index, { conditions: { ...field.conditions!, mode: event.target.value as "ALL" | "ANY" } })} className="min-h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs"><option value="ALL">Tất cả điều kiện đúng</option><option value="ANY">Một trong các điều kiện đúng</option></select>{field.conditions.rules.map((rule, ruleIndex) => <div key={`${rule.fieldId}-${ruleIndex}`} className="grid gap-2 sm:grid-cols-[1fr_110px_1fr_auto]"><select value={rule.fieldId} onChange={event => { const rules = [...field.conditions!.rules]; rules[ruleIndex] = { ...rule, fieldId: event.target.value }; patchField(index, { conditions: { ...field.conditions!, rules } }); }} className="min-h-9 rounded-lg border border-slate-300 bg-white px-2 text-[11px]"><option value="">Chọn trường</option>{fields.filter(candidate => candidate.id !== field.id).map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}</select><select value={rule.operator || "EQUALS"} onChange={event => { const rules = [...field.conditions!.rules]; rules[ruleIndex] = { ...rule, operator: event.target.value as any }; patchField(index, { conditions: { ...field.conditions!, rules } }); }} className="min-h-9 rounded-lg border border-slate-300 bg-white px-2 text-[11px]"><option value="EQUALS">Bằng</option><option value="NOT_EQUALS">Khác</option><option value="NOT_EMPTY">Đã nhập</option></select>{rule.operator !== "NOT_EMPTY" && <input value={String(rule.value ?? "")} onChange={event => { const rules = [...field.conditions!.rules]; rules[ruleIndex] = { ...rule, value: event.target.value }; patchField(index, { conditions: { ...field.conditions!, rules } }); }} placeholder="Giá trị" className="min-h-9 rounded-lg border border-slate-300 px-2 text-[11px]" />}<button type="button" onClick={() => patchField(index, { conditions: { ...field.conditions!, rules: field.conditions!.rules.filter((_, i) => i !== ruleIndex) } })} className="text-[10px] font-bold text-rose-600">Xóa</button></div>)}<button type="button" onClick={() => patchField(index, { conditions: { ...field.conditions!, rules: [...field.conditions!.rules, { fieldId: fields.find(candidate => candidate.id !== field.id)?.id || "", operator: "EQUALS", value: "" }] } })} className="text-[10px] font-bold text-orange-600">+ Thêm điều kiện</button></div>}
                    </div>

                    <div className="flex flex-wrap gap-4 rounded-xl bg-slate-50 p-3">
                      <label className="inline-flex min-h-10 items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={Boolean(field.required)} onChange={event => patchField(index, { required: event.target.checked })} className="h-4 w-4 rounded text-orange-600" /> Bắt buộc</label>
                      {["TEXT", "TEXTAREA"].includes(field.type) && <NumberInput label="Tối đa ký tự" value={field.maxLength} min={1} max={1000} onChange={value => patchField(index, { maxLength: value })} />}
                      {field.type === "NUMBER" && <><NumberInput label="Nhỏ nhất" value={field.min} min={-10000} max={10000} onChange={value => patchField(index, { min: value })} /><NumberInput label="Lớn nhất" value={field.max} min={-10000} max={10000} onChange={value => patchField(index, { max: value })} /></>}
                      {field.type === "IMAGE_UPLOAD" && <><NumberInput label="Dung lượng gốc (MB)" value={field.maxFileSizeMB || 12} min={1} max={20} onChange={value => patchField(index, { maxFileSizeMB: value })} /><NumberInput label="Rộng tối thiểu (px)" value={field.minImageWidth || 800} min={100} max={10000} onChange={value => patchField(index, { minImageWidth: value })} /><NumberInput label="Cao tối thiểu (px)" value={field.minImageHeight || 800} min={100} max={10000} onChange={value => patchField(index, { minImageHeight: value })} /></>}
                    </div>

                    {supportsOptions(field.type) && (
                      <div className="rounded-xl border border-slate-200 p-3">
                        <div className="mb-2 flex items-center justify-between"><span className="text-[11px] font-extrabold text-slate-800">Danh sách lựa chọn</span><button type="button" onClick={() => patchField(index, { options: [...(field.options || []), createOption(field.type)] })} className="inline-flex min-h-10 items-center gap-1 px-2 text-[10px] font-bold text-orange-600"><Plus className="h-3.5 w-3.5" /> Thêm lựa chọn</button></div>
                        <div className="space-y-2">{(field.options || []).map((option, optionIndex) => <div key={option.id} className="grid gap-2 rounded-lg bg-slate-50 p-2 sm:grid-cols-[1fr_1fr_1.2fr_110px_auto]"><input aria-label={`Tên lựa chọn ${optionIndex + 1}`} value={option.label} onChange={event => patchOption(index, optionIndex, { label: event.target.value })} placeholder="Tên hiển thị" className="mc-focus-ring min-h-10 rounded-lg border border-slate-300 px-2 text-xs" /><input aria-label={`Giá trị lựa chọn ${optionIndex + 1}`} value={option.value} onChange={event => patchOption(index, optionIndex, { value: event.target.value })} placeholder={field.type === "COLOR_SWATCH" ? "#f97316" : "Giá trị"} className="mc-focus-ring min-h-10 rounded-lg border border-slate-300 px-2 text-xs" /><input aria-label={`URL ảnh lựa chọn ${optionIndex + 1}`} value={option.previewAssetUrl || ""} onChange={event => patchOption(index, optionIndex, { previewAssetUrl: event.target.value })} placeholder="URL ảnh design/thumbnail" className="mc-focus-ring min-h-10 rounded-lg border border-slate-300 px-2 text-xs" /><input aria-label={`Phụ thu lựa chọn ${optionIndex + 1}`} type="number" value={option.priceDeltaVND ?? ""} onChange={event => patchOption(index, optionIndex, { priceDeltaVND: event.target.value === "" ? undefined : Number(event.target.value) })} placeholder="Phụ thu (đ)" className="mc-focus-ring min-h-10 rounded-lg border border-slate-300 px-2 text-xs" /><button type="button" aria-label={`Xóa lựa chọn ${optionIndex + 1}`} onClick={() => patchField(index, { options: (field.options || []).filter((_, itemIndex) => itemIndex !== optionIndex) })} className="mc-focus-ring grid h-10 w-10 place-items-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></button></div>)}</div>
                      </div>
                    )}

                    {field.type === "REPEAT_GROUP" && field.repeat && (
                      <div className="rounded-xl border border-slate-200 p-3">
                        <div className="grid gap-3 sm:grid-cols-3"><label className="text-[10px] font-bold text-slate-500">Tên mỗi mục<input value={field.repeat.itemLabel || ""} onChange={event => patchField(index, { repeat: { ...field.repeat!, itemLabel: event.target.value } })} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-2 text-xs" /></label><NumberInput label="Tối thiểu" value={field.repeat.minItems} min={0} max={20} onChange={value => patchField(index, { repeat: { ...field.repeat!, minItems: value || 0 } })} /><NumberInput label="Tối đa" value={field.repeat.maxItems} min={1} max={20} onChange={value => patchField(index, { repeat: { ...field.repeat!, maxItems: value || 1 } })} /></div>
                        <p className="mt-2 text-[10px] text-slate-500">Nhóm mới mặc định có trường “Tên”. Có thể tinh chỉnh cấu trúc con qua dữ liệu sản phẩm nếu cần avatar nhiều lớp chuyên sâu.</p>
                      </div>
                    )}

                    <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-3">
                      <div className="mb-2 text-[11px] font-extrabold text-orange-950">Vị trí trên vùng preview (%)</div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6"><NumberInput label="Trái (X)" value={field.preview?.xPercent} onChange={value => patchField(index, { preview: { ...field.preview, xPercent: value } })} /><NumberInput label="Trên (Y)" value={field.preview?.yPercent} onChange={value => patchField(index, { preview: { ...field.preview, yPercent: value } })} /><NumberInput label="Rộng" value={field.preview?.widthPercent} min={1} onChange={value => patchField(index, { preview: { ...field.preview, widthPercent: value } })} /><NumberInput label="Cao" value={field.preview?.heightPercent} min={1} onChange={value => patchField(index, { preview: { ...field.preview, heightPercent: value } })} /><NumberInput label="Xoay (độ)" value={field.preview?.rotationDeg} min={-180} max={180} onChange={value => patchField(index, { preview: { ...field.preview, rotationDeg: value } })} />{!["IMAGE_UPLOAD", "ASSET_PICKER"].includes(field.type) && <NumberInput label="Cỡ chữ (%)" value={field.preview?.fontSizePercent} min={1} max={15} onChange={value => patchField(index, { preview: { ...field.preview, fontSizePercent: value } })} />}</div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3">
                      <div className="mb-2 text-[11px] font-extrabold text-slate-800">Hiển thị có điều kiện</div>
                      <div className="grid gap-2 sm:grid-cols-3"><select value={field.visibleWhen?.fieldId || ""} onChange={event => patchField(index, { visibleWhen: event.target.value ? { fieldId: event.target.value, operator: "EQUALS", value: "" } : undefined })} className="min-h-10 rounded-lg border border-slate-300 bg-white px-2 text-xs"><option value="">Luôn hiển thị</option>{fields.filter(candidate => candidate.id !== field.id).map(candidate => <option key={candidate.id} value={candidate.id}>Khi “{candidate.label}”</option>)}</select>{field.visibleWhen && <><select value={field.visibleWhen.operator || "EQUALS"} onChange={event => patchField(index, { visibleWhen: { ...field.visibleWhen!, operator: event.target.value as "EQUALS" | "NOT_EQUALS" | "NOT_EMPTY" } })} className="min-h-10 rounded-lg border border-slate-300 bg-white px-2 text-xs"><option value="EQUALS">Bằng</option><option value="NOT_EQUALS">Khác</option><option value="NOT_EMPTY">Đã nhập/chọn</option></select>{field.visibleWhen.operator !== "NOT_EMPTY" && <input value={String(field.visibleWhen.value ?? "")} onChange={event => patchField(index, { visibleWhen: { ...field.visibleWhen!, value: event.target.value } })} placeholder="Giá trị kích hoạt" className="min-h-10 rounded-lg border border-slate-300 px-2 text-xs" />}</>}</div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};
