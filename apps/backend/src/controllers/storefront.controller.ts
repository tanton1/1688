import { Request, Response } from "express";
import { inMemoryProducts } from "./import.controller.js";
import { ordersService } from "../services/orders.service.js";
import { telegramAlertService } from "../services/telegram-alert.service.js";
import { StorefrontConfig, StorefrontCheckoutRequest, WebProduct, CustomerOrder, CustomerOrderItem } from "@hub1688/shared-types";
import { generateVietQRUrl } from "@hub1688/shared-utils";
import { supabaseService } from "../services/supabase.service.js";

export let currentStorefrontConfig: StorefrontConfig = {
  storeName: "1688 DIRECT STORE",
  tagline: "Tổng Kho Sỉ & Bán Lẻ Hàng Nguồn Tận Xưởng",
  hotline: "0908.123.456",
  zaloUrl: "https://zalo.me/0908123456",
  address: "Kho Vận Hà Nội & TP. Hồ Chí Minh",
  freeShipThresholdVND: 500000,
  bankName: "MB",
  bankAccountNo: "0908123456",
  bankAccountName: "CHỦ CỬA HÀNG 1688",
  bannerTitle: "TỔNG KHO NGUỒN HÀNG TẬN XƯỞNG TRỰC TIẾP",
  bannerSubtitle: "Đồng bộ tự động từ các xưởng 1688/Taobao • Giá bán chuẩn E-Commerce • Bảo hành đổi trả 7 ngày",
  accentColor: "#ea580c"
};

export class StorefrontController {
  /**
   * Đồng bộ nạp sản phẩm từ Supabase nếu có
   */
  private async hydrateProducts(): Promise<void> {
    if (!supabaseService.isConfigured()) return;
    try {
      const dbProducts = await supabaseService.getProducts();
      if (dbProducts && dbProducts.items && dbProducts.items.length > 0) {
        for (const p of dbProducts.items) {
          if (p.id && !inMemoryProducts.has(p.id)) {
            inMemoryProducts.set(p.id, p);
          }
        }
      }
    } catch (e) {
      console.warn("[Storefront] Hydrate warning:", e);
    }
  }

  /**
   * Lấy thông tin cấu hình cửa hàng công khai cho khách xem
   */
  public getStoreInfo(req: Request, res: Response): void {
    res.json({
      success: true,
      config: currentStorefrontConfig
    });
  }

  /**
   * Cập nhật thông tin cửa hàng (Admin)
   */
  public updateStoreSettings(req: Request, res: Response): void {
    const updates = req.body as Partial<StorefrontConfig>;
    currentStorefrontConfig = {
      ...currentStorefrontConfig,
      ...updates
    };
    res.json({
      success: true,
      config: currentStorefrontConfig
    });
  }

  /**
   * Lấy danh sách sản phẩm đang bán (status === PUBLISHED) cho khách hàng
   */
  public async listPublicProducts(req: Request, res: Response): Promise<void> {
    await this.hydrateProducts();

    const { category, search, sort, minPrice, maxPrice } = req.query as Record<string, string>;

    let allProducts = Array.from(inMemoryProducts.values());

    // Chỉ lấy sản phẩm đã duyệt đăng bán (PUBLISHED)
    let published = allProducts.filter(p => p.status === "PUBLISHED");

    // Lọc theo danh mục
    if (category && category !== "ALL") {
      published = published.filter(p => p.categoryName?.toLowerCase() === category.toLowerCase());
    }

    // Tìm kiếm theo từ khóa
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      published = published.filter(p =>
        p.titleVI.toLowerCase().includes(q) ||
        (p.titleEN && p.titleEN.toLowerCase().includes(q)) ||
        p.skuCode.toLowerCase().includes(q) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(q))
      );
    }

    // Lọc theo khoảng giá VNĐ
    if (minPrice) {
      const min = parseInt(minPrice, 10);
      if (!isNaN(min)) published = published.filter(p => p.minPriceVND >= min);
    }
    if (maxPrice) {
      const max = parseInt(maxPrice, 10);
      if (!isNaN(max)) published = published.filter(p => p.minPriceVND <= max);
    }

    // Sắp xếp
    if (sort === "PRICE_ASC") {
      published.sort((a, b) => a.minPriceVND - b.minPriceVND);
    } else if (sort === "PRICE_DESC") {
      published.sort((a, b) => b.minPriceVND - a.minPriceVND);
    } else if (sort === "QUALITY_DESC") {
      published.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
    } else {
      // Mặc định mới nhất
      published.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    // Thống kê danh mục có sẵn
    const categoryCounts: Record<string, number> = {};
    allProducts.filter(p => p.status === "PUBLISHED").forEach(p => {
      const cat = p.categoryName || "Khác";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const categories = Object.entries(categoryCounts).map(([name, count]) => ({
      name,
      count
    }));

    res.json({
      success: true,
      total: published.length,
      products: published,
      categories,
      storeInfo: currentStorefrontConfig
    });
  }

  /**
   * Lấy chi tiết sản phẩm cho trang xem chi tiết (theo ID hoặc Slug)
   */
  public async getProductDetail(req: Request, res: Response): Promise<void> {
    await this.hydrateProducts();
    const { idOrSlug } = req.params;

    const all = Array.from(inMemoryProducts.values());
    const product = all.find(p => p.id === idOrSlug || p.slug === idOrSlug || p.skuCode === idOrSlug);

    if (!product || product.status !== "PUBLISHED") {
      res.status(404).json({ error: "Sản phẩm không tồn tại hoặc chưa được mở bán" });
      return;
    }

    // Lấy 4 sản phẩm liên quan cùng danh mục
    const relatedProducts = all
      .filter(p => p.id !== product.id && p.status === "PUBLISHED" && p.categoryName === product.categoryName)
      .slice(0, 4);

    res.json({
      success: true,
      product,
      relatedProducts
    });
  }

  /**
   * Đặt hàng nhanh từ giỏ hàng Web Bán Hàng (One-Page Checkout)
   */
  public async checkoutOrder(req: Request, res: Response): Promise<void> {
    const payload = req.body as StorefrontCheckoutRequest;

    if (!payload.customerName || !payload.customerName.trim()) {
      res.status(400).json({ error: "Vui lòng nhập họ và tên nhận hàng" });
      return;
    }

    if (!payload.customerPhone || !payload.customerPhone.trim()) {
      res.status(400).json({ error: "Vui lòng nhập số điện thoại nhận hàng" });
      return;
    }

    if (!payload.customerAddress || !payload.customerAddress.trim()) {
      res.status(400).json({ error: "Vui lòng nhập địa chỉ giao hàng" });
      return;
    }

    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      res.status(400).json({ error: "Giỏ hàng hiện đang trống" });
      return;
    }

    const orderNumber = `HUB-#${Date.now().toString().slice(-6)}`;
    const allProducts = Array.from(inMemoryProducts.values());

    let totalAmountVND = 0;
    let totalCostVND = 0;

    const orderItems: CustomerOrderItem[] = payload.items.map(item => {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const price = Number(item.sellingPriceVND) || 0;
      totalAmountVND += price * qty;

      // Tìm sản phẩm gốc trong Hub để lấy giá vốn 1688 và link xưởng
      const matchedProd = allProducts.find(p => p.id === item.productId || p.skuCode === item.skuCode);
      const matchedVar = matchedProd?.variants.find(v => v.sourceSkuId === item.skuCode || (v.colorName && item.variantName.includes(v.colorName)));

      const cost = matchedVar?.costPriceVND || (price * 0.45); // Ước tính 45% giá bán nếu chưa có
      totalCostVND += cost * qty;

      return {
        skuCode: item.skuCode || matchedProd?.skuCode || "SKU-PROD",
        variantName: item.variantName || "Mặc định",
        quantity: qty,
        sellingPriceVND: price,
        costVND: cost,
        source1688Url: matchedProd?.sourceUrl,
        sourceProductId: matchedProd?.sourceProductId,
        sourceSkuId: matchedVar?.sourceSkuId,
        image: item.image || matchedVar?.imageUrl || matchedProd?.primaryImage
      };
    });

    const estimatedProfitVND = Math.max(0, totalAmountVND - totalCostVND);

    // Miễn phí vận chuyển nếu vượt ngưỡng
    const shippingFee = totalAmountVND >= (currentStorefrontConfig.freeShipThresholdVND || 500000) ? 0 : 30000;
    const finalTotalVND = totalAmountVND + shippingFee;

    const newOrder: CustomerOrder = {
      id: `ord_${Date.now()}`,
      orderNumber,
      platform: "STOREFRONT",
      customerName: payload.customerName.trim(),
      customerPhone: payload.customerPhone.trim(),
      customerAddress: payload.customerAddress.trim(),
      items: orderItems,
      totalAmountVND: finalTotalVND,
      totalCostVND,
      estimatedProfitVND,
      status: "PENDING_SOURCING",
      paymentMethod: payload.paymentMethod || "COD",
      paymentStatus: "PENDING",
      note: payload.note ? payload.note.trim() : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Lưu vào bộ nhớ quản lý đơn hàng
    ordersService.createOrder(newOrder);

    // Tạo mã VietQR nếu chọn chuyển khoản
    let qrCodeUrl: string | undefined;
    if (payload.paymentMethod === "VIETQR" || payload.paymentMethod === "BANK_TRANSFER") {
      qrCodeUrl = generateVietQRUrl({
        bankId: currentStorefrontConfig.bankName,
        accountNo: currentStorefrontConfig.bankAccountNo,
        amount: finalTotalVND,
        orderInfo: `THANH TOAN DON ${orderNumber}`,
        accountName: currentStorefrontConfig.bankAccountName
      });
    }

    // Bắn thông báo Telegram tự động cho chủ cửa hàng nếu đã kết nối bot
    try {
      const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
      const telegramChatId = process.env.TELEGRAM_CHAT_ID;
      if (telegramToken && telegramChatId) {
        const itemSummary = orderItems.map(i => `• ${i.variantName} x${i.quantity} (${i.sellingPriceVND.toLocaleString("vi-VN")}đ)`).join("\n");
        const msg = `🛍️ **ĐƠN HÀNG MỚI TỪ WEB BÁN HÀNG!**\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `📋 Mã đơn: **${orderNumber}**\n` +
          `👤 Khách hàng: **${newOrder.customerName}**\n` +
          `📞 SĐT: **${newOrder.customerPhone}**\n` +
          `📍 Địa chỉ: ${newOrder.customerAddress}\n` +
          `📦 Món hàng:\n${itemSummary}\n` +
          `💰 Tổng thanh toán: **${finalTotalVND.toLocaleString("vi-VN")} VNĐ**\n` +
          `💳 Hình thức: **${newOrder.paymentMethod}**\n` +
          `📈 Lợi nhuận ước tính: **+${estimatedProfitVND.toLocaleString("vi-VN")} VNĐ**`;

        await telegramAlertService.sendMessage(telegramToken, telegramChatId, msg);
      }
    } catch (err: any) {
      console.warn("[Storefront] Telegram alert error:", err.message);
    }

    res.status(201).json({
      success: true,
      orderNumber,
      order: newOrder,
      qrCodeUrl,
      storeConfig: currentStorefrontConfig
    });
  }

  /**
   * Tra cứu đơn hàng theo mã đơn hoặc số điện thoại (cho khách tự theo dõi đơn)
   */
  public trackOrder(req: Request, res: Response): void {
    const { query } = req.params;
    const orders = ordersService.listOrders();

    const matched = orders.filter(o =>
      o.orderNumber.toLowerCase() === query.toLowerCase() ||
      o.customerPhone === query
    );

    res.json({
      success: true,
      orders: matched
    });
  }
}

export const storefrontController = new StorefrontController();
