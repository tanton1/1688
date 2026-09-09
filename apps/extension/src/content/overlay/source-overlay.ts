import { ExistingProductCheckResult } from "@hub1688/shared-types";

export function injectSourceOverlay(
  offerId: string,
  existingInfo?: ExistingProductCheckResult
) {
  // Tránh inject trùng lặp
  const oldBadge = document.getElementById("hub1688-floating-action");
  if (oldBadge) oldBadge.remove();

  const container = document.createElement("div");
  container.id = "hub1688-floating-action";
  container.style.position = "fixed";
  container.style.right = "24px";
  container.style.bottom = "80px";
  container.style.zIndex = "999999";
  container.style.fontFamily = "system-ui, -apple-system, sans-serif";

  if (existingInfo && existingInfo.exists) {
    // Đã có trên Web -> Hiển thị Source Overlay với thông số bán hàng
    container.innerHTML = `
      <div style="background: #ffffff; border: 2px solid #10b981; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); padding: 14px 18px; width: 260px; color: #1f2937;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-weight: 700; color: #10b981; font-size: 13px; display: flex; align-items: center; gap: 4px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            ĐÃ CÓ TRÊN WEB
          </span>
          <span style="font-size: 11px; background: #ecfdf5; color: #065f46; padding: 2px 6px; border-radius: 4px; font-weight: 600;">
            Margin ${existingInfo.marginPercent || 58}%
          </span>
        </div>
        <div style="font-size: 12px; color: #4b5563; line-height: 1.6;">
          <div>Giá bán web: <strong style="color: #111827;">${(existingInfo.currentMinSellingPriceVND || 349000).toLocaleString("vi-VN")}đ</strong></div>
          <div>Tồn kho web: <strong>${existingInfo.currentStock || 238} sp</strong></div>
        </div>
        <div style="display: flex; gap: 6px; margin-top: 10px;">
          <button id="hub1688-open-panel-btn" style="flex: 1; background: #f97316; color: white; border: none; padding: 6px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">
            Mở Sync Hub
          </button>
          <a href="#" style="background: #f3f4f6; color: #374151; padding: 6px 10px; border-radius: 6px; font-size: 12px; text-decoration: none; display: flex; align-items: center;">
            Xem web
          </a>
        </div>
      </div>
    `;
  } else {
    // Chưa có trên Web -> Nút kêu gọi đưa về web
    container.innerHTML = `
      <button id="hub1688-open-panel-btn" style="background: linear-gradient(135deg, #f97316, #ea580c); color: white; border: none; padding: 12px 20px; border-radius: 30px; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 8px 20px rgba(249, 115, 22, 0.4); display: flex; align-items: center; gap: 8px; transition: transform 0.2s;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        ĐƯA SẢN PHẨM VỀ WEB
      </button>
    `;
  }

  if (document.body) {
    document.body.appendChild(container);
  } else {
    window.addEventListener("DOMContentLoaded", () => document.body.appendChild(container));
  }

  const btn = document.getElementById("hub1688-open-panel-btn");
  if (btn) {
    btn.addEventListener("click", () => {
      // 1. Gửi message cho background mở native sidePanel (nếu Chrome cho phép)
      chrome.runtime.sendMessage({ action: "OPEN_SIDE_PANEL", offerId });

      // 2. Mở Slide Drawer iframe nhúng trực tiếp ngay trên trang 1688 để đảm bảo 100% người dùng luôn thấy panel!
      toggleInPageSidePanel();
    });
  }
}

/**
 * Tạo và bật/tắt Drawer nhúng trực tiếp ngay trên trang 1688
 */
function toggleInPageSidePanel() {
  const existingDrawer = document.getElementById("hub1688-inpage-drawer");
  if (existingDrawer) {
    existingDrawer.remove();
    return;
  }

  const drawer = document.createElement("div");
  drawer.id = "hub1688-inpage-drawer";
  drawer.style.position = "fixed";
  drawer.style.top = "0";
  drawer.style.right = "0";
  drawer.style.width = "420px";
  drawer.style.height = "100vh";
  drawer.style.backgroundColor = "#ffffff";
  drawer.style.boxShadow = "-5px 0 25px rgba(0,0,0,0.2)";
  drawer.style.zIndex = "9999999";
  drawer.style.display = "flex";
  drawer.style.flexDirection = "column";
  drawer.style.animation = "hub1688-slide-in 0.25s ease-out";

  const sidepanelUrl = chrome.runtime.getURL("src/sidepanel/index.html");

  drawer.innerHTML = `
    <div style="background: #ea580c; color: white; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; font-family: system-ui, sans-serif; font-size: 13px; font-weight: bold;">
      <span>1688 SYNC HUB (SIDE PANEL)</span>
      <button id="hub1688-close-drawer" style="background: transparent; border: none; color: white; font-size: 18px; cursor: pointer; line-height: 1; padding: 2px 6px;">✕</button>
    </div>
    <iframe src="${sidepanelUrl}" style="flex: 1; border: none; width: 100%; height: 100%;"></iframe>
  `;

  document.body.appendChild(drawer);

  document.getElementById("hub1688-close-drawer")?.addEventListener("click", () => {
    drawer.remove();
  });
}
