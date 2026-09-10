import { detectAnyCommercePage } from "./page-detector.js";
import { UniversalPlatformExtractor } from "./extractors/universal-platform.extractor.js";
import { injectSourceOverlay } from "./overlay/source-overlay.js";
import { injectBulkSelectionBar } from "./overlay/bulk-checkbox.js";
import { ExistingProductCheckResult } from "@hub1688/shared-types";
import { apiFetch } from "../shared/config.js";

console.log("[1688 Hub] Multi-Platform Content Script đã nạp thành công (1688, Taobao, Tmall, Shopee, TikTok Shop, AliExpress)!");

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

// Theo dõi thay đổi URL khi người dùng lướt sản phẩm (SPA navigation)
let lastUrl = window.location.href;
new MutationObserver(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    console.log("[1688 Hub] Phát hiện chuyển hướng trang:", currentUrl);
    setTimeout(() => runPageDetection(), 800);
  }
}).observe(document, { subtree: true, childList: true });

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
