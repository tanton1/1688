import React, { useState, useEffect } from "react";
import { RefreshCw, ExternalLink, ShieldCheck, Settings, Check, Globe, Sparkles, KeyRound, Cpu, Shield, Lock, EyeOff } from "lucide-react";
import { Raw1688Shop } from "@hub1688/shared-types";
import {
  getApiBaseUrl,
  setApiBaseUrl,
  fetchBackendAiConfig,
  updateBackendAiConfig,
  getSelectedModel,
  setSelectedModel,
  BackendAiConfig,
  DEFAULT_API_URL
} from "../../shared/config.js";

interface HeaderProps {
  shop?: Raw1688Shop;
  onRefresh: () => void;
  loading: boolean;
}

export const Header: React.FC<HeaderProps> = ({ shop, onRefresh, loading }) => {
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [apiUrl, setApiUrl] = useState<string>(DEFAULT_API_URL);
  const [backendAiConfig, setBackendAiConfig] = useState<BackendAiConfig | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState<string>("");
  const [aiModel, setAiModel] = useState<string>("gemini-flash-8");
  const [isCustomModel, setIsCustomModel] = useState<boolean>(false);
  const [customModelName, setCustomModelName] = useState<string>("");
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    getApiBaseUrl().then(url => setApiUrl(url));
    getSelectedModel().then(m => setAiModel(m));
    fetchBackendAiConfig().then(cfg => {
      if (cfg) {
        setBackendAiConfig(cfg);
        if (cfg.defaultModel) setAiModel(cfg.defaultModel);
      }
    });
  }, []);

  const handleSaveSettings = async () => {
    const finalModel = isCustomModel && customModelName.trim() ? customModelName.trim() : aiModel;

    await setApiBaseUrl(apiUrl);
    await setSelectedModel(finalModel);

    const updateParams: { apiKey?: string; model?: string } = { model: finalModel };
    if (apiKeyInput.trim()) {
      updateParams.apiKey = apiKeyInput.trim();
    }

    await updateBackendAiConfig(updateParams);
    setApiKeyInput(""); // Xóa sạch input key ngay sau khi lưu để không lưu lại bộ nhớ

    const fresh = await fetchBackendAiConfig();
    if (fresh) setBackendAiConfig(fresh);

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
            title="Cấu hình Backend API & AI Gateway (apikey.fun)"
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
        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs space-y-3">
          {/* Backend URL */}
          <div className="space-y-1">
            <div className="flex items-center justify-between font-bold text-gray-800">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-orange-600" />
                Backend API URL
              </span>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">
                Vercel / Local
              </span>
            </div>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://your-sync-hub.vercel.app"
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-800 font-mono text-[11px] focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* AI Gateway (apikey.fun) - Lưu bảo mật trên backend */}
          <div className="space-y-2 pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between font-bold text-gray-800">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                AI Gateway (apikey.fun)
              </span>
              <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-600" />
                Bảo mật Backend
              </span>
            </div>

            {/* Trạng thái key trên server */}
            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-md space-y-1.5">
              <div className="flex items-center justify-between text-[10.5px]">
                <span className="font-bold text-emerald-800 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-600" />
                  Bảo mật Backend (3 Chùm Key Riêng Biệt):
                </span>
                <span className="font-mono text-emerald-700 font-semibold">
                  {backendAiConfig?.isConfigured ? "Đã Kích Hoạt" : "Chưa Cấu Hình"}
                </span>
              </div>
              <div className="text-[10px] text-emerald-800 space-y-0.5">
                <div className="flex justify-between">
                  <span>Gemini Flash 6/7/8:</span>
                  <code className="font-mono bg-white px-1 rounded border border-emerald-200">{backendAiConfig?.maskedGeminiKey || backendAiConfig?.maskedKey || "Chưa cấu hình"}</code>
                </div>
                <div className="flex justify-between">
                  <span>OpenAI Sol / Luna 5.6:</span>
                  <code className="font-mono bg-white px-1 rounded border border-emerald-200">{backendAiConfig?.maskedOpenAiKey || "Chưa cấu hình"}</code>
                </div>
                <div className="flex justify-between">
                  <span>GPT-Image-2:</span>
                  <code className="font-mono bg-white px-1 rounded border border-emerald-200">{backendAiConfig?.maskedImageKey || "Chưa cấu hình"}</code>
                </div>
              </div>
            </div>

            {/* Nhập key mới */}
            <div className="space-y-1">
              <label className="text-[10px] text-gray-600 flex items-center gap-1 font-medium">
                <KeyRound className="w-3 h-3 text-gray-400" />
                Cập nhật API Key mới (Lưu trực tiếp vào Backend .env):
              </label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="sk-... (để trống nếu muốn giữ nguyên key cũ)"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-800 font-mono text-[11px] focus:outline-none focus:border-purple-500"
              />
              <p className="text-[9.5px] text-gray-400">
                🛡️ Key được lưu trên máy chủ backend, <strong>không lưu ở trình duyệt client</strong>, tuyệt đối không lộ secret.
              </p>
            </div>

            {/* Mô hình AI mới nhất */}
            <div className="space-y-1">
              <label className="text-[10px] text-gray-600 flex items-center gap-1 font-medium">
                <Cpu className="w-3 h-3 text-gray-400" />
                Mô hình AI mới nhất (Gemini Flash 6,7,8 & ChatGPT Luna/Sol 5.6)
              </label>
              <select
                value={isCustomModel ? "CUSTOM" : aiModel}
                onChange={(e) => {
                  if (e.target.value === "CUSTOM") {
                    setIsCustomModel(true);
                  } else {
                    setIsCustomModel(false);
                    setAiModel(e.target.value);
                  }
                }}
                className="w-full px-2 py-1.5 border border-gray-300 rounded bg-white text-gray-800 text-[11px] font-medium focus:outline-none focus:border-purple-500"
              >
                <optgroup label="✨ Google Gemini (Flash 6, 7, 8 - Mới Nhất)">
                  <option value="gemini-flash-8">Gemini Flash 8 (Next-Gen Ultra Fast)</option>
                  <option value="gemini-flash-7">Gemini Flash 7 (Next-Gen Vision & OCR)</option>
                  <option value="gemini-flash-6">Gemini Flash 6 (Next-Gen Balanced)</option>
                  <option value="gemini-3.8-flash">Gemini 3.8 Flash (Native ID)</option>
                  <option value="gemini-3.7-flash">Gemini 3.7 Flash (Native ID)</option>
                  <option value="gemini-3.6-flash">Gemini 3.6 Flash (Native ID)</option>
                  <option value="gemini-3-pro">Gemini 3 Pro (Lập luận sâu)</option>
                </optgroup>
                <optgroup label="🤖 OpenAI ChatGPT (Sol 5.6, Luna 5.6 & Terra)">
                  <option value="sol-5.6">ChatGPT Sol 5.6 (Vision & Multimodal Đỉnh Cao)</option>
                  <option value="luna-5.6">ChatGPT Luna 5.6 (Siêu Tốc & Sáng Tạo E-commerce)</option>
                  <option value="terra-5.6">ChatGPT Terra 5.6 (Reasoning & Analysis)</option>
                  <option value="gpt-5.6-sol">GPT-5.6 Sol (Native ID)</option>
                  <option value="gpt-6-astra">GPT-6 Astra / Luna (Native ID)</option>
                </optgroup>
                <optgroup label="🎨 Image & Media">
                  <option value="gpt-image-2">GPT-Image-2 (Tạo & Xử lý ảnh)</option>
                </optgroup>
                <optgroup label="⚙️ Tùy chọn khác">
                  <option value="CUSTOM">-- Nhập Model ID Khác --</option>
                </optgroup>
              </select>

              {isCustomModel && (
                <input
                  type="text"
                  value={customModelName}
                  onChange={(e) => setCustomModelName(e.target.value)}
                  placeholder="Nhập ID mô hình trên apikey.fun (ví dụ: gemini-flash-8, luna-5.6...)"
                  className="w-full mt-1 px-2.5 py-1.5 border border-purple-300 rounded bg-purple-50/50 text-gray-800 font-mono text-[11px] focus:outline-none focus:border-purple-600"
                />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setApiUrl(DEFAULT_API_URL)}
              className="text-[10px] text-gray-500 hover:underline"
            >
              Reset URL
            </button>
            <button
              onClick={handleSaveSettings}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-1.5 rounded text-[11px] flex items-center gap-1 shadow-sm transition-all active:scale-95"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3 h-3 text-emerald-300" />
                  <span>Đã lưu vào Backend</span>
                </>
              ) : (
                <span>Lưu Cài Đặt Server</span>
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
