import React, { useState } from "react";
import { ProductDiffSummary } from "@hub1688/shared-types";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Info
} from "lucide-react";

interface DiffCenterViewProps {
  diffLogs: ProductDiffSummary[];
  onResolveDiff: (webProductId: string, action: "APPLY" | "IGNORE") => void;
}

export const DiffCenterView: React.FC<DiffCenterViewProps> = ({
  diffLogs,
  onResolveDiff
}) => {
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const handleAction = async (webProductId: string, action: "APPLY" | "IGNORE") => {
    setResolvingId(webProductId);
    await onResolveDiff(webProductId, action);
    setResolvingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Trung Tâm Xử Lý Biến Động Nguồn 1688
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Hệ thống liên tục kiểm tra giá nhập, tồn kho tại các xưởng sản xuất 1688 để bảo vệ biên lợi nhuận của bạn.
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-slate-700">Đang chờ xử lý:</span>{" "}
            <span className="text-xs font-black text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
              {diffLogs.length} cảnh báo
            </span>
          </div>
        </div>
      </div>

      {/* Danh sách các biến động */}
      <div className="space-y-4">
        {diffLogs.map((log) => (
          <div
            key={log.webProductId}
            className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden"
          >
            {/* Header của sản phẩm */}
            <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                  1688 #{log.sourceProductId}
                </span>
                <h3 className="text-xs font-bold text-slate-900">
                  {log.productTitle}
                </h3>
                <a
                  href={`https://detail.1688.com/offer/${log.sourceProductId}.html`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-orange-600 hover:underline text-[11px] font-semibold flex items-center gap-0.5"
                >
                  Xem xưởng <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <span className="text-[11px] text-slate-400">
                Phát hiện: {new Date(log.detectedAt).toLocaleString("vi-VN")}
              </span>
            </div>

            {/* Chi tiết các trường thay đổi */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {log.changes.map((change, cIdx) => (
                  <div
                    key={cIdx}
                    className={`p-3.5 rounded-lg border text-xs space-y-2 ${
                      change.severity === "CRITICAL"
                        ? "bg-rose-50/40 border-rose-200"
                        : change.severity === "WARNING"
                        ? "bg-amber-50/40 border-amber-200"
                        : "bg-blue-50/40 border-blue-200"
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-800 flex items-center gap-1.5">
                        {change.fieldName === "price" ? (
                          <>
                            <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
                            Biến Động Giá Nhập 1688
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            Thay Đổi Tồn Kho / Phân Loại
                          </>
                        )}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-extrabold uppercase ${
                          change.severity === "CRITICAL"
                            ? "bg-rose-100 text-rose-700"
                            : change.severity === "WARNING"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {change.severity}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-slate-700 bg-white p-2.5 rounded border border-slate-200">
                      <div className="flex-1">
                        <span className="text-[10px] text-slate-400 block font-medium">Trước đây:</span>
                        <span className="font-semibold text-slate-700">{String(change.oldValue)}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                      <div className="flex-1">
                        <span className="text-[10px] text-slate-400 block font-medium">Hiện tại trên 1688:</span>
                        <span className="font-bold text-rose-600">{String(change.newValue)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Khuyến nghị & Quyết định */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-600 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>
                    <strong>Khuyến nghị hệ thống:</strong> Cập nhật lại giá vốn và tắt đặt hàng cho các biến thể đã hết hàng tại nguồn.
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAction(log.webProductId, "IGNORE")}
                    disabled={resolvingId === log.webProductId}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex items-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Bỏ Qua & Giữ Nguyên
                  </button>

                  <button
                    onClick={() => handleAction(log.webProductId, "APPLY")}
                    disabled={resolvingId === log.webProductId}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {resolvingId === log.webProductId ? "Đang xử lý..." : "Chấp Nhận Cập Nhật"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {diffLogs.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-2xs">
            <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900">Không có biến động nào cần xử lý</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Tất cả giá bán, tồn kho và biến thể trên website hiện đều khớp chính xác với tình trạng xưởng 1688.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
