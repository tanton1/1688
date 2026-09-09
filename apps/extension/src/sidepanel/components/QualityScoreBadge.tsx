import React from "react";
import { Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { QualityScoreResult } from "@hub1688/shared-types";

interface QualityScoreBadgeProps {
  scoreResult?: QualityScoreResult;
}

export const QualityScoreBadge: React.FC<QualityScoreBadgeProps> = ({ scoreResult }) => {
  const score = scoreResult?.totalScore ?? 92;
  const canPublish = scoreResult?.canPublish ?? true;

  const getScoreColor = (val: number) => {
    if (val >= 85) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (val >= 70) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-rose-600 bg-rose-50 border-rose-200";
  };

  return (
    <div className={`p-3 rounded-lg border flex items-center justify-between ${getScoreColor(score)}`}>
      <div className="flex items-center space-x-2.5">
        {canPublish ? (
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
        ) : (
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-500" />
        )}
        <div>
          <div className="flex items-center space-x-1.5">
            <span className="font-bold text-xs uppercase tracking-wider">Product Readiness</span>
            <span className="font-black text-sm">{score}/100</span>
          </div>
          <p className="text-[11px] opacity-90">
            {canPublish ? "Sẵn sàng đăng bán trực tiếp" : "Cần bổ sung cấu hình trước khi đăng"}
          </p>
        </div>
      </div>
      <Sparkles className="w-4 h-4 opacity-70" />
    </div>
  );
};
