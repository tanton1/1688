import { detectAnyCommercePage } from "./page-detector.js";
import { UniversalPlatformExtractor } from "./extractors/universal-platform.extractor.js";
import { injectSourceOverlay } from "./overlay/source-overlay.js";
import { injectBulkSelectionBar } from "./overlay/bulk-checkbox.js";
import { ExistingProductCheckResult } from "@hub1688/shared-types";
import { apiFetch } from "../shared/config.js";

console.log("[1688 Hub] Multi-Platform Content Script đã nạp thành công (1688, Taobao, Tmall, Shopee, TikTok Shop, AliExpress, Etsy, Amazon)!");

function runPageDetection() {
  const { platform, pageType, productId, offerId } = detectAnyCommercePage();
  const effectiveId = offerId || productId;
  console.log(`[1688 Hub] Nhận diện nền tảng: ${platform}, Trang: ${pageType}, ID: ${effectiveId || "N/A"}`);

  if (pageType === "DETAIL" && effectiveId) {
    // Kiểm tra sản phẩm đã có trên Web chưa
    apiFetch("/api/v1/sync/check-existing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceProductIds: [effectiveId] })
    })
      .then(res => res.json())
      .then(data => {
        const existingInfo: ExistingProductCheckResult = data.results?.[0] || { exists: false, sourceProductId: effectiveId };
        injectSourceOverlay(effectiveId, existingInfo);
      })
      .catch(err => {
        console.warn("[1688 Hub] Check existing warning, fallback to default overlay:", err);
        injectSourceOverlay(effectiveId);
      });
  } else if (pageType === "SEARCH" || pageType === "SHOP") {
    setTimeout(() => {
      injectBulkSelectionBar();
    }, 1200);
  }
}

// Khởi chạy khi DOM đã sẵn sàng
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => runPageDetection());
} else {
  runPageDetection();
}

// Theo dõi điều hướng SPA trực tiếp, không quan sát toàn bộ DOM.
let lastUrl = window.location.href;
let navigationTimer: number | undefined;
const onNavigation = () => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    window.clearTimeout(navigationTimer);
    navigationTimer = window.setTimeout(runPageDetection, 500);
  }
};
for (const method of ["pushState", "replaceState"] as const) {
  const original = history[method];
  history[method] = function (this: History, ...args: Parameters<History[typeof method]>) {
    const result = original.apply(this, args);
    queueMicrotask(onNavigation);
    return result;
  } as History[typeof method];
}
window.addEventListener("popstate", onNavigation);

// Lắng nghe yêu cầu bóc tách dữ liệu từ Side Panel hoặc Background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "EXTRACT_CURRENT_PRODUCT") {
    UniversalPlatformExtractor.extract()
      .then(product => {
        sendResponse({ success: true, data: product });
      })
      .catch(err => {
        console.error("[1688 Hub] Lỗi bóc tách đa nền tảng:", err);
        sendResponse({ success: false, error: err.message });
      });
    return true; // Asynchronous response
  }
});
