import React, { useState, useMemo } from "react";
import DOMPurify from "dompurify";
import { WebProduct, WebProductVariant, ProductImageSEO, ProductFAQItem, AICopywritingStyle, VisualSourcingMatch, ProductTemplate } from "@hub1688/shared-types";
import { AdminApi, type AIGeneratedProductCopy } from "../services/api";
import { useAccessibleDialog } from "../hooks/useAccessibleDialog";
import { getVariantVisual } from "../storefront/VariantMockupPreview";
import { PersonalizationBuilder } from "./PersonalizationBuilder";
import {
  generateSlug,
  extractSEOKeywords,
  generateSEOMeta,
  generateImageAltTags,
  generateProductFAQs,
  generateProductJsonLd,
  auditListingSEO,
  evaluateProductQuality
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
  FileText,
  Factory,
  RefreshCw,
  LayoutTemplate,
  CloudDownload,
  Settings2
} from "lucide-react";

interface ProductDetailModalProps {
  product: WebProduct;
  onClose: () => void;
  onSave: (updatedProduct: WebProduct) => Promise<WebProduct | void> | WebProduct | void;
  onPublish?: (updatedProduct: WebProduct) => Promise<WebProduct>;
  onOpenStorefront?: (product: WebProduct) => void;
  onOpenConnectors?: (product: WebProduct) => void;
  onOpenBannerStudio?: (product: WebProduct, initialImage?: string, mode?: "TRANSLATE" | "FRAME") => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onSave,
  onPublish,
  onOpenStorefront,
  onOpenConnectors,
  onOpenBannerStudio
}) => {
  const dialogRef = useAccessibleDialog<HTMLDivElement>(true, onClose);

  const [activeTab, setActiveTab] = useState<"content" | "variants" | "media" | "personalization" | "seo" | "quality" | "copywriter" | "sourcing">("content");
  const [copyStyle, setCopyStyle] = useState<AICopywritingStyle>("AIDA");
  const [copyLang, setCopyLang] = useState<"VI" | "EN">(product.displayLanguage || "VI");
  const [generatedCopy, setGeneratedCopy] = useState<AIGeneratedProductCopy | null>(null);
  const [seoFocusKeyword, setSeoFocusKeyword] = useState(product.focusKeywords?.[0] || extractSEOKeywords(product.titleVI, product.categoryName, "VI")[0] || product.titleVI);
  const [seoTone, setSeoTone] = useState<"TRUSTWORTHY" | "CONVERSION" | "PREMIUM" | "FRIENDLY">("TRUSTWORTHY");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiGenerationError, setAiGenerationError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [editLang, setEditLang] = useState<"VI" | "EN">(product.displayLanguage || "VI");
  const [visualMatches, setVisualMatches] = useState<VisualSourcingMatch[] | null>(null);
  const [isLoadingVisual, setIsLoadingVisual] = useState(false);
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
  const [isPublishing, setIsPublishing] = useState(false);
  const [variantSearch, setVariantSearch] = useState("");
  const [customVideoInput, setCustomVideoInput] = useState("");
  const [serpDevice, setSerpDevice] = useState<"desktop" | "mobile">("desktop");
  const [newKeywordInput, setNewKeywordInput] = useState("");
  const [showJsonLdModal, setShowJsonLdModal] = useState(false);
  const [copiedJsonLd, setCopiedJsonLd] = useState(false);

  // Product Template State & Actions
  const [showApplyTemplateModal, setShowApplyTemplateModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const jsonDialogRef = useAccessibleDialog<HTMLDivElement>(showJsonLdModal, () => setShowJsonLdModal(false));
  const applyTemplateDialogRef = useAccessibleDialog<HTMLDivElement>(showApplyTemplateModal, () => setShowApplyTemplateModal(false));
  const saveTemplateDialogRef = useAccessibleDialog<HTMLDivElement>(showSaveTemplateModal, () => setShowSaveTemplateModal(false));
  const [availableTemplates, setAvailableTemplates] = useState<ProductTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [applyContentOption, setApplyContentOption] = useState(true);
  const [applyVariationOption, setApplyVariationOption] = useState(true);
  const [templateSaveName, setTemplateSaveName] = useState("");
  const [templateSaveCategory, setTemplateSaveCategory] = useState(product.categoryName || "Quà Tặng & In Ấn (POD)");
  const [templateToast, setTemplateToast] = useState<string | null>(null);

  const handleOpenApplyTemplate = async () => {
    try {
      const res = await AdminApi.getTemplates();
      if (res.success && res.templates && res.templates.length > 0) {
        setAvailableTemplates(res.templates);
        const defaultTpl = res.templates.find(t => t.isDefault) || res.templates[0];
        setSelectedTemplateId(defaultTpl.id);
      }
    } catch (err) {
      console.error("Lỗi nạp templates:", err);
    }
    setShowApplyTemplateModal(true);
  };

  const handleApplySelectedTemplate = () => {
    const tpl = availableTemplates.find(t => t.id === selectedTemplateId);
    if (!tpl) return;

    setFormData(prev => {
      const next = { ...prev };
      if (applyContentOption && tpl.content) {
        let baseTitle = next.titleVI || "";
        const cleanTitle = baseTitle.replace(/^\[[^\]]+\]\s*/, "").replace(/\s*-[^-]+$/, "").trim();
        const prefix = tpl.content.titlePrefix ? `${tpl.content.titlePrefix} ` : "";
        const suffix = tpl.content.titleSuffix ? ` ${tpl.content.titleSuffix}` : "";
        next.titleVI = `${prefix}${cleanTitle || baseTitle}${suffix}`.trim();

        if (tpl.content.shortDescVI) next.shortDescVI = tpl.content.shortDescVI;
        if (tpl.content.shortDescEN) next.shortDescEN = tpl.content.shortDescEN;
        if (tpl.content.fullDescVI) next.fullDescVI = tpl.content.fullDescVI;
        if (tpl.content.fullDescEN) next.fullDescEN = tpl.content.fullDescEN;

        if (tpl.content.attributes && tpl.content.attributes.length > 0) {
          const newAttrs = [...(next.attributes || [])];
          for (const pa of tpl.content.attributes) {
            const existingIdx = newAttrs.findIndex(a => a.keyVI === pa.key || a.keyCN === pa.key);
            const isUnverifiedPlaceholder = /\[Cần xác minh/i.test(pa.value);
            if (existingIdx !== -1) {
              // Placeholder từ template/AI không được ghi đè dữ liệu sản phẩm đã xác minh.
              if (!isUnverifiedPlaceholder) {
                newAttrs[existingIdx] = { ...newAttrs[existingIdx], valueVI: pa.value };
              }
            } else {
              newAttrs.push({ keyCN: pa.key, valueCN: pa.value, keyVI: pa.key, valueVI: pa.value });
            }
          }
          next.attributes = newAttrs;
        }

        if (tpl.content.warrantyPolicy) next.warrantyPolicy = tpl.content.warrantyPolicy;
        if (tpl.content.shippingPolicy) next.shippingPolicy = tpl.content.shippingPolicy;
        if (tpl.content.focusKeywords && tpl.content.focusKeywords.length > 0) {
          next.focusKeywords = Array.from(new Set([...(next.focusKeywords || []), ...tpl.content.focusKeywords]));
        }
      }
      return next;
    });

    if (applyVariationOption && tpl.variation?.predefinedVariants && tpl.variation.predefinedVariants.length > 0) {
      const baseCost = variants[0]?.costPriceVND ?? 0;
      const baseSell = variants[0]?.sellingPriceVND ?? 0;
      const primaryImg = formData.primaryImage;

      const newVariants: WebProductVariant[] = tpl.variation.predefinedVariants.map((pv, idx) => {
        const priceAdj = pv.priceAdjustmentVND || 0;
        // Template chỉ mô tả cấu trúc biến thể; tồn kho phải đến từ nguồn đã xác minh.
        const stockQuantity = 0;
        return {
          sourceSkuId: `${formData.sourceProductId || "VAR"}-${idx + 1}`,
          sizeName: pv.option1,
          colorName: pv.option2,
          specDetails: {
            [tpl.variation.options[0]?.name || "Option 1"]: pv.option1 || "",
            ...(pv.option2 ? { [tpl.variation.options[1]?.name || "Option 2"]: pv.option2 } : {})
          },
          costPriceVND: baseCost,
          sellingPriceVND: baseSell + priceAdj,
          stockQuantity,
          imageUrl: primaryImg,
          sourceAvailable: stockQuantity > 0,
          selectedForSale: true
        };
      });
      setVariants(newVariants);
    }

    setShowApplyTemplateModal(false);
    setTemplateToast(`Đã áp dụng template "${tpl.name}" thành công!`);
    setTimeout(() => setTemplateToast(null), 3500);
  };

  const handleSaveAsTemplate = async () => {
    if (!templateSaveName.trim()) return;
    try {
      const newTpl: Partial<ProductTemplate> = {
        name: templateSaveName.trim(),
        categoryName: templateSaveCategory,
        description: `Template lưu từ sản phẩm ${formData.titleVI.substring(0, 40)}...`,
        content: {
          titlePrefix: formData.titleVI.match(/^\[([^\]]+)\]/)?.[0] || "",
          shortDescVI: formData.shortDescVI,
          shortDescEN: formData.shortDescEN,
          fullDescVI: formData.fullDescVI,
          fullDescEN: formData.fullDescEN,
          attributes: formData.attributes?.map(a => ({ key: a.keyVI || a.keyCN, value: a.valueVI || a.valueCN })) || [],
          warrantyPolicy: formData.warrantyPolicy,
          shippingPolicy: formData.shippingPolicy,
          focusKeywords: formData.focusKeywords
        },
        variation: {
          options: [
            {
              name: "Phân loại",
              values: Array.from(new Set(variants.map(v => v.sizeName || v.colorName || "Mặc định").filter(Boolean)))
            }
          ],
          defaultStock: 0,
          predefinedVariants: variants.map(v => ({
            name: `${v.sizeName || ""} ${v.colorName || ""}`.trim() || "Tiêu Chuẩn",
            option1: v.sizeName,
            option2: v.colorName,
            priceAdjustmentVND: Math.max(0, v.sellingPriceVND - (variants[0]?.sellingPriceVND || 0)),
            stock: 0
          }))
        }
      };
      await AdminApi.createTemplate(newTpl);
      setShowSaveTemplateModal(false);
      setTemplateToast(`Đã lưu thành Template mới "${templateSaveName}"!`);
      setTimeout(() => setTemplateToast(null), 3500);
    } catch (err: any) {
      alert("Lỗi lưu template: " + err.message);
    }
  };

  // Lưu trữ ảnh vĩnh viễn (Media Mirror CDN)
  const [isMirroring, setIsMirroring] = useState(false);

  const handleMirrorImages = async () => {
    if (!formData.id) return;
    setIsMirroring(true);
    try {
      const res = await AdminApi.mirrorProductImages(formData.id);
      if (res.success && res.product) {
        setFormData(res.product);
        setTemplateToast(res.message || "Đã lưu trữ vĩnh viễn toàn bộ ảnh lên CDN!");
        setTimeout(() => setTemplateToast(null), 3500);
      }
    } catch (err: any) {
      alert("Lỗi lưu trữ ảnh: " + err.message);
    } finally {
      setIsMirroring(false);
    }
  };

  // Tính toán điểm SEO thời gian thực
  const seoAudit = useMemo(() => {
    return auditListingSEO(formData);
  }, [formData]);

  const qualityAudit = useMemo(() => evaluateProductQuality({ ...formData, variants }), [formData, variants]);

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

  const handleVariantMockupModeChange = (index: number, mode: "AUTO" | "DESIGN" | "COLOR" | "PLAIN") => {
    const sourceSkuId = variants[index].sourceSkuId;
    setFormData(prev => {
      const variantMockupVisuals = { ...(prev.seo?.variantMockupVisuals || {}) };
      if (mode === "AUTO") delete variantMockupVisuals[sourceSkuId];
      else variantMockupVisuals[sourceSkuId] = { ...variantMockupVisuals[sourceSkuId], type: mode };
      return { ...prev, seo: { ...(prev.seo || {}), variantMockupVisuals } };
    });
  };

  const handleVariantMockupColorChange = (index: number, colorHex: string) => {
    const sourceSkuId = variants[index].sourceSkuId;
    setFormData(prev => ({
      ...prev,
      seo: {
        ...(prev.seo || {}),
        variantMockupVisuals: {
          ...(prev.seo?.variantMockupVisuals || {}),
          [sourceSkuId]: { type: "COLOR", colorHex }
        }
      }
    }));
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

  // Tìm kiếm xưởng sản xuất gốc trên 1688 (Visual Sourcing)
  const handleLoadVisualSourcing = async () => {
    setIsLoadingVisual(true);
    try {
      const res = await AdminApi.getVisualSourcingMatches({
        productId: formData.id,
        imageUrl: formData.primaryImage,
        title: formData.titleVI,
        currentSellingPriceVND: formData.minPriceVND
      });
      if (res.success && res.matches) {
        setVisualMatches(res.matches);
      }
    } catch (err) {
      console.warn("Lỗi tìm kiếm nguồn xưởng 1688:", err);
    } finally {
      setIsLoadingVisual(false);
    }
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

  const buildUpdatedProduct = (status: WebProduct["status"] = formData.status): WebProduct => ({
      ...formData,
      status,
      qualityScore: qualityAudit.totalScore,
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
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = buildUpdatedProduct();
      const saved = await onSave(updated);
      if (saved) setFormData(saved);
      setTemplateToast("Đã lưu bản nháp và toàn bộ thay đổi sản phẩm.");
      setTimeout(() => setTemplateToast(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!onPublish) return;
    setIsPublishing(true);
    try {
      const published = await onPublish(buildUpdatedProduct("DRAFT"));
      setFormData(published);
      setTemplateToast("Đã đăng sản phẩm lên storefront. Khách hàng có thể xem ngay.");
      setTimeout(() => setTemplateToast(null), 3500);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleGenerateAISEO = async () => {
    if (!formData.id) return;
    const keyword = seoFocusKeyword.trim();
    if (!keyword) {
      setAiGenerationError("Hãy nhập từ khóa chính trước khi tạo nội dung.");
      return;
    }

    setIsGeneratingAI(true);
    setAiGenerationError(null);
    try {
      const secondaryKeywords = (formData.focusKeywords || []).filter(item => item.toLowerCase() !== keyword.toLowerCase());
      const response = await AdminApi.generateAICopy(formData.id, {
        style: copyStyle,
        language: copyLang,
        focusKeyword: keyword,
        secondaryKeywords,
        tone: seoTone
      });
      setGeneratedCopy(response.copy);
    } catch (error: any) {
      setAiGenerationError(error?.message || "Không thể tạo nội dung AI lúc này.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const applyAISEODraft = (scope: "title" | "description" | "meta" | "all") => {
    const seo = generatedCopy?.seo;
    if (!seo) return;
    setFormData(prev => {
      const next = { ...prev };
      if (scope === "title" || scope === "all") {
        if (copyLang === "VI") next.titleVI = seo.title;
        else next.titleEN = seo.title;
      }
      if (scope === "description" || scope === "all") {
        if (copyLang === "VI") {
          next.shortDescVI = seo.shortDescription;
          next.fullDescVI = seo.fullDescriptionHtml;
        } else {
          next.shortDescEN = seo.shortDescription;
          next.fullDescEN = seo.fullDescriptionHtml;
        }
      }
      if (scope === "meta" || scope === "all") {
        next.metaTitle = seo.metaTitle;
        next.metaDescription = seo.metaDescription;
        next.slug = seo.slug;
        next.focusKeywords = Array.from(new Set([seo.focusKeyword, ...seo.secondaryKeywords]));
        next.faqs = seo.faqs;
      }
      if (scope === "all") {
        next.imagesSEO = generateImageAltTags(
          seo.title,
          next.primaryImage,
          next.galleryImages,
          next.detailImages || [],
          variants
        );
      }
      return next;
    });
    setTemplateToast(scope === "all" ? "Đã áp dụng toàn bộ bản nháp AI. Hãy rà soát rồi lưu." : "Đã áp dụng phần nội dung đã chọn.");
    setTimeout(() => setTemplateToast(null), 3000);
  };

  const handleOpenAICopywriter = () => {
    const currentTitle = editLang === "VI" ? formData.titleVI : (formData.titleEN || formData.titleVI);
    if (!seoFocusKeyword.trim()) {
      setSeoFocusKeyword(extractSEOKeywords(currentTitle, formData.categoryName, editLang)[0] || currentTitle);
    }
    setCopyLang(editLang);
    setAiGenerationError(null);
    setActiveTab("copywriter");
  };

  const mediaCount =
    formData.galleryImages.length +
    1 +
    (formData.detailImages?.length || 0) +
    (formData.videoUrl ? 1 : 0);

  const activeVariantCount = variants.filter(variant => variant.selectedForSale).length;
  const variantImageCount = variants.filter(variant => Boolean(variant.imageUrl)).length;
  const variantImageCoverage = variants.length > 0 ? Math.round((variantImageCount / variants.length) * 100) : 0;
  const visibleVariants = useMemo(() => {
    const query = variantSearch.trim().toLowerCase();
    return variants.map((variant, index) => ({ variant, index })).filter(({ variant }) => {
      if (!query) return true;
      return [variant.sourceSkuId, variant.colorName, variant.colorNameEN, variant.sizeName, variant.sizeNameEN, ...Object.values(variant.specDetails || {})]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(query));
    });
  }, [variants, variantSearch]);

  const jsonLdCode = useMemo(() => {
    return JSON.stringify(generateProductJsonLd(formData), null, 2);
  }, [formData]);

  const handleEditorTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabList = event.currentTarget.closest('[role="tablist"]');
    const tabs = Array.from(tabList?.querySelectorAll<HTMLButtonElement>('[role="tab"]') || []);
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
    <div className="fixed inset-0 z-50 bg-slate-950/65">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="product-dialog-title" className="flex h-[100dvh] w-screen max-w-none flex-col overflow-hidden border-0 bg-[#f8fafc] shadow-2xl animate-in fade-in duration-150">
        {/* Modal Header */}
        <div className="border-b border-slate-200 bg-white">
          <div className="flex items-start justify-between gap-4 px-4 py-4 sm:px-6">
            <div className="flex min-w-0 items-start gap-3">
              <img
                src={formData.primaryImage}
                alt=""
                className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 bg-slate-100 object-cover"
              />
              <div className="min-w-0">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                    {formData.skuCode}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${formData.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {formData.status === "PUBLISHED" ? "Đang hiển thị trên web" : "Bản nháp nội bộ"}
                  </span>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                    Storefront riêng · React/Vite
                  </span>
                </div>
                <h2 id="product-dialog-title" className="max-w-3xl truncate text-sm font-extrabold leading-5 text-slate-950 sm:text-base">
                  {editLang === "VI" ? formData.titleVI : (formData.titleEN || formData.titleVI)}
                </h2>
                <p className="mt-1 text-[11px] text-slate-500">
                  Chỉnh nội dung, media, biến thể và SEO trước khi xuất bản cho khách hàng.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng trình biên tập sản phẩm"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 active:bg-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
              <div className="flex shrink-0 items-center bg-white p-0.5 rounded-lg border border-slate-300">
              <button
                type="button"
                onClick={() => setEditLang("VI")}
                className={`flex min-h-11 items-center gap-1 rounded-md px-3 py-1 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 sm:min-h-8 ${
                  editLang === "VI"
                    ? "bg-white text-orange-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Chỉnh sửa nội dung Tiếng Việt"
              >
                <Languages className="h-3.5 w-3.5" /> VI
              </button>
              <button
                type="button"
                onClick={() => setEditLang("EN")}
                className={`flex min-h-11 items-center gap-1 rounded-md px-3 py-1 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:min-h-8 ${
                  editLang === "EN"
                    ? "bg-white text-blue-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Edit content in English"
              >
                <Languages className="h-3.5 w-3.5" /> EN
              </button>
            </div>

            {onOpenConnectors && (
              <button
                type="button"
                onClick={() => onOpenConnectors(formData)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-xs transition-colors"
                title="Đẩy sản phẩm lên WooCommerce, Shopify hoặc xuất CSV"
              >
                <Share2 className="w-3.5 h-3.5 text-orange-600" />
                <span>Kênh bán khác</span>
              </button>
            )}

            {onOpenBannerStudio && (
                <button
                  type="button"
                  onClick={() => onOpenBannerStudio(formData, formData.primaryImage, "TRANSLATE")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg shadow-xs transition-colors"
                  title="Dịch bảng size (尺码表), thay thế tem mác tiếng Trung sang Tiếng Việt/Tiếng Anh"
                >
                  <Languages className="w-3.5 h-3.5 text-orange-600" />
                  <span>Dịch chữ trên ảnh</span>
                </button>
            )}

            <button
              type="button"
              onClick={handleOpenApplyTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-xs transition-colors"
              title="Áp dụng mẫu nội dung & biến thể chuẩn cho sản phẩm này"
            >
              <LayoutTemplate className="w-3.5 h-3.5 text-indigo-600" />
              <span>Áp dụng template</span>
            </button>
            <button
              type="button"
              onClick={() => { setTemplateSaveName(formData.titleVI.slice(0, 30)); setShowSaveTemplateModal(true); }}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
              title="Lưu cấu trúc sản phẩm này thành mẫu tái sử dụng"
            >
              <Save className="h-3.5 w-3.5" /> Lưu mẫu
            </button>
            <a href={formData.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white hover:text-orange-700">
              Nguồn gốc <ExternalLink className="h-3.5 w-3.5" />
            </a>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {formData.status === "PUBLISHED" && onOpenStorefront && (
                <button type="button" onClick={() => onOpenStorefront(formData)} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100">
                  <ExternalLink className="h-3.5 w-3.5" /> Xem trên web
                </button>
              )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 shadow-xs transition-colors hover:bg-slate-100 disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Đang lưu..." : "Lưu bản nháp"}</span>
            </button>
              {onPublish && (
                <button onClick={handlePublish} disabled={isPublishing || isSaving} className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-orange-600/20 transition-colors hover:bg-orange-700 disabled:opacity-60">
                  <Globe className="h-3.5 w-3.5" />
                  {isPublishing ? "Đang đăng..." : formData.status === "PUBLISHED" ? "Cập nhật storefront" : "Đăng lên storefront"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-200 bg-white select-none overflow-x-auto" role="tablist" aria-label="Khu vực biên tập sản phẩm">
          <button
            id="product-editor-tab-content"
            type="button"
            role="tab"
            aria-selected={activeTab === "content"}
            aria-controls="product-editor-panel-content"
            tabIndex={activeTab === "content" ? 0 : -1}
            onKeyDown={handleEditorTabKeyDown}
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
            id="product-editor-tab-variants"
            type="button"
            role="tab"
            aria-selected={activeTab === "variants"}
            aria-controls="product-editor-panel-variants"
            tabIndex={activeTab === "variants" ? 0 : -1}
            onKeyDown={handleEditorTabKeyDown}
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
            id="product-editor-tab-media"
            type="button"
            role="tab"
            aria-selected={activeTab === "media"}
            aria-controls="product-editor-panel-media"
            tabIndex={activeTab === "media" ? 0 : -1}
            onKeyDown={handleEditorTabKeyDown}
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

          <button
            id="product-editor-tab-personalization"
            type="button"
            role="tab"
            aria-selected={activeTab === "personalization"}
            aria-controls="product-editor-panel-personalization"
            tabIndex={activeTab === "personalization" ? 0 : -1}
            onKeyDown={handleEditorTabKeyDown}
            onClick={() => setActiveTab("personalization")}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "personalization"
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Cá Nhân Hóa ({formData.personalizationFields?.length || 0})
          </button>

          {/* TAB: TỐI ƯU SEO & SERP */}
          <button
            id="product-editor-tab-seo"
            type="button"
            role="tab"
            aria-selected={activeTab === "seo"}
            aria-controls="product-editor-panel-seo"
            tabIndex={activeTab === "seo" ? 0 : -1}
            onKeyDown={handleEditorTabKeyDown}
            onClick={() => { setActiveTab("seo"); setCopyLang(editLang); }}
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
            id="product-editor-tab-copywriter"
            type="button"
            role="tab"
            aria-selected={activeTab === "copywriter"}
            aria-controls="product-editor-panel-copywriter"
            tabIndex={activeTab === "copywriter" ? 0 : -1}
            onKeyDown={handleEditorTabKeyDown}
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
            id="product-editor-tab-quality"
            type="button"
            role="tab"
            aria-selected={activeTab === "quality"}
            aria-controls="product-editor-panel-quality"
            tabIndex={activeTab === "quality" ? 0 : -1}
            onKeyDown={handleEditorTabKeyDown}
            onClick={() => setActiveTab("quality")}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "quality"
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Chất Lượng Listing ({qualityAudit.totalScore}/100)
          </button>

          {/* TAB: VISUAL SOURCING 1688 */}
          <button
            id="product-editor-tab-sourcing"
            type="button"
            role="tab"
            aria-selected={activeTab === "sourcing"}
            aria-controls="product-editor-panel-sourcing"
            tabIndex={activeTab === "sourcing" ? 0 : -1}
            onKeyDown={handleEditorTabKeyDown}
            onClick={() => {
              setActiveTab("sourcing");
              if (!visualMatches) {
                handleLoadVisualSourcing();
              }
            }}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "sourcing"
                ? "border-amber-600 text-amber-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
            title="Tìm nguồn xưởng sản xuất tận gốc 1688 bằng hình ảnh để tối ưu giá vốn và tăng biên lợi nhuận"
          >
            <Factory className="w-3.5 h-3.5 text-amber-500" />
            <span>Nguồn Xưởng 1688 Gốc</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
              Sourcing
            </span>
          </button>
        </div>

        {/* Operational product snapshot */}
        <div className="grid grid-cols-2 gap-px border-b border-slate-200 bg-slate-200 sm:grid-cols-4 lg:grid-cols-6">
          <div className="bg-white px-4 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Giá bán</div>
            <div className="mt-0.5 text-xs font-extrabold text-slate-900">
              {formData.minPriceVND.toLocaleString("vi-VN")}đ{formData.maxPriceVND > formData.minPriceVND ? ` – ${formData.maxPriceVND.toLocaleString("vi-VN")}đ` : ""}
            </div>
          </div>
          <div className="bg-white px-4 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Phân loại bán</div>
            <div className="mt-0.5 text-xs font-extrabold text-slate-900">{activeVariantCount}/{variants.length} SKU</div>
          </div>
          <div className="bg-white px-4 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Ảnh biến thể</div>
            <div className={`mt-0.5 text-xs font-extrabold ${variantImageCoverage === 100 ? "text-emerald-700" : "text-amber-700"}`}>{variantImageCount}/{variants.length} · {variantImageCoverage}%</div>
          </div>
          <div className="bg-white px-4 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Media</div>
            <div className="mt-0.5 text-xs font-extrabold text-slate-900">{mediaCount} tài nguyên</div>
          </div>
          <div className="bg-white px-4 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">SEO</div>
            <div className={`mt-0.5 text-xs font-extrabold ${seoAudit.score >= 80 ? "text-emerald-700" : "text-amber-700"}`}>{seoAudit.score}/100</div>
          </div>
          <div className="bg-white px-4 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Chất lượng</div>
            <div className={`mt-0.5 text-xs font-extrabold ${qualityAudit.canPublish ? "text-emerald-700" : "text-amber-700"}`}>{qualityAudit.totalScore}/100</div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: NỘI DUNG & THÔNG SỐ */}
          {activeTab === "content" && (
            <div id="product-editor-panel-content" role="tabpanel" aria-labelledby="product-editor-tab-content" tabIndex={0} className="space-y-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
              <div className="grid gap-4 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-orange-50 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm shadow-violet-600/20">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-950">Tạo nhanh nội dung sản phẩm bằng AI</h3>
                    <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">
                      AI chỉ dùng dữ liệu sản phẩm đã có để tạo tiêu đề, mô tả, SEO và FAQ. Giá, tồn kho và bảng thông số kỹ thuật không bị thay đổi.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAICopywriter}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 active:bg-violet-800"
                >
                  <Sparkles className="h-4 w-4" />
                  Mở trợ lý AI
                </button>
              </div>

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

                <p className="text-[11px] leading-5 text-slate-500">
                  Attributes mô tả thông tin dùng chung cho sản phẩm và không tạo SKU. Những lựa chọn khách hàng có thể chọn khi mua phải được quản lý tại tab Ma Trận SKU.
                </p>

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
            <div id="product-editor-panel-variants" role="tabpanel" aria-labelledby="product-editor-tab-variants" tabIndex={0} className="space-y-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <div>
                  <p className="font-bold">AI và template chỉ hỗ trợ dựng nhanh cấu trúc phân loại.</p>
                  <p className="mt-1 leading-5">Giá vốn, giá bán, tồn kho và trạng thái nguồn 1688 phải được đối chiếu theo từng SKU trước khi đăng sản phẩm.</p>
                </div>
              </div>
              <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-950">Ma trận biến thể đồng bộ</h3>
                  <p className="mt-1 text-xs text-slate-500">Ảnh, giá, tồn kho và trạng thái bán được quản lý theo từng SKU; ảnh biến thể sẽ đổi tương ứng trên storefront.</p>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                  <span className="rounded-full bg-orange-50 px-3 py-1.5 text-orange-700">{activeVariantCount}/{variants.length} đang bán</span>
                  <span className={`rounded-full px-3 py-1.5 ${variantImageCoverage === 100 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{variantImageCount}/{variants.length} có ảnh</span>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="variant-search" className="sr-only">Tìm biến thể</label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input id="variant-search" value={variantSearch} onChange={event => setVariantSearch(event.target.value)} placeholder="Tìm theo màu, kích thước hoặc mã SKU…" className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15" />
                  </div>
                </div>
              </div>

              <div className="min-h-[320px] max-h-[calc(100dvh-360px)] overflow-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-[1120px] w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 shadow-xs">
                    <tr>
                      <th className="p-3 w-12 text-center">Bán</th>
                      <th className="p-3">Phân Loại ({editLang === "VI" ? "Màu / Size" : "Color / Size"})</th>
                      <th className="p-3">Hiển thị mockup</th>
                      <th className="p-3">Giá Vốn VNĐ</th>
                      <th className="p-3">Giá Bán Web VNĐ</th>
                      <th className="p-3">Margin %</th>
                      <th className="p-3">Tồn Kho</th>
                      <th className="p-3 text-center">Nguồn 1688</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleVariants.map(({ variant: v, index: idx }) => {
                      const margin = v.sellingPriceVND > 0
                        ? Math.round(((v.sellingPriceVND - v.costPriceVND) / v.sellingPriceVND) * 100)
                        : 0;

                      const displayColor = editLang === "VI" ? (v.colorName || "Mặc định") : (v.colorNameEN || v.colorName || "Default");
                      const displaySize = editLang === "VI" ? (v.sizeName || "Freesize") : (v.sizeNameEN || v.sizeName || "Freesize");
                      const visualConfig = formData.seo?.variantMockupVisuals?.[v.sourceSkuId];

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
                                <input
                                  type="url"
                                  value={v.imageUrl || ""}
                                  onChange={(event) => handleVariantChange(idx, "imageUrl", event.target.value.trim() || undefined)}
                                  placeholder="URL ảnh riêng của SKU"
                                  aria-label={`Ảnh SKU ${v.sourceSkuId}`}
                                  className="mt-1.5 w-56 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-normal text-slate-600 outline-none focus:border-orange-400"
                                />
                              </div>
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <select
                                value={visualConfig?.type || "AUTO"}
                                onChange={(event) => handleVariantMockupModeChange(idx, event.target.value as "AUTO" | "DESIGN" | "COLOR" | "PLAIN")}
                                aria-label={`Kiểu mockup ${v.sourceSkuId}`}
                                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-700 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
                              >
                                <option value="AUTO">Tự nhận diện</option>
                                <option value="DESIGN">Ảnh design</option>
                                <option value="COLOR">Màu sản phẩm</option>
                                <option value="PLAIN">Nền trơn</option>
                              </select>
                              {visualConfig?.type === "COLOR" && (
                                <input
                                  type="color"
                                  value={visualConfig.colorHex || getVariantVisual({ ...formData, variants }, v).colorHex || "#f8fafc"}
                                  onChange={(event) => handleVariantMockupColorChange(idx, event.target.value)}
                                  aria-label={`Màu mockup ${v.sourceSkuId}`}
                                  className="h-8 w-9 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
                                />
                              )}
                            </div>
                            <p className="mt-1 text-[9px] leading-3 text-slate-400">
                              {visualConfig?.type === "DESIGN"
                                ? (v.imageUrl ? "Dùng ảnh riêng của SKU" : "Cần nhập URL ảnh SKU")
                                : visualConfig?.type === "COLOR"
                                  ? "Phủ màu lên vùng in"
                                  : "Có thể để hệ thống tự chọn"}
                            </p>
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
                    {visibleVariants.length === 0 && (
                      <tr><td colSpan={8} className="p-8 text-center text-xs text-slate-500">Không tìm thấy biến thể phù hợp.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: MEDIA & VIDEO */}
          {activeTab === "media" && (
            <div id="product-editor-panel-media" role="tabpanel" aria-labelledby="product-editor-tab-media" tabIndex={0} className="space-y-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
              {/* 0. Mockup nền trơn & vùng đặt design */}
              <div className="overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 shadow-sm">
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-lg bg-orange-100 p-2 text-orange-700">
                        <Layers className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                          Mockup nền trơn cho biến thể
                          {formData.customizerMockupTemplateUrl ? (
                            <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Đã cấu hình</span>
                          ) : (
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500">CSS fallback</span>
                          )}
                        </h3>
                        <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600">
                          Storefront sẽ mở mockup nền trơn. Khi khách chọn variant có ảnh riêng, ảnh design được đặt lên mockup; variant chỉ có màu sẽ được phủ màu tương ứng.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="url"
                        value={formData.customizerMockupTemplateUrl || ""}
                        onChange={(e) => handleFieldChange("customizerMockupTemplateUrl", e.target.value.trim() || undefined)}
                        placeholder="https://.../mockup-nen-tron.png"
                        className="min-w-0 flex-1 rounded-xl border border-orange-200 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                        aria-label="URL mockup nền trơn"
                      />
                      {formData.customizerMockupTemplateUrl && (
                        <button
                          type="button"
                          onClick={() => handleFieldChange("customizerMockupTemplateUrl", undefined)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                        >
                          Xóa mockup
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">
                      Khuyến nghị PNG/WebP nền trong suốt hoặc ảnh sản phẩm trơn, tỉ lệ vuông. Để trống để dùng mockup CSS tự động theo danh mục.
                    </p>
                  </div>

                  {formData.customizerMockupTemplateUrl && (
                    <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-orange-200 bg-white shadow-inner sm:h-32 sm:w-32">
                      <img
                        src={formData.customizerMockupTemplateUrl}
                        alt="Xem trước mockup nền trơn"
                        className="h-full w-full object-contain p-1"
                        onLoad={(event) => { event.currentTarget.style.opacity = "1"; }}
                        onError={(event) => { event.currentTarget.style.opacity = "0.25"; }}
                      />
                    </div>
                  )}
                </div>
              </div>

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
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      Ảnh Đại Diện & Album Ảnh Trưng Bày ({formData.galleryImages.length + 1} ảnh)
                      {formData.isMediaMirrored ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Đã Lưu Trữ CDN
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800">
                          Ảnh Nguồn Gốc
                        </span>
                      )}
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      Bấm vào ảnh gallery để chọn làm ảnh đại diện chính
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleMirrorImages}
                    disabled={isMirroring}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                    title="Tải và host vĩnh viễn toàn bộ ảnh lên CDN Supabase/Server, chống vỡ ảnh khi 1688 chặn hotlink"
                  >
                    <CloudDownload className="w-4 h-4 text-indigo-600" />
                    <span>{isMirroring ? "Đang Lưu CDN..." : "☁️ Lưu Trữ Ảnh Vĩnh Viễn"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {/* Ảnh Chính */}
                  <div className="relative rounded-xl border-2 border-orange-500 overflow-hidden group aspect-square">
                    <img
                      src={formData.primaryImage}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-1.5 left-1.5 bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                      Ảnh Chính
                    </span>

                    {onOpenBannerStudio && (
                      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenBannerStudio(formData, formData.primaryImage, "TRANSLATE")}
                          className="w-full py-1.5 px-2 bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-bold rounded-lg shadow-xs flex items-center justify-center gap-1 transition-all"
                        >
                          <Languages className="w-3.5 h-3.5" />
                          Dịch Chữ / Sửa Ảnh
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenBannerStudio(formData, formData.primaryImage, "FRAME")}
                          className="w-full py-1.5 px-2 bg-white/90 hover:bg-white text-slate-800 text-[11px] font-bold rounded-lg shadow-xs flex items-center justify-center gap-1 transition-all"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-pink-600" />
                          Đóng Khung Viền
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Ảnh Gallery */}
                  {formData.galleryImages.map((img, i) => (
                    <div
                      key={i}
                      className="relative rounded-xl border border-slate-200 overflow-hidden group aspect-square hover:border-orange-400 transition-all"
                    >
                      <img
                        src={img}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const newGallery = formData.galleryImages.filter((_, idx) => idx !== i);
                            newGallery.push(formData.primaryImage);
                            setFormData(prev => ({
                              ...prev,
                              primaryImage: img,
                              galleryImages: newGallery
                            }));
                          }}
                          className="w-full py-1 bg-white/90 hover:bg-white text-slate-800 text-[10px] font-bold rounded-md transition-all text-center"
                        >
                          Làm ảnh chính
                        </button>
                        {onOpenBannerStudio && (
                          <button
                            type="button"
                            onClick={() => onOpenBannerStudio(formData, img, "TRANSLATE")}
                            className="w-full py-1 bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-bold rounded-md flex items-center justify-center gap-1 transition-all"
                          >
                            <Languages className="w-3 h-3" />
                            Dịch chữ
                          </button>
                        )}
                      </div>
                      <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1 rounded">
                        #{i + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Ảnh Chi Tiết Bán Hàng Dài (Detail Images & Bảng size) */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      Ảnh Chi Tiết Bán Hàng & Bảng Size (1688 Detail Images: {formData.detailImages?.length || 0} ảnh)
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.2 rounded-full">
                        尺码表 & Specs
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Ảnh chi tiết dài (Infographic thông số, Bảng size 尺码表, Cận cảnh chất liệu). Hỗ trợ dịch đè chữ tiếng Trung sang Tiếng Việt/Tiếng Anh.
                    </p>
                  </div>

                  {onOpenBannerStudio && (formData.detailImages?.length ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => onOpenBannerStudio(formData, formData.detailImages?.[0], "TRANSLATE")}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg shadow-xs transition-colors"
                    >
                      <Languages className="w-3.5 h-3.5" />
                      <span>Dịch Bảng Size Trên Ảnh</span>
                    </button>
                  )}
                </div>

                {formData.detailImages && formData.detailImages.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {formData.detailImages.map((dImg, idx) => (
                      <div
                        key={idx}
                        className="relative group rounded-lg border border-slate-200 overflow-hidden bg-slate-100 aspect-3/4 hover:border-orange-500 transition-all block"
                      >
                        <img
                          src={dImg}
                          alt={`Detail ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 gap-1.5">
                          {onOpenBannerStudio && (
                            <button
                              type="button"
                              onClick={() => onOpenBannerStudio(formData, dImg, "TRANSLATE")}
                              className="w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-md flex items-center justify-center gap-1 shadow-xs transition-all"
                            >
                              <Languages className="w-3 h-3" />
                              Dịch Bảng Size
                            </button>
                          )}
                          <a
                            href={dImg}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full py-1 px-2 bg-white/90 hover:bg-white text-slate-800 text-[10px] font-bold rounded-md flex items-center justify-center gap-1 transition-all"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Mở Full HD
                          </a>
                        </div>
                        <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1 rounded">
                          #{idx + 1}
                        </span>
                      </div>
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

          {activeTab === "personalization" && (
            <div id="product-editor-panel-personalization" role="tabpanel" aria-labelledby="product-editor-tab-personalization" tabIndex={0} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
              <PersonalizationBuilder
                enabled={Boolean(formData.isPersonalized)}
                mockupUrl={formData.customizerMockupTemplateUrl}
                previewImageUrl={formData.primaryImage}
                fields={formData.personalizationFields || []}
                onEnabledChange={isPersonalized => handleFieldChange("isPersonalized", isPersonalized)}
                onMockupUrlChange={customizerMockupTemplateUrl => handleFieldChange("customizerMockupTemplateUrl", customizerMockupTemplateUrl)}
                onFieldsChange={personalizationFields => handleFieldChange("personalizationFields", personalizationFields)}
              />
            </div>
          )}

          {/* TAB 4: TỐI ƯU SEO & SERP */}
          {activeTab === "seo" && (
            <div id="product-editor-panel-seo" role="tabpanel" aria-labelledby="product-editor-tab-seo" tabIndex={0} className="space-y-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
              {/* AI SEO workspace */}
              <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-xl shadow-slate-900/10">
                <div className="grid gap-0 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                  <div className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-500 text-white">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-extrabold">AI SEO Workspace</h3>
                          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">Xử lý tại backend</span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          Tạo mới tiêu đề, mô tả ngắn, mô tả HTML, meta, URL, FAQ và ALT ảnh từ dữ liệu sản phẩm đã xác minh.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 space-y-4">
                      <div>
                        <label className="mb-1.5 block text-[11px] font-bold text-slate-300">Từ khóa chính <span className="text-orange-400">*</span></label>
                        <input
                          value={seoFocusKeyword}
                          onChange={event => setSeoFocusKeyword(event.target.value)}
                          placeholder="Ví dụ: quà tặng cá nhân hóa cho mẹ"
                          className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-xs text-white outline-hidden placeholder:text-slate-500 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1.5 block text-[11px] font-bold text-slate-300">Ngôn ngữ</label>
                          <select value={copyLang} onChange={event => setCopyLang(event.target.value as "VI" | "EN")} className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2.5 text-xs text-white outline-hidden focus:border-orange-400">
                            <option value="VI">Tiếng Việt</option>
                            <option value="EN">English</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[11px] font-bold text-slate-300">Giọng văn</label>
                          <select value={seoTone} onChange={event => setSeoTone(event.target.value as typeof seoTone)} className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2.5 text-xs text-white outline-hidden focus:border-orange-400">
                            <option value="TRUSTWORTHY">Tin cậy, rõ ràng</option>
                            <option value="CONVERSION">Thuyết phục mua hàng</option>
                            <option value="PREMIUM">Cao cấp</option>
                            <option value="FRIENDLY">Thân thiện</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-300">Từ khóa phụ đang dùng</label>
                          <button type="button" onClick={() => setSeoFocusKeyword(formData.focusKeywords?.[0] || "")} className="text-[10px] font-bold text-orange-300 hover:text-orange-200">Lấy từ SEO hiện tại</button>
                        </div>
                        <div className="flex min-h-9 flex-wrap gap-1.5 rounded-xl border border-white/10 bg-white/5 p-2">
                          {(formData.focusKeywords || []).slice(0, 8).map(keyword => (
                            <span key={keyword} className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-slate-300">{keyword}</span>
                          ))}
                          {(formData.focusKeywords || []).length === 0 && <span className="px-1 py-1 text-[10px] text-slate-500">Chưa có — AI sẽ đề xuất.</span>}
                        </div>
                      </div>

                      {aiGenerationError && (
                        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-[11px] text-rose-200">
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {aiGenerationError}
                        </div>
                      )}

                      <button type="button" onClick={handleGenerateAISEO} disabled={isGeneratingAI} className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-xs font-extrabold text-white shadow-lg shadow-orange-950/30 transition-colors hover:bg-orange-400 disabled:cursor-wait disabled:opacity-60">
                        <Sparkles className={`h-4 w-4 ${isGeneratingAI ? "animate-pulse" : ""}`} />
                        {isGeneratingAI ? "AI đang phân tích và viết nội dung…" : "Tạo bộ nội dung SEO mới"}
                      </button>
                      <p className="text-[10px] leading-4 text-slate-500">AI không tự ghi đè. Bạn luôn được xem trước và chọn phần muốn áp dụng.</p>
                    </div>
                  </div>

                  <div className="bg-white p-5 text-slate-900">
                    {!generatedCopy?.seo ? (
                      <div className="grid min-h-[360px] place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                        <div className="max-w-sm">
                          <Search className="mx-auto h-8 w-8 text-slate-300" />
                          <h4 className="mt-3 text-sm font-bold text-slate-800">Bản nháp sẽ xuất hiện ở đây</h4>
                          <p className="mt-1 text-xs leading-5 text-slate-500">Nhập từ khóa chính để AI viết nội dung mới dựa trên tiêu đề, thuộc tính, giá và danh mục hiện có.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-600">Bản nháp AI · Chưa lưu</div>
                            <h4 className="mt-1 text-sm font-extrabold text-slate-950">Xem trước thay đổi</h4>
                          </div>
                          <button type="button" onClick={() => applyAISEODraft("all")} className="rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-emerald-700">Áp dụng toàn bộ</button>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Tiêu đề sản phẩm</span>
                            <button type="button" onClick={() => applyAISEODraft("title")} className="text-[10px] font-bold text-orange-600 hover:underline">Áp dụng</button>
                          </div>
                          <p className="mt-1.5 text-sm font-extrabold leading-5 text-slate-950">{generatedCopy.seo.title}</p>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Mô tả bán hàng</span>
                            <button type="button" onClick={() => applyAISEODraft("description")} className="text-[10px] font-bold text-orange-600 hover:underline">Áp dụng</button>
                          </div>
                          <p className="mt-1.5 text-xs leading-5 text-slate-600">{generatedCopy.seo.shortDescription}</p>
                          <div className="prose prose-sm mt-3 max-h-40 max-w-none overflow-y-auto rounded-lg bg-slate-50 p-3 text-xs" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(generatedCopy.seo.fullDescriptionHtml, { USE_PROFILES: { html: true } }) }} />
                        </div>

                        <div className="rounded-xl border border-slate-200 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Google Search & cấu trúc SEO</span>
                            <button type="button" onClick={() => applyAISEODraft("meta")} className="text-[10px] font-bold text-orange-600 hover:underline">Áp dụng</button>
                          </div>
                          <p className="mt-2 text-sm font-medium text-[#1a0dab]">{generatedCopy.seo.metaTitle}</p>
                          <p className="mt-1 text-[11px] leading-4 text-slate-600">{generatedCopy.seo.metaDescription}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {[generatedCopy.seo.focusKeyword, ...generatedCopy.seo.secondaryKeywords].slice(0, 8).map(keyword => <span key={keyword} className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">{keyword}</span>)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

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
                        {seoAudit.score >= 85 ? "Nội dung đã tối ưu tốt" : "Cần tối ưu thêm"}
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
                    Tự điền SEO nhanh
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

                    {/* Rich Snippets Price & verified rating */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-amber-600">
                      {Number(formData.rating) > 0 && Number(formData.reviewCount) > 0 && (
                        <>
                          <div className="flex items-center text-amber-500 font-bold">
                            ★ <span className="ml-1 text-slate-700 font-semibold">{formData.rating} ({formData.reviewCount} đánh giá)</span>
                          </div>
                          <span className="text-slate-300">·</span>
                        </>
                      )}
                      <span className="font-extrabold text-emerald-700">
                        {formData.minPriceVND.toLocaleString("vi-VN")} đ
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500 font-medium">{variants.some(variant => variant.selectedForSale && variant.stockQuantity > 0) ? "Còn hàng (InStock)" : "Hết hàng (OutOfStock)"}</span>
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
            <div id="product-editor-panel-quality" role="tabpanel" aria-labelledby="product-editor-tab-quality" tabIndex={0} className="space-y-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
              <div className="flex items-center gap-4 bg-orange-50/60 border border-orange-200 p-4 rounded-xl">
                <div className="w-16 h-16 rounded-full bg-orange-500 text-white flex items-center justify-center text-xl font-black">
                  {qualityAudit.totalScore}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Điểm Sẵn Sàng Bán Hàng (Quality Readiness Score)
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Đánh giá theo các tiêu chuẩn e-commerce và SEO để đảm bảo tỷ lệ chuyển đổi cao khi chạy quảng cáo hoặc bán trên sàn.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${qualityAudit.canPublish ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {qualityAudit.canPublish ? "Đủ điều kiện đăng storefront" : "Chưa đủ điều kiện đăng"}
                    </span>
                    {qualityAudit.blockers.map(blocker => <span key={blocker} className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-semibold text-rose-700">{blocker}</span>)}
                  </div>
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
            <div id="product-editor-panel-copywriter" role="tabpanel" aria-labelledby="product-editor-tab-copywriter" tabIndex={0} className="space-y-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
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
                      desc: "Sắp xếp thông tin theo luồng chú ý, quan tâm, cân nhắc và hành động."
                    },
                    {
                      id: "PAS",
                      name: "Công Thức PAS",
                      tag: "Problem - Agitate - Solution",
                      desc: "Nêu vấn đề của người mua và giải pháp dựa trên dữ liệu sản phẩm."
                    },
                    {
                      id: "STORYTELLING",
                      name: "Kể Chuyện Cảm Xúc",
                      tag: "Brand Story & Heritage",
                      desc: "Tạo khung câu chuyện; chỉ dùng nguồn gốc và quy trình đã xác minh."
                    },
                    {
                      id: "SOCIAL_ADS",
                      name: "Nội Dung Mạng Xã Hội",
                      tag: "TikTok / FB Ads Hook",
                      desc: "Tóm tắt ngắn gọn từ thông tin hiện có, không tự tạo ưu đãi."
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
                    onClick={handleGenerateAISEO}
                    disabled={isGeneratingAI}
                    className="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-pink-500/30 flex items-center gap-2 transition-all disabled:cursor-wait disabled:opacity-60"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isGeneratingAI ? "AI đang viết…" : "Sinh bài viết bằng AI"}
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
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(generatedCopy.bodyHtml, { USE_PROFILES: { html: true } }) }}
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

          {/* TAB 7: VISUAL SOURCING 1688 (TÌM XƯỞNG GỐC) */}
          {activeTab === "sourcing" && (
            <div id="product-editor-panel-sourcing" role="tabpanel" aria-labelledby="product-editor-tab-sourcing" tabIndex={0} className="space-y-6 animate-fadeIn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Factory className="w-4 h-4 text-amber-600" />
                    <span>Visual Sourcing: Tìm Nguồn Xưởng Sản Xuất Gốc Trên 1688</span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Hệ thống phân tích hình ảnh và tiêu đề để truy tìm trực tiếp các nhà máy sản xuất gốc tại Chiết Giang, Quảng Đông, giúp cắt giảm các tầng trung gian và tăng biên lợi nhuận lên đến 65%.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isLoadingVisual}
                  onClick={handleLoadVisualSourcing}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingVisual ? "animate-spin" : ""}`} />
                  <span>{isLoadingVisual ? "Đang quét xưởng 1688..." : "Quét Lại Nguồn Xưởng"}</span>
                </button>
              </div>

              {isLoadingVisual && (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-amber-600 animate-spin" />
                  <p className="text-xs text-slate-500 font-medium">
                    Đang tìm kiếm nhà máy 1688 bằng thuật toán hình ảnh và đối chiếu bảng giá sỉ...
                  </p>
                </div>
              )}

              {!isLoadingVisual && visualMatches && visualMatches.length > 0 && (
                <div className="space-y-4">
                  {visualMatches.some(match => match.isDemo) && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900" role="note">
                      Chế độ Demo — kết quả xưởng, giá và độ tương đồng là dữ liệu mô phỏng; không dùng để đặt hàng.
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {visualMatches.map((m, idx) => (
                    <div
                      key={idx}
                      className="bg-white border-2 border-slate-200 hover:border-amber-500/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            {m.isDemo ? "DEMO" : `Khớp ${m.similarityScore}%`}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Tỷ lệ mua lại: <strong className="text-emerald-600">{m.repurchaseRate}%</strong>
                          </span>
                        </div>

                        <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                          <img
                            src={m.primaryImage}
                            alt={m.shopName}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{m.shopName}</h4>
                          <p className="text-[11px] text-slate-500">{m.location} • MOQ: {m.moq} cái</p>
                          <p className="text-xs text-slate-700 line-clamp-2 mt-1 italic">{m.titleVI}</p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Giá xưởng gốc:</span>
                          <span className="font-bold text-amber-600">
                            ¥{m.factoryPriceCNY} ({m.factoryPriceVND.toLocaleString("vi-VN")} ₫)
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Biên lãi dự kiến:</span>
                          <span className="font-bold text-emerald-600 text-sm">
                            +{m.estimatedMarginWith1688}%
                          </span>
                        </div>

                        <a
                          href={m.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2 px-3 text-xs font-bold rounded-xl bg-orange-50 hover:bg-orange-600 text-orange-600 hover:text-white border border-orange-200 hover:border-orange-600 transition-all flex items-center justify-center gap-1.5"
                        >
                          <span>Mở Link Xưởng 1688 Gốc</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal xem mã Schema JSON-LD */}
      {showJsonLdModal && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-900/70 backdrop-blur-xs">
          <div ref={jsonDialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Mã cấu trúc JSON-LD" className="flex min-h-[100dvh] w-screen flex-col bg-slate-950 p-6 text-slate-100 shadow-2xl">
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col space-y-4">
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
                aria-label="Đóng mã JSON-LD"
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
        </div>
      )}

      {/* Floating Template Toast */}
      {templateToast && (
        <div className="fixed bottom-6 right-6 z-60 bg-indigo-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-indigo-700 flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom-5">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{templateToast}</span>
        </div>
      )}

      {/* Modal: Áp Dụng Template Lên Sản Phẩm */}
      {showApplyTemplateModal && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
          <div ref={applyTemplateDialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Áp dụng mẫu sản phẩm" className="flex min-h-[100dvh] w-screen flex-col overflow-hidden border-0 bg-white shadow-2xl animate-in fade-in duration-150">
            <div className="p-4 px-6 border-b border-slate-200 flex items-center justify-between bg-indigo-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-600 text-white rounded-lg">
                  <LayoutTemplate className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Chọn Mẫu Template Áp Dụng
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tự động điền nội dung tiêu chuẩn hoặc ma trận biến thể cho sản phẩm này
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowApplyTemplateModal(false)}
                aria-label="Đóng chọn mẫu"
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Danh Sách Template Khả Dụng ({availableTemplates.length}):
                </label>
                {availableTemplates.map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                      selectedTemplateId === tpl.id
                        ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-xs text-slate-900">{tpl.name}</span>
                        <span className="px-2 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                          {tpl.categoryName}
                        </span>
                        {tpl.isDefault && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            Mặc định
                          </span>
                        )}
                      </div>
                      {tpl.description && (
                        <p className="text-xs text-slate-500 line-clamp-1">{tpl.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                        <span>📝 Tiêu đề: <b className="text-indigo-600">{tpl.content?.titlePrefix || ""}</b> ... <b className="text-teal-600">{tpl.content?.titleSuffix || ""}</b></span>
                        <span>🔀 Biến thể: <b className="text-purple-600">{tpl.variation?.predefinedVariants?.length || 0} SKU</b></span>
                      </div>
                    </div>
                    <div className="mt-1">
                      <input
                        type="radio"
                        checked={selectedTemplateId === tpl.id}
                        onChange={() => setSelectedTemplateId(tpl.id)}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Scope Options */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Tùy Chọn Thành Phần Áp Dụng:</span>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                  <input
                    type="checkbox"
                    checked={applyContentOption}
                    onChange={(e) => setApplyContentOption(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <span>Áp dụng <b>Nội Dung Sẵn</b> (Tiền tố/Hậu tố tiêu đề, Mô tả ngắn, Mô tả chi tiết, Bảo hành, Thuộc tính)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                  <input
                    type="checkbox"
                    checked={applyVariationOption}
                    onChange={(e) => setApplyVariationOption(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <span>Áp dụng <b>Ma Trận Biến Thể Mẫu</b> (Thay thế hoặc tạo mới danh sách SKU phân loại & giá chênh lệch)</span>
                </label>
              </div>
            </div>

            <div className="p-4 px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowApplyTemplateModal(false)}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleApplySelectedTemplate}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-200"
              >
                <Check className="w-4 h-4" />
                Áp Dụng Ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Lưu Thành Template Mới */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
          <div ref={saveTemplateDialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Lưu mẫu sản phẩm" className="flex min-h-[100dvh] w-screen flex-col overflow-hidden border-0 bg-white shadow-2xl animate-in fade-in duration-150">
            <div className="p-4 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-600 text-white rounded-lg">
                  <Save className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Lưu Thành Mẫu Template Mới
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lưu cấu trúc nội dung và ma trận biến thể này để tái sử dụng
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveTemplateModal(false)}
                aria-label="Đóng lưu mẫu"
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 overflow-y-auto p-6 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Tên Template Mới <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={templateSaveName}
                  onChange={(e) => setTemplateSaveName(e.target.value)}
                  placeholder="Ví dụ: Mẫu Quà Tặng 2026..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Ngành Hàng
                </label>
                <input
                  type="text"
                  value={templateSaveCategory}
                  onChange={(e) => setTemplateSaveCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-slate-700">
                <span className="font-semibold block mb-1">Dữ liệu sẽ được lưu:</span>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600">
                  <li>Tiêu đề, mô tả ngắn và mô tả chi tiết hiện tại</li>
                  <li>{formData.attributes?.length || 0} thông số kỹ thuật</li>
                  <li>{variants.length} phân loại biến thể & cấu trúc chênh lệch giá</li>
                  <li>Chính sách bảo hành & giao hàng</li>
                </ul>
              </div>
            </div>

            <div className="p-4 px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSaveTemplateModal(false)}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveAsTemplate}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-200"
              >
                <Check className="w-4 h-4" />
                Lưu Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
