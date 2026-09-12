import React, { useState } from "react";
import {
  PersonalizationField,
  PersonalizationFieldType,
  PersonalizationOptionItem,
  PersonalizationCanvas,
  PersonalizationPrintArea
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
  onEnabledChange,
  onMockupUrlChange,
  onFieldsChange,
  onCanvasChange
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(fields[0]?.id || null);

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
  const patchArea = (areaIndex: number, updates: Partial<PersonalizationPrintArea>) => {
    const next = [...printAreas];
    next[areaIndex] = { ...next[areaIndex], ...updates };
    onCanvasChange({ ...(canvas || {}), printAreas: next });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
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
          <div className="mt-1.5 flex items-center gap-2">
            <ImageIcon className="h-4 w-4 shrink-0 text-slate-400" />
            <input id="personalization-mockup-url" type="url" value={mockupUrl || ""} onChange={event => onMockupUrlChange(event.target.value)} placeholder="https://.../mockup-tron.png" className="mc-focus-ring min-h-11 w-full rounded-xl border border-slate-300 px-3 text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" />
          </div>
          <p className="mt-1.5 text-[10px] text-slate-500">Khuyến nghị PNG/JPG vuông, nền sạch và vùng in nằm ở trung tâm. Design của SKU và dữ liệu khách sẽ được chồng lên mockup này.</p>
          <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50/60 p-3"><div className="mb-2 flex items-center justify-between"><span className="text-[11px] font-extrabold text-orange-950">Vùng in trên mockup</span><button type="button" onClick={() => onCanvasChange({ ...(canvas || {}), printAreas: [...printAreas, { id: newId("area"), label: `Vùng ${printAreas.length + 1}`, xPercent: 18, yPercent: 20, widthPercent: 64, heightPercent: 62, shape: "RECT" }] })} className="text-[10px] font-bold text-orange-700">+ Thêm vùng</button></div>{printAreas.length === 0 ? <p className="text-[10px] text-orange-900/70">Đang dùng vùng mặc định. Thêm vùng để căn nhiều mặt in hoặc chỉ định field cụ thể.</p> : <div className="space-y-2">{printAreas.map((area, areaIndex) => <div key={area.id} className="grid gap-2 rounded-lg bg-white p-2 sm:grid-cols-[1fr_repeat(4,70px)_auto]"><input value={area.label || ""} onChange={event => patchArea(areaIndex, { label: event.target.value })} placeholder="Tên vùng" className="min-h-9 rounded border border-slate-300 px-2 text-[10px]" />{(["xPercent", "yPercent", "widthPercent", "heightPercent"] as const).map(key => <input key={key} type="number" min={0} max={100} value={area[key]} onChange={event => patchArea(areaIndex, { [key]: Number(event.target.value) })} aria-label={key} className="min-h-9 rounded border border-slate-300 px-2 text-[10px]" />)}<button type="button" onClick={() => onCanvasChange({ ...(canvas || {}), printAreas: printAreas.filter((_, index) => index !== areaIndex) })} className="text-[10px] font-bold text-rose-600">Xóa</button></div>)}</div>}</div>
        </div>
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner">
          {mockupUrl || previewImageUrl ? <img src={mockupUrl || previewImageUrl} alt="Xem trước mockup" className="h-full w-full object-contain p-2" /> : <div className="absolute inset-0 grid place-items-center p-6 text-center text-xs text-slate-400">Thêm URL mockup nền trơn để xem trước vùng thiết kế.</div>}
          <div className="pointer-events-none absolute left-[22%] top-[25%] h-[50%] w-[56%] rounded-xl border-2 border-dashed border-orange-500/70 bg-orange-100/10" />
          <span className="absolute bottom-2 left-2 rounded-md bg-slate-950/75 px-2 py-1 text-[9px] font-bold text-white">Vùng in minh hoạ</span>
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
