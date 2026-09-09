import React, { useState, useEffect } from "react";
import { RefreshCw, ExternalLink, ShieldCheck, Settings, Check, Globe } from "lucide-react";
import { Raw1688Shop } from "@hub1688/shared-types";
import { getApiBaseUrl, setApiBaseUrl, DEFAULT_API_URL } from "../../shared/config.js";

interface HeaderProps {
  shop?: Raw1688Shop;
  onRefresh: () => void;
  loading: boolean;
}

export const Header: React.FC<HeaderProps> = ({ shop, onRefresh, loading }) => {
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [apiUrl, setApiUrl] = useState<string>(DEFAULT_API_URL);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    getApiBaseUrl().then(url => setApiUrl(url));
  }, []);

  const handleSaveUrl = async () => {
    await setApiBaseUrl(apiUrl);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setShowSettings(false);
    }, 1200);
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-orange-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
            16
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-sm leading-tight">1688 SYNC HUB</h1>
            <p className="text-[11px] text-gray-500 font-medium">Bản quyền Sourcing V1</p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-md transition-colors ${
              showSettings ? "text-orange-600 bg-orange-50" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            }`}
            title="Cấu hình Backend API (Vercel / Supabase)"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
            title="Tải lại dữ liệu trang 1688"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-orange-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Settings dropdown modal */}
      {showSettings && (
        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs space-y-2">
          <div className="flex items-center justify-between font-bold text-gray-800">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-orange-600" />
              Cấu hình Backend URL
            </span>
            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">
              Vercel / Local
            </span>
          </div>
          <div className="space-y-1">
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://your-sync-hub.vercel.app"
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-800 font-mono text-[11px] focus:outline-none focus:border-orange-500"
            />
            <p className="text-[10px] text-gray-500">
              Nhập domain Vercel đã deploy hoặc dùng localhost:3001
            </p>
          </div>
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setApiUrl(DEFAULT_API_URL)}
              className="text-[10px] text-gray-500 hover:underline"
            >
              Reset Localhost
            </button>
            <button
              onClick={handleSaveUrl}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-1 rounded text-[11px] flex items-center gap-1 shadow-sm"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>Đã lưu</span>
                </>
              ) : (
                <span>Lưu URL</span>
              )}
            </button>
          </div>
        </div>
      )}

      {shop && !showSettings && (
        <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1.5 truncate max-w-[260px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold text-gray-700 truncate" title={shop.shopName}>
              {shop.shopName}
            </span>
          </div>
          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
            ★ {shop.ratingScore || 4.8}
          </span>
        </div>
      )}
    </header>
  );
};
