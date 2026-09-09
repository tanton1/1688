export function injectBulkSelectionBar() {
  const cards = document.querySelectorAll(".space-common-card, .sm-offer-item, .search-offer-item");
  if (cards.length === 0) return;

  const selectedOfferIds = new Set<string>();

  // Thêm checkbox vào từng card
  cards.forEach(card => {
    if (card.querySelector(".hub1688-bulk-checkbox")) return;

    const linkEl = card.querySelector("a[href*='detail.1688.com/offer/']") as HTMLAnchorElement;
    if (!linkEl) return;
    const match = linkEl.href.match(/\/offer\/(\d+)\.html/);
    if (!match) return;
    const offerId = match[1];

    (card as HTMLElement).style.position = "relative";

    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.className = "hub1688-bulk-checkbox";
    chk.style.position = "absolute";
    chk.style.top = "8px";
    chk.style.left = "8px";
    chk.style.width = "20px";
    chk.style.height = "20px";
    chk.style.zIndex = "999";
    chk.style.cursor = "pointer";

    chk.addEventListener("change", (e) => {
      if ((e.target as HTMLInputElement).checked) {
        selectedOfferIds.add(offerId);
      } else {
        selectedOfferIds.delete(offerId);
      }
      updateBottomBar(selectedOfferIds);
    });

    card.prepend(chk);
  });

  // Tạo thanh công cụ đáy (Bottom Floating Bar)
  let bottomBar = document.getElementById("hub1688-bottom-bar");
  if (!bottomBar) {
    bottomBar = document.createElement("div");
    bottomBar.id = "hub1688-bottom-bar";
    bottomBar.style.position = "fixed";
    bottomBar.style.bottom = "0";
    bottomBar.style.left = "0";
    bottomBar.style.width = "100%";
    bottomBar.style.backgroundColor = "#ffffff";
    bottomBar.style.boxShadow = "0 -4px 15px rgba(0,0,0,0.1)";
    bottomBar.style.padding = "12px 30px";
    bottomBar.style.display = "none";
    bottomBar.style.alignItems = "center";
    bottomBar.style.justifyContent = "space-between";
    bottomBar.style.zIndex = "999998";
    bottomBar.style.fontFamily = "system-ui, sans-serif";

    bottomBar.innerHTML = `
      <div style="display: flex; align-items: center; gap: 15px;">
        <span style="font-weight: 700; color: #ea580c; font-size: 15px;">1688 SYNC HUB</span>
        <span id="hub1688-selected-count" style="font-size: 14px; color: #374151;">Đã chọn: 0 sản phẩm</span>
        <button id="hub1688-select-all" style="background: #f3f4f6; border: 1px solid #d1d5db; padding: 4px 10px; border-radius: 4px; font-size: 12px; cursor: pointer;">
          Chọn tất cả trang này
        </button>
      </div>
      <button id="hub1688-import-bulk-btn" style="background: #ea580c; color: white; border: none; padding: 8px 18px; border-radius: 6px; font-weight: 700; cursor: pointer;">
        NHẬP HÀNG LOẠT VỀ WEB
      </button>
    `;
    document.body.appendChild(bottomBar);

    // Xử lý nút Import Bulk
    document.getElementById("hub1688-import-bulk-btn")?.addEventListener("click", () => {
      const ids = Array.from(selectedOfferIds);
      if (ids.length === 0) return;
      chrome.runtime.sendMessage({ action: "IMPORT_BULK_REQUEST", offerIds: ids });
      alert(`Đã gửi yêu cầu nhập ${ids.length} sản phẩm vào hàng đợi xử lý!`);
    });
  }
}

function updateBottomBar(selectedIds: Set<string>) {
  const bar = document.getElementById("hub1688-bottom-bar");
  const countEl = document.getElementById("hub1688-selected-count");
  if (!bar || !countEl) return;

  if (selectedIds.size > 0) {
    bar.style.display = "flex";
    countEl.innerText = `Đã chọn: ${selectedIds.size} sản phẩm`;
  } else {
    bar.style.display = "none";
  }
}
