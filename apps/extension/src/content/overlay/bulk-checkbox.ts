import { apiFetch } from "../../shared/config.js";
import { ProductTemplate } from "@hub1688/shared-types";

export function injectBulkSelectionBar() {
  const cardSelector = [
    ".space-common-card",
    ".sm-offer-item",
    ".search-offer-item",
    ".mo-offer-card",
    ".mo-card",
    "[data-offer-id]",
    ".common-card",
    ".mo-offer-item",
    "div[class*='offer-card']"
  ].join(", ");

  const cards = document.querySelectorAll(cardSelector);
  if (cards.length === 0) return;

  const selectedOfferIds = new Map<string, string>(); // offerId -> detailUrl
  let availableTemplates: ProductTemplate[] = [];

  // Tải danh sách templates từ backend
  apiFetch("/api/v1/templates")
    .then(res => res.json())
    .then(data => {
      if (data?.templates) {
        availableTemplates = data.templates;
        populateTemplateSelect(availableTemplates);
      }
    })
    .catch(() => {});

  // Thêm checkbox vào từng card
  cards.forEach(card => {
    if (card.querySelector(".hub1688-bulk-checkbox")) return;

    let offerId = card.getAttribute("data-offer-id") || "";
    let detailUrl = "";

    const linkEl = card.querySelector("a[href*='detail.1688.com/offer/']") as HTMLAnchorElement;
    if (linkEl) {
      detailUrl = linkEl.href;
      const match = detailUrl.match(/\/offer\/(\d+)\.html/);
      if (match) offerId = match[1];
    }

    if (!offerId) return;
    if (!detailUrl) detailUrl = `https://detail.1688.com/offer/${offerId}.html`;

    (card as HTMLElement).style.position = "relative";

    // Container cho checkbox và badge
    const badgeContainer = document.createElement("div");
    badgeContainer.className = "hub1688-card-tools";
    badgeContainer.style.position = "absolute";
    badgeContainer.style.top = "6px";
    badgeContainer.style.left = "6px";
    badgeContainer.style.zIndex = "999";
    badgeContainer.style.display = "flex";
    badgeContainer.style.alignItems = "center";
    badgeContainer.style.gap = "4px";
    badgeContainer.style.backgroundColor = "rgba(255, 255, 255, 0.92)";
    badgeContainer.style.padding = "2px 6px";
    badgeContainer.style.borderRadius = "6px";
    badgeContainer.style.boxShadow = "0 2px 6px rgba(0,0,0,0.15)";

    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.className = "hub1688-bulk-checkbox";
    chk.dataset.offerId = offerId;
    chk.dataset.detailUrl = detailUrl;
    chk.style.width = "16px";
    chk.style.height = "16px";
    chk.style.cursor = "pointer";
    chk.style.accentColor = "#ea580c";

    const lbl = document.createElement("span");
    lbl.innerText = "Chọn";
    lbl.style.fontSize = "11px";
    lbl.style.fontWeight = "bold";
    lbl.style.color = "#374151";
    lbl.style.cursor = "pointer";
    lbl.onclick = () => chk.click();

    chk.addEventListener("change", (e) => {
      if ((e.target as HTMLInputElement).checked) {
        selectedOfferIds.set(offerId, detailUrl);
      } else {
        selectedOfferIds.delete(offerId);
      }
      updateBottomBar(selectedOfferIds);
    });

    badgeContainer.appendChild(chk);
    badgeContainer.appendChild(lbl);
    card.prepend(badgeContainer);
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
    bottomBar.style.boxShadow = "0 -6px 20px rgba(0,0,0,0.15)";
    bottomBar.style.padding = "10px 24px";
    bottomBar.style.display = "none";
    bottomBar.style.alignItems = "center";
    bottomBar.style.justifyContent = "space-between";
    bottomBar.style.zIndex = "999999";
    bottomBar.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    bottomBar.style.borderTop = "2px solid #ea580c";

    bottomBar.innerHTML = `
      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="background: #ea580c; color: white; font-weight: 900; font-size: 11px; padding: 3px 8px; rounded: 4px; border-radius: 4px;">1688 HUB</span>
          <span id="hub1688-selected-count" style="font-size: 13px; font-weight: bold; color: #1f2937;">Đã chọn: 0 sản phẩm</span>
        </div>

        <div style="display: flex; gap: 6px;">
          <button id="hub1688-select-20" type="button" style="background: #f3f4f6; border: 1px solid #d1d5db; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; color: #374151;">
            Chọn 20 SP đầu
          </button>
          <button id="hub1688-unselect-all" type="button" style="background: #ffffff; border: 1px solid #d1d5db; padding: 4px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; color: #6b7280;">
            Bỏ chọn
          </button>
        </div>

        <div style="display: flex; align-items: center; gap: 6px; margin-left: 10px;">
          <label style="font-size: 12px; font-weight: 600; color: #4b5563;">Áp dụng Mẫu:</label>
          <select id="hub1688-bulk-template-select" style="padding: 4px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px; font-weight: 600; background: white; color: #1f2937;">
            <option value="">(Tự động theo ngành hàng)</option>
          </select>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 12px;">
        <div id="hub1688-bulk-status" style="font-size: 12px; font-weight: bold; color: #ea580c; display: none;"></div>
        <button id="hub1688-import-bulk-btn" type="button" style="background: linear-gradient(135deg, #ea580c, #c2410c); color: white; border: none; padding: 8px 20px; border-radius: 8px; font-weight: bold; font-size: 13px; cursor: pointer; box-shadow: 0 2px 8px rgba(234, 88, 12, 0.4); display: flex; align-items: center; gap: 6px;">
          <span>⚡ CÀO HÀNG LOẠT VỀ WEB</span>
        </button>
      </div>
    `;
    document.body.appendChild(bottomBar);

    // Xử lý Chọn 20 SP đầu
    document.getElementById("hub1688-select-20")?.addEventListener("click", () => {
      const allCheckboxes = document.querySelectorAll(".hub1688-bulk-checkbox") as NodeListOf<HTMLInputElement>;
      let count = 0;
      allCheckboxes.forEach(chk => {
        if (count < 20) {
          chk.checked = true;
          const id = chk.dataset.offerId;
          const url = chk.dataset.detailUrl;
          if (id && url) selectedOfferIds.set(id, url);
          count++;
        }
      });
      updateBottomBar(selectedOfferIds);
    });

    // Xử lý Bỏ chọn
    document.getElementById("hub1688-unselect-all")?.addEventListener("click", () => {
      const allCheckboxes = document.querySelectorAll(".hub1688-bulk-checkbox") as NodeListOf<HTMLInputElement>;
      allCheckboxes.forEach(chk => { chk.checked = false; });
      selectedOfferIds.clear();
      updateBottomBar(selectedOfferIds);
    });

    // Xử lý nút Import Bulk
    document.getElementById("hub1688-import-bulk-btn")?.addEventListener("click", async () => {
      const urls = Array.from(selectedOfferIds.values());
      if (urls.length === 0) return;

      const btn = document.getElementById("hub1688-import-bulk-btn") as HTMLButtonElement;
      const statusEl = document.getElementById("hub1688-bulk-status");
      const templateSelect = document.getElementById("hub1688-bulk-template-select") as HTMLSelectElement;
      const selectedTplId = templateSelect?.value;

      btn.disabled = true;
      btn.style.opacity = "0.6";
      btn.innerText = "⏳ Đang gửi yêu cầu...";
      if (statusEl) {
        statusEl.style.display = "block";
        statusEl.innerText = `Đang xử lý 0/${urls.length} sản phẩm...`;
      }

      try {
        const res = await apiFetch("/api/v1/clone/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            urls,
            platform: "1688",
            autoPublish: false
          })
        });

        const data = await res.json() as any;
        if (data.success) {
          if (statusEl) statusEl.innerText = `✓ Thành công: ${data.succeeded || urls.length}/${urls.length} SP!`;
          alert(`🎉 Đã nhập thành công ${data.succeeded || urls.length}/${urls.length} sản phẩm vào Admin Hub!`);
        } else {
          alert("Lỗi nhập hàng loạt: " + (data.error || data.message || "Vui lòng kiểm tra lại backend"));
        }
      } catch (err: any) {
        alert("Lỗi kết nối máy chủ: " + err.message);
      } finally {
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.innerText = "⚡ CÀO HÀNG LOẠT VỀ WEB";
      }
    });
  }
}

function populateTemplateSelect(templates: ProductTemplate[]) {
  const sel = document.getElementById("hub1688-bulk-template-select") as HTMLSelectElement;
  if (!sel || templates.length === 0) return;

  sel.innerHTML = `<option value="">(Tự động theo ngành hàng)</option>` +
    templates.map(t => `<option value="${t.id}">${t.name} (${t.categoryName})</option>`).join("");
}

function updateBottomBar(selectedMap: Map<string, string>) {
  const bar = document.getElementById("hub1688-bottom-bar");
  const countEl = document.getElementById("hub1688-selected-count");
  if (!bar || !countEl) return;

  if (selectedMap.size > 0) {
    bar.style.display = "flex";
    countEl.innerText = `Đã chọn: ${selectedMap.size} sản phẩm`;
  } else {
    bar.style.display = "none";
  }
}
