import { Request, Response } from "express";
import { inMemoryProducts } from "./import.controller.js";
import { ordersService } from "../services/orders.service.js";
import { telegramAlertService } from "../services/telegram-alert.service.js";
import { StorefrontConfig, StorefrontCheckoutRequest, WebProduct, CustomerOrder, CustomerOrderItem } from "@hub1688/shared-types";
import { calculateStorefrontPricing, generateVietQRUrl } from "@hub1688/shared-utils";
import { supabaseService } from "../services/supabase.service.js";
import crypto from "node:crypto";
import { ENV } from "../config/env.js";

export let currentStorefrontConfig: StorefrontConfig = {
  storeName: "1688 STORE",
  tagline: "Cửa hàng trực tuyến",
  hotline: "",
  zaloUrl: "",
  address: "",
  freeShipThresholdVND: 500000,
  shippingFeeVND: 30000,
  discountRules: [],
  bankName: "",
  bankAccountNo: "",
  bankAccountName: "",
  bannerTitle: "Khám phá sản phẩm mới",
  bannerSubtitle: "Giá và tồn kho được xác nhận trực tiếp khi đặt hàng.",
  accentColor: "#ea580c"
};

export class StorefrontController {
  /**
   * Đồng bộ nạp sản phẩm từ Supabase nếu có
   */
  private async getPublishedProducts(): Promise<WebProduct[]> {
    if (!supabaseService.isConfigured()) {
      return Array.from(inMemoryProducts.values()).filter(product => product.status === "PUBLISHED");
    }
    const products: WebProduct[] = [];
    let page = 1;
    let total = 0;
    do {
      const result = await supabaseService.getProducts({ status: "PUBLISHED", page, pageSize: 100 });
      if (!result) throw new Error("PERSISTENCE_FAILED");
      products.push(...result.items);
      total = result.total;
      page++;
    } while (products.length < total);
    return products;
  }

  /**
   * Lấy thông tin cấu hình cửa hàng công khai cho khách xem
   */
  public async getStoreInfo(req: Request, res: Response): Promise<void> {
    if (supabaseService.isConfigured()) {
      const persisted = await supabaseService.getStorefrontSettings<StorefrontConfig>();
      if (persisted) currentStorefrontConfig = { ...currentStorefrontConfig, ...persisted };
    }
    res.json({
      success: true,
      config: currentStorefrontConfig
    });
  }

  /**
   * Cập nhật thông tin cửa hàng (Admin)
   */
  public async updateStoreSettings(req: Request, res: Response): Promise<void> {
    const updates = req.body as Partial<StorefrontConfig>;
    const normalizedUpdates = updates.discountRules
      ? { ...updates, discountRules: updates.discountRules.map(rule => ({ ...rule, code: rule.code.trim().toUpperCase() })) }
      : updates;
    const candidate = {
      ...currentStorefrontConfig,
      ...normalizedUpdates
    };
    if (supabaseService.isConfigured() && !(await supabaseService.saveStorefrontSettings(candidate))) {
      res.status(503).json({ error: "PERSISTENCE_FAILED" }); return;
    }
    currentStorefrontConfig = candidate;
    res.json({
      success: true,
      config: currentStorefrontConfig
    });
  }

  /**
   * Lấy danh sách sản phẩm đang bán (status === PUBLISHED) cho khách hàng
   */
  public async listPublicProducts(req: Request, res: Response): Promise<void> {
    const { category, search, sort, minPrice, maxPrice, page: rawPage, limit: rawLimit } = req.query as Record<string, string>;
    const page = Math.max(1, Number.parseInt(rawPage || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(rawLimit || "50", 10) || 50));
    let published: WebProduct[];
    try {
      published = await this.getPublishedProducts();
    } catch (error) {
      console.error("[Storefront list products]", error);
      res.status(503).json({ error: "PERSISTENCE_FAILED" });
      return;
    }
    const allPublished = [...published];

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
    allPublished.forEach(p => {
      const cat = p.categoryName || "Khác";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const categoryDetails = Object.entries(categoryCounts).map(([name, count]) => ({
      name,
      count
    }));

    const total = published.length;

    res.json({
      success: true,
      total,
      page,
      limit,
      products: published.slice((page - 1) * limit, page * limit).map(product => this.toPublicProduct(product)),
      categories: categoryDetails.map(item => item.name),
      categoryDetails,
      storeInfo: currentStorefrontConfig
    });
  }

  /**
   * Lấy chi tiết sản phẩm cho trang xem chi tiết (theo ID hoặc Slug)
   */
  public async getProductDetail(req: Request, res: Response): Promise<void> {
    const { idOrSlug } = req.params;
    let all: WebProduct[];
    try {
      all = await this.getPublishedProducts();
    } catch (error) {
      console.error("[Storefront product detail]", error);
      res.status(503).json({ error: "PERSISTENCE_FAILED" });
      return;
    }
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
      product: this.toPublicProduct(product),
      relatedProducts: relatedProducts.map(item => this.toPublicProduct(item))
    });
  }

  /**
   * Đặt hàng nhanh từ giỏ hàng Web Bán Hàng (One-Page Checkout)
   */
  public async checkoutOrder(req: Request, res: Response): Promise<void> {
    res.setHeader("Cache-Control", "no-store");
    const payload = req.body as StorefrontCheckoutRequest;
    const phone = payload.customerPhone.replace(/\D/g, "");
    if ((payload.paymentMethod === "VIETQR" || payload.paymentMethod === "BANK_TRANSFER") &&
      (!currentStorefrontConfig.bankName || !currentStorefrontConfig.bankAccountNo || !currentStorefrontConfig.bankAccountName)) {
      res.status(503).json({ error: "PAYMENT_NOT_CONFIGURED", message: "Thanh toán chuyển khoản chưa được cấu hình" });
      return;
    }
    const orderNumber = `HUB-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    let allProducts: WebProduct[];
    try {
      allProducts = await this.getPublishedProducts();
    } catch (error) {
      console.error("[Storefront checkout products]", error);
      res.status(503).json({ error: "PERSISTENCE_FAILED" });
      return;
    }

    let totalAmountVND = 0;
    let totalCostVND = 0;
    const reservations: Array<{ productId: string; sourceSkuId: string; quantity: number; expectedBasePriceVND: number }> = [];

    const orderItems: CustomerOrderItem[] = [];
    for (const item of payload.items) {
      const qty = item.quantity;
      const matchedProd = allProducts.find(product => product.id === item.productId);
      if (!matchedProd) {
        res.status(409).json({ error: "PRODUCT_UNAVAILABLE", message: "Một sản phẩm không còn được mở bán" });
        return;
      }
      const matchedVar = matchedProd.variants.find(variant =>
        variant.sourceSkuId === item.sourceSkuId ||
        variant.sourceSkuId === item.skuCode ||
        item.skuCode.startsWith(`${variant.sourceSkuId}-CUST-`)
      );
      if (!matchedVar || !matchedVar.selectedForSale || !matchedVar.sourceAvailable) {
        res.status(409).json({ error: "VARIANT_UNAVAILABLE", message: `Phân loại của ${matchedProd.titleVI} không còn bán` });
        return;
      }
      if (matchedVar.stockQuantity < qty) {
        res.status(409).json({ error: "INSUFFICIENT_STOCK", message: `${matchedProd.titleVI} chỉ còn ${matchedVar.stockQuantity} sản phẩm` });
        return;
      }
      const tier = [...(matchedProd.volumeDiscountTiers || [])]
        .sort((a, b) => b.minQty - a.minQty)
        .find(candidate => qty >= candidate.minQty);
      const addonIds = item.giftAddonsSelected || [];
      const validAddons = (matchedProd.giftAddons || []).filter(addon => addonIds.includes(addon.id));
      if (validAddons.length !== addonIds.length) {
        res.status(409).json({ error: "INVALID_ADDON", message: `Tùy chọn quà tặng của ${matchedProd.titleVI} đã thay đổi` });
        return;
      }
      const addonPrice = validAddons.reduce((sum, addon) => sum + addon.priceVND, 0);
      const price = Math.round(matchedVar.sellingPriceVND * (1 - (tier?.discountPercent || 0) / 100)) + addonPrice;
      totalAmountVND += price * qty;
      const cost = matchedVar.costPriceVND ?? 0;
      totalCostVND += cost * qty;
      reservations.push({ productId: matchedProd.id!, sourceSkuId: matchedVar.sourceSkuId, quantity: qty, expectedBasePriceVND: matchedVar.sellingPriceVND });
      orderItems.push({
        skuCode: item.skuCode,
        variantName: item.variantName,
        quantity: qty,
        sellingPriceVND: price,
        costVND: cost,
        source1688Url: matchedProd.sourceUrl,
        sourceProductId: matchedProd.sourceProductId,
        sourceSkuId: matchedVar.sourceSkuId,
        image: item.customizedPreviewUrl || matchedVar.imageUrl || matchedProd.primaryImage,
        customizationData: item.customizationData,
        customizedPreviewUrl: item.customizedPreviewUrl
      });
    }

    const consolidatedReservations = Array.from(reservations.reduce((map, reservation) => {
      const key = `${reservation.productId}:${reservation.sourceSkuId}`;
      const existing = map.get(key);
      map.set(key, existing ? { ...existing, quantity: existing.quantity + reservation.quantity } : reservation);
      return map;
    }, new Map<string, { productId: string; sourceSkuId: string; quantity: number; expectedBasePriceVND: number }>()).values());

    const discountCode = payload.discountCode?.trim().toUpperCase();
    const pricing = calculateStorefrontPricing(totalAmountVND, currentStorefrontConfig, discountCode);
    if (!pricing.couponValid) {
      res.status(400).json({ error: "INVALID_DISCOUNT_CODE", message: "Mã ưu đãi không hợp lệ hoặc đã ngừng áp dụng" });
      return;
    }
    const estimatedProfitVND = Math.max(0, totalAmountVND - pricing.discountAmountVND - totalCostVND);

    const newOrder: CustomerOrder = {
      id: crypto.randomUUID(),
      orderNumber,
      platform: "STOREFRONT",
      customerName: payload.customerName.trim(),
      customerPhone: phone,
      customerAddress: payload.customerAddress.trim(),
      items: orderItems,
      totalAmountVND: pricing.finalTotalVND,
      totalCostVND,
      estimatedProfitVND,
      status: "PENDING_SOURCING",
      paymentMethod: payload.paymentMethod || "COD",
      paymentStatus: "PENDING",
      note: payload.note ? payload.note.trim() : undefined,
      giftAddonsSelected: payload.giftAddonsSelected,
      discountCode: pricing.appliedDiscountCode,
      discountAmountVND: pricing.discountAmountVND,
      shippingFeeVND: pricing.shippingFeeVND,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Lưu vào bộ nhớ quản lý đơn hàng
    let createdOrder: CustomerOrder;
    try {
      createdOrder = await ordersService.createOrder(newOrder, consolidatedReservations);
    } catch (error) {
      console.error("[Storefront checkout order]", error);
      if (error instanceof Error && error.message === "STOCK_OR_PRICE_CHANGED") {
        res.status(409).json({ error: "STOCK_OR_PRICE_CHANGED", message: "Giá hoặc tồn kho vừa thay đổi; vui lòng tải lại giỏ hàng" });
        return;
      }
      res.status(503).json({ error: "PERSISTENCE_FAILED" });
      return;
    }

    // Tạo mã VietQR nếu chọn chuyển khoản
    let qrCodeUrl: string | undefined;
    if (payload.paymentMethod === "VIETQR" || payload.paymentMethod === "BANK_TRANSFER") {
      qrCodeUrl = generateVietQRUrl({
        bankId: currentStorefrontConfig.bankName,
        accountNo: currentStorefrontConfig.bankAccountNo,
        amount: pricing.finalTotalVND,
        orderInfo: `THANH TOAN DON ${orderNumber}`,
        accountName: currentStorefrontConfig.bankAccountName
      });
    }

    // Bắn thông báo Telegram tự động cho chủ cửa hàng nếu đã kết nối bot
    try {
      const telegramToken = ENV.TELEGRAM_BOT_TOKEN;
      const telegramChatId = ENV.TELEGRAM_CHAT_ID;
      if (telegramToken && telegramChatId) {
        const itemSummary = orderItems.map(i => `• ${i.variantName} x${i.quantity} (${i.sellingPriceVND.toLocaleString("vi-VN")}đ)`).join("\n");
        const msg = `🛍️ **ĐƠN HÀNG MỚI TỪ WEB BÁN HÀNG!**\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `📋 Mã đơn: **${orderNumber}**\n` +
          `👤 Khách hàng: **${newOrder.customerName}**\n` +
          `📞 SĐT: **${newOrder.customerPhone}**\n` +
          `📍 Địa chỉ: ${newOrder.customerAddress}\n` +
          `📦 Món hàng:\n${itemSummary}\n` +
          `💰 Tổng thanh toán: **${pricing.finalTotalVND.toLocaleString("vi-VN")} VNĐ**\n` +
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
      order: this.toPublicOrder(createdOrder),
      qrCodeUrl,
      storeConfig: currentStorefrontConfig
    });
  }

  /**
   * Tra cứu đơn hàng bằng đồng thời mã đơn và số điện thoại.
   */
  public async trackOrder(req: Request, res: Response): Promise<void> {
    res.setHeader("Cache-Control", "no-store");
    const { orderNumber, customerPhone } = req.body as { orderNumber: string; customerPhone: string };
    const phone = customerPhone.replace(/\D/g, "");
    const matched = await ordersService.findForTracking(orderNumber.trim(), phone);

    res.json({
      success: true,
      orders: matched ? [this.toPublicOrder(matched)] : []
    });
  }

  private toPublicOrder(order: CustomerOrder): CustomerOrder {
    return {
      ...order,
      totalCostVND: 0,
      estimatedProfitVND: 0,
      items: order.items.map(({ costVND: _cost, source1688Url: _url, sourceProductId: _product, sourceSkuId: _sku, ...item }) => item)
    };
  }

  private toPublicProduct(product: WebProduct): WebProduct {
    return {
      ...product,
      titleVariants: undefined,
      titleVariantsEN: undefined,
      sourceProductId: "",
      sourceUrl: "",
      supplierName: "",
      storeSyncHistory: undefined,
      attributes: product.attributes?.map(attribute => ({ ...attribute, keyCN: "", valueCN: "" })),
      priceTiers: product.priceTiers?.map(tier => ({ ...tier, priceCNY: 0 })),
      variants: product.variants.map(variant => ({
        ...variant,
        sourceVariantId: undefined,
        sourcePrice: undefined,
        costPriceVND: 0
      }))
    };
  }
}

export const storefrontController = new StorefrontController();
