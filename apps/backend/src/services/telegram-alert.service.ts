/**
 * Telegram Alert Service
 * Gửi thông báo biến động giá sỉ 1688, cháy hàng biến thể và cảnh báo tự động về nhóm Telegram
 */

export interface TelegramTestResult {
  success: boolean;
  botName?: string;
  botUsername?: string;
  error?: string;
}

export interface TelegramSendResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

export class TelegramAlertService {
  /**
   * Kiểm tra kết nối Telegram bot và chat ID
   */
  public async testConnection(botToken: string, chatId: string): Promise<TelegramTestResult> {
    try {
      // 1. Kiểm tra bot token qua getMe
      const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const meData = await meRes.json() as any;

      if (!meData.ok) {
        return {
          success: false,
          error: meData.description || "Invalid Telegram Bot Token"
        };
      }

      const botName = meData.result.first_name;
      const botUsername = meData.result.username;

      // 2. Gửi thử tin nhắn chào mừng tới chat ID
      const welcomeMsg = [
        `🤖 *1688 Listing Sync Hub - Kết nối thành công!*`,
        `━━━━━━━━━━━━━━━━━━`,
        `✅ Bot: *${botName}* (@${botUsername})`,
        `📡 Kênh: \`${chatId}\``,
        `⏰ Thời gian: \`${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}\``,
        `🔔 Kênh này sẽ tự động nhận cảnh báo:`,
        `• Biến động giá sỉ 1688 (tăng / giảm)`,
        `• SKU/Biến thể hết hàng (Out of Stock)`,
        `• Đồng bộ dữ liệu lên WooCommerce / Shopify`
      ].join("\n");

      const sendRes = await this.sendMessage(botToken, chatId, welcomeMsg);
      if (!sendRes.success) {
        return {
          success: false,
          botName,
          botUsername,
          error: `Bot hợp lệ nhưng không gửi được tin nhắn tới chat ID (${chatId}): ${sendRes.error}`
        };
      }

      return {
        success: true,
        botName,
        botUsername
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Không thể kết nối tới Telegram API"
      };
    }
  }

  /**
   * Gửi tin nhắn Markdown tới Telegram Chat
   */
  public async sendMessage(
    botToken: string,
    chatId: string,
    text: string
  ): Promise<TelegramSendResult> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "Markdown",
          disable_web_page_preview: false
        })
      });

      const data = await response.json() as any;
      if (!data.ok) {
        return {
          success: false,
          error: data.description || "Gửi tin nhắn Telegram thất bại"
        };
      }

      return {
        success: true,
        messageId: data.result.message_id
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Lỗi mạng khi gọi Telegram API"
      };
    }
  }

  /**
   * Gửi cảnh báo biến động giá sản phẩm 1688
   */
  public async sendPriceChangeAlert(params: {
    botToken: string;
    chatId: string;
    productTitle: string;
    skuCode: string;
    oldPriceCNY: number;
    newPriceCNY: number;
    oldPriceVND: number;
    newPriceVND: number;
    sourceUrl?: string;
  }): Promise<TelegramSendResult> {
    const isIncrease = params.newPriceCNY > params.oldPriceCNY;
    const emoji = isIncrease ? "🚨 📈 *CẢNH BÁO: GIÁ NGUỒN 1688 TĂNG*" : "📉 💡 *THÔNG BÁO: GIÁ NGUỒN 1688 GIẢM*";
    const percentDiff = (((params.newPriceCNY - params.oldPriceCNY) / params.oldPriceCNY) * 100).toFixed(1);
    const sign = isIncrease ? "+" : "";

    const message = [
      emoji,
      `━━━━━━━━━━━━━━━━━━`,
      `📦 *Sản phẩm:* ${params.productTitle}`,
      `🏷 *Mã SKU:* \`${params.skuCode}\``,
      ``,
      `💴 *Giá gốc 1688 (Tệ):*`,
      `• Cũ: ¥${params.oldPriceCNY.toFixed(2)}`,
      `• Mới: *¥${params.newPriceCNY.toFixed(2)}* (${sign}${percentDiff}%)`,
      ``,
      `🇻🇳 *Giá bán VNĐ ước tính:*`,
      `• Cũ: ${params.oldPriceVND.toLocaleString("vi-VN")} đ`,
      `• Mới: *${params.newPriceVND.toLocaleString("vi-VN")} đ*`,
      ``,
      params.sourceUrl ? `🔗 [Xem link gốc 1688](${params.sourceUrl})` : "",
      `⏰ \`${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}\``
    ].filter(Boolean).join("\n");

    return this.sendMessage(params.botToken, params.chatId, message);
  }

  /**
   * Gửi cảnh báo biến thể hết hàng (Out of stock)
   */
  public async sendStockAlert(params: {
    botToken: string;
    chatId: string;
    productTitle: string;
    skuCode: string;
    variantName: string;
    remainingStock: number;
    sourceUrl?: string;
  }): Promise<TelegramSendResult> {
    const isOutOfStock = params.remainingStock <= 0;
    const title = isOutOfStock
      ? "🔴 ⚠️ *CẢNH BÁO: HẾT HÀNG BIẾN THỂ 1688*"
      : "🟡 ⚠️ *CẢNH BÁO: SẮP HẾT HÀNG 1688*";

    const message = [
      title,
      `━━━━━━━━━━━━━━━━━━`,
      `📦 *Sản phẩm:* ${params.productTitle}`,
      `🏷 *Mã SKU:* \`${params.skuCode}\``,
      `🎨 *Biến thể:* \`${params.variantName}\``,
      `📊 *Tồn kho hiện tại:* *${params.remainingStock}* sản phẩm`,
      ``,
      isOutOfStock
        ? `⛔ _Đề xuất: Tạm ẩn biến thể hoặc điều chỉnh trạng thái hết hàng trên website bán lẻ!_`
        : `⚡ _Đề xuất: Chuẩn bị kế hoạch nhập thêm hoặc tìm xưởng phụ trợ!_`,
      ``,
      params.sourceUrl ? `🔗 [Xem link nguồn 1688](${params.sourceUrl})` : "",
      `⏰ \`${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}\``
    ].filter(Boolean).join("\n");

    return this.sendMessage(params.botToken, params.chatId, message);
  }
}

export const telegramAlertService = new TelegramAlertService();
