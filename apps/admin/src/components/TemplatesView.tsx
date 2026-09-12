import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ProductTemplate,
  TemplateContentPreset,
  TemplateVariationPreset,
  TemplateVariationOption
} from "@hub1688/shared-types";
import { AdminApi } from "../services/api";
import { useAccessibleDialog } from "../hooks/useAccessibleDialog";
import {
  LayoutTemplate,
  Plus,
  Search,
  Edit,
  Copy,
  Trash2,
  Star,
  Check,
  Tag,
  Layers,
  FileText,
  ShieldCheck,
  Truck,
  Sparkles,
  RotateCcw,
  X,
  Package,
  Sliders,
  DollarSign,
  AlertCircle,
  HelpCircle,
  Bot,
  Loader2
} from "lucide-react";

interface TemplatesViewProps {
  onSelectTemplateToApply?: (template: ProductTemplate) => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({ onSelectTemplateToApply }) => {
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Modal Editor State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<ProductTemplate> | null>(null);
  const [activeTab, setActiveTab] = useState<"CONTENT" | "VARIATION">("CONTENT");
  const [saving, setSaving] = useState(false);
  const [aiBrief, setAiBrief] = useState("");
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);
  const [aiTemplateError, setAiTemplateError] = useState<string | null>(null);
  const [aiTemplateResult, setAiTemplateResult] = useState<{
    mode: "DEMO" | "LIVE";
    warnings: string[];
    attributes: number;
    options: number;
    variants: number;
  } | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const editorDialogRef = useAccessibleDialog<HTMLDivElement>(isEditorOpen && Boolean(editingTemplate), () => setIsEditorOpen(false));

  // New tag temporary inputs for Variation Builder
  const [newOption1Val, setNewOption1Val] = useState("");
  const [newOption2Val, setNewOption2Val] = useState("");
  const [newKeywordInput, setNewKeywordInput] = useState("");

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await AdminApi.getTemplates(selectedCategory !== "ALL" ? selectedCategory : undefined, searchQuery || undefined);
      if (res.success && res.templates) {
        setTemplates(res.templates);
      }
    } catch (err: any) {
      console.error("Lỗi nạp templates:", err);
      showToast("Không thể tải danh sách template: " + (err.message || "Lỗi máy chủ"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadTemplates();
  };

  // Categories list
  const categories = [
    "ALL",
    "Quà Tặng & In Ấn (POD)",
    "Thời Trang & May Mặc",
    "Gia Dụng & Đời Sống",
    "Công Nghệ & Phụ Kiện"
  ];

  // Open Create New Template
  const handleOpenCreate = () => {
    const defaultTpl: Partial<ProductTemplate> = {
      name: "",
      description: "",
      categoryName: selectedCategory !== "ALL" ? selectedCategory : "Quà Tặng & In Ấn (POD)",
      targetPlatform: "ALL",
      isDefault: false,
      content: {
        titlePrefix: "",
        titleSuffix: "",
        titleFormula: "{prefix} {title} {suffix}",
        shortDescVI: "",
        fullDescVI: `### THÔNG TIN SẢN PHẨM\n- Bổ sung đặc điểm đã được xác minh từ dữ liệu nguồn.\n- Bổ sung kích thước, chất liệu và hướng dẫn sử dụng nếu có.\n\n### CHÍNH SÁCH\n- Chỉ ghi bảo hành, đổi trả và vận chuyển theo chính sách thực tế của cửa hàng.`,
        attributes: [],
        warrantyPolicy: "",
        shippingPolicy: "",
        focusKeywords: [],
        faqs: []
      },
      variation: {
        options: [
          { name: "Phân Loại", values: ["Tiêu Chuẩn", "Nâng Cấp"] }
        ],
        defaultStock: 0,
        skuPattern: "{SKU}-{OPT1}",
        predefinedVariants: [
          { name: "Tiêu Chuẩn", option1: "Tiêu Chuẩn", priceAdjustmentVND: 0, stock: 0 },
          { name: "Nâng Cấp", option1: "Nâng Cấp", priceAdjustmentVND: 0, stock: 0 }
        ]
      }
    };
    setEditingTemplate(defaultTpl);
    setActiveTab("CONTENT");
    setAiBrief("");
    setAiTemplateError(null);
    setAiTemplateResult(null);
    setIsEditorOpen(true);
  };

  // Open Edit Template
  const handleOpenEdit = (tpl: ProductTemplate) => {
    // Deep clone to prevent direct state mutation
    setEditingTemplate(JSON.parse(JSON.stringify(tpl)));
    setActiveTab("CONTENT");
    setAiBrief("");
    setAiTemplateError(null);
    setAiTemplateResult(null);
    setIsEditorOpen(true);
  };

  // Duplicate Template
  const handleDuplicate = async (tpl: ProductTemplate) => {
    try {
      const duplicated: Partial<ProductTemplate> = {
        ...JSON.parse(JSON.stringify(tpl)),
        id: undefined,
        name: `${tpl.name} (Bản Sao)`,
        isDefault: false
      };
      await AdminApi.createTemplate(duplicated);
      showToast(`Đã nhân bản "${tpl.name}" thành công!`);
      loadTemplates();
    } catch (err: any) {
      showToast("Lỗi nhân bản: " + err.message, "error");
    }
  };

  // Set Default Template
  const handleSetDefault = async (tpl: ProductTemplate) => {
    try {
      await AdminApi.updateTemplate(tpl.id, { isDefault: true });
      showToast(`Đã đặt "${tpl.name}" làm template mặc định!`);
      loadTemplates();
    } catch (err: any) {
      showToast("Lỗi cập nhật: " + err.message, "error");
    }
  };

  // Delete Template
  const handleDelete = async (tpl: ProductTemplate) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa template "${tpl.name}"?`)) return;
    try {
      await AdminApi.deleteTemplate(tpl.id);
      showToast(`Đã xóa template "${tpl.name}"!`);
      loadTemplates();
    } catch (err: any) {
      showToast("Lỗi xóa: " + err.message, "error");
    }
  };

  // Reset Starter Templates
  const handleResetDefaults = async () => {
    if (!window.confirm("Khôi phục lại 4 template mẫu gốc? (Các template mẫu sẽ được cập nhật)")) return;
    try {
      await AdminApi.resetDefaultTemplates();
      showToast("Đã khôi phục các template mẫu chuẩn!");
      loadTemplates();
    } catch (err: any) {
      showToast("Lỗi: " + err.message, "error");
    }
  };

  // Save Template in Modal
  const handleSaveTemplate = async () => {
    if (!editingTemplate || !editingTemplate.name?.trim()) {
      showToast("Vui lòng nhập tên template!", "error");
      return;
    }
    if (!editingTemplate.categoryName?.trim()) {
      showToast("Vui lòng chọn hoặc nhập ngành hàng!", "error");
      return;
    }

    setSaving(true);
    try {
      const safeTemplate: Partial<ProductTemplate> = {
        ...editingTemplate,
        variation: editingTemplate.variation ? {
          ...editingTemplate.variation,
          defaultStock: 0,
          predefinedVariants: (editingTemplate.variation.predefinedVariants || []).map(variant => ({
            ...variant,
            stock: 0
          }))
        } : editingTemplate.variation
      };
      if (editingTemplate.id) {
        await AdminApi.updateTemplate(editingTemplate.id, safeTemplate);
        showToast(`Đã cập nhật template "${editingTemplate.name}"!`);
      } else {
        await AdminApi.createTemplate(safeTemplate);
        showToast(`Đã tạo template mới "${editingTemplate.name}"!`);
      }
      setIsEditorOpen(false);
      setEditingTemplate(null);
      loadTemplates();
    } catch (err: any) {
      showToast("Lỗi lưu template: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateTemplateWithAI = async () => {
    if (!editingTemplate?.name?.trim()) {
      setAiTemplateError("Hãy nhập tên template trước khi tạo bản nháp AI.");
      return;
    }
    if (!editingTemplate.categoryName?.trim()) {
      setAiTemplateError("Hãy chọn ngành hàng trước khi tạo bản nháp AI.");
      return;
    }

    setIsGeneratingTemplate(true);
    setAiTemplateError(null);
    setAiTemplateResult(null);
    try {
      const response = await AdminApi.generateAITemplate({
        name: editingTemplate.name.trim(),
        categoryName: editingTemplate.categoryName.trim(),
        targetPlatform: editingTemplate.targetPlatform || "ALL",
        brief: aiBrief.trim() || undefined
      });
      const draft = response.draft;
      setEditingTemplate(current => current ? ({
        ...current,
        description: draft.description,
        content: draft.content,
        variation: {
          ...draft.variation,
          defaultStock: 0,
          predefinedVariants: (draft.variation.predefinedVariants || []).map(variant => ({
            ...variant,
            priceAdjustmentVND: 0,
            stock: 0
          }))
        }
      }) : current);
      setAiTemplateResult({
        mode: response.mode,
        warnings: draft.warnings,
        attributes: draft.content.attributes?.length || 0,
        options: draft.variation.options.length,
        variants: draft.variation.predefinedVariants?.length || 0
      });
      setActiveTab("CONTENT");
      showToast("AI đã tạo bản nháp. Hãy rà soát Content và Variation trước khi lưu.");
    } catch (error: any) {
      setAiTemplateError(error?.message || "Không thể tạo template bằng AI lúc này.");
    } finally {
      setIsGeneratingTemplate(false);
    }
  };

  // ===================== VARIATION HELPERS =====================
  const updateOptionName = (index: number, name: string) => {
    if (!editingTemplate) return;
    const currentVariation = { ...editingTemplate.variation } as TemplateVariationPreset;
    const options = [...(currentVariation.options || [])];
    if (options[index]) {
      options[index] = { ...options[index], name };
      currentVariation.options = options;
      rebuildVariantMatrix(currentVariation);
    }
  };

  const addOptionValue = (index: number, value: string) => {
    if (!value.trim() || !editingTemplate) return;
    const currentVariation = { ...editingTemplate.variation } as TemplateVariationPreset;
    const options = [...(currentVariation.options || [])];
    if (options[index]) {
      if (!options[index].values.includes(value.trim())) {
        options[index] = {
          ...options[index],
          values: [...options[index].values, value.trim()]
        };
        currentVariation.options = options;
        rebuildVariantMatrix(currentVariation);
      }
    }
  };

  const removeOptionValue = (optionIndex: number, valueIndex: number) => {
    if (!editingTemplate) return;
    const currentVariation = { ...editingTemplate.variation } as TemplateVariationPreset;
    const options = [...(currentVariation.options || [])];
    if (options[optionIndex]) {
      options[optionIndex] = {
        ...options[optionIndex],
        values: options[optionIndex].values.filter((_, idx) => idx !== valueIndex)
      };
      currentVariation.options = options;
      rebuildVariantMatrix(currentVariation);
    }
  };

  const addSecondOptionGroup = () => {
    if (!editingTemplate) return;
    const currentVariation = { ...editingTemplate.variation } as TemplateVariationPreset;
    const options = [...(currentVariation.options || [])];
    if (options.length < 2) {
      options.push({ name: "Màu sắc / Combo", values: ["Màu Đen", "Màu Trắng"] });
      currentVariation.options = options;
      currentVariation.skuPattern = "{SKU}-{OPT1}-{OPT2}";
      rebuildVariantMatrix(currentVariation);
    }
  };

  const removeSecondOptionGroup = () => {
    if (!editingTemplate) return;
    const currentVariation = { ...editingTemplate.variation } as TemplateVariationPreset;
    const options = [...(currentVariation.options || [])];
    if (options.length > 1) {
      options.splice(1, 1);
      currentVariation.options = options;
      currentVariation.skuPattern = "{SKU}-{OPT1}";
      rebuildVariantMatrix(currentVariation);
    }
  };

  // Tự động sinh danh sách ma trận biến thể khi thay đổi Option 1 hoặc Option 2
  const rebuildVariantMatrix = (variationObj: TemplateVariationPreset) => {
    const opts = variationObj.options || [];
    const opt1 = opts[0];
    const opt2 = opts[1];
    const defaultStock = variationObj.defaultStock ?? 0;
    const existingVariants = variationObj.predefinedVariants || [];

    const newVariants: Array<{
      name: string;
      option1?: string;
      option2?: string;
      priceAdjustmentVND?: number;
      stock?: number;
    }> = [];

    if (!opt1 || opt1.values.length === 0) {
      variationObj.predefinedVariants = [];
      setEditingTemplate(prev => prev ? ({ ...prev, variation: variationObj }) : null);
      return;
    }

    if (!opt2 || opt2.values.length === 0) {
      // 1-dimension variants
      for (const val1 of opt1.values) {
        const found = existingVariants.find(v => v.option1 === val1);
        newVariants.push({
          name: val1,
          option1: val1,
          priceAdjustmentVND: found ? found.priceAdjustmentVND : 0,
          stock: found?.stock !== undefined ? found.stock : defaultStock
        });
      }
    } else {
      // 2-dimension Cartesian product (Option 1 x Option 2)
      for (const val1 of opt1.values) {
        for (const val2 of opt2.values) {
          const found = existingVariants.find(v => v.option1 === val1 && v.option2 === val2);
          newVariants.push({
            name: `${val1} / ${val2}`,
            option1: val1,
            option2: val2,
            priceAdjustmentVND: found ? found.priceAdjustmentVND : 0,
            stock: found?.stock !== undefined ? found.stock : defaultStock
          });
        }
      }
    }

    variationObj.predefinedVariants = newVariants;
    setEditingTemplate(prev => prev ? ({ ...prev, variation: variationObj }) : null);
  };

  const updateVariantAdjustment = (idx: number, adjustmentVND: number) => {
    if (!editingTemplate || !editingTemplate.variation) return;
    const variants = [...(editingTemplate.variation.predefinedVariants || [])];
    if (variants[idx]) {
      variants[idx] = { ...variants[idx], priceAdjustmentVND: adjustmentVND };
      setEditingTemplate({
        ...editingTemplate,
        variation: { ...editingTemplate.variation, predefinedVariants: variants }
      });
    }
  };

  // Quick Presets Loaders
  const loadVariationPresetPreset = (type: "POD" | "FASHION" | "APPLIANCE" | "TECH") => {
    if (!editingTemplate) return;
    let preset: TemplateVariationPreset;

    if (type === "POD") {
      preset = {
        options: [
          { name: "Kích thước (Size)", values: ["Size Vừa (7x9 inch)", "Size Lớn (9x10 inch)"] },
          { name: "Combo / Đóng gói", values: ["1 PCS (Đơn)", "Combo 2 PCS", "Combo 4 PCS", "Combo 6 PCS"] }
        ],
        defaultStock: 0,
        skuPattern: "{SKU}-{SIZE}-{COMBO}",
        predefinedVariants: []
      };
    } else if (type === "FASHION") {
      preset = {
        options: [
          { name: "Kích thước (Size)", values: ["Size S", "Size M", "Size L", "Size XL", "Size 2XL"] },
          { name: "Màu sắc (Color)", values: ["Đen Basic", "Trắng Tinh Khôi", "Xám Khói", "Nâu Be"] }
        ],
        defaultStock: 0,
        skuPattern: "{SKU}-{SIZE}-{COLOR}",
        predefinedVariants: []
      };
    } else if (type === "APPLIANCE") {
      preset = {
        options: [
          { name: "Phiên bản (Model)", values: ["Bản Tiêu Chuẩn", "Bản Nâng Cấp (Kèm Phụ Kiện)", "Bản Cao Cấp Full Box"] }
        ],
        defaultStock: 0,
        skuPattern: "{SKU}-{MODEL}",
        predefinedVariants: []
      };
    } else {
      preset = {
        options: [
          { name: "Màu khung máy", values: ["Đen Nhám (Black)", "Bạc Ánh Kim (Silver)", "Vàng Hồng (Rose)"] },
          { name: "Loại Dây Đeo", values: ["Dây Silicon Thể Thao", "Dây Thép Milanese", "Dây Da Bò Cao Cấp"] }
        ],
        defaultStock: 0,
        skuPattern: "{SKU}-{COLOR}-{STRAP}",
        predefinedVariants: []
      };
    }

    rebuildVariantMatrix(preset);
  };

  // ===================== CONTENT HELPERS =====================
  const addAttributeRow = () => {
    if (!editingTemplate) return;
    const content = { ...(editingTemplate.content || {}) } as TemplateContentPreset;
    const attrs = [...(content.attributes || []), { key: "", value: "" }];
    setEditingTemplate({
      ...editingTemplate,
      content: { ...content, attributes: attrs }
    });
  };

  const updateAttributeRow = (index: number, key: string, value: string) => {
    if (!editingTemplate) return;
    const content = { ...(editingTemplate.content || {}) } as TemplateContentPreset;
    const attrs = [...(content.attributes || [])];
    attrs[index] = { key, value };
    setEditingTemplate({
      ...editingTemplate,
      content: { ...content, attributes: attrs }
    });
  };

  const removeAttributeRow = (index: number) => {
    if (!editingTemplate) return;
    const content = { ...(editingTemplate.content || {}) } as TemplateContentPreset;
    const attrs = (content.attributes || []).filter((_, idx) => idx !== index);
    setEditingTemplate({
      ...editingTemplate,
      content: { ...content, attributes: attrs }
    });
  };

  const addKeyword = () => {
    if (!newKeywordInput.trim() || !editingTemplate) return;
    const content = { ...(editingTemplate.content || {}) } as TemplateContentPreset;
    const kwList = [...(content.focusKeywords || [])];
    if (!kwList.includes(newKeywordInput.trim())) {
      kwList.push(newKeywordInput.trim());
      setEditingTemplate({
        ...editingTemplate,
        content: { ...content, focusKeywords: kwList }
      });
      setNewKeywordInput("");
    }
  };

  const removeKeyword = (kw: string) => {
    if (!editingTemplate) return;
    const content = { ...(editingTemplate.content || {}) } as TemplateContentPreset;
    const kwList = (content.focusKeywords || []).filter(k => k !== kw);
    setEditingTemplate({
      ...editingTemplate,
      content: { ...content, focusKeywords: kwList }
    });
  };

  const addFAQRow = () => {
    if (!editingTemplate) return;
    const content = { ...(editingTemplate.content || {}) } as TemplateContentPreset;
    setEditingTemplate({
      ...editingTemplate,
      content: { ...content, faqs: [...(content.faqs || []), { question: "", answer: "" }] }
    });
  };

  const updateFAQRow = (index: number, question: string, answer: string) => {
    if (!editingTemplate) return;
    const content = { ...(editingTemplate.content || {}) } as TemplateContentPreset;
    const faqs = [...(content.faqs || [])];
    faqs[index] = { question, answer };
    setEditingTemplate({ ...editingTemplate, content: { ...content, faqs } });
  };

  const removeFAQRow = (index: number) => {
    if (!editingTemplate) return;
    const content = { ...(editingTemplate.content || {}) } as TemplateContentPreset;
    setEditingTemplate({
      ...editingTemplate,
      content: { ...content, faqs: (content.faqs || []).filter((_, faqIndex) => faqIndex !== index) }
    });
  };

  const insertContentBlock = (blockType: "HIGHLIGHTS" | "SPECS" | "POLICY" | "USAGE") => {
    if (!editingTemplate) return;
    const content = { ...(editingTemplate.content || {}) } as TemplateContentPreset;
    let snippet = "";
    if (blockType === "HIGHLIGHTS") {
      snippet = `\n\n### ĐIỂM NỔI BẬT CỦA SẢN PHẨM\n- [Bổ sung đặc điểm đã xác minh từ nguồn]\n- [Bổ sung công dụng hoặc phạm vi sử dụng thực tế]\n- [Bổ sung khác biệt giữa các phân loại]`;
    } else if (blockType === "SPECS") {
      snippet = `\n\n### BẢNG THÔNG SỐ CHI TIẾT\n- Kích thước: [Cần xác minh]\n- Trọng lượng: [Cần xác minh]\n- Xuất xứ: [Cần xác minh]`;
    } else if (blockType === "POLICY") {
      snippet = `\n\n### CHÍNH SÁCH BẢO HÀNH VÀ ĐỔI TRẢ\n- [Chỉ điền thời hạn và điều kiện đang được cửa hàng áp dụng]\n- [Nêu rõ trường hợp được và không được hỗ trợ]\n- [Nêu kênh liên hệ xử lý yêu cầu]`;
    } else if (blockType === "USAGE") {
      snippet = `\n\n### HƯỚNG DẪN SỬ DỤNG & BẢO QUẢN\n- [Bổ sung hướng dẫn đã xác minh theo sản phẩm]\n- [Bổ sung điều kiện bảo quản thực tế]\n- [Bổ sung cảnh báo an toàn nếu có]`;
    }

    setEditingTemplate({
      ...editingTemplate,
      content: {
        ...content,
        fullDescVI: (content.fullDescVI || "") + snippet
      }
    });
  };

  const handleTemplateTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabs = Array.from(event.currentTarget.closest('[role="tablist"]')?.querySelectorAll<HTMLButtonElement>('[role="tab"]') || []);
    if (tabs.length === 0) return;
    const currentIndex = tabs.indexOf(event.currentTarget);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? tabs.length - 1
        : event.key === "ArrowRight"
          ? (currentIndex + 1) % tabs.length
          : (currentIndex - 1 + tabs.length) % tabs.length;
    event.preventDefault();
    tabs[nextIndex]?.focus();
    tabs[nextIndex]?.click();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {notification && (
        <div
          role={notification.type === "error" ? "alert" : "status"}
          aria-live={notification.type === "error" ? "assertive" : "polite"}
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all animate-in slide-in-from-bottom-5 ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {notification.type === "success" ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
          {notification.message}
        </div>
      )}

      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden border border-indigo-700/50">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="p-2 bg-indigo-500/30 backdrop-blur-md rounded-xl border border-indigo-400/30">
                <LayoutTemplate className="w-6 h-6 text-indigo-200" />
              </span>
              <h1 className="text-2xl font-black tracking-tight text-white">
                Mẫu Đăng Bán (Template Presets)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold">
                Nội Dung Sẵn & Biến Thể Mẫu
              </span>
            </div>
            <p className="text-indigo-200 text-sm max-w-2xl leading-relaxed">
              Tạo trước cấu trúc tiêu đề, mô tả chuẩn SEO, cam kết bảo hành và ma trận biến thể (Option, giá chênh lệch, tồn kho). Áp dụng 1-click lên bất kỳ sản phẩm nào từ 1688, Macorner, Shopee hay Taobao.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleResetDefaults}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-medium flex items-center gap-1.5 transition-all"
              title="Khôi phục 4 template gốc có sẵn"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-300" />
              Khôi Phục Gốc
            </button>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-sm shadow-md shadow-emerald-900/30 flex items-center gap-2 transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Tạo Template Mới
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {cat === "ALL" ? "Tất Cả Ngành Hàng" : cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72 shrink-0">
          <input
            type="text"
            placeholder="Tìm theo tên hoặc ngành..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
        </form>
      </div>

      {/* Template Cards Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          Đang tải danh sách template mẫu...
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300">
          <LayoutTemplate className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">Chưa có template nào phù hợp</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Hãy tạo template mới hoặc bấm &quot;Khôi Phục Gốc&quot; để nạp sẵn 4 template bán chạy tiêu chuẩn.
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tạo Template Đầu Tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
          {templates.map((tpl) => {
            const variantCount = tpl.variation?.predefinedVariants?.length || 0;
            const optionsCount = tpl.variation?.options?.length || 0;
            const attrCount = tpl.content?.attributes?.length || 0;

            return (
              <div
                key={tpl.id}
                className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col overflow-hidden shadow-xs hover:shadow-md ${
                  tpl.isDefault ? "border-indigo-300 ring-2 ring-indigo-500/20" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Card Header */}
                <div className="p-5 pb-4 border-b border-slate-100 flex-1">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 text-[11px] font-semibold">
                          {tpl.categoryName}
                        </span>
                        {tpl.targetPlatform && tpl.targetPlatform !== "ALL" && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                            {tpl.targetPlatform}
                          </span>
                        )}
                        {tpl.isDefault && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                            Mặc Định
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-indigo-600">
                        {tpl.name}
                      </h3>
                      {tpl.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {tpl.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Summary Block 1: Preset Content */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>Tiền tố / Hậu tố Tiêu Đề:</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 font-mono text-[11px] text-slate-700 truncate">
                      <span className="text-indigo-600 font-semibold">{tpl.content?.titlePrefix || "[Tiền tố]"}</span>{" "}
                      <span className="text-slate-400">{tpl.content?.titleFormula || "{Tên Sản Phẩm}"}</span>{" "}
                      <span className="text-teal-600 font-semibold">{tpl.content?.titleSuffix || "[Hậu tố]"}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        {tpl.content?.warrantyPolicy ? "Có chính sách bảo hành" : "Chưa có bảo hành"}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                        {attrCount} thông số kỹ thuật
                      </span>
                    </div>
                  </div>

                  {/* Summary Block 2: Variation Preset */}
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                        <Sliders className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <span>Biến thể ({optionsCount} nhóm tùy chọn):</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold text-[11px]">
                        {variantCount} SKU sinh ra
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {tpl.variation?.options?.map((opt, i) => (
                        <div key={i} className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-[11px] flex items-center gap-1 text-slate-700">
                          <span className="font-semibold text-slate-900">{opt.name}:</span>
                          <span className="text-indigo-600 font-medium">{opt.values.length} giá trị</span>
                        </div>
                      ))}
                    </div>

                    {tpl.variation?.skuPattern && (
                      <div className="text-[11px] text-slate-400 font-mono">
                        Pattern: <span className="text-slate-600">{tpl.variation.skuPattern}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {!tpl.isDefault && (
                      <button
                        onClick={() => handleSetDefault(tpl)}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg text-xs font-medium transition-colors"
                        title="Đặt làm mặc định"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDuplicate(tpl)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-medium transition-colors"
                      title="Nhân bản template"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(tpl)}
                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs font-medium transition-colors"
                      title="Xóa template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {onSelectTemplateToApply && (
                      <button
                        onClick={() => onSelectTemplateToApply(tpl)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Áp Dụng
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenEdit(tpl)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Chỉnh Sửa
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================== MODAL EDITOR ===================== */}
      {isEditorOpen && editingTemplate && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-100">
          <div ref={editorDialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="template-editor-title" className="flex h-[100dvh] w-screen max-w-none flex-col overflow-hidden border-0 bg-white shadow-2xl animate-in fade-in duration-150">
            {/* Modal Header */}
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/90 px-4 py-3 sm:px-6 sm:py-4">
              <div className="min-w-0">
                <h2 id="template-editor-title" className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <LayoutTemplate className="w-5 h-5 text-indigo-600" />
                  {editingTemplate.id ? "Chỉnh Sửa Template Mẫu" : "Tạo Mới Template Mẫu"}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Cấu hình nội dung sẵn (Content) và biến thể sẵn (Variation) để áp dụng nhanh
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                aria-label="Đóng biên tập mẫu"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 active:bg-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
            {/* General Info Bar */}
            <div className="grid shrink-0 grid-cols-1 gap-3 border-b border-indigo-100 bg-indigo-50/50 px-4 py-3 text-xs sm:px-6 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Tên Template <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingTemplate.name || ""}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  placeholder="Ví dụ: Quà Tặng POD In Tên..."
                  autoComplete="off"
                  className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Ngành Hàng <span className="text-red-500">*</span>
                </label>
                <select
                  value={editingTemplate.categoryName || "Quà Tặng & In Ấn (POD)"}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, categoryName: e.target.value })}
                  className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Quà Tặng & In Ấn (POD)">Quà Tặng & In Ấn (POD)</option>
                  <option value="Thời Trang & May Mặc">Thời Trang & May Mặc</option>
                  <option value="Gia Dụng & Đời Sống">Gia Dụng & Đời Sống</option>
                  <option value="Công Nghệ & Phụ Kiện">Công Nghệ & Phụ Kiện</option>
                  <option value="Sức Khỏe & Sắc Đẹp">Sức Khỏe & Sắc Đẹp</option>
                  <option value="Mẹ & Bé">Mẹ & Bé</option>
                  <option value="Chung">Chung</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Nền Tảng Áp Dụng
                </label>
                <select
                  value={editingTemplate.targetPlatform || "ALL"}
                  onChange={(e) => setEditingTemplate({
                    ...editingTemplate,
                    targetPlatform: e.target.value as ProductTemplate["targetPlatform"]
                  })}
                  className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">Tất cả nền tảng</option>
                  <option value="SHOPIFY">Shopify</option>
                  <option value="WOOCOMMERCE">WooCommerce</option>
                  <option value="SHOPEE">Shopee</option>
                  <option value="TIKTOK_SHOP">TikTok Shop</option>
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg border border-indigo-100 bg-white px-3 transition-colors hover:border-indigo-300">
                  <input
                    type="checkbox"
                    checked={editingTemplate.isDefault || false}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, isDefault: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span className="font-semibold text-slate-800">Đặt làm mẫu mặc định</span>
                </label>
              </div>
            </div>

            {/* AI quick-create workspace */}
            <section aria-labelledby="ai-template-title" className="shrink-0 border-b border-slate-800 bg-slate-950 px-4 py-3 text-white sm:px-6">
              <div className="grid gap-3 lg:grid-cols-[minmax(220px,0.7fr)_minmax(320px,1.8fr)_auto] lg:items-end">
                <div>
                  <h3 id="ai-template-title" className="flex items-center gap-2 text-sm font-bold">
                    <Bot className="h-4 w-4 text-violet-300" />
                    Tạo nhanh Content + Variation bằng AI
                  </h3>
                  <p className="mt-1 text-[11px] leading-4 text-slate-300">
                    AI tạo bản nháp để duyệt; không tự lưu, không sinh giá hoặc tồn kho.
                  </p>
                </div>
                <div>
                  <label htmlFor="ai-template-brief" className="mb-1 block text-[11px] font-semibold text-slate-200">
                    Mục tiêu sản phẩm / yêu cầu cho template
                  </label>
                  <input
                    id="ai-template-brief"
                    type="text"
                    value={aiBrief}
                    onChange={(event) => setAiBrief(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !isGeneratingTemplate) {
                        event.preventDefault();
                        handleGenerateTemplateWithAI();
                      }
                    }}
                    placeholder="Ví dụ: quà tặng cá nhân hóa, cần Size × Combo và nội dung ngắn gọn"
                    autoComplete="off"
                    aria-describedby={aiTemplateError ? "ai-template-error" : "ai-template-help"}
                    className="min-h-11 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-white outline-none placeholder:text-slate-500 focus-visible:border-violet-400 focus-visible:ring-2 focus-visible:ring-violet-400/40"
                  />
                  <span id="ai-template-help" className="sr-only">AI chỉ tạo bản nháp, mọi dữ liệu cần được duyệt trước khi lưu.</span>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateTemplateWithAI}
                  disabled={isGeneratingTemplate}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-violet-950/30 transition-colors hover:bg-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGeneratingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {isGeneratingTemplate ? "Đang tạo bản nháp…" : "Tạo bản nháp bằng AI"}
                </button>
              </div>
              {aiTemplateError && (
                <p id="ai-template-error" role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {aiTemplateError}
                </p>
              )}
              {aiTemplateResult && (
                <div role="status" className="mt-3 flex flex-col gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-[11px] text-emerald-50 md:flex-row md:items-start md:justify-between">
                  <div>
                    <strong>Bản nháp {aiTemplateResult.mode === "LIVE" ? "AI live" : "demo"} đã sẵn sàng:</strong>{" "}
                    {aiTemplateResult.attributes} thuộc tính, {aiTemplateResult.options} nhóm tùy chọn, {aiTemplateResult.variants} SKU.
                  </div>
                  <p className="max-w-3xl text-emerald-100">{aiTemplateResult.warnings.join(" ")}</p>
                </div>
              )}
            </section>

            {/* Tabs Selector */}
            <div role="tablist" aria-label="Phần cấu hình template" className="sticky top-0 z-20 flex overflow-x-auto border-b border-slate-200 bg-white px-4 shadow-xs sm:px-6">
              <button
                type="button"
                role="tab"
                id="template-tab-content"
                aria-selected={activeTab === "CONTENT"}
                aria-controls="template-content-panel"
                tabIndex={activeTab === "CONTENT" ? 0 : -1}
                onKeyDown={handleTemplateTabKeyDown}
                onClick={() => setActiveTab("CONTENT")}
                className={`flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-600 ${
                  activeTab === "CONTENT"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <FileText className="w-4 h-4" />
                1. Nội Dung Sẵn (Tiêu Đề, Mô Tả, Bảo Hành, Thuộc Tính)
              </button>
              <button
                type="button"
                role="tab"
                id="template-tab-variation"
                aria-selected={activeTab === "VARIATION"}
                aria-controls="template-variation-panel"
                tabIndex={activeTab === "VARIATION" ? 0 : -1}
                onKeyDown={handleTemplateTabKeyDown}
                onClick={() => setActiveTab("VARIATION")}
                className={`flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-600 ${
                  activeTab === "VARIATION"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Sliders className="w-4 h-4" />
                2. Biến Thể Sẵn (Tùy Chọn, Giá Chênh Lệch, Ma Trận)
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="space-y-6 bg-slate-50/50 p-4 sm:p-6">
              {/* TAB 1: CONTENT PRESET */}
              {activeTab === "CONTENT" && (
                <div id="template-content-panel" role="tabpanel" aria-labelledby="template-tab-content" tabIndex={0} className="mx-auto max-w-7xl space-y-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
                  <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4">
                    <label htmlFor="template-description" className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Mục đích và phạm vi của template
                    </label>
                    <textarea
                      id="template-description"
                      rows={2}
                      value={editingTemplate.description || ""}
                      onChange={(event) => setEditingTemplate({ ...editingTemplate, description: event.target.value })}
                      placeholder="Mô tả khi nào nên dùng template này để đội vận hành chọn đúng mẫu."
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  {/* Section: Title Prefix / Suffix & Formula */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Tag className="w-4 h-4 text-indigo-600" />
                        Định Dạng Tiêu Đề Tự Động
                      </h4>
                      <span className="text-[11px] text-slate-500">
                        Hỗ trợ chèn trước hoặc sau tiêu đề gốc
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">
                          Tiền tố tiêu đề (Prefix)
                        </label>
                        <input
                          type="text"
                          value={editingTemplate.content?.titlePrefix || ""}
                          onChange={(e) => setEditingTemplate({
                            ...editingTemplate,
                            content: { ...editingTemplate.content, titlePrefix: e.target.value }
                          })}
                          placeholder="Ví dụ: [Quà tặng] hoặc [Unisex]"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-medium mb-1">
                          Hậu tố tiêu đề (Suffix)
                        </label>
                        <input
                          type="text"
                          value={editingTemplate.content?.titleSuffix || ""}
                          onChange={(e) => setEditingTemplate({
                            ...editingTemplate,
                            content: { ...editingTemplate.content, titleSuffix: e.target.value }
                          })}
                          placeholder="Ví dụ: - Khắc Tên Cao Cấp (Bảo Hành 12T)"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Live Preview Title */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs">
                      <span className="text-slate-400 font-medium block mb-1">Xem trước tiêu đề mẫu:</span>
                      <p className="font-semibold text-slate-800">
                        <span className="text-indigo-600">{editingTemplate.content?.titlePrefix || ""}</span>{" "}
                        Tên sản phẩm nguồn sau khi làm sạch{" "}
                        <span className="text-teal-600">{editingTemplate.content?.titleSuffix || ""}</span>
                      </p>
                    </div>
                  </div>

                  {/* Section: Short Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                      Mô Tả Ngắn Sản Phẩm (Short Description)
                    </label>
                    <textarea
                      rows={2}
                      value={editingTemplate.content?.shortDescVI || ""}
                      onChange={(e) => setEditingTemplate({
                        ...editingTemplate,
                        content: { ...editingTemplate.content, shortDescVI: e.target.value }
                      })}
                      placeholder="Câu giới thiệu ngắn gọn, súc tích nêu bật tính năng và lợi ích hàng đầu..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Section: Full Description with Quick Snippet Buttons */}
                  <div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Mô Tả Chi Tiết (Full Markdown Description)
                      </label>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-slate-500">Chèn nhanh:</span>
                        <button
                          type="button"
                          onClick={() => insertContentBlock("HIGHLIGHTS")}
                          className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-indigo-50 px-2 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:min-h-8"
                        >
                          <Sparkles className="h-3.5 w-3.5" /> Điểm nổi bật
                        </button>
                        <button
                          type="button"
                          onClick={() => insertContentBlock("SPECS")}
                          className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-purple-50 px-2 text-[11px] font-medium text-purple-700 hover:bg-purple-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 sm:min-h-8"
                        >
                          <Package className="h-3.5 w-3.5" /> Thông số
                        </button>
                        <button
                          type="button"
                          onClick={() => insertContentBlock("POLICY")}
                          className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-emerald-50 px-2 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:min-h-8"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" /> Chính sách
                        </button>
                        <button
                          type="button"
                          onClick={() => insertContentBlock("USAGE")}
                          className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-amber-50 px-2 text-[11px] font-medium text-amber-700 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:min-h-8"
                        >
                          <HelpCircle className="h-3.5 w-3.5" /> Hướng dẫn
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={8}
                      value={editingTemplate.content?.fullDescVI || ""}
                      onChange={(e) => setEditingTemplate({
                        ...editingTemplate,
                        content: { ...editingTemplate.content, fullDescVI: e.target.value }
                      })}
                      placeholder="Soạn nội dung mô tả chi tiết với định dạng Markdown..."
                      className="w-full px-3 py-2 bg-slate-50 font-mono text-xs border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Section: Technical Attributes Table */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-indigo-600" />
                        Bảng Thông Số Kỹ Thuật (Attributes)
                      </h4>
                      <button
                        type="button"
                        onClick={addAttributeRow}
                        className="flex min-h-11 items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Thêm Thuộc Tính
                      </button>
                    </div>

                    <p className="text-[11px] leading-5 text-slate-500">
                      Attributes là thông tin mô tả chung như chất liệu, kích thước đóng gói hoặc xuất xứ; không tạo SKU. Tab Biến Thể dùng cho lựa chọn khách mua như Size hoặc Màu và sẽ tạo ma trận SKU.
                    </p>

                    <div className="space-y-2">
                      {editingTemplate.content?.attributes?.map((attr, idx) => (
                        <div key={idx} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(140px,1fr)_minmax(0,2fr)_44px] sm:items-center">
                          <input
                            type="text"
                            value={attr.key}
                            onChange={(e) => updateAttributeRow(idx, e.target.value, attr.value)}
                            placeholder="Tên thuộc tính (vd: Chất liệu)"
                            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                          />
                          <input
                            type="text"
                            value={attr.value}
                            onChange={(e) => updateAttributeRow(idx, attr.key, e.target.value)}
                            placeholder="Giá trị đã xác minh từ nguồn"
                            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() => removeAttributeRow(idx)}
                            aria-label={`Xóa thuộc tính ${attr.key || idx + 1}`}
                            className="inline-flex h-11 w-11 shrink-0 items-center justify-center justify-self-end rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 sm:justify-self-auto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {(!editingTemplate.content?.attributes || editingTemplate.content.attributes.length === 0) && (
                        <p className="text-xs text-slate-400 italic">Chưa có thuộc tính nào. Bấm &quot;Thêm Thuộc Tính&quot; để tạo.</p>
                      )}
                    </div>
                  </div>

                  {/* Section: Warranties & Policies */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2">
                      <label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        Chính Sách Bảo Hành & Đổi Trả
                      </label>
                      <textarea
                        rows={3}
                        value={editingTemplate.content?.warrantyPolicy || ""}
                        onChange={(e) => setEditingTemplate({
                          ...editingTemplate,
                          content: { ...editingTemplate.content, warrantyPolicy: e.target.value }
                        })}
                        placeholder="Chỉ nhập chính sách bảo hành đang áp dụng"
                        className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-100 space-y-2">
                      <label className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-teal-600" />
                        Chính Sách Giao Hàng & Đồng Kiểm
                      </label>
                      <textarea
                        rows={3}
                        value={editingTemplate.content?.shippingPolicy || ""}
                        onChange={(e) => setEditingTemplate({
                          ...editingTemplate,
                          content: { ...editingTemplate.content, shippingPolicy: e.target.value }
                        })}
                        placeholder="Giao hàng toàn quốc 2-4 ngày, đóng hộp chống sốc..."
                        className="w-full px-3 py-2 bg-white border border-teal-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  {/* Section: Focus Keywords & SEO */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      Từ Khóa SEO & Hashtags Mẫu
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {editingTemplate.content?.focusKeywords?.map((kw, i) => (
                        <span key={i} className="px-2.5 py-1 bg-white border border-slate-300 rounded-full text-xs text-slate-700 flex items-center gap-1">
                          #{kw}
                          <button
                            type="button"
                            onClick={() => removeKeyword(kw)}
                            aria-label={`Xóa từ khóa ${kw}`}
                            className="inline-flex h-11 w-11 items-center justify-center text-slate-400 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 sm:h-7 sm:w-7"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        value={newKeywordInput}
                        onChange={(e) => setNewKeywordInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }}
                        placeholder="Thêm từ khóa SEO (nhấn Enter)..."
                        className="min-h-11 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={addKeyword}
                        className="min-h-11 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-600"
                      >
                        Thêm
                      </button>
                    </div>
                  </div>

                  {/* Section: FAQ */}
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800">
                          <HelpCircle className="h-4 w-4 text-indigo-600" />
                          Câu hỏi thường gặp (FAQ)
                        </h4>
                        <p className="mt-1 text-[11px] leading-5 text-slate-500">FAQ do AI tạo phải được duyệt và đối chiếu dữ liệu trước khi lưu.</p>
                      </div>
                      <button
                        type="button"
                        onClick={addFAQRow}
                        className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      >
                        <Plus className="h-3.5 w-3.5" /> Thêm FAQ
                      </button>
                    </div>

                    <div className="space-y-3">
                      {editingTemplate.content?.faqs?.map((faq, index) => (
                        <div key={index} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[minmax(220px,0.9fr)_minmax(0,1.8fr)_44px] lg:items-start">
                          <div>
                            <label htmlFor={`template-faq-question-${index}`} className="mb-1 block text-[11px] font-semibold text-slate-600">Câu hỏi</label>
                            <input
                              id={`template-faq-question-${index}`}
                              type="text"
                              value={faq.question}
                              onChange={(event) => updateFAQRow(index, event.target.value, faq.answer)}
                              placeholder="Khách hàng thường hỏi gì?"
                              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label htmlFor={`template-faq-answer-${index}`} className="mb-1 block text-[11px] font-semibold text-slate-600">Câu trả lời đã xác minh</label>
                            <textarea
                              id={`template-faq-answer-${index}`}
                              rows={2}
                              value={faq.answer}
                              onChange={(event) => updateFAQRow(index, faq.question, event.target.value)}
                              placeholder="Nhập câu trả lời hoặc giữ placeholder cần xác minh."
                              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFAQRow(index)}
                            aria-label={`Xóa FAQ ${faq.question || index + 1}`}
                            className="inline-flex h-11 w-11 items-center justify-center justify-self-end rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 lg:mt-5 lg:justify-self-auto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {(!editingTemplate.content?.faqs || editingTemplate.content.faqs.length === 0) && (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                          <HelpCircle className="mx-auto h-5 w-5 text-slate-400" />
                          <p className="mt-2 text-xs text-slate-500">Chưa có FAQ. Thêm thủ công hoặc dùng AI để tạo khung câu hỏi.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: VARIATION PRESET */}
              {activeTab === "VARIATION" && (
                <div id="template-variation-panel" role="tabpanel" aria-labelledby="template-tab-variation" tabIndex={0} className="mx-auto max-w-7xl space-y-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
                  <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <div>
                      <p className="font-bold">Template và AI chỉ tạo cấu trúc phân loại.</p>
                      <p className="mt-1 leading-5">Giá chênh lệch phải được người quản trị nhập; tồn kho luôn bằng 0 cho đến khi đồng bộ từ nguồn đã xác minh.</p>
                    </div>
                  </div>
                  {/* Quick Preset Buttons */}
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-xs text-purple-900 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        Nạp Nhanh Biến Thể Mẫu Chuẩn:
                      </span>
                      <p className="text-[11px] text-purple-700 mt-0.5">
                        Bấm vào ngành hàng tương ứng để tự động sinh cấu trúc phân loại và ma trận
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => loadVariationPresetPreset("POD")}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-purple-200 bg-white px-3 text-xs font-semibold text-purple-800 shadow-2xs hover:bg-purple-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                      >
                        <Package className="h-3.5 w-3.5" /> Quà Tặng POD (Size × Combo)
                      </button>
                      <button
                        type="button"
                        onClick={() => loadVariationPresetPreset("FASHION")}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 text-xs font-semibold text-indigo-800 shadow-2xs hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      >
                        <Layers className="h-3.5 w-3.5" /> Thời Trang (S–2XL × Màu)
                      </button>
                      <button
                        type="button"
                        onClick={() => loadVariationPresetPreset("APPLIANCE")}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 text-xs font-semibold text-emerald-800 shadow-2xs hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      >
                        <Truck className="h-3.5 w-3.5" /> Gia Dụng (Model)
                      </button>
                      <button
                        type="button"
                        onClick={() => loadVariationPresetPreset("TECH")}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-cyan-200 bg-white px-3 text-xs font-semibold text-cyan-800 shadow-2xs hover:bg-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                      >
                        <Sliders className="h-3.5 w-3.5" /> Công Nghệ (Vỏ × Dây)
                      </button>
                    </div>
                  </div>

                  {/* Option Group 1 Builder */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        Nhóm Tùy Chọn 1 (Option 1)
                      </label>
                      <span className="text-[11px] text-slate-500">Ví dụ: Kích thước, Dung tích, Size...</span>
                    </div>

                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                      <input
                        type="text"
                        value={editingTemplate.variation?.options?.[0]?.name || "Kích thước (Size)"}
                        onChange={(e) => updateOptionName(0, e.target.value)}
                        placeholder="Tên nhóm tùy chọn 1"
                        className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 md:w-1/3"
                      />

                      <div className="flex w-full flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          type="text"
                          value={newOption1Val}
                          onChange={(e) => setNewOption1Val(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addOptionValue(0, newOption1Val);
                              setNewOption1Val("");
                            }
                          }}
                          placeholder="Thêm giá trị phân loại (nhấn Enter)..."
                          className="min-h-11 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            addOptionValue(0, newOption1Val);
                            setNewOption1Val("");
                          }}
                          className="min-h-11 shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:w-auto"
                        >
                          Thêm Tag
                        </button>
                      </div>
                    </div>

                    {/* Tags Pill List */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {editingTemplate.variation?.options?.[0]?.values?.map((val, idx) => (
                        <span key={idx} className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 flex items-center gap-1.5 shadow-2xs">
                          {val}
                          <button
                            type="button"
                            onClick={() => removeOptionValue(0, idx)}
                            aria-label={`Xóa giá trị ${val}`}
                            className="inline-flex h-11 w-11 items-center justify-center text-slate-400 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 sm:h-7 sm:w-7"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Option Group 2 Builder (Optional) */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-purple-600" />
                        Nhóm Tùy Chọn 2 (Option 2 - Tùy chọn mở rộng)
                      </label>
                      {(!editingTemplate.variation?.options || editingTemplate.variation.options.length < 2) ? (
                        <button
                          type="button"
                          onClick={addSecondOptionGroup}
                          className="flex min-h-11 items-center gap-1 rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Thêm Nhóm Tùy Chọn 2
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={removeSecondOptionGroup}
                          className="min-h-11 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        >
                          Xóa Nhóm 2
                        </button>
                      )}
                    </div>

                    {editingTemplate.variation?.options && editingTemplate.variation.options.length > 1 && (
                      <div className="space-y-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center">
                          <input
                            type="text"
                            value={editingTemplate.variation.options[1].name}
                            onChange={(e) => updateOptionName(1, e.target.value)}
                            placeholder="Tên nhóm tùy chọn 2 (vd: Màu sắc)"
                            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 md:w-1/3"
                          />

                          <div className="flex w-full flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                            <input
                              type="text"
                              value={newOption2Val}
                              onChange={(e) => setNewOption2Val(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addOptionValue(1, newOption2Val);
                                  setNewOption2Val("");
                                }
                              }}
                              placeholder="Thêm giá trị tùy chọn 2 (nhấn Enter)..."
                              className="min-h-11 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                addOptionValue(1, newOption2Val);
                                setNewOption2Val("");
                              }}
                              className="min-h-11 shrink-0 rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 sm:w-auto"
                            >
                              Thêm Tag
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                          {editingTemplate.variation.options[1].values.map((val, idx) => (
                            <span key={idx} className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 flex items-center gap-1.5 shadow-2xs">
                              {val}
                              <button
                                type="button"
                                onClick={() => removeOptionValue(1, idx)}
                                aria-label={`Xóa giá trị ${val}`}
                                className="inline-flex h-11 w-11 items-center justify-center text-slate-400 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 sm:h-7 sm:w-7"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Default Stock and SKU Pattern Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Tồn kho mẫu (luôn bắt đầu từ 0)
                      </label>
                      <input
                        type="number"
                        value={0}
                        readOnly
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-500 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Quy tắc sinh mã SKU (SKU Pattern)
                      </label>
                      <input
                        type="text"
                        value={editingTemplate.variation?.skuPattern || "{SKU}-{OPT1}-{OPT2}"}
                        onChange={(e) => setEditingTemplate({
                          ...editingTemplate,
                          variation: { ...editingTemplate.variation!, skuPattern: e.target.value }
                        })}
                        placeholder="{SKU}-{SIZE}-{COLOR}"
                        className="w-full px-3 py-2 bg-white font-mono border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Live Cartesian Matrix Preview */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                        Ma Trận Biến Thể & Điều Chỉnh Giá (+VND)
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-200">
                        {editingTemplate.variation?.predefinedVariants?.length || 0} Phân Loại
                      </span>
                    </div>

                    <div className="max-h-72 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0 z-10">
                          <tr>
                            <th className="py-2.5 px-4 font-semibold">Tên Biến Thể</th>
                            <th className="py-2.5 px-3 font-semibold">Tùy Chọn 1</th>
                            {editingTemplate.variation?.options && editingTemplate.variation.options.length > 1 && (
                              <th className="py-2.5 px-3 font-semibold">Tùy Chọn 2</th>
                            )}
                            <th className="py-2.5 px-3 font-semibold">Chênh Lệch Giá (+VND)</th>
                                  <th className="py-2.5 px-3 font-semibold">Tồn kho khi áp dụng</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {editingTemplate.variation?.predefinedVariants?.map((variant, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80">
                              <td className="py-2 px-4 font-medium text-slate-900">
                                {variant.name}
                              </td>
                              <td className="py-2 px-3 text-slate-600">
                                {variant.option1 || "—"}
                              </td>
                              {editingTemplate.variation?.options && editingTemplate.variation.options.length > 1 && (
                                <td className="py-2 px-3 text-slate-600">
                                  {variant.option2 || "—"}
                                </td>
                              )}
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400 font-semibold">+</span>
                                  <input
                                    type="number"
                                    step={1000}
                                    value={variant.priceAdjustmentVND ?? 0}
                                    onChange={(e) => updateVariantAdjustment(idx, parseInt(e.target.value) || 0)}
                                    className="w-28 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-semibold text-emerald-700 focus:ring-1 focus:ring-emerald-500"
                                  />
                                  <span className="text-[11px] text-slate-500">đ</span>
                                </div>
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                    value={0}
                                    readOnly
                                    title="Tồn kho phải được lấy từ nguồn đã xác minh"
                                    className="w-20 px-2 py-1 bg-slate-100 border border-slate-300 rounded text-xs text-slate-500 cursor-not-allowed"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 active:bg-slate-200"
              >
                Hủy Bỏ
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={saving}
                  className="flex min-h-11 items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-200 transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 active:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang Lưu...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Lưu Template
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
