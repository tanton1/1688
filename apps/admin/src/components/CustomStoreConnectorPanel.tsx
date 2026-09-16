import React, { useEffect, useMemo, useState } from "react";
import {
  CustomConnectorAuthType,
  CustomConnectorProtocol,
  CustomStoreConnectionSummary,
  WebProduct
} from "@hub1688/shared-types";
import {
  CheckCircle2,
  Code2,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  Loader2,
  PackageCheck,
  Plus,
  RefreshCw,
  Save,
  Send,
  ShieldCheck
} from "lucide-react";
import { AdminApi } from "../services/api";

interface CustomStoreConnectorPanelProps {
  product?: WebProduct | null;
  onShowToast: (message: string, type?: "success" | "error") => void;
}

interface FormState {
  id?: string;
  name: string;
  baseUrl: string;
  protocol: CustomConnectorProtocol;
  authType: CustomConnectorAuthType;
  authHeaderName: string;
  secret: string;
  publishPath: string;
  updatePath: string;
  inventoryPath: string;
  graphqlMutation: string;
}

const emptyForm = (): FormState => ({
  name: "Website REST API",
  baseUrl: "https://",
  protocol: "REST_JSON",
  authType: "BEARER",
  authHeaderName: "X-API-Key",
  secret: "",
  publishPath: "/api/products",
  updatePath: "/api/products/{externalProductId}",
  inventoryPath: "/api/products/{externalProductId}/inventory",
  graphqlMutation: "mutation UpsertProduct($product: JSON!) { upsertProduct(product: $product) { id url } }"
});

const fromSummary = (item: CustomStoreConnectionSummary): FormState => ({
  id: item.id,
  name: item.name,
  baseUrl: item.baseUrl,
  protocol: item.protocol,
  authType: item.authType,
  authHeaderName: item.authHeaderName || "X-API-Key",
  secret: "",
  publishPath: item.publishPath,
  updatePath: item.updatePath || "",
  inventoryPath: item.inventoryPath || "",
  graphqlMutation: item.graphqlMutation || ""
});

const formatDate = (value?: string) => value
  ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value))
  : "Chưa kiểm tra";

export const CustomStoreConnectorPanel: React.FC<CustomStoreConnectorPanelProps> = ({ product, onShowToast }) => {
  const [connections, setConnections] = useState<CustomStoreConnectionSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selected = useMemo(() => connections.find(item => item.id === selectedId) || null, [connections, selectedId]);
  const secretReady = form.authType === "NONE" || Boolean(form.secret.trim()) || Boolean(selected?.secretConfigured);
  const canSave = Boolean(form.name.trim() && /^https?:\/\//i.test(form.baseUrl) && /^\/(?!\/)/.test(form.publishPath) && secretReady);

  const load = async (preferredId?: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await AdminApi.getCustomStoreConnections();
      setConnections(response.connections);
      const next = response.connections.find(item => item.id === (preferredId || selectedId)) || response.connections[0];
      if (next) {
        setSelectedId(next.id);
        setForm(fromSummary(next));
      } else {
        setSelectedId("");
        setForm(emptyForm());
      }
    } catch (err: any) {
      setError(err.message || "Không thể tải connector website");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const chooseConnection = (id: string) => {
    const item = connections.find(connection => connection.id === id);
    if (!item) return;
    setSelectedId(id);
    setForm(fromSummary(item));
    setPreview(null);
    setError("");
  };

  const createNew = () => {
    setSelectedId("");
    setForm(emptyForm());
    setPreview(null);
    setError("");
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await AdminApi.saveCustomStoreConnection({
        ...(form.id ? { id: form.id } : {}),
        name: form.name.trim(),
        baseUrl: form.baseUrl.trim(),
        protocol: form.protocol,
        authType: form.authType,
        ...(form.authType === "API_KEY_HEADER" ? { authHeaderName: form.authHeaderName.trim() } : {}),
        ...(form.secret.trim() ? { secret: form.secret.trim() } : {}),
        publishPath: form.publishPath.trim(),
        ...(form.updatePath.trim() ? { updatePath: form.updatePath.trim() } : {}),
        ...(form.inventoryPath.trim() ? { inventoryPath: form.inventoryPath.trim() } : {}),
        ...(form.protocol === "GRAPHQL" ? { graphqlMutation: form.graphqlMutation.trim() } : {})
      });
      onShowToast("Đã lưu connector và mã hóa thông tin xác thực.");
      await load(response.connection.id);
    } catch (err: any) {
      setError(err.message || "Không thể lưu connector");
      onShowToast(err.message || "Không thể lưu connector", "error");
    } finally {
      setLoading(false);
    }
  };

  const test = async () => {
    if (!selectedId) return;
    setLoading(true);
    setError("");
    try {
      await AdminApi.testCustomStoreConnection(selectedId);
      onShowToast("Website phản hồi và thông tin xác thực hợp lệ.");
      await load(selectedId);
    } catch (err: any) {
      setError(err.message || "Kiểm tra kết nối thất bại");
      onShowToast(err.message || "Kiểm tra kết nối thất bại", "error");
    } finally {
      setLoading(false);
    }
  };

  const showPreview = async () => {
    if (!selectedId || !product?.id) return;
    setLoading(true);
    setError("");
    try {
      const response = await AdminApi.previewCustomStoreProduct(selectedId, product.id);
      setPreview(response.payload);
    } catch (err: any) {
      setError(err.message || "Không thể tạo payload preview");
    } finally {
      setLoading(false);
    }
  };

  const publish = async () => {
    if (!selectedId || !product?.id) return;
    setLoading(true);
    setError("");
    try {
      const response = await AdminApi.publishCustomStoreProduct(selectedId, product.id);
      onShowToast(response.result.externalProductId ? `Đã đẩy sản phẩm, ID đích ${response.result.externalProductId}.` : "Đã đẩy sản phẩm sang website.");
    } catch (err: any) {
      setError(err.message || "Đẩy sản phẩm thất bại");
      onShowToast(err.message || "Đẩy sản phẩm thất bại", "error");
    } finally {
      setLoading(false);
    }
  };

  const syncInventory = async () => {
    if (!selectedId || !product?.id) return;
    setLoading(true);
    setError("");
    try {
      await AdminApi.syncCustomStoreInventory(selectedId, product.id);
      onShowToast("Đã cập nhật giá và tồn kho sang website.");
    } catch (err: any) {
      setError(err.message || "Đồng bộ giá/tồn kho thất bại");
      onShowToast(err.message || "Đồng bộ giá/tồn kho thất bại", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-4">
      <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-white">
        <div className="flex flex-col gap-3 bg-gradient-to-br from-indigo-50 via-white to-white p-4 sm:flex-row sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white"><Globe2 className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1"><h4 className="text-sm font-black text-slate-950">Website API tùy chỉnh</h4><p className="mt-1 text-xs text-slate-600">Kết nối website có REST, GraphQL hoặc webhook mà không phụ thuộc Shopify/WooCommerce.</p></div>
          <div className="flex min-w-0 gap-2 sm:w-[360px]">
            <select value={selectedId} onChange={event => chooseConnection(event.target.value)} disabled={!connections.length || loading} className="min-h-10 min-w-0 flex-1 rounded-xl border border-indigo-200 bg-white px-3 text-xs font-bold text-slate-800">
              {!selectedId && <option value="">Connector mới</option>}
              {connections.map(item => <option key={item.id} value={item.id}>{item.name} · {item.protocol}</option>)}
            </select>
            <button type="button" onClick={createNew} disabled={loading} className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-xl border border-indigo-300 bg-white px-3 text-xs font-black text-indigo-700"><Plus className="h-4 w-4" /> Mới</button>
          </div>
        </div>

        <form onSubmit={save} className="space-y-4 border-t border-indigo-100 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="lg:col-span-2"><span className="mb-1 block text-xs font-bold text-slate-700">Tên kết nối</span><input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /></label>
            <label className="lg:col-span-2"><span className="mb-1 block text-xs font-bold text-slate-700">Base URL</span><input value={form.baseUrl} onChange={event => setForm({ ...form, baseUrl: event.target.value })} placeholder="https://store.example.com" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm" /></label>
            <label><span className="mb-1 block text-xs font-bold text-slate-700">Giao thức</span><select value={form.protocol} onChange={event => setForm({ ...form, protocol: event.target.value as CustomConnectorProtocol })} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="REST_JSON">REST JSON</option><option value="GRAPHQL">GraphQL</option><option value="WEBHOOK">Webhook</option></select></label>
            <label><span className="mb-1 block text-xs font-bold text-slate-700">Xác thực</span><select value={form.authType} onChange={event => setForm({ ...form, authType: event.target.value as CustomConnectorAuthType })} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="NONE">Không cần</option><option value="BEARER">Bearer token</option><option value="API_KEY_HEADER">API key header</option><option value="BASIC">Basic auth</option></select></label>
            {form.authType === "API_KEY_HEADER" && <label><span className="mb-1 block text-xs font-bold text-slate-700">Tên header</span><input value={form.authHeaderName} onChange={event => setForm({ ...form, authHeaderName: event.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm" /></label>}
            {form.authType !== "NONE" && <label className={form.authType === "API_KEY_HEADER" ? "" : "sm:col-span-2"}><span className="mb-1 flex justify-between text-xs font-bold text-slate-700"><span>{form.authType === "BASIC" ? "username:password" : "Secret / token"}</span>{selected?.secretConfigured && <span className="text-emerald-700">Đã mã hóa</span>}</span><div className="relative"><KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input type={showSecret ? "text" : "password"} value={form.secret} onChange={event => setForm({ ...form, secret: event.target.value })} placeholder={selected?.secretConfigured ? "Để trống nếu không đổi" : "Nhập secret"} className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-10 font-mono text-sm" /><button type="button" onClick={() => setShowSecret(value => !value)} className="absolute right-2 top-1.5 rounded-lg p-2 text-slate-500">{showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label><span className="mb-1 block text-xs font-bold text-slate-700">Tạo sản phẩm</span><input value={form.publishPath} onChange={event => setForm({ ...form, publishPath: event.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-xs" /></label>
            <label><span className="mb-1 block text-xs font-bold text-slate-700">Cập nhật sản phẩm</span><input value={form.updatePath} onChange={event => setForm({ ...form, updatePath: event.target.value })} placeholder="Tùy chọn" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-xs" /></label>
            <label><span className="mb-1 block text-xs font-bold text-slate-700">Giá & tồn kho</span><input value={form.inventoryPath} onChange={event => setForm({ ...form, inventoryPath: event.target.value })} placeholder="Tùy chọn" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-xs" /></label>
          </div>

          {form.protocol === "GRAPHQL" && <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">GraphQL mutation</span><textarea value={form.graphqlMutation} onChange={event => setForm({ ...form, graphqlMutation: event.target.value })} rows={4} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-xs" /></label>}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-1.5 text-[11px] text-slate-500"><ShieldCheck className="h-4 w-4 text-emerald-600" />Secret chỉ được giải mã phía server và không trả về trình duyệt.</p>
            <div className="flex gap-2"><button type="button" onClick={test} disabled={loading || !selectedId} className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-3 text-xs font-bold text-slate-700 disabled:opacity-40"><RefreshCw className="h-4 w-4" /> Kiểm tra</button><button type="submit" disabled={loading || !canSave} className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-4 text-xs font-black text-white disabled:bg-slate-300">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Lưu</button></div>
          </div>
        </form>
      </section>

      {selected && <section className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><CheckCircle2 className={`h-4 w-4 ${selected.lastError ? "text-amber-400" : "text-emerald-400"}`} /><h4 className="text-sm font-black">{selected.name}</h4></div><p className="mt-1 text-[11px] text-slate-400">Kiểm tra: {formatDate(selected.lastTestedAt)}{selected.lastError ? ` · ${selected.lastError}` : ""}</p></div><div className="grid grid-cols-3 gap-2"><button type="button" onClick={showPreview} disabled={loading || !product?.id} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-white/15 px-3 text-[11px] font-bold disabled:opacity-40"><Code2 className="h-4 w-4" /> Preview</button><button type="button" onClick={syncInventory} disabled={loading || !product?.id || !selected.inventoryPath} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-white/15 px-3 text-[11px] font-bold disabled:opacity-40"><PackageCheck className="h-4 w-4" /> Kho/giá</button><button type="button" onClick={publish} disabled={loading || !product?.id} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl bg-indigo-500 px-3 text-[11px] font-black hover:bg-indigo-400 disabled:opacity-40"><Send className="h-4 w-4" /> Đẩy ngay</button></div></div>
        {product && <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"><img src={product.primaryImage} alt="" className="h-12 w-12 rounded-lg bg-white object-cover" /><div className="min-w-0"><p className="line-clamp-1 text-xs font-bold">{product.titleVI}</p><p className="mt-1 text-[10px] text-slate-400">{product.variants.filter(item => item.selectedForSale).length} SKU · {product.status === "PUBLISHED" ? "Sẵn sàng đẩy" : "Cần xuất bản nội bộ"}</p></div></div>}
      </section>}

      {preview && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><h4 className="text-sm font-black text-slate-950">Payload gửi sang website</h4><p className="text-[11px] text-slate-500">Không chứa secret; kiểm tra SKU, ảnh, custom fields trước khi đẩy.</p></div><button type="button" onClick={() => setPreview(null)} className="text-xs font-bold text-slate-500">Đóng</button></div><pre className="max-h-96 overflow-auto bg-slate-950 p-4 text-[11px] leading-relaxed text-emerald-300">{JSON.stringify(preview, null, 2)}</pre></section>}
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
    </div>
  );
};
