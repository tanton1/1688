import { apiFetch } from "../shared/config.js";

chrome.runtime.onInstalled.addListener(() => {
  console.log("[1688 Hub Background] Service Worker đã được cài đặt thành công!");
  
  // Cho phép mở Side Panel khi click vào icon extension
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "OPEN_SIDE_PANEL") {
    if (sender.tab?.windowId) {
      chrome.sidePanel.open({ windowId: sender.tab.windowId });
      sendResponse({ status: "ok" });
    }
  }

  if (message.action === "IMPORT_BULK_REQUEST") {
    const { offerIds } = message;
    apiFetch("/api/v1/import/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerIds,
          settings: {
            categoryName: "Thời trang",
            translationMode: "ECOMMERCE",
            autoPublish: false
          }
        })
      })
        .then(res => res.json())
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
