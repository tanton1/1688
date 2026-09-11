import React, { useState } from "react";
import { AlertCircle, Loader2, LogIn, ShieldCheck } from "lucide-react";
import { ExtensionAuthUser } from "../../shared/config.js";

interface ExtensionLoginCardProps {
  onLogin: (email: string, password: string) => Promise<ExtensionAuthUser>;
  error?: string;
}

export const ExtensionLoginCard: React.FC<ExtensionLoginCardProps> = ({ onLogin, error }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError("");
    setSubmitting(true);
    try {
      await onLogin(email.trim(), password);
      setPassword("");
    } catch (err: any) {
      setLocalError(err.message || "Không thể đăng nhập");
    } finally {
      setSubmitting(false);
    }
  };

  return <section className="rounded-xl border border-orange-200 bg-white p-3 shadow-sm">
    <div className="mb-3 flex items-start gap-2">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-orange-100 text-orange-700"><ShieldCheck size={17} /></span>
      <div><h2 className="text-xs font-extrabold text-slate-900">Đăng nhập để đồng bộ</h2><p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">Dùng cùng tài khoản Supabase/Admin Hub. Phiên đăng nhập sẽ được tự động gia hạn.</p></div>
    </div>
    {(localError || error) && <div role="alert" className="mb-3 flex gap-1.5 rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700"><AlertCircle size={14} className="shrink-0" /><span>{localError || error}</span></div>}
    <form onSubmit={submit} className="space-y-2">
      <input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} placeholder="Email tài khoản" className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs focus:border-orange-500 focus:outline-none" />
      <input type="password" autoComplete="current-password" minLength={8} maxLength={128} required value={password} onChange={event => setPassword(event.target.value)} placeholder="Mật khẩu" className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs focus:border-orange-500 focus:outline-none" />
      <button disabled={submitting} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white hover:bg-orange-700 disabled:opacity-60">
        {submitting ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />}{submitting ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>
    </form>
  </section>;
};
