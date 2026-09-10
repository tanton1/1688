import React, { useState, useMemo } from "react";
import { WebProduct, WebProductVariant, ProductImageSEO, ProductFAQItem, AICopywritingStyle } from "@hub1688/shared-types";
import {
  generateSlug,
  extractSEOKeywords,
  generateSEOMeta,
  generateImageAltTags,
  generateProductFAQs,
  generateProductJsonLd,
  auditListingSEO,
  generateMarketingCopy
} from "@hub1688/shared-utils";
import {
  X,
  Save,
  CheckCircle,
  ExternalLink,
  Lock,
  Unlock,
  Zap,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Award,
  AlertCircle,
  Info,
  DollarSign,
  Video,
  Download,
  Copy,
  Languages,
  ListChecks,
  Globe,
  Search,
  Tag,
  Plus,
  Trash2,
  Code,
  HelpCircle,
  Monitor,
  Smartphone,
  Check,
  Share2,
  FileText
} from "lucide-react";

interface ProductDetailModalProps {
  product: WebProduct | null;
  onClose: () => void;
  onSave: (updatedProduct: WebProduct) => void;
  onOpenConnectors?: (product: WebProduct) => void;
  onOpenBannerStudio?: (product: WebProduct) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onSave,
  onOpenConnectors,
  onOpenBannerStudio
}) => {
  if (!product) return null;

  const [activeTab, setActiveTab] = useState<"content" | "variants" | "media" | "seo" | "quality" | "copywriter">("content");
  const [copyStyle, setCopyStyle] = useState<AICopywritingStyle>("AIDA");
  const [copyLang, setCopyLang] = useState<"VI" | "EN">(product.displayLanguage || "VI");
  const [generatedCopy, setGeneratedCopy] = useState<any>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [editLang, setEditLang] = useState<"VI" | "EN">(product.displayLanguage || "VI");
  const [formData, setFormData] = useState<WebProduct>(() => {
    const p = { ...product };
    // Khởi tạo các trường SEO nếu chưa có
    if (!p.slug) p.slug = generateSlug(p.titleVI);
    if (!p.metaTitle) p.metaTitle = generateSEOMeta(p.titleVI, p.categoryName, p.attributes, "VI").metaTitle;
    if (!p.metaDescription) p.metaDescription = generateSEOMeta(p.titleVI, p.categoryName, p.attributes, "VI").metaDescription;
    if (!p.focusKeywords || p.focusKeywords.length === 0) {
      p.focusKeywords = extractSEOKeywords(p.titleVI, p.categoryName, "VI");
    }
    if (!p.imagesSEO || p.imagesSEO.length === 0) {
      p.imagesSEO = generateImageAltTags(p.titleVI, p.primaryImage, p.galleryImages, p.detailImages || [], p.variants);
    }
    if (!p.faqs || p.faqs.length === 0) {
      p.faqs = generateProductFAQs(p.titleVI, p.categoryName, "VI");
    }
    return p;
  });

  const [variants, setVariants] = useState<WebProductVariant[]>([...product.variants]);
  const [isSaving, setIsSaving] = useState(false);
  const [customVideoInput, setCustomVideoInput] = useState("");
  const [serpDevice, setSerpDevice] = useState<"desktop" | "mobile">("desktop");
  const [newKeywordInput, setNewKeywordInput] = useState("");
  const [showJsonLdModal, setShowJsonLdModal] = useState(false);
  const [copiedJsonLd, setCopiedJsonLd] = useState(false);

  // Tính toán điểm SEO thời gian thực
  const seoAudit = useMemo(() => {
    return auditListingSEO(formData);
  }, [formData]);

  // Cập nhật trường thông tin cơ bản
  const handleFieldChange = (field: keyof WebProduct, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Cập nhật cờ khóa trường
  const handleLockToggle = (lockField: keyof WebProduct) => {
    setFormData(prev => ({ ...prev, [lockField]: !prev[lockField] }));
  };

  // Cập nhật biến thể
  const handleVariantChange = (index: number, field: keyof WebProductVariant, value: any) => {
    const next = [...variants];
    next[index] = { ...next[index], [field]: value };
    setVariants(next);

    const validPrices = next.filter(v => v.selectedForSale).map(v => v.sellingPriceVND);
    if (validPrices.length > 0) {
      setFormData(prev => ({
        ...prev,
        minPriceVND: Math.min(...validPrices),
        maxPriceVND: Math.max(...validPrices)
      }));
    }
  };

  // Bật/tắt bán variant
  const handleToggleVariantSale = (index: number) => {
    const next = [...variants];
    next[index] = { ...next[index], selectedForSale: !next[index].selectedForSale };
    setVariants(next);
  };

  // Thêm từ khóa SEO
  const handleAddKeyword = () => {
    const kw = newKeywordInput.trim().toLowerCase();
    if (kw && !formData.focusKeywords?.includes(kw)) {
      const nextKw = [...(formData.focusKeywords || []), kw];
      handleFieldChange("focusKeywords", nextKw);
      setNewKeywordInput("");
    }
  };

  // Xóa từ khóa SEO
  const handleRemoveKeyword = (kwToRemove: string) => {
    const nextKw = (formData.focusKeywords || []).filter(k => k !== kwToRemove);
    handleFieldChange("focusKeywords", nextKw);
  };

  // Cập nhật thẻ ALT của ảnh
  const handleUpdateImageAlt = (url: string, newAlt: string) => {
    const nextImagesSEO = (formData.imagesSEO || []).map(img => {
      if (img.url === url) {
        return { ...img, alt: newAlt };
      }
      return img;
    });
    handleFieldChange("imagesSEO", nextImagesSEO);
  };

  // Tự động điền lại thẻ ALT chuẩn SEO
  const handleAutoGenerateAlts = () => {
    const newAlts = generateImageAltTags(
      editLang === "VI" ? formData.titleVI : (formData.titleEN || formData.titleVI),
      formData.primaryImage,
      formData.galleryImages,
      formData.detailImages || [],
      variants
    );
    handleFieldChange("imagesSEO", newAlts);
  };

  // Tự động tối ưu lại toàn bộ SEO (AI Re-optimize)
  const handleAutoOptimizeSEO = () => {
    const activeTitle = editLang === "VI" ? formData.titleVI : (formData.titleEN || formData.titleVI);
    const meta = generateSEOMeta(activeTitle, formData.categoryName, formData.attributes, editLang);
    const keywords = extractSEOKeywords(activeTitle, formData.categoryName, editLang);
    const newAlts = generateImageAltTags(
      activeTitle,
      formData.primaryImage,
      formData.galleryImages,
      formData.detailImages || [],
      variants
    );
    const faqs = generateProductFAQs(activeTitle, formData.categoryName, editLang);
    const newSlug = generateSlug(activeTitle);

    setFormData(prev => ({
      ...prev,
      slug: newSlug,
      metaTitle: meta.metaTitle,
      metaDescription: meta.metaDescription,
      focusKeywords: keywords,
      imagesSEO: newAlts,
      faqs
    }));
  };

  const handleSave = () => {
    setIsSaving(true);
    const updated: WebProduct = {
      ...formData,
      displayLanguage: editLang,
      variants,
      seo: {
        ...(formData.seo || {}),
        metaTitleVI: formData.metaTitle,
        metaDescriptionVI: formData.metaDescription,
        focusKeywordsVI: formData.focusKeywords,
        imagesSEO: formData.imagesSEO,
        faqs: formData.faqs,
        jsonLdSchema: generateProductJsonLd(formData),
        seoScore: seoAudit.score
      },
      updatedAt: new Date().toISOString()
    };
    onSave(updated);
    setTimeout(() => {
      setIsSaving(false);
      onClose();
    }, 400);
  };

  const mediaCount =
    formData.galleryImages.length +
    1 +
    (formData.detailImages?.length || 0) +
    (formData.videoUrl ? 1 : 0);

  const jsonLdCode = useMemo(() => {
    return JSON.stringify(generateProductJsonLd(formData), null, 2);
  }, [formData]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono text-xs bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded shrink-0">
              {formData.skuCode}
            </span>
            <h2 className="text-sm font-bold text-slate-900 truncate max-w-md">
              {editLang === "VI" ? formData.titleVI : (formData.titleEN || formData.titleVI)}
            </h2>
            {formData.videoUrl && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md shrink-0">
                <Video className="w-3 h-3" /> Có Video
              </span>
            )}
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
              seoAudit.score >= 80 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}>
              <Globe className="w-3 h-3" /> SEO {seoAudit.score}/100
            </span>
            <a
              href={formData.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:underline shrink-0"
            >
              Mở 1688 gốc <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300">
              <button
                type="button"
                onClick={() => setEditLang("VI")}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
                  editLang === "VI"
                    ? "bg-white text-orange-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Chỉnh sửa nội dung Tiếng Việt"
              >
                <span>🇻🇳</span> VI
              </button>
              <button
                type="button"
                onClick={() => setEditLang("EN")}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
                  editLang === "EN"
                    ? "bg-white text-blue-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Edit content in English"
              >
                <span>🇬🇧</span> EN
              </button>
            </div>

            <button
              onClick={() => handleFieldChange("status", formData.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED")}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                formData.status === "PUBLISHED"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                  : "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
              }`}
            >
              {formData.status === "PUBLISHED" ? "✓ Đang Bán" : "Chế Độ Bản Nháp"}
            </button>

            {onOpenConnectors && (
              <button
                type="button"
                onClick={() => onOpenConnectors(formData)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-xs transition-colors"
                title="Đẩy sản phẩm lên WooCommerce, Shopify hoặc xuất CSV"
              >
                <Share2 className="w-3.5 h-3.5 text-orange-600" />
                <span>Đẩy Lên Web Bán Hàng</span>
              </button>
            )}

            {onOpenBannerStudio && (
              <button
                type="button"
                onClick={() => onOpenBannerStudio(formData)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-xs transition-colors"
                title="Tạo khung viền khuyến mại Shopee Mall, Flash Sale cho ảnh đại diện"
              >
                <Sparkles className="w-3.5 h-3.5 text-pink-600" />
                <span>Khung Viền Promo</span>
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Đang lưu..." : "Lưu Thay Đổi"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-200 bg-white select-none overflow-x-auto">
          <button
            onClick={() => setActiveTab("content")}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "content"
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Nội Dung & Thông Số
          </button>

          <button
            onClick={() => setActiveTab("variants")}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "variants"
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Ma Trận SKU ({variants.length})
          </button>

          <button
            onClick={() => setActiveTab("media")}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "media"
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Media & Video ({mediaCount})
          </button>

          {/* TAB: TỐI ƯU SEO & SERP */}
          <button
            onClick={() => setActiveTab("seo")}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "seo"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Tối Ưu SEO & SERP
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              seoAudit.score >= 80 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}>
              {seoAudit.score}/100
            </span>
          </button>

          {/* TAB MỚI: AI MARKETING COPYWRITER */}
          <button
            onClick={() => setActiveTab("copywriter")}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "copywriter"
                ? "border-pink-600 text-pink-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-500" />
            AI Marketing Copywriter
            <span className="px-1.5 py-0.2 bg-pink-100 text-pink-700 rounded-full text-[10px] font-extrabold">
              AI
            </span>
          </button>

          <button
            onClick={() => setActiveTab("quality")}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "quality"
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Chất Lượng Listing ({formData.qualityScore}/100)
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: NỘI DUNG & THÔNG SỐ */}
          {activeTab === "content" && (
            <div className="space-y-5">
              {/* Box Khóa Trường (Field Locks Control) */}
              <div className="bg-orange-50/60 border border-orange-200/80 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-orange-600" />
                    <h3 className="text-xs font-bold text-slate-900">
                      Cơ Chế Khóa Trường (Field-Level Locks)
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Ngăn chặn crawler tự động ghi đè nội dung bạn đã tối ưu thủ công
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                  <label className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-orange-300">
                    <input
                      type="checkbox"
                      checked={formData.isTitleLocked}
                      onChange={() => handleLockToggle("isTitleLocked")}
                      className="rounded text-orange-600 focus:ring-orange-500"
                    />
                    <span className="font-semibold text-slate-700">Khóa Tiêu Đề</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-orange-300">
                    <input
                      type="checkbox"
                      checked={formData.isDescLocked}
                      onChange={() => handleLockToggle("isDescLocked")}
                      className="rounded text-orange-600 focus:ring-orange-500"
                    />
                    <span className="font-semibold text-slate-700">Khóa Mô Tả</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-orange-300">
                    <input
                      type="checkbox"
                      checked={formData.isImagesLocked}
                      onChange={() => handleLockToggle("isImagesLocked")}
                      className="rounded text-orange-600 focus:ring-orange-500"
                    />
                    <span className="font-semibold text-slate-700">Khóa Ảnh Media</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-orange-300">
                    <input
                      type="checkbox"
                      checked={formData.isPriceAutoSync}
                      onChange={() => handleLockToggle("isPriceAutoSync")}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-700">Tự Động Sync Giá</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-orange-300">
                    <input
                      type="checkbox"
                      checked={formData.isStockAutoSync}
                      onChange={() => handleLockToggle("isStockAutoSync")}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-700">Tự Động Sync Kho</span>
                  </label>
                </div>
              </div>

              {/* Tiêu đề Sản Phẩm theo ngôn ngữ chọn */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    {editLang === "VI" ? (
                      <>
                        <span>🇻🇳</span> Tiêu Đề Sản Phẩm Tiếng Việt (Web & Sàn)
                      </>
                    ) : (
                      <>
                        <span>🇬🇧</span> English Product Title (Global / Cross-border)
                      </>
                    )}
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {editLang === "VI"
                      ? `${formData.titleVI?.length || 0} ký tự`
                      : `${formData.titleEN?.length || 0} ký tự`}
                  </span>
                </div>

                {editLang === "VI" ? (
                  <input
                    type="text"
                    value={formData.titleVI}
                    onChange={(e) => handleFieldChange("titleVI", e.target.value)}
                    className="w-full text-xs font-semibold px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                ) : (
                  <input
                    type="text"
                    value={formData.titleEN || ""}
                    onChange={(e) => handleFieldChange("titleEN", e.target.value)}
                    placeholder="Enter English product title..."
                    className="w-full text-xs font-semibold px-3.5 py-2.5 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}

                {/* Các biến thể tiêu đề AI */}
                {editLang === "VI" && formData.titleVariants && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                    <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-orange-500" />
                      Gợi ý tiêu đề AI Tiếng Việt (Nhấp để chọn nhanh):
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleFieldChange("titleVI", formData.titleVariants!.seo)}
                        className="px-2.5 py-1 bg-white hover:bg-orange-50 border border-slate-200 rounded text-slate-700 text-left text-[11px]"
                      >
                        <span className="font-bold text-orange-600">SEO:</span> {formData.titleVariants.seo}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFieldChange("titleVI", formData.titleVariants!.clean)}
                        className="px-2.5 py-1 bg-white hover:bg-orange-50 border border-slate-200 rounded text-slate-700 text-left text-[11px]"
                      >
                        <span className="font-bold text-blue-600">Tinh gọn:</span> {formData.titleVariants.clean}
                      </button>
                    </div>
                  </div>
                )}

                {editLang === "EN" && formData.titleVariantsEN && (
                  <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-200 space-y-2">
                    <div className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-blue-600" />
                      AI English Title Suggestions (Click to apply):
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleFieldChange("titleEN", formData.titleVariantsEN!.seo)}
                        className="px-2.5 py-1 bg-white hover:bg-blue-100 border border-blue-200 rounded text-slate-700 text-left text-[11px]"
                      >
                        <span className="font-bold text-blue-600">SEO:</span> {formData.titleVariantsEN.seo}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFieldChange("titleEN", formData.titleVariantsEN!.clean)}
                        className="px-2.5 py-1 bg-white hover:bg-blue-100 border border-blue-200 rounded text-slate-700 text-left text-[11px]"
                      >
                        <span className="font-bold text-emerald-600">Clean:</span> {formData.titleVariantsEN.clean}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Đối chiếu Tiêu đề gốc 1688 */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <span className="text-[11px] font-bold text-slate-500">Tiêu đề gốc tiếng Trung trên 1688:</span>
                <p className="font-mono text-slate-700">{formData.titleVariants?.original || "N/A"}</p>
                <div className="text-[11px] text-slate-500 pt-1">
                  Nhà cung cấp: <strong className="text-slate-800">{formData.supplierName}</strong>
                </div>
              </div>

              {/* Ngành hàng & Mô tả ngắn */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ngành Hàng / Danh Mục
                  </label>
                  <input
                    type="text"
                    value={formData.categoryName}
                    onChange={(e) => handleFieldChange("categoryName", e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {editLang === "VI" ? "Mô Tả Ngắn (Highlight VI)" : "Short Description (Highlight EN)"}
                  </label>
                  {editLang === "VI" ? (
                    <input
                      type="text"
                      value={formData.shortDescVI || ""}
                      onChange={(e) => handleFieldChange("shortDescVI", e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData.shortDescEN || ""}
                      onChange={(e) => handleFieldChange("shortDescEN", e.target.value)}
                      placeholder="Short product highlights in English..."
                      className="w-full text-xs px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              </div>

              {/* Mô tả chi tiết HTML */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {editLang === "VI"
                    ? "Mô Tả Chi Tiết Sản Phẩm (HTML Tiếng Việt)"
                    : "Detailed Product Description (HTML English)"}
                </label>
                {editLang === "VI" ? (
                  <textarea
                    rows={6}
                    value={formData.fullDescVI || ""}
                    onChange={(e) => handleFieldChange("fullDescVI", e.target.value)}
                    className="w-full text-xs font-mono p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  ></textarea>
                ) : (
                  <textarea
                    rows={6}
                    value={formData.fullDescEN || ""}
                    onChange={(e) => handleFieldChange("fullDescEN", e.target.value)}
                    placeholder="<p>Full HTML description in English...</p>"
                    className="w-full text-xs font-mono p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  ></textarea>
                )}
              </div>

              {/* BẢNG GIÁ SỈ BẬC THANG 1688 */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-bold text-slate-900">
                      Bảng Giá Sỉ Bậc Thang 1688 (Wholesale Price Tiers)
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Tự động tính toán từ thang giá sỉ 1688 sang VNĐ và USD
                  </span>
                </div>

                {formData.priceTiers && formData.priceTiers.length > 0 ? (
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 border-b border-slate-200 font-semibold text-slate-600">
                        <tr>
                          <th className="p-2.5">Số Lượng Mua</th>
                          <th className="p-2.5">Giá Gốc 1688 (CNY)</th>
                          <th className="p-2.5">Giá Quy Đổi (VNĐ)</th>
                          <th className="p-2.5">Giá Ước Tính (USD)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {formData.priceTiers.map((tier, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold text-slate-800">
                              ≥ {tier.minQuantity} sản phẩm
                            </td>
                            <td className="p-2.5 font-mono text-red-600 font-bold">
                              ¥{tier.priceCNY.toFixed(2)}
                            </td>
                            <td className="p-2.5 font-mono text-emerald-700 font-extrabold">
                              {tier.priceVND.toLocaleString("vi-VN")} đ
                            </td>
                            <td className="p-2.5 font-mono text-blue-700 font-bold">
                              ${tier.priceUSD ? tier.priceUSD.toFixed(2) : (tier.priceCNY * 0.14).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3 bg-white rounded-lg border border-dashed border-slate-300 text-center text-slate-400 text-xs">
                    Sản phẩm có 1 mức giá cố định (hoặc chưa phát hiện thang giá sỉ bậc thang).
                  </div>
                )}
              </div>

              {/* THÔNG SỐ KỸ THUẬT CHI TIẾT */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-bold text-slate-900">
                      Thông Số Kỹ Thuật Chi Tiết (1688 Attributes & Specs)
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {editLang === "VI" ? "Dịch tự động tiếng Việt & đối chiếu tiếng Trung gốc" : "Translated into English & original Chinese"}
                  </span>
                </div>

                {formData.attributes && formData.attributes.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {formData.attributes.map((attr, idx) => (
                      <div key={idx} className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-bold text-slate-700 block truncate">
                            {editLang === "VI" ? (attr.keyVI || attr.keyCN) : (attr.keyEN || attr.keyVI || attr.keyCN)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {attr.keyCN}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-semibold text-slate-900 block">
                            {editLang === "VI" ? (attr.valueVI || attr.valueCN) : (attr.valueEN || attr.valueVI || attr.valueCN)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {attr.valueCN}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-white rounded-lg border border-dashed border-slate-300 text-center text-slate-400 text-xs">
                    Không có thông số kỹ thuật bổ sung từ nhà cung cấp 1688.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MA TRẬN SKU & BIẾN THỂ */}
          {activeTab === "variants" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Tùy chỉnh giá bán, tồn kho và chọn lọc các biến thể cho phép bán trên website ({editLang === "VI" ? "Tiếng Việt" : "English"}).
                </p>
                <span className="text-xs font-bold text-orange-600">
                  {variants.filter(v => v.selectedForSale).length}/{variants.length} phân loại được kích hoạt bán
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <tr>
                      <th className="p-3 w-12 text-center">Bán</th>
                      <th className="p-3">Phân Loại ({editLang === "VI" ? "Màu / Size" : "Color / Size"})</th>
                      <th className="p-3">Giá Vốn VNĐ</th>
                      <th className="p-3">Giá Bán Web VNĐ</th>
                      <th className="p-3">Margin %</th>
                      <th className="p-3">Tồn Kho</th>
                      <th className="p-3 text-center">Nguồn 1688</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {variants.map((v, idx) => {
                      const margin = v.sellingPriceVND > 0
                        ? Math.round(((v.sellingPriceVND - v.costPriceVND) / v.sellingPriceVND) * 100)
                        : 0;

                      const displayColor = editLang === "VI" ? (v.colorName || "Mặc định") : (v.colorNameEN || v.colorName || "Default");
                      const displaySize = editLang === "VI" ? (v.sizeName || "Freesize") : (v.sizeNameEN || v.sizeName || "Freesize");

                      return (
                        <tr key={v.sourceSkuId} className={`hover:bg-slate-50 ${!v.selectedForSale ? "opacity-50 bg-slate-50/60" : ""}`}>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={v.selectedForSale}
                              onChange={() => handleToggleVariantSale(idx)}
                              className="rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                            />
                          </td>

                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {v.imageUrl && (
                                <img
                                  src={v.imageUrl}
                                  alt=""
                                  className="w-8 h-8 rounded object-cover border border-slate-200 shrink-0"
                                />
                              )}
                              <div>
                                <div className="font-bold text-slate-800">{displayColor}</div>
                                <div className="text-[11px] text-slate-500">{displaySize}</div>
                              </div>
                            </div>
                          </td>

                          <td className="p-3 font-mono font-semibold text-slate-600">
                            {v.costPriceVND.toLocaleString("vi-VN")}đ
                          </td>

                          <td className="p-3">
                            <input
                              type="number"
                              step="1000"
                              value={v.sellingPriceVND}
                              onChange={(e) => handleVariantChange(idx, "sellingPriceVND", parseInt(e.target.value) || 0)}
                              className="w-28 text-xs font-bold text-slate-900 px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-orange-500"
                            />
                          </td>

                          <td className="p-3">
                            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${margin >= 35 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                              {margin}%
                            </span>
                          </td>

                          <td className="p-3">
                            <input
                              type="number"
                              value={v.stockQuantity}
                              onChange={(e) => handleVariantChange(idx, "stockQuantity", parseInt(e.target.value) || 0)}
                              className="w-20 text-xs px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-orange-500"
                            />
                          </td>

                          <td className="p-3 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.sourceAvailable ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                              {v.sourceAvailable ? "Còn hàng" : "Hết hàng"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: MEDIA & VIDEO */}
          {activeTab === "media" && (
            <div className="space-y-6">
              {/* 1. Video Sản Phẩm 1688 */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 shadow-lg border border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        Video Sản Phẩm 1688
                        {formData.videoUrl ? (
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            ✓ HD Cloud Video (.mp4)
                          </span>
                        ) : (
                          <span className="bg-slate-700 text-slate-300 text-[10px] px-2 py-0.5 rounded-full">
                            Chưa có video
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Xem trực tiếp video 1688, sao chép liên kết nhúng hoặc tải file mp4 lưu trữ.
                      </p>
                    </div>
                  </div>
                </div>

                {formData.videoUrl ? (
                  <div className="space-y-3">
                    <div className="relative rounded-xl overflow-hidden bg-black flex items-center justify-center max-h-80 border border-slate-800">
                      <video
                        src={formData.videoUrl}
                        poster={formData.videoPosterUrl || formData.primaryImage}
                        controls
                        playsInline
                        className="w-full max-h-80 object-contain rounded-xl"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        <a
                          href={formData.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Mở Tab Mới
                        </a>
                        <a
                          href={formData.videoUrl}
                          download={`video-${formData.skuCode}.mp4`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Tải Video MP4
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            if (formData.videoUrl) {
                              navigator.clipboard.writeText(formData.videoUrl);
                              alert("Đã sao chép link video vào clipboard!");
                            }
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Sao Chép Link
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Bạn có muốn gỡ video khỏi sản phẩm này?")) {
                            handleFieldChange("videoUrl", null);
                            handleFieldChange("videoPosterUrl", null);
                          }
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
                      >
                        Gỡ bỏ video
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-800/60 rounded-xl border border-dashed border-slate-700 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                      Sản phẩm này chưa có video hoặc 1688 không nhúng video. Bạn có thể dán link video mp4 thủ công:
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={customVideoInput}
                        onChange={(e) => setCustomVideoInput(e.target.value)}
                        placeholder="https://cloud.video.taobao.com/...mp4"
                        className="flex-1 text-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customVideoInput.trim()) {
                            handleFieldChange("videoUrl", customVideoInput.trim());
                            setCustomVideoInput("");
                          }
                        }}
                        className="px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        Gắn Video
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Bộ Sưu Tập Ảnh Sản Phẩm */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900">
                    Ảnh Đại Diện & Album Ảnh Trưng Bày ({formData.galleryImages.length + 1} ảnh)
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Bấm vào ảnh gallery để chọn làm ảnh đại diện chính
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  <div className="relative rounded-xl border-2 border-orange-500 overflow-hidden group aspect-square">
                    <img
                      src={formData.primaryImage}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-1.5 left-1.5 bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                      Ảnh Chính
                    </span>
                  </div>

                  {formData.galleryImages.map((img, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        const newGallery = formData.galleryImages.filter((_, idx) => idx !== i);
                        newGallery.push(formData.primaryImage);
                        setFormData(prev => ({
                          ...prev,
                          primaryImage: img,
                          galleryImages: newGallery
                        }));
                      }}
                      className="relative rounded-xl border border-slate-200 overflow-hidden group aspect-square hover:border-orange-400 cursor-pointer transition-all"
                    >
                      <img
                        src={img}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold text-center p-1">
                        Đặt làm ảnh chính
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Ảnh Chi Tiết Bán Hàng Dài */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      Ảnh Chi Tiết Bán Hàng (1688 Long-strip Detail Images: {formData.detailImages?.length || 0} ảnh)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Ảnh chi tiết dạng dài trong nội dung 1688 (Infographic thông số, Bảng size, Cận cảnh chất liệu vải/da).
                    </p>
                  </div>
                </div>

                {formData.detailImages && formData.detailImages.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {formData.detailImages.map((dImg, idx) => (
                      <a
                        key={idx}
                        href={dImg}
                        target="_blank"
                        rel="noreferrer"
                        className="relative group rounded-lg border border-slate-200 overflow-hidden bg-slate-100 aspect-3/4 hover:border-orange-500 transition-all block"
                        title="Bấm để mở ảnh gốc full size"
                      >
                        <img
                          src={dImg}
                          alt={`Detail ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                          <ExternalLink className="w-4 h-4" />
                        </div>
                        <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1 rounded">
                          #{idx + 1}
                        </span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-slate-400 text-xs">
                    Không có ảnh chi tiết dài hoặc sản phẩm này sử dụng mô tả dạng văn bản thuần.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: TỐI ƯU SEO & SERP */}
          {activeTab === "seo" && (
            <div className="space-y-6">
              {/* Header Tối Ưu SEO & Nút Tự Động Hóa */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-emerald-50/80 border border-emerald-200 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg font-black shrink-0 shadow-xs">
                    {seoAudit.score}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      Điểm Chuẩn SEO E-Commerce Google
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-200/80 text-emerald-800 rounded-full font-extrabold">
                        {seoAudit.score >= 85 ? "Rất Tốt (Top 1% SERP)" : "Cần Tối Ưu Thêm"}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Tối ưu hoá từ khóa cho Tiêu đề, Thẻ ALT hình ảnh, URL Slug, Meta tags và Rich Snippets schema.org.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoOptimizeSEO}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                    title="Tự động áp dụng từ khóa, Meta description và thẻ ALT ảnh"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Tối Ưu Toàn Diện
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowJsonLdModal(true)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Code className="w-3.5 h-3.5 text-blue-600" />
                    Mã Schema JSON-LD
                  </button>
                </div>
              </div>

              {/* 1. GOOGLE SERP SEARCH PREVIEW */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-blue-600" />
                    <h4 className="text-xs font-bold text-slate-900">
                      Xem Trước Kết Quả Google Tìm Kiếm (SERP Snippet Preview)
                    </h4>
                  </div>
                  <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setSerpDevice("desktop")}
                      className={`px-2 py-1 text-[11px] font-bold rounded flex items-center gap-1 ${
                        serpDevice === "desktop" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-500"
                      }`}
                    >
                      <Monitor className="w-3 h-3" /> Desktop
                    </button>
                    <button
                      type="button"
                      onClick={() => setSerpDevice("mobile")}
                      className={`px-2 py-1 text-[11px] font-bold rounded flex items-center gap-1 ${
                        serpDevice === "mobile" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-500"
                      }`}
                    >
                      <Smartphone className="w-3 h-3" /> Mobile
                    </button>
                  </div>
                </div>

                {/* Khung giả lập Google SERP */}
                <div className={`p-4 bg-slate-50/70 border border-slate-200 rounded-xl ${serpDevice === "mobile" ? "max-w-md mx-auto" : ""}`}>
                  <div className="space-y-1.5">
                    {/* URL Breadcrumb */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                      <div className="w-4 h-4 rounded-full bg-orange-600 text-white flex items-center justify-center text-[9px] font-bold">
                        16
                      </div>
                      <span className="font-semibold text-slate-800">1688 Hub Store</span>
                      <span className="text-slate-400">›</span>
                      <span className="text-slate-500 truncate">products › {formData.slug || "san-pham"}</span>
                    </div>

                    {/* Google Blue Title */}
                    <h5 className="text-[17px] leading-snug font-medium text-[#1a0dab] hover:underline cursor-pointer">
                      {formData.metaTitle || formData.titleVI}
                    </h5>

                    {/* Rich Snippets Stars & Price */}
                    <div className="flex items-center gap-2 text-xs text-amber-600">
                      <div className="flex items-center text-amber-500 font-bold">
                        ★★★★★ <span className="ml-1 text-slate-700 font-semibold">4.9 (128 đánh giá)</span>
                      </div>
                      <span className="text-slate-300">·</span>
                      <span className="font-extrabold text-emerald-700">
                        {formData.minPriceVND.toLocaleString("vi-VN")} đ
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500 font-medium">Còn hàng (InStock)</span>
                    </div>

                    {/* Meta Description */}
                    <p className="text-xs text-[#4d5156] leading-relaxed pt-0.5 line-clamp-2">
                      {formData.metaDescription || "Mô tả sản phẩm hiển thị trên công cụ tìm kiếm Google..."}
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. CẤU HÌNH META TAGS & URL SLUG */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-orange-600" />
                    Cấu Hình Thẻ Meta & Đường Dẫn Tối Ưu Hóa
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Trực tiếp quyết định tiêu đề và mô tả xuất hiện trên Google
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Meta Title */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        SEO Meta Title (Tiêu Đề SERP)
                      </label>
                      <span className={`text-[11px] font-bold ${
                        (formData.metaTitle?.length || 0) >= 40 && (formData.metaTitle?.length || 0) <= 65
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }`}>
                        {formData.metaTitle?.length || 0} / 65 ký tự
                      </span>
                    </div>
                    <input
                      type="text"
                      value={formData.metaTitle || ""}
                      onChange={(e) => handleFieldChange("metaTitle", e.target.value)}
                      placeholder="Tiêu đề chuẩn SEO xuất hiện trên Google..."
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Meta Description */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        SEO Meta Description (Đoạn Giới Thiệu SERP)
                      </label>
                      <span className={`text-[11px] font-bold ${
                        (formData.metaDescription?.length || 0) >= 115 && (formData.metaDescription?.length || 0) <= 160
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }`}>
                        {formData.metaDescription?.length || 0} / 160 ký tự
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      value={formData.metaDescription || ""}
                      onChange={(e) => handleFieldChange("metaDescription", e.target.value)}
                      placeholder="Viết đoạn mô tả súc tích, kích thích click kèm ưu đãi mua hàng..."
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    ></textarea>
                  </div>

                  {/* URL Slug */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        URL Slug (Đường dẫn sản phẩm không dấu)
                      </label>
                      <button
                        type="button"
                        onClick={() => handleFieldChange("slug", generateSlug(formData.titleVI))}
                        className="text-[11px] text-emerald-600 hover:underline font-bold"
                      >
                        Tạo lại slug từ tiêu đề
                      </button>
                    </div>
                    <div className="flex items-center">
                      <span className="bg-slate-200 border border-r-0 border-slate-300 px-3 py-2 text-xs font-mono text-slate-600 rounded-l-lg">
                        /products/
                      </span>
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) => handleFieldChange("slug", generateSlug(e.target.value))}
                        className="flex-1 text-xs font-mono px-3 py-2 border border-slate-300 rounded-r-lg focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. BỘ TỪ KHÓA MỤC TIÊU (FOCUS KEYWORDS TAG CLOUD) */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-bold text-slate-900">
                      Từ Khóa Mục Tiêu & LSI Keywords ({formData.focusKeywords?.length || 0})
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Phục vụ thuật toán xếp hạng từ khóa tìm kiếm và gợi ý liên quan
                  </span>
                </div>

                {/* Danh sách Tags */}
                <div className="flex flex-wrap gap-2">
                  {(formData.focusKeywords || []).map((kw, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-full"
                    >
                      #{kw}
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(kw)}
                        className="text-emerald-600 hover:text-rose-600 font-bold ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                {/* Thêm từ khóa mới */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newKeywordInput}
                    onChange={(e) => setNewKeywordInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddKeyword())}
                    placeholder="Nhập từ khóa SEO mới (ví dụ: đầm xòe công sở, hàng thiết kế...)"
                    className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddKeyword}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm Từ Khóa
                  </button>
                </div>
              </div>

              {/* 4. QUẢN LÝ THẺ ALT HÌNH ẢNH (GOOGLE IMAGE SEARCH) */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      Tối Ưu Thẻ ALT Hình Ảnh (Google Image Search SEO)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Google sử dụng thẻ ALT để hiểu nội dung ảnh và hiển thị trên tab Google Hình Ảnh.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoGenerateAlts}
                    className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    Tự Động Điền ALT Toàn Bộ Ảnh
                  </button>
                </div>

                {/* Bảng ALT cho từng ảnh */}
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-72 overflow-y-auto bg-slate-50/50">
                  {(formData.imagesSEO || []).map((img, idx) => (
                    <div key={idx} className="p-2.5 flex items-center gap-3 hover:bg-white transition-colors">
                      <img
                        src={img.url}
                        alt=""
                        className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0 bg-white"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            img.type === "PRIMARY"
                              ? "bg-orange-100 text-orange-700"
                              : img.type === "DETAIL"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-slate-200 text-slate-700"
                          }`}>
                            {img.type === "PRIMARY" ? "Ảnh Chính" : img.type === "DETAIL" ? "Ảnh Chi Tiết" : "Gallery"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono truncate max-w-xs">
                            {img.url.split("/").pop()}
                          </span>
                        </div>
                        <input
                          type="text"
                          value={img.alt}
                          onChange={(e) => handleUpdateImageAlt(img.url, e.target.value)}
                          placeholder="Nhập thẻ ALT chứa từ khóa mô tả hình ảnh..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. CÂU HỎI THƯỜNG GẶP FAQ SCHEMA */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-purple-600" />
                    <h4 className="text-xs font-bold text-slate-900">
                      Khối Câu Hỏi Thường Gặp (FAQ Schema Markup)
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Xuất hiện dưới dạng accordion trực tiếp trên kết quả tìm kiếm Google
                  </span>
                </div>

                <div className="space-y-2">
                  {(formData.faqs || []).map((faq, i) => (
                    <div key={i} className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5">
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <span className="text-purple-600">Q{i + 1}:</span>
                        <input
                          type="text"
                          value={faq.question}
                          onChange={(e) => {
                            const nextFaqs = [...(formData.faqs || [])];
                            nextFaqs[i] = { ...nextFaqs[i], question: e.target.value };
                            handleFieldChange("faqs", nextFaqs);
                          }}
                          className="w-full text-xs font-semibold px-2 py-1 border border-slate-200 rounded focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                      <div className="text-xs text-slate-600 flex items-start gap-1.5">
                        <span className="text-slate-400 font-bold">A:</span>
                        <textarea
                          rows={2}
                          value={faq.answer}
                          onChange={(e) => {
                            const nextFaqs = [...(formData.faqs || [])];
                            nextFaqs[i] = { ...nextFaqs[i], answer: e.target.value };
                            handleFieldChange("faqs", nextFaqs);
                          }}
                          className="w-full text-xs px-2 py-1 border border-slate-200 rounded focus:ring-1 focus:ring-purple-500"
                        ></textarea>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. BẢNG CHECKLIST KIỂM ĐỊNH SEO AUDIT */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <ListChecks className="w-4 h-4 text-emerald-600" />
                    Bảng Tiêu Chí Đánh Giá Chuẩn SEO (SEO Audit Checklist)
                  </h4>
                  <span className="text-xs font-extrabold text-emerald-700">
                    Đạt {seoAudit.checks.filter(c => c.passed).length}/{seoAudit.checks.length} tiêu chuẩn
                  </span>
                </div>

                <div className="space-y-2">
                  {seoAudit.checks.map((chk) => (
                    <div
                      key={chk.id}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                        chk.passed
                          ? "bg-emerald-50/50 border-emerald-200 text-emerald-900"
                          : "bg-amber-50/50 border-amber-200 text-amber-900"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {chk.passed ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        )}
                        <div>
                          <span className="font-bold">{chk.title}</span>
                          <p className="text-[11px] text-slate-500 mt-0.5">{chk.tip}</p>
                        </div>
                      </div>
                      <span className="font-mono font-bold shrink-0 text-[11px]">
                        +{chk.scoreDelta}đ
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CHẤT LƯỢNG LISTING */}
          {activeTab === "quality" && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 bg-orange-50/60 border border-orange-200 p-4 rounded-xl">
                <div className="w-16 h-16 rounded-full bg-orange-500 text-white flex items-center justify-center text-xl font-black">
                  {formData.qualityScore}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Điểm Sẵn Sàng Bán Hàng (Quality Readiness Score)
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Đánh giá theo các tiêu chuẩn e-commerce và SEO để đảm bảo tỷ lệ chuyển đổi cao khi chạy quảng cáo hoặc bán trên sàn.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 text-xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="font-semibold text-slate-800">
                      Tiêu đề tối ưu hóa (Song ngữ VI/EN chuẩn SEO): {formData.titleVI?.length || 0} ký tự
                    </span>
                  </div>
                  <span className="font-bold text-emerald-600">+25 Điểm</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 text-xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="font-semibold text-slate-800">
                      Đầy đủ Media & Video: {formData.galleryImages.length + 1} ảnh album
                      {formData.videoUrl ? " + 🎬 Có Video MP4" : ""}
                    </span>
                  </div>
                  <span className="font-bold text-emerald-600">+20 Điểm</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 text-xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="font-semibold text-slate-800">
                      Ma trận biến thể SKU: {variants.filter(v => v.selectedForSale).length}/{variants.length} phân loại sẵn sàng bán
                    </span>
                  </div>
                  <span className="font-bold text-emerald-600">+25 Điểm</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 text-xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="font-semibold text-slate-800">
                      Biên lợi nhuận an toàn & Thang giá sỉ minh bạch
                    </span>
                  </div>
                  <span className="font-bold text-emerald-600">+20 Điểm</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 text-xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="font-semibold text-slate-800">
                      Tối ưu SEO Google: {formData.focusKeywords?.length || 0} từ khóa & {formData.imagesSEO?.length || 0} thẻ ALT
                    </span>
                  </div>
                  <span className="font-bold text-emerald-600">+10 Điểm</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: AI MARKETING COPYWRITER */}
          {activeTab === "copywriter" && (
            <div className="space-y-6">
              {/* Header Box */}
              <div className="bg-gradient-to-r from-pink-50 via-rose-50 to-amber-50 border border-pink-200/80 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-pink-500 text-white flex items-center justify-center shadow-sm shadow-pink-500/30">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Động Cơ Sinh Nội Dung Bán Hàng AI Copywriter
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Tự động viết bài quảng cáo, bài PR chuyển đổi cao theo các công thức kinh điển (AIDA, PAS, Storytelling, Social Ads)
                      </p>
                    </div>
                  </div>

                  {/* Language Selector */}
                  <div className="flex items-center bg-white border border-pink-200 rounded-lg p-1 shadow-xs">
                    <button
                      type="button"
                      onClick={() => setCopyLang("VI")}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                        copyLang === "VI"
                          ? "bg-pink-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      🇻🇳 Tiếng Việt
                    </button>
                    <button
                      type="button"
                      onClick={() => setCopyLang("EN")}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                        copyLang === "EN"
                          ? "bg-pink-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      🇬🇧 English (Global)
                    </button>
                  </div>
                </div>

                {/* Formula Selection Cards */}
                <div className="grid grid-cols-4 gap-3 mt-4">
                  {[
                    {
                      id: "AIDA",
                      name: "Công Thức AIDA",
                      tag: "Attention - Interest - Desire - Action",
                      desc: "Gây chú ý, khơi gợi tò mò, khao khát sở hữu và chốt đơn ngay."
                    },
                    {
                      id: "PAS",
                      name: "Công Thức PAS",
                      tag: "Problem - Agitate - Solution",
                      desc: "Xoáy sâu nỗi đau mua hàng kém chất lượng và trao giải pháp triệt để."
                    },
                    {
                      id: "STORYTELLING",
                      name: "Kể Chuyện Cảm Xúc",
                      tag: "Brand Story & Heritage",
                      desc: "Truyền tải câu chuyện xưởng may, nguồn gốc sợi vải và sự nâng niu."
                    },
                    {
                      id: "SOCIAL_ADS",
                      name: "Quảng Cáo Viral",
                      tag: "TikTok / FB Ads Hook",
                      desc: "Bắt trend ngắn gọn, từ khóa giật tít, thôi thúc đặt hàng nhận freeship."
                    }
                  ].map(formula => (
                    <button
                      key={formula.id}
                      type="button"
                      onClick={() => setCopyStyle(formula.id as AICopywritingStyle)}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        copyStyle === formula.id
                          ? "bg-white border-pink-500 ring-2 ring-pink-500/20 shadow-sm"
                          : "bg-white/60 border-slate-200 hover:border-pink-300 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${copyStyle === formula.id ? "text-pink-600" : "text-slate-800"}`}>
                          {formula.name}
                        </span>
                        {copyStyle === formula.id && <Check className="w-3.5 h-3.5 text-pink-600" />}
                      </div>
                      <span className="block text-[10px] font-semibold text-slate-500 mt-1 uppercase tracking-tight">
                        {formula.tag}
                      </span>
                      <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                        {formula.desc}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Generate Button */}
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const res = generateMarketingCopy(formData, copyStyle, copyLang);
                      setGeneratedCopy(res);
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-pink-500/30 flex items-center gap-2 transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    Sinh Bài Viết Bán Hàng Ngay
                  </button>
                </div>
              </div>

              {/* Generated Output Area */}
              {generatedCopy && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom duration-200">
                  {/* Headline Box */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-pink-500" />
                        Tiêu Đề Quảng Cáo / Headline:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedCopy.headline);
                          setCopiedField("headline");
                          setTimeout(() => setCopiedField(null), 2000);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-semibold flex items-center gap-1"
                      >
                        {copiedField === "headline" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        {copiedField === "headline" ? "Đã chép" : "Sao chép"}
                      </button>
                    </div>
                    <p className="text-sm font-extrabold text-slate-900 font-sans">
                      {generatedCopy.headline}
                    </p>
                  </div>

                  {/* Body Text Box */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-pink-500" />
                        Nội Dung Bài Viết (Rich-HTML & Text):
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedCopy.bodyText);
                            setCopiedField("body");
                            setTimeout(() => setCopiedField(null), 2000);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-semibold flex items-center gap-1"
                        >
                          {copiedField === "body" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          {copiedField === "body" ? "Đã chép" : "Sao chép văn bản"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (copyLang === "VI") {
                              setFormData(prev => ({ ...prev, fullDescVI: generatedCopy.bodyHtml }));
                            } else {
                              setFormData(prev => ({ ...prev, fullDescEN: generatedCopy.bodyHtml }));
                            }
                            setCopiedField("applied");
                            setTimeout(() => setCopiedField(null), 2500);
                          }}
                          className="px-3 py-1 bg-pink-600 hover:bg-pink-700 text-white rounded-md text-[11px] font-bold flex items-center gap-1 shadow-xs"
                        >
                          {copiedField === "applied" ? <Check className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                          {copiedField === "applied" ? "Đã áp dụng!" : "Áp dụng vào Mô Tả Web"}
                        </button>
                      </div>
                    </div>

                    <div
                      className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs leading-relaxed text-slate-800 font-sans prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: generatedCopy.bodyHtml }}
                    />
                  </div>

                  {/* Call to Action Box */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        Lời Kêu Gọi Hành Động (CTA Button):
                      </span>
                      <p className="text-xs font-bold text-orange-600 mt-1">
                        "{generatedCopy.callToAction}"
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedCopy.callToAction);
                        setCopiedField("cta");
                        setTimeout(() => setCopiedField(null), 2000);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold flex items-center gap-1"
                    >
                      {copiedField === "cta" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      Sao chép CTA
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal xem mã Schema JSON-LD */}
      {showJsonLdModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-60 p-4">
          <div className="bg-slate-950 text-slate-100 rounded-2xl max-w-2xl w-full border border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">
                  Mã Nguồn Cấu Trúc Schema.org (Product JSON-LD)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowJsonLdModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Nhúng đoạn mã này vào thẻ <code className="text-blue-300">&lt;head&gt;</code> hoặc cấu hình trên website để Google hiển thị Rich Snippets (Giá bán, đánh giá 5 sao, tình trạng kho).
            </p>

            <div className="relative">
              <pre className="text-xs font-mono bg-slate-900 p-4 rounded-xl border border-slate-800 text-emerald-400 max-h-80 overflow-y-auto">
                {jsonLdCode}
              </pre>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(jsonLdCode);
                  setCopiedJsonLd(true);
                  setTimeout(() => setCopiedJsonLd(false), 2000);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                {copiedJsonLd ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedJsonLd ? "Đã Sao Chép!" : "Sao Chép Mã JSON-LD"}
              </button>
              <button
                type="button"
                onClick={() => setShowJsonLdModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
