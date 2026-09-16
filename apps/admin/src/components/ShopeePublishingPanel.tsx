import React, { useEffect, useMemo, useState } from "react";
import {
  ChannelAccountSummary,
  ChannelReadinessResult,
  ShopeeAppConfigSummary,
  ShopeeAttributeOption,
  ShopeeCategoryOption,
  ShopeeListingDraft,
  ShopeeLogisticsOption,
  WebProduct
} from "@hub1688/shared-types";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  EyeOff,
  Image as ImageIcon,
  KeyRound,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Save,
  ShieldCheck
} from "lucide-react";
import { AdminApi } from "../services/api";

interface ShopeePublishingPanelProps {
  product?: WebProduct | null;
  onShowToast: (message: string, type?: "success" | "error") => void;
  onExportCsv: () => void;
}

const steps = ["Nội dung", "Ngành hàng", "Biến thể", "Kiểm tra"];

const createDraft = (product?: WebProduct | null, accountId?: string): ShopeeListingDraft => ({
  productId: product?.id || "",
  accountId,
  title: product?.titleVI || "",
  description: product?.fullDescVI || product?.shortDescVI || product?.titleVI || "",
  categoryId: "",
  weightKg: 0.3,
  dimensions: {},
  attributes: [],
  requiredAttributeIds: [],
  logistics: [],
  selectedVariantIds: (product?.variants || []).filter(variant => variant.selectedForSale).map(variant => variant.id || variant.sourceSkuId),
  primaryVariationName: "Mẫu thiết kế",
  secondaryVariationName: "Kích thước",
  stockBuffer: 1,
  priceAdjustmentPercent: 0
});

export const ShopeePublishingPanel: React.FC<ShopeePublishingPanelProps> = ({ product, onShowToast, onExportCsv }) => {
  const [appConfig, setAppConfig] = useState<ShopeeAppConfigSummary | null>(null);
  const [accounts, setAccounts] = useState<ChannelAccountSummary[]>([]);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ShopeeListingDraft>(() => createDraft(product));
  const [categories, setCategories] = useState<ShopeeCategoryOption[]>([]);
  const [attributes, setAttributes] = useState<ShopeeAttributeOption[]>([]);
  const [logistics, setLogistics] = useState<ShopeeLogisticsOption[]>([]);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [readiness, setReadiness] = useState<ChannelReadinessResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [referenceLoading, setReferenceLoading] = useState(false);
  const [error, setError] = useState("");
  const [configName, setConfigName] = useState("Shopee Open Platform");
  const [partnerId, setPartnerId] = useState("");
  const [partnerKey, setPartnerKey] = useState("");
  const [showPartnerKey, setShowPartnerKey] = useState(false);

  const account = useMemo(() => accounts.find(item => item.id === draft.accountId) || accounts[0] || null, [accounts, draft.accountId]);
  const isConnected = account?.status === "CONNECTED";
  const selectedVariantIds = useMemo(() => new Set(draft.selectedVariantIds || []), [draft.selectedVariantIds]);
  const categoryMatches = useMemo(() => {
    const query = categoryQuery.trim().toLocaleLowerCase("vi");
    if (!query) return categories.filter(item => !item.hasChildren).slice(0, 30);
    return categories.filter(item => `${item.name} ${item.id}`.toLocaleLowerCase("vi").includes(query)).slice(0, 50);
  }, [categories, categoryQuery]);

  const loadStatus = async () => {
    setLoading(true);
    setError("");
    try {
      const [configResponse, accountsResponse] = await Promise.all([
        AdminApi.getShopeeAppConfig(),
        AdminApi.getShopeeAccounts()
      ]);
      setAppConfig(configResponse.config);
      setConfigName(configResponse.config.name || "Shopee Open Platform");
      setPartnerId(configResponse.config.partnerId || "");
      setAccounts(accountsResponse.accounts);
      setDraft(current => {
        const stillExists = accountsResponse.accounts.some(item => item.id === current.accountId);
        const selected = stillExists ? current.accountId : accountsResponse.accounts.find(item => item.status === "CONNECTED")?.id || accountsResponse.accounts[0]?.id;
        return { ...current, accountId: selected };
      });
    } catch (err: any) {
      setError(err.message || "Không thể kiểm tra kết nối Shopee");
    } finally {
      setLoading(false);
    }
  };

  const loadReferences = async (accountId?: string) => {
    setReferenceLoading(true);
    setError("");
    try {
      const [categoryResponse, logisticsResponse] = await Promise.all([
        AdminApi.getShopeeCategories(accountId),
        AdminApi.getShopeeLogistics(accountId)
      ]);
      setCategories(categoryResponse.categories);
      setLogistics(logisticsResponse.logistics);
      setDraft(current => ({
        ...current,
        logistics: logisticsResponse.logistics.map(item => ({ logisticId: item.id, enabled: item.enabled }))
      }));
    } catch (err: any) {
      setError(err.message || "Không thể tải dữ liệu ngành hàng Shopee");
    } finally {
      setReferenceLoading(false);
    }
  };

  useEffect(() => { void loadStatus(); }, []);

  useEffect(() => {
    setDraft(current => createDraft(product, current.accountId || account?.id));
    setStep(0);
    setReadiness(null);
    setAttributes([]);
    setCategoryQuery("");
  }, [product?.id]);

  useEffect(() => {
    if (isConnected && categories.length === 0 && !referenceLoading) void loadReferences(account?.id);
  }, [isConnected, account?.id]);

  const connect = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await AdminApi.getShopeeAuthorizationUrl(appConfig?.id);
      window.location.assign(response.authorizationUrl);
    } catch (err: any) {
      setError(err.message || "Không thể mở trang cấp quyền Shopee");
      setLoading(false);
    }
  };

  const saveConfig = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await AdminApi.saveShopeeAppConfig({
        id: appConfig?.id,
        name: configName,
        region: appConfig?.region || "VN",
        partnerId,
        ...(partnerKey.trim() ? { partnerKey: partnerKey.trim() } : {})
      });
      setAppConfig(response.config);
      setPartnerKey("");
      onShowToast("Đã lưu và mã hóa cấu hình Shopee Open Platform.");
      await loadStatus();
    } catch (err: any) {
      setError(err.message || "Không thể lưu cấu hình Shopee");
      onShowToast(err.message || "Không thể lưu cấu hình Shopee", "error");
    } finally {
      setLoading(false);
    }
  };

  const copyRedirectUrl = async () => {
    if (!appConfig?.redirectUrl) return;
    try {
      await navigator.clipboard.writeText(appConfig.redirectUrl);
      onShowToast("Đã sao chép Redirect URL.");
    } catch {
      onShowToast("Không thể sao chép tự động. Hãy chọn và sao chép URL.", "error");
    }
  };

  const selectAccount = (accountId: string) => {
    setDraft(current => ({ ...current, accountId }));
    setCategories([]);
    setAttributes([]);
    setLogistics([]);
    setReadiness(null);
    void loadReferences(accountId);
  };

  const chooseCategory = async (category: ShopeeCategoryOption) => {
    setDraft(current => ({ ...current, categoryId: category.id, categoryPath: category.name, attributes: [], requiredAttributeIds: [] }));
    setCategoryQuery(category.name);
    setReferenceLoading(true);
    setError("");
    try {
      const response = await AdminApi.getShopeeAttributes(category.id, account?.id);
      setAttributes(response.attributes);
      setDraft(current => ({
        ...current,
        requiredAttributeIds: response.attributes.filter(item => item.isMandatory).map(item => item.id)
      }));
    } catch (err: any) {
      setError(err.message || "Không thể tải thuộc tính ngành hàng");
    } finally {
      setReferenceLoading(false);
    }
  };

  const updateAttribute = (attributeId: string, value: string, hasOptions: boolean) => {
    setDraft(current => ({
      ...current,
      attributes: [
        ...current.attributes.filter(item => item.attributeId !== attributeId),
        ...(value ? [{ attributeId, ...(hasOptions ? { valueId: value } : { valueName: value }) }] : [])
      ]
    }));
    setReadiness(null);
  };

  const toggleVariant = (id: string) => {
    setDraft(current => {
      const next = new Set(current.selectedVariantIds || []);
      if (next.has(id)) next.delete(id); else next.add(id);
      return { ...current, selectedVariantIds: Array.from(next) };
    });
    setReadiness(null);
  };

  const validate = async (): Promise<ChannelReadinessResult | null> => {
    if (!product?.id) return null;
    setLoading(true);
    setError("");
    try {
      const response = await AdminApi.validateShopeeListing({ ...draft, productId: product.id, accountId: account?.id });
      setReadiness(response.readiness);
      return response.readiness;
    } catch (err: any) {
      setError(err.message || "Không thể kiểm tra listing");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const publish = async () => {
    if (!product?.id) return;
    let result = readiness;
    if (!result) result = await validate();
    if (!result?.isReady) {
      setStep(3);
      onShowToast("Listing còn lỗi bắt buộc; hãy hoàn thiện trước khi đăng.", "error");
      return;
    }
    if (!window.confirm(`Đăng “${draft.title}” lên ${account?.shopName || "Shopee"}?`)) return;
    setLoading(true);
    setError("");
    try {
      const response = await AdminApi.publishShopeeListing({ ...draft, productId: product.id, accountId: account?.id });
      setReadiness(response.readiness);
      onShowToast("Đã gửi listing lên Shopee; sản phẩm đang chờ sàn xử lý.");
      if (response.listing.externalUrl) window.open(response.listing.externalUrl, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      setError(err.message || "Đăng Shopee thất bại");
      onShowToast(err.message || "Đăng Shopee thất bại", "error");
    } finally {
      setLoading(false);
    }
  };

  const canSaveConfig = /^\d{1,20}$/.test(partnerId.trim()) && (partnerKey.trim().length >= 8 || Boolean(appConfig?.keyConfigured));
  const canConnectSeller = Boolean(appConfig?.keyConfigured && appConfig.partnerId && appConfig.redirectUrl);

  const configurationCard = (
    <div className="overflow-hidden rounded-2xl border border-orange-200 bg-white">
      <div className="flex items-start gap-3 bg-gradient-to-br from-orange-50 to-white p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-600 text-lg font-black text-white">S</div>
        <div className="min-w-0">
          <h4 className="font-black text-slate-950">Shopee Open Platform</h4>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">Lưu khóa ứng dụng một lần, sau đó cấp quyền cho từng Seller shop.</p>
        </div>
      </div>
      <form onSubmit={saveConfig} className="space-y-3 border-t border-orange-100 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-black text-slate-700">Tên cấu hình</span>
            <input value={configName} maxLength={100} onChange={event => setConfigName(event.target.value)} placeholder="Shopee Việt Nam" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-black text-slate-700">Partner ID</span>
            <input value={partnerId} inputMode="numeric" autoComplete="off" onChange={event => setPartnerId(event.target.value.replace(/\D/g, ""))} placeholder="Nhập Partner ID" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 flex items-center justify-between text-xs font-black text-slate-700"><span>Partner Key</span>{appConfig?.keyConfigured && <span className="text-emerald-700">Đã mã hóa</span>}</span>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input type={showPartnerKey ? "text" : "password"} value={partnerKey} autoComplete="new-password" onChange={event => setPartnerKey(event.target.value)} placeholder={appConfig?.keyConfigured ? "Để trống nếu không đổi Partner Key" : "Nhập Partner Key"} className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-11 font-mono text-sm outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
            <button type="button" onClick={() => setShowPartnerKey(value => !value)} aria-label={showPartnerKey ? "Ẩn Partner Key" : "Hiện Partner Key"} className="absolute right-2 top-1.5 rounded-lg p-2 text-slate-500 hover:bg-slate-100">{showPartnerKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
          </div>
        </label>
        <div>
          <span className="mb-1 block text-xs font-black text-slate-700">Redirect URL</span>
          <div className="flex gap-2">
            <input readOnly value={appConfig?.redirectUrl || "Máy chủ chưa cấu hình URL production"} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-[11px] text-slate-600" />
            <button type="button" onClick={copyRedirectUrl} disabled={!appConfig?.redirectUrl} className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-xl border border-slate-300 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><Copy className="h-4 w-4" /> <span className="hidden sm:inline">Sao chép</span></button>
          </div>
        </div>
        {appConfig?.message && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">{appConfig.message}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5 text-[11px] text-slate-500"><ShieldCheck className="h-4 w-4 text-emerald-600" />Partner Key không được trả lại trình duyệt sau khi lưu.</p>
          <button type="submit" disabled={loading || !canSaveConfig} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Lưu cấu hình</button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="space-y-4 pb-20 sm:pb-0">
      {configurationCard}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-sm font-black text-slate-950">Seller đã kết nối</h4>
            <p className="mt-0.5 text-xs text-slate-500">Chọn shop nhận listing hoặc cấp quyền thêm shop mới.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={loadStatus} disabled={loading} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Làm mới</button>
            <button type="button" onClick={connect} disabled={loading || !canConnectSeller} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-orange-600 px-3 text-xs font-black text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300"><Plus className="h-4 w-4" /> Kết nối Seller</button>
          </div>
        </div>
        {accounts.length > 0 ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {accounts.map(item => {
              const selected = item.id === account?.id;
              const connected = item.status === "CONNECTED";
              return (
                <button key={item.id || item.shopId} type="button" onClick={() => item.id && selectAccount(item.id)} className={`flex min-h-16 items-center gap-3 rounded-xl border p-3 text-left transition ${selected ? "border-orange-400 bg-orange-50 ring-2 ring-orange-100" : "border-slate-200 hover:border-slate-300"}`}>
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black text-white ${connected ? "bg-orange-600" : "bg-slate-400"}`}>S</div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-900">{item.shopName || `Shopee Shop ${item.shopId}`}</p><p className="mt-0.5 text-[11px] text-slate-500">Shop ID {item.shopId} · {connected ? "Sẵn sàng" : "Cần kết nối lại"}</p></div>
                  {selected && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 flex flex-col items-center rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center"><Link2 className="h-6 w-6 text-slate-400" /><p className="mt-2 text-sm font-bold text-slate-700">Chưa có Seller nào</p><p className="mt-1 text-xs text-slate-500">Lưu Partner ID/Key rồi bấm “Kết nối Seller”.</p></div>
        )}
      </div>

      {!isConnected && <div className="grid gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 sm:grid-cols-[1fr_auto] sm:items-center"><p>{account?.status === "TOKEN_EXPIRED" ? "Phiên Seller đã hết hạn. Hãy kết nối lại shop này." : "Cần chọn một Seller đang kết nối trước khi tạo listing."}</p><button type="button" onClick={onExportCsv} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 font-bold"><Download className="h-4 w-4" /> Xuất CSV dự phòng</button></div>}

      {isConnected && <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1">
        {steps.map((label, index) => (
          <button key={label} type="button" onClick={() => setStep(index)} className={`rounded-lg px-1 py-2 text-[10px] font-black transition sm:text-xs ${step === index ? "bg-white text-orange-700 shadow-sm" : index < step ? "text-emerald-700" : "text-slate-500"}`}>
            <span className="mr-1 hidden sm:inline">{index < step ? "✓" : index + 1}.</span>{label}
          </button>
        ))}
      </div>}

      {isConnected && (!product ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Chọn một sản phẩm ở phía trên để tạo listing.</div>
      ) : (
        <div className="min-h-[360px]">
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex gap-3 rounded-xl border border-slate-200 p-3">
                <img src={product.primaryImage} alt="" className="h-16 w-16 rounded-lg bg-slate-100 object-cover" />
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-black text-slate-900">{product.titleVI}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{product.variants.length} biến thể · {product.status === "PUBLISHED" ? "Đã duyệt nội bộ" : "Chưa xuất bản nội bộ"}</p>
                </div>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-black text-slate-700">Tiêu đề Shopee <span className="text-slate-400">{draft.title.length}/120</span></span>
                <input value={draft.title} maxLength={120} onChange={event => { setDraft({ ...draft, title: event.target.value }); setReadiness(null); }} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-black text-slate-700">Mô tả bán hàng</span>
                <textarea value={draft.description} onChange={event => { setDraft({ ...draft, description: event.target.value }); setReadiness(null); }} rows={8} className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-sm leading-relaxed outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-black text-slate-700">Tìm ngành hàng Shopee</label>
                <input value={categoryQuery} onChange={event => setCategoryQuery(event.target.value)} placeholder={referenceLoading ? "Đang tải ngành hàng…" : "Nhập tên hoặc mã ngành hàng"} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-hidden focus:border-orange-500" />
                {draft.categoryId && <p className="mt-1 text-[11px] font-bold text-emerald-700">Đã chọn: {draft.categoryPath} · ID {draft.categoryId}</p>}
                {!draft.categoryId || categoryQuery !== draft.categoryPath ? (
                  <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                    {categoryMatches.map(category => (
                      <button key={category.id} type="button" disabled={category.hasChildren} onClick={() => chooseCategory(category)} className="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2 text-left text-xs hover:bg-orange-50 disabled:cursor-not-allowed disabled:text-slate-400">
                        <span>{category.name}</span><span className="font-mono text-[10px] text-slate-400">{category.id}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {attributes.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {attributes.map(attribute => {
                    const current = draft.attributes.find(item => item.attributeId === attribute.id);
                    return (
                      <label key={attribute.id} className="block">
                        <span className="mb-1 block text-xs font-bold text-slate-700">{attribute.name}{attribute.isMandatory && <span className="text-rose-600"> *</span>}</span>
                        {attribute.values.length ? (
                          <select value={current?.valueId || ""} onChange={event => updateAttribute(attribute.id, event.target.value, true)} className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs">
                            <option value="">Chọn giá trị</option>
                            {attribute.values.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}
                          </select>
                        ) : (
                          <input value={current?.valueName || ""} onChange={event => updateAttribute(attribute.id, event.target.value, false)} className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs" />
                        )}
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-4">
                <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Cân nặng (kg)</span><input type="number" min="0.001" step="0.001" value={draft.weightKg || ""} onChange={event => setDraft({ ...draft, weightKg: Number(event.target.value) })} className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs" /></label>
                {(["lengthCm", "widthCm", "heightCm"] as const).map((key, index) => <label key={key} className="block"><span className="mb-1 block text-xs font-bold text-slate-700">{["Dài", "Rộng", "Cao"][index]} (cm)</span><input type="number" min="1" value={draft.dimensions?.[key] || ""} onChange={event => setDraft({ ...draft, dimensions: { ...draft.dimensions, [key]: Number(event.target.value) || undefined } })} className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs" /></label>)}
              </div>

              <div>
                <p className="mb-2 text-xs font-black text-slate-700">Đơn vị vận chuyển</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {logistics.map(option => {
                    const enabled = draft.logistics.find(item => item.logisticId === option.id)?.enabled || false;
                    return <label key={option.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs ${enabled ? "border-orange-300 bg-orange-50" : "border-slate-200"}`}><input type="checkbox" checked={enabled} onChange={event => setDraft({ ...draft, logistics: draft.logistics.map(item => item.logisticId === option.id ? { ...item, enabled: event.target.checked } : item) })} />{option.name}</label>;
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Tên nhóm biến thể ảnh</span><input value={draft.primaryVariationName || ""} onChange={event => setDraft({ ...draft, primaryVariationName: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" /></label>
                <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Tên nhóm kích thước</span><input value={draft.secondaryVariationName || ""} onChange={event => setDraft({ ...draft, secondaryVariationName: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" /></label>
                <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Điều chỉnh giá (%)</span><input type="number" value={draft.priceAdjustmentPercent || 0} onChange={event => setDraft({ ...draft, priceAdjustmentPercent: Number(event.target.value) })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" /></label>
                <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Trừ tồn kho an toàn/SKU</span><input type="number" min="0" value={draft.stockBuffer || 0} onChange={event => setDraft({ ...draft, stockBuffer: Number(event.target.value) })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" /></label>
              </div>
              <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200">
                {product.variants.map(variant => {
                  const id = variant.id || variant.sourceSkuId;
                  const selected = selectedVariantIds.has(id);
                  return (
                    <label key={id} className={`grid cursor-pointer grid-cols-[auto_42px_1fr_auto] items-center gap-2 border-b border-slate-100 p-2.5 text-xs ${selected ? "bg-orange-50/60" : "opacity-60"}`}>
                      <input type="checkbox" checked={selected} onChange={() => toggleVariant(id)} />
                      {variant.imageUrl ? <img src={variant.imageUrl} alt="" className="h-10 w-10 rounded-md bg-white object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100"><ImageIcon className="h-4 w-4 text-slate-400" /></div>}
                      <div className="min-w-0"><p className="truncate font-bold text-slate-800">{[variant.colorName, variant.sizeName].filter(Boolean).join(" · ") || "Mặc định"}</p><p className="truncate font-mono text-[10px] text-slate-500">{variant.sourceSkuId}</p></div>
                      <div className="text-right"><p className="font-black text-slate-900">{Math.round(variant.sellingPriceVND * (1 + (draft.priceAdjustmentPercent || 0) / 100)).toLocaleString("vi-VN")}₫</p><p className="text-[10px] text-slate-500">Kho {Math.max(0, variant.stockQuantity - (draft.stockBuffer || 0))}</p></div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <button type="button" onClick={validate} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-60">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Kiểm tra khả năng đăng
              </button>
              {readiness ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className={`flex items-center justify-between p-4 ${readiness.isReady ? "bg-emerald-50" : "bg-amber-50"}`}>
                    <div><p className="text-sm font-black text-slate-950">Shopee Readiness</p><p className="text-xs text-slate-600">{readiness.stats.selectedVariants} SKU · {readiness.stats.galleryImages} ảnh · tổng kho {readiness.stats.totalStock}</p></div>
                    <div className={`text-2xl font-black ${readiness.isReady ? "text-emerald-700" : "text-amber-700"}`}>{readiness.score}%</div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {readiness.issues.length === 0 ? <p className="flex items-center gap-2 p-4 text-sm font-bold text-emerald-700"><CheckCircle2 className="h-5 w-5" />Listing đã đủ điều kiện gửi.</p> : readiness.issues.map((issue, index) => <div key={`${issue.code}-${index}`} className="flex gap-2 p-3 text-xs"><AlertCircle className={`mt-0.5 h-4 w-4 shrink-0 ${issue.severity === "BLOCKER" ? "text-rose-600" : "text-amber-600"}`} /><div><p className="font-bold text-slate-800">{issue.message}</p><p className="mt-0.5 font-mono text-[10px] text-slate-400">{issue.field}{issue.sku ? ` · ${issue.sku}` : ""}</p></div></div>)}
                  </div>
                </div>
              ) : <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">Chạy kiểm tra để xem các lỗi cụ thể trước khi gửi sang Shopee.</p>}
            </div>
          )}
        </div>
      ))}

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}

      {isConnected && product && (
        <div className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-between gap-2 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur sm:static sm:rounded-xl sm:border sm:shadow-none">
          <button type="button" disabled={step === 0 || loading} onClick={() => setStep(value => value - 1)} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-3 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30"><ArrowLeft className="h-4 w-4" /> Quay lại</button>
          <div className="flex gap-2">
            <button type="button" onClick={onExportCsv} className="hidden min-h-10 items-center gap-1 rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 sm:inline-flex"><Download className="h-4 w-4" /> CSV</button>
            {step < 3 ? <button type="button" onClick={() => setStep(value => value + 1)} className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-orange-600 px-4 text-xs font-black text-white hover:bg-orange-700">Tiếp tục <ArrowRight className="h-4 w-4" /></button> : <button type="button" disabled={loading || !readiness?.isReady} onClick={publish} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-orange-600 px-4 text-xs font-black text-white shadow-sm hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Đăng lên Shopee</button>}
          </div>
        </div>
      )}
    </div>
  );
};
