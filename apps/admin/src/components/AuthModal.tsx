import React, { useState } from "react";
import {
  ShieldCheck,
  User,
  Key,
  Lock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ExternalLink
} from "lucide-react";

export type UserRole = "ADMIN" | "SOURCING";

export interface CurrentUser {
  email: string;
  name: string;
  role: UserRole;
  isDemo?: boolean;
}

interface AuthModalProps {
  isOpen: boolean;
  currentUser: CurrentUser | null;
  onClose: () => void;
  onLogin: (user: CurrentUser) => void;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onLogin,
  onLogout
}) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("ADMIN");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Vui lòng nhập đầy đủ Email và Mật khẩu");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu phải từ 6 ký tự trở lên");
      return;
    }

    const loggedUser: CurrentUser = {
      email,
      name: name.trim() || email.split("@")[0],
      role,
      isDemo: false
    };

    onLogin(loggedUser);
    onClose();
  };

  const handleDemoBypass = (selectedRole: UserRole) => {
    const demoUser: CurrentUser = {
      email: selectedRole === "ADMIN" ? "admin@1688hub.com" : "sourcing@1688hub.com",
      name: selectedRole === "ADMIN" ? "Quản Trị Viên (Owner)" : "Chuyên Viên Tìm Hàng 1688",
      role: selectedRole,
      isDemo: true
    };
    onLogin(demoUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {currentUser ? "Tài Khoản Phân Quyền" : isRegisterMode ? "Đăng Ký Tài Khoản" : "Đăng Nhập Quản Trị"}
              </h3>
              <p className="text-[11px] text-slate-500">
                Hệ thống bảo vệ phân quyền Admin & Sourcing Specialist
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {currentUser ? (
          <div className="py-6 space-y-4">
            <div className="p-4 bg-orange-50/60 border border-orange-200 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 truncate">
                    {currentUser.name}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      currentUser.role === "ADMIN"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {currentUser.role === "ADMIN" ? "Quản Trị Viên (Owner)" : "Sourcing Specialist"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-1.5 p-3 bg-slate-50 rounded-lg">
              <p className="font-semibold text-slate-700">Quyền hạn tài khoản của bạn:</p>
              {currentUser.role === "ADMIN" ? (
                <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                  <li>Toàn quyền Thêm, Sửa, Xóa và Đăng bán sản phẩm</li>
                  <li>Cấu hình đồng bộ WooCommerce, Shopify & Telegram</li>
                  <li>Phê duyệt cập nhật giá sỉ & hàng tồn 1688</li>
                  <li>Điều chỉnh công thức định giá tự động và biên lợi nhuận</li>
                </ul>
              ) : (
                <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                  <li>Bóc tách và biên tập sản phẩm từ 1688</li>
                  <li>Tối ưu SEO, hình ảnh và tạo bài viết AI Copywriter</li>
                  <li>Xem danh sách chênh lệch giá & đề xuất xuất bản</li>
                </ul>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="px-3.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Đăng Xuất
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-4 space-y-4">
            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {isRegisterMode && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Họ và Tên:
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email:
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@1688hub.com"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mật khẩu:
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vai trò (Role):
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  <option value="ADMIN">Quản Trị Viên (Owner / Admin) – Toàn quyền</option>
                  <option value="SOURCING">Chuyên Viên Nguồn Hàng (Sourcing Specialist)</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm shadow-orange-500/30 transition-all"
                >
                  {isRegisterMode ? "Đăng Ký Tài Khoản" : "Đăng Nhập"}
                </button>
              </div>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="bg-white px-2 text-slate-400 font-semibold">
                  Hoặc trải nghiệm nhanh không cần mật khẩu
                </span>
              </div>
            </div>

            {/* Quick Demo Bypass Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoBypass("ADMIN")}
                className="p-2.5 bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-300 rounded-xl text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 group-hover:text-orange-600">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  Vào vai Admin (Owner)
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Toàn quyền hệ thống & đồng bộ</p>
              </button>

              <button
                type="button"
                onClick={() => handleDemoBypass("SOURCING")}
                className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 group-hover:text-blue-600">
                  <User className="w-3.5 h-3.5 text-blue-500" />
                  Vào vai Sourcing
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Biên tập SEO & kéo nguồn 1688</p>
              </button>
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(!isRegisterMode);
                  setError("");
                }}
                className="text-xs text-orange-600 hover:underline font-semibold"
              >
                {isRegisterMode
                  ? "Đã có tài khoản? Đăng nhập ngay"
                  : "Chưa có tài khoản? Đăng ký mới"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
