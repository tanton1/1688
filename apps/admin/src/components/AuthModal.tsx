import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, LogOut, ShieldCheck, X } from "lucide-react";
import { AdminApi, clearAccessToken, setAccessToken } from "../services/api";

export type UserRole = "ADMIN" | "SOURCING";
export interface CurrentUser { id?: string; email: string; name: string; role: UserRole; }
interface AuthModalProps { isOpen: boolean; currentUser: CurrentUser | null; onClose: () => void; onLogin: (user: CurrentUser) => void; onLogout: () => void; }

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, currentUser, onClose, onLogin, onLogout }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => emailRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && currentUser) onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("button,input,[href],[tabindex]:not([tabindex='-1'])")].filter(element => !element.hasAttribute("disabled"));
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previouslyFocused?.focus(); };
  }, [isOpen, currentUser, onClose]);

  if (!isOpen) return null;
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setSubmitting(true);
    try {
      const result = await AdminApi.login(email.trim(), password);
      setAccessToken(result.accessToken); onLogin(result.user); setPassword(""); onClose();
    } catch (err: any) { clearAccessToken(); setError(err.message || "Không thể đăng nhập"); }
    finally { setSubmitting(false); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="auth-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between border-b border-slate-100 pb-4">
        <div className="flex gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-100 text-orange-600"><ShieldCheck aria-hidden="true" /></span><div><h2 id="auth-title" className="text-base font-bold text-slate-950">{currentUser ? "Tài khoản" : "Đăng nhập Sync Hub"}</h2><p className="mt-1 text-sm text-slate-500">Quyền được xác thực và cấp từ máy chủ.</p></div></div>
        {currentUser && <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500"><X size={18} /></button>}
      </div>
      {currentUser ? <div className="space-y-4 pt-5">
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4"><p className="font-bold text-slate-950">{currentUser.name}</p><p className="mt-1 text-sm text-slate-600">{currentUser.email}</p><span className="mt-3 inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-bold text-orange-700">{currentUser.role}</span></div>
        <button type="button" onClick={() => { clearAccessToken(); onLogout(); onClose(); }} className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50"><LogOut size={16} />Đăng xuất</button>
      </div> : <form onSubmit={handleSubmit} className="space-y-4 pt-5">
        {error && <div role="alert" className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle className="shrink-0" size={18} /><span>{error}</span></div>}
        <label className="block text-sm font-semibold text-slate-700">Email<input ref={emailRef} type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200" /></label>
        <label className="block text-sm font-semibold text-slate-700">Mật khẩu<input type="password" autoComplete="current-password" minLength={8} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200" /></label>
        <button disabled={submitting} className="w-full rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-700 disabled:cursor-wait disabled:opacity-60">{submitting ? "Đang xác thực…" : "Đăng nhập"}</button>
        <p className="text-xs leading-relaxed text-slate-500">Tài khoản do quản trị viên tạo trong Supabase Auth. Vai trò không thể tự chọn trên trình duyệt.</p>
      </form>}
    </div>
  </div>;
};
