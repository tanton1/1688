import React, { useState, useEffect } from "react";
import { PricingRuleConfig, PricingBreakdown } from "@hub1688/shared-types";
import { AdminApi } from "../services/api";
import {
  DollarSign,
  Calculator,
  Sliders,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Percent,
  CheckCircle2,
  Info,
  Plus,
  Pencil,
  Trash2,
  Save,
  X
} from "lucide-react";

export const PricingRulesView: React.FC = () => {
  const [rules, setRules] = useState<PricingRuleConfig[]>([]);
  const [testCny, setTestCny] = useState<number>(35);
  const [selectedRuleId, setSelectedRuleId] = useState<string>("CLOTHING_SHIRTS");
  const [breakdown, setBreakdown] = useState<PricingBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editing, setEditing] = useState<PricingRuleConfig | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState("");

  const openNew = () => {
    setIsNew(true);
    setEditing({ id: "", name: "", categoryKeyword: "", exchangeRate: 3800, domesticChinaShipVND: 12000, intlShipPerKgVND: 30000, estimatedWeightKg: 0.3, multiplier: 2.2, platformFeeRate: 0.05, minProfitVND: 50000, minMarginPercent: 35, roundToThousand: true });
  };
  const saveRule = async () => {
    if (!editing) return;
    setError("");
    try {
      const result = isNew ? await AdminApi.createPricingRule(editing) : await AdminApi.updatePricingRule(editing.id, editing);
      setRules(current => isNew ? [...current, result.rule] : current.map(rule => rule.id === result.rule.id ? result.rule : rule));
      setEditing(null); setIsNew(false);
    } catch (err: any) { setError(err.message || "Không thể lưu quy tắc"); }
  };
  const deleteRule = async (id: string) => {
    try { await AdminApi.deletePricingRule(id); setRules(current => current.filter(rule => rule.id !== id)); }
    catch (err: any) { setError(err.message || "Không thể xóa quy tắc"); }
  };

  useEffect(() => {
    AdminApi.getPricingRules()
      .then(res => {
        setRules(res.rules || []);
        if (res.rules?.length > 0) {
          setSelectedRuleId(res.rules[0].id);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (testCny > 0) {
      setIsLoading(true);
      AdminApi.calculatePricing(testCny, selectedRuleId)
        .then(res => setBreakdown(res.breakdown))
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [testCny, selectedRuleId]);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-600" />
          Cấu Hình Định Giá & Tính Toán Giá Vốn Tự Động
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Hệ thống áp dụng công thức tính giá vốn chuẩn E-Commerce quốc tế: Tỷ giá NDT/VND + Phí vận chuyển nội địa TQ + Cước quốc tế cân nặng + Tỷ suất lợi nhuận an toàn (Margin Safety Floor).
        </p>
      </div>

      {/* Simulator: Thử Nghiệm Công Thức Giá Tức Thì */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-700">
        <div className="flex items-center gap-2 mb-4 text-orange-400 font-bold text-xs">
          <Calculator className="w-4 h-4" />
          MÔ PHỎNG ĐỊNH GIÁ TRỰC TIẾP (PRICING SIMULATOR)
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Cột 1: Nhập giá tệ */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Giá gốc trên 1688 (Nhân Dân Tệ - ¥)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">¥</span>
                <input
                  type="number"
                  step="0.5"
                  value={testCny}
                  onChange={(e) => setTestCny(parseFloat(e.target.value) || 0)}
                  className="w-full text-base font-bold pl-8 pr-3 py-2 bg-slate-950/80 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Quy tắc ngành hàng
              </label>
              <select
                value={selectedRuleId}
                onChange={(e) => setSelectedRuleId(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
              >
                {rules.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} (Hệ số x{r.multiplier}, Min margin {r.minMarginPercent}%)
                  </option>
                ))}
              </select>
            </div>

            <div className="text-[11px] text-slate-400 space-y-1 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between">
                <span>Tỷ giá NDT/VND:</span>
                <strong className="text-white">3,800 đ/tệ</strong>
              </div>
              <div className="flex justify-between">
                <span>Phí cước quốc tế:</span>
                <strong className="text-white">30,000 đ/kg</strong>
              </div>
            </div>
          </div>

          {/* Cột 2 & 3: Kết quả phân tích chi phí */}
          <div className="md:col-span-2 bg-slate-950/60 rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
            {breakdown ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Quy đổi tiền hàng</span>
                    <div className="text-sm font-bold text-white mt-1">
                      {breakdown.costVND.toLocaleString()}đ
                    </div>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Phí vận chuyển TQ-VN</span>
                    <div className="text-sm font-bold text-white mt-1">
                      {(breakdown.chinaShipVND + breakdown.intlShipVND).toLocaleString()}đ
                    </div>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-orange-400 uppercase font-bold">Tổng Chi Phí Vốn</span>
                    <div className="text-sm font-extrabold text-orange-400 mt-1">
                      {breakdown.totalCostVND.toLocaleString()}đ
                    </div>
                  </div>

                  <div className="bg-emerald-950/60 border border-emerald-500/40 p-2.5 rounded-lg">
                    <span className="text-[10px] text-emerald-400 uppercase font-bold">Giá Bán Đề Xuất</span>
                    <div className="text-base font-black text-emerald-400 mt-0.5">
                      {breakdown.finalSellingPriceVND.toLocaleString()}đ
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-300">Biên Lợi Nhuận Gộp Ước Tính:</span>
                    <strong className="text-emerald-400 text-sm font-black">
                      {breakdown.marginPercent}%
                    </strong>
                  </div>

                  <div className="text-slate-300">
                    Lợi nhuận ròng: <strong className="text-white font-bold">{breakdown.grossProfitVND.toLocaleString()}đ</strong> / sản phẩm
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Đang tính toán...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Danh Sách Các Quy Tắc Định Giá Hiện Có */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 font-bold text-sm text-slate-900 flex items-center justify-between gap-3">
          <span>Danh Sách Quy Tắc Ngành Hàng Đang Áp Dụng</span>
          <button type="button" onClick={openNew} className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white hover:bg-orange-700"><Plus size={14} />Thêm quy tắc</button>
        </div>

        {error && <div role="alert" className="m-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
        {editing && <div role="dialog" aria-modal="true" aria-labelledby="pricing-editor-title" className="m-4 rounded-xl border border-orange-200 bg-orange-50/50 p-4">
          <div className="mb-3 flex items-center justify-between"><h3 id="pricing-editor-title" className="text-sm font-bold text-slate-900">{isNew ? "Quy tắc mới" : `Sửa ${editing.name}`}</h3><button type="button" aria-label="Đóng" onClick={() => setEditing(null)}><X size={17} /></button></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {isNew && <label className="text-xs font-semibold text-slate-700">ID<input value={editing.id} onChange={e => setEditing({ ...editing, id: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} className="mt-1 w-full rounded border p-2 font-mono" /></label>}
            <label className="text-xs font-semibold text-slate-700">Tên<input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="mt-1 w-full rounded border p-2" /></label>
            <label className="text-xs font-semibold text-slate-700">Từ khóa<input value={editing.categoryKeyword || ""} onChange={e => setEditing({ ...editing, categoryKeyword: e.target.value })} className="mt-1 w-full rounded border p-2" /></label>
            {(["exchangeRate", "domesticChinaShipVND", "intlShipPerKgVND", "estimatedWeightKg", "multiplier", "platformFeeRate", "minProfitVND", "minMarginPercent"] as const).map(field => <label key={field} className="text-xs font-semibold text-slate-700">{field}<input type="number" step="any" value={editing[field]} onChange={e => setEditing({ ...editing, [field]: Number(e.target.value) })} className="mt-1 w-full rounded border p-2" /></label>)}
          </div>
          <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="rounded-lg px-3 py-2 text-xs font-semibold">Hủy</button><button type="button" onClick={saveRule} className="inline-flex items-center gap-1 rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white"><Save size={14} />Lưu</button></div>
        </div>}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="p-3.5">Tên Quy Tắc</th>
                <th className="p-3.5">Từ Khóa Ngành</th>
                <th className="p-3.5">Tỷ Giá NDT</th>
                <th className="p-3.5">Cước Vận Chuyển</th>
                <th className="p-3.5">Hệ Số Nhân</th>
                <th className="p-3.5">Lợi Nhuận Min</th>
                <th className="p-3.5 text-center">Margin Tối Thiểu</th>
                <th className="p-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rules.map(rule => (
                <tr key={rule.id} className="hover:bg-slate-50">
                  <td className="p-3.5 font-bold text-slate-900">{rule.name}</td>
                  <td className="p-3.5">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-semibold">
                      {rule.categoryKeyword || "Mặc định"}
                    </span>
                  </td>
                  <td className="p-3.5 font-semibold text-slate-700">{rule.exchangeRate.toLocaleString()}đ</td>
                  <td className="p-3.5 text-slate-600">
                    {rule.domesticChinaShipVND.toLocaleString()}đ TQ + {(rule.intlShipPerKgVND * rule.estimatedWeightKg).toLocaleString()}đ quốc tế
                  </td>
                  <td className="p-3.5 font-bold text-orange-600">x{rule.multiplier}</td>
                  <td className="p-3.5 text-slate-700 font-medium">{rule.minProfitVND.toLocaleString()}đ</td>
                  <td className="p-3.5 text-center">
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                      ≥ {rule.minMarginPercent}%
                    </span>
                  </td>
                  <td className="p-3.5"><div className="flex justify-end gap-1"><button type="button" aria-label={`Sửa ${rule.name}`} onClick={() => { setEditing({ ...rule }); setIsNew(false); }} className="rounded p-2 text-slate-500 hover:bg-slate-100"><Pencil size={14} /></button><button type="button" aria-label={`Xóa ${rule.name}`} onClick={() => deleteRule(rule.id)} className="rounded p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={14} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
