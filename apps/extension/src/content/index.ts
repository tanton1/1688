import { detect1688Page } from "./page-detector.js";
import { Detail1688Extractor } from "./extractors/1688-detail.extractor.js";
import { injectSourceOverlay } from "./overlay/source-overlay.js";
import { injectBulkSelectionBar } from "./overlay/bulk-checkbox.js";
import { ExistingProductCheckResult } from "@hub1688/shared-types";
import { getApiBaseUrl } from "../shared/config.js";

console.log("[1688 Hub] Content Script đã nạp thành công vào trang 1688!");

function runPageDetection() {
  const { pageType, offerId } = detect1688Page();
  console.log(`[1688 Hub] Nhận diện trang: ${pageType}, offerId: ${offerId || "N/A"}`);

  if (pageType === "DETAIL" && offerId) {
    // Kiểm tra sản phẩm đã có trên Web chưa
    getApiBaseUrl()
      .then(baseUrl => {
        fetch(`${baseUrl}/api/v1/sync/check-existing`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceProductIds: [offerId] })
        })
          .then(res => res.json())
          .then(data => {
            const existingInfo: ExistingProductCheckResult = data.results?.[0] || { exists: false, sourceProductId: offerId };
            injectSourceOverlay(offerId, existingInfo);
          })
          .catch(err => {
            console.warn("[1688 Hub] Check existing warning, fallback to default overlay:", err);
            injectSourceOverlay(offerId);
          });
      })
      .catch(() => {
        injectSourceOverlay(offerId);
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
    console.log("[1688 Hub] Phát hiện chuyển hướng trang 1688:", currentUrl);
    setTimeout(() => runPageDetection(), 800);
  }
}).observe(document, { subtree: true, childList: true });

// Lắng nghe yêu cầu bóc tách dữ liệu từ Side Panel hoặc Background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "EXTRACT_CURRENT_PRODUCT") {
    Detail1688Extractor.extract()
      .then(product => {
        sendResponse({ success: true, data: product });
      })
      .catch(err => {
        console.error("[1688 Hub] Lỗi bóc tách:", err);
        sendResponse({ success: false, error: err.message });
      });
    return true; // Asynchronous response
  }
});
