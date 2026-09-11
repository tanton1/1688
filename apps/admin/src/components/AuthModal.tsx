import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, LogOut, Mail, ShieldCheck, X } from "lucide-react";
import { AdminApi, clearAccessToken, setAccessToken } from "../services/api";

export type UserRole = "ADMIN" | "SOURCING";
export interface CurrentUser { id?: string; email: string; name: string; role: UserRole; }
interface AuthModalProps { isOpen: boolean; currentUser: CurrentUser | null; onClose: () => void; onLogin: (user: CurrentUser) => void; onLogout: () => void; }
type AuthMode = "login" | "request-reset" | "reset-sent" | "confirm-reset" | "reset-complete";

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, currentUser, onClose, onLogin, onLogout }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [mode, setMode] = useState<AuthMode>("login");
  const [recoveryToken, setRecoveryToken] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const queryParams = new URLSearchParams(window.location.search);
    const token = hashParams.get("access_token") || "";
    const recoveryError = hashParams.get("error_description") || queryParams.get("error_description") || "";

    if (hashParams.get("type") === "recovery" && token) {
      setRecoveryToken(token);
      setMode("confirm-reset");
      setError("");
    } else if (queryParams.get("auth") === "recovery" && recoveryError) {
      setMode("request-reset");
      setError(decodeURIComponent(recoveryError.replace(/\+/g, " ")));
    }

    if (token || recoveryError) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.hash = "";
      cleanUrl.searchParams.delete("auth");
      cleanUrl.searchParams.delete("error");
      cleanUrl.searchParams.delete("error_code");
      cleanUrl.searchParams.delete("error_description");
      window.history.replaceState({}, "", cleanUrl.toString());
    }
  }, []);

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

  const resetForm = (nextMode: AuthMode) => {
    setError("");
    setPassword("");
    setPasswordConfirmation("");
    setMode(nextMode);
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setSubmitting(true);
    try {
      const result = await AdminApi.login(email.trim(), password);
      setAccessToken(result.accessToken); onLogin(result.user); setPassword(""); onClose();
    } catch (err: any) { clearAccessToken(); setError(err.message || "Không thể đăng nhập"); }
    finally { setSubmitting(false); }
  };

  const handleResetRequest = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setSubmitting(true);
    try {
      await AdminApi.requestPasswordReset(email.trim());
      setMode("reset-sent");
    } catch (err: any) { setError(err.message || "Không thể gửi email đặt lại mật khẩu"); }
    finally { setSubmitting(false); }
  };

  const handleResetConfirmation = async (event: React.FormEvent) => {
    event.preventDefault(); setError("");
    if (password !== passwordConfirmation) {
      setError("Hai mật khẩu chưa trùng khớp");
      return;
    }
    setSubmitting(true);
    try {
      await AdminApi.confirmPasswordReset(recoveryToken, password);
      setRecoveryToken("");
      setPassword("");
      setPasswordConfirmation("");
      setMode("reset-complete");
    } catch (err: any) { setError(err.message || "Không thể cập nhật mật khẩu"); }
    finally { setSubmitting(false); }
  };

  const title = mode === "login" ? "Đăng nhập Sync Hub"
    : mode === "request-reset" ? "Đặt lại mật khẩu"
      : mode === "confirm-reset" ? "Tạo mật khẩu mới"
        : mode === "reset-complete" ? "Đã đổi mật khẩu"
          : "Kiểm tra email";

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="auth-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between border-b border-slate-100 pb-4">
        <div className="flex gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-100 text-orange-600"><ShieldCheck aria-hidden="true" /></span><div><h2 id="auth-title" className="text-base font-bold text-slate-950">{currentUser ? "Tài khoản" : title}</h2><p className="mt-1 text-sm text-slate-500">{mode === "login" ? "Quyền được xác thực và cấp từ máy chủ." : "Khôi phục quyền truy cập tài khoản an toàn."}</p></div></div>
        {currentUser && <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500"><X size={18} /></button>}
      </div>
      {currentUser ? <div className="space-y-4 pt-5">
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4"><p className="font-bold text-slate-950">{currentUser.name}</p><p className="mt-1 text-sm text-slate-600">{currentUser.email}</p><span className="mt-3 inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-bold text-orange-700">{currentUser.role}</span></div>
        <button type="button" onClick={() => { clearAccessToken(); onLogout(); onClose(); }} className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50"><LogOut size={16} />Đăng xuất</button>
      </div> : <div className="pt-5">
        {error && <div role="alert" className="mb-4 flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle className="shrink-0" size={18} /><span>{error}</span></div>}

        {mode === "login" && <form onSubmit={handleLogin} className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700">Email<input ref={emailRef} type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200" /></label>
          <label className="block text-sm font-semibold text-slate-700">Mật khẩu<input type="password" autoComplete="current-password" minLength={8} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200" /></label>
          <div className="flex justify-end"><button type="button" onClick={() => resetForm("request-reset")} className="text-sm font-semibold text-orange-700 hover:text-orange-800 hover:underline">Quên mật khẩu?</button></div>
          <button disabled={submitting} className="w-full rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-700 disabled:cursor-wait disabled:opacity-60">{submitting ? "Đang xác thực…" : "Đăng nhập"}</button>
          <p className="text-xs leading-relaxed text-slate-500">Tài khoản do quản trị viên tạo trong Supabase Auth. Vai trò không thể tự chọn trên trình duyệt.</p>
        </form>}

        {mode === "request-reset" && <form onSubmit={handleResetRequest} className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700">Email tài khoản<input ref={emailRef} type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200" /></label>
          <p className="text-xs leading-relaxed text-slate-500">Hệ thống sẽ gửi liên kết dùng một lần tới email đã đăng ký.</p>
          <button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-700 disabled:cursor-wait disabled:opacity-60"><Mail size={16} />{submitting ? "Đang gửi…" : "Gửi liên kết đặt lại"}</button>
          <button type="button" onClick={() => resetForm("login")} className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"><ArrowLeft size={15} />Quay lại đăng nhập</button>
        </form>}

        {mode === "reset-sent" && <div className="space-y-4 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Mail size={22} /></span>
          <p className="text-sm leading-relaxed text-slate-600">Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi. Hãy kiểm tra cả thư rác.</p>
          <button type="button" onClick={() => resetForm("login")} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"><ArrowLeft size={15} />Quay lại đăng nhập</button>
        </div>}

        {mode === "confirm-reset" && <form onSubmit={handleResetConfirmation} className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700">Mật khẩu mới<input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} required autoFocus className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200" /></label>
          <label className="block text-sm font-semibold text-slate-700">Nhập lại mật khẩu<input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={passwordConfirmation} onChange={event => setPasswordConfirmation(event.target.value)} required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200" /></label>
          <p className="text-xs leading-relaxed text-slate-500">Dùng ít nhất 8 ký tự và không tái sử dụng mật khẩu cũ.</p>
          <button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-700 disabled:cursor-wait disabled:opacity-60"><KeyRound size={16} />{submitting ? "Đang cập nhật…" : "Lưu mật khẩu mới"}</button>
        </form>}

        {mode === "reset-complete" && <div className="space-y-4 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 size={24} /></span>
          <p className="text-sm leading-relaxed text-slate-600">Mật khẩu đã được cập nhật. Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.</p>
          <button type="button" onClick={() => resetForm("login")} className="w-full rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-700">Đăng nhập</button>
        </div>}
      </div>}
    </div>
  </div>;
};
