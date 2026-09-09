import { detect1688Page } from "./page-detector.js";
import { Detail1688Extractor } from "./extractors/1688-detail.extractor.js";
import { injectSourceOverlay } from "./overlay/source-overlay.js";
import { injectBulkSelectionBar } from "./overlay/bulk-checkbox.js";
import { ExistingProductCheckResult } from "@hub1688/shared-types";

import { getApiBaseUrl } from "../shared/config.js";

console.log("[1688 Hub] Content Script đã sẵn sàng hoạt động!");

const { pageType, offerId } = detect1688Page();

if (pageType === "DETAIL" && offerId) {
  // 1. Kiểm tra sản phẩm đã có trên Web chưa
  getApiBaseUrl().then(baseUrl => {
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
      .catch(() => {
        // Nếu server chưa bật hoặc offline, vẫn hiển thị nút đưa về web bình thường
        injectSourceOverlay(offerId);
      });
  });
} else if (pageType === "SEARCH" || pageType === "SHOP") {
  // 2. Chế độ chọn hàng loạt
  setTimeout(() => {
    injectBulkSelectionBar();
  }, 1200);
}

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
