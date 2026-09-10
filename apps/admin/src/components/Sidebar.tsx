import React from "react";
import {
  LayoutDashboard,
  Package,
  RefreshCw,
  DollarSign,
  ShoppingBag,
  BookOpen,
  Layers,
  ExternalLink,
  Settings,
  Sparkles
} from "lucide-react";

export type AdminTab = "DASHBOARD" | "PRODUCTS" | "ORDERS" | "DIFFS" | "PRICING" | "GLOSSARY";

interface SidebarProps {
  currentTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  pendingDiffCount: number;
  totalProductsCount: number;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  pendingDiffCount,
  totalProductsCount,
  onOpenSettings
}) => {
  const menuItems = [
    {
      id: "DASHBOARD" as AdminTab,
      label: "Tổng Quan",
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: "PRODUCTS" as AdminTab,
      label: "Sản Phẩm Đồng Bộ",
      icon: Package,
      badge: totalProductsCount > 0 ? totalProductsCount : null
    },
    {
      id: "ORDERS" as AdminTab,
      label: "Đơn Hàng & Mua Hộ 1688",
      icon: ShoppingBag,
      badge: "Mới",
      badgeColor: "bg-emerald-500 text-white"
    },
    {
      id: "DIFFS" as AdminTab,
      label: "Xử Lý Lệch (Diff)",
      icon: RefreshCw,
      badge: pendingDiffCount > 0 ? `${pendingDiffCount} cần duyệt` : null,
      badgeColor: "bg-amber-500 text-white"
    },
    {
      id: "PRICING" as AdminTab,
      label: "Cấu Hình Định Giá",
      icon: DollarSign,
      badge: null
    },
    {
      id: "GLOSSARY" as AdminTab,
      label: "Từ Điển Dịch AI",
      icon: BookOpen,
      badge: null
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen fixed left-0 top-0 z-30 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800 bg-slate-950/60">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-black shadow-lg shadow-orange-500/20">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <div className="text-white font-bold text-sm tracking-wide flex items-center gap-1.5">
            1688 SYNC HUB
            <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.2 rounded font-semibold">
              PRO
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Admin Management Portal</p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-300">
          Phân Hệ Quản Trị
        </div>

        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? "bg-orange-600 text-white shadow-md shadow-orange-600/30 font-bold"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/80"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    item.badgeColor || (isActive ? "bg-white text-orange-600" : "bg-slate-800 text-slate-300")
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Extension & Status Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 space-y-2">
        <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-slate-400 font-medium">Trạng thái Hub</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Sẵn sàng
            </span>
          </div>
          <div className="text-[11px] text-slate-300 truncate font-mono">
            1688-phi.vercel.app
          </div>
        </div>

        <button
          onClick={onOpenSettings}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 transition-colors"
        >
          <Settings className="w-3.5 h-3.5 text-slate-400" />
          <span>Cấu hình Backend URL</span>
        </button>
      </div>
    </aside>
  );
};
