import React, { useEffect, useState } from "react";
import { Check, Globe, LogOut, RefreshCw, Settings, ShieldCheck, X } from "lucide-react";
import { Raw1688Shop } from "@hub1688/shared-types";
import { DEFAULT_API_URL, ExtensionAuthUser, getApiBaseUrl, setApiBaseUrl } from "../../shared/config.js";

interface HeaderProps { shop?: Raw1688Shop; authUser: ExtensionAuthUser | null; onLogout: () => void; onRefresh: () => void; loading: boolean; }

export const Header: React.FC<HeaderProps> = ({ shop, authUser, onLogout, onRefresh, loading }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getApiBaseUrl().then(setApiUrl);
  }, []);

  const save = async () => {
    await setApiBaseUrl(apiUrl);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };

  return <header className="sticky top-0 z-50 border-b border-slate-200 bg-white px-4 py-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#FF5A00] text-xs font-black text-white">16</span><div><h1 className="text-sm font-extrabold text-[#0B1628]">1688 SYNC HUB</h1><p className="text-xs text-slate-500">Sourcing operations</p></div></div>
      <div className="flex gap-1">
        <button type="button" onClick={() => setShowSettings(value => !value)} aria-label="Cấu hình kết nối" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Settings size={17} /></button>
        <button type="button" onClick={onRefresh} disabled={loading} aria-label="Tải lại dữ liệu" className="rounded-lg p-2 text-slate-500 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-50"><RefreshCw size={17} className={loading ? "animate-spin" : ""} /></button>
      </div>
    </div>

    {showSettings && <section aria-label="Cấu hình extension" className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between"><h2 className="text-sm font-bold text-slate-900">Kết nối an toàn</h2><button type="button" aria-label="Đóng cài đặt" onClick={() => setShowSettings(false)} className="rounded p-1 text-slate-500 hover:bg-slate-200"><X size={16} /></button></div>
      <label className="block text-xs font-semibold text-slate-700"><span className="mb-1 flex items-center gap-1"><Globe size={13} /> Backend URL</span><input type="url" value={apiUrl} onChange={event => setApiUrl(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-xs focus:border-orange-500 focus:outline-none" /></label>
      <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs text-emerald-800"><span className="flex items-center gap-1.5"><ShieldCheck size={14} /> {authUser ? authUser.email : "Chưa đăng nhập"}</span><span className="font-bold">{authUser?.role || "—"}</span></div>
      <div className="flex justify-end gap-2">{authUser && <button type="button" onClick={onLogout} className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"><LogOut size={14} />Đăng xuất</button>}<button type="button" onClick={save} className="flex items-center gap-1 rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white hover:bg-orange-700">{saved && <Check size={14} />}{saved ? "Đã lưu" : "Lưu URL"}</button></div>
    </section>}

    {shop && !showSettings && <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-xs"><span className="truncate font-semibold text-slate-700">{shop.shopName}</span><span className="rounded bg-amber-100 px-2 py-0.5 font-bold text-amber-800">★ {shop.ratingScore ?? "—"}</span></div>}
  </header>;
};
