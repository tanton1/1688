import { CustomerOrder, CustomerOrderItem, OrderSourcingStatus, WebProduct } from "@hub1688/shared-types";
import { inMemoryProducts } from "../controllers/import.controller.js";
import crypto from "node:crypto";
import { ENV } from "../config/env.js";
import { supabaseService } from "./supabase.service.js";

// Khởi tạo các đơn hàng mẫu để người dùng thấy ngay giá trị thực tế
const DEMO_ORDERS: Array<[string, CustomerOrder]> = [
  [
    "ord_1001",
    {
      id: "ord_1001",
      orderNumber: "WC-#88214",
      platform: "WOOCOMMERCE",
      customerName: "Nguyễn Thị Thảo Vy",
      customerPhone: "0908123456",
      customerAddress: "124 Nguyễn Đình Chiểu, Phường 6, Quận 3, TP. Hồ Chí Minh",
      items: [
        {
          skuCode: "SP-908234-01",
          variantName: "Họa tiết hoa xanh - Size M",
          quantity: 2,
          sellingPriceVND: 350000,
          costVND: 145000,
          source1688Url: "https://detail.1688.com/offer/744219082341.html",
          sourceProductId: "744219082341",
          sourceSkuId: "sku_flower_blue_m",
          image: "https://img.alicdn.com/imgextra/i4/2214553218764/O1CN01Z7W8v71vR4sQ8Yw7R_!!2214553218764.jpg"
        }
      ],
      totalAmountVND: 700000,
      totalCostVND: 290000,
      estimatedProfitVND: 410000,
      status: "PENDING_SOURCING",
      note: "Khách dặn bọc chống sốc kỹ, giao trước thứ 7",
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 4).toISOString()
    }
  ],
  [
    "ord_1002",
    {
      id: "ord_1002",
      orderNumber: "SHP-#10582",
      platform: "SHOPIFY",
      customerName: "Jessica Tran",
      customerPhone: "+1 408 555 0199",
      customerAddress: "1428 Elm Street, San Jose, CA 95128, USA",
      items: [
        {
          skuCode: "SP-882310-02",
          variantName: "Màu Trắng Kem - Freesize",
          quantity: 1,
          sellingPriceVND: 480000,
          costVND: 172000,
          source1688Url: "https://detail.1688.com/offer/684210992310.html",
          sourceProductId: "684210992310",
          sourceSkuId: "sku_linen_cream",
          image: "https://img.alicdn.com/imgextra/i2/2215889912014/O1CN01K7T8w91xR3sP9Zv9A_!!2215889912014.jpg"
        }
      ],
      totalAmountVND: 480000,
      totalCostVND: 172000,
      estimatedProfitVND: 308000,
      status: "ORDERED_1688",
      note: "Đã đặt xưởng Thâm Quyến, mã tracking nội địa TQ: SF1420998812",
      createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 12).toISOString()
    }
  ]
];
export const inMemoryOrders = new Map<string, CustomerOrder>(ENV.DEMO_MODE ? DEMO_ORDERS : []);

export class OrdersService {
  public async listOrders(): Promise<CustomerOrder[]> {
    if (supabaseService.isConfigured()) {
      const persisted = await supabaseService.listOrders();
      if (persisted) {
        for (const order of persisted) inMemoryOrders.set(order.id, order);
        return persisted;
      }
      throw new Error("PERSISTENCE_FAILED");
    }
    return Array.from(inMemoryOrders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public async getOrderById(id: string): Promise<CustomerOrder | null> {
    if (supabaseService.isConfigured()) await this.listOrders();
    return inMemoryOrders.get(id) || null;
  }

  public async findForTracking(orderNumber: string, customerPhone: string): Promise<CustomerOrder | null> {
    if (supabaseService.isConfigured()) {
      return supabaseService.getOrderForTracking(orderNumber, customerPhone);
    }
    return Array.from(inMemoryOrders.values()).find(order =>
      order.orderNumber.toLowerCase() === orderNumber.toLowerCase() &&
      (order.customerPhone || "").replace(/\D/g, "") === customerPhone
    ) || null;
  }

  public async createOrder(payload: Partial<CustomerOrder>, reservations?: Array<{ productId: string; sourceSkuId: string; quantity: number; expectedBasePriceVND: number }>): Promise<CustomerOrder> {
    const id = crypto.randomUUID();
    const orderNumber = payload.orderNumber || `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    // Tự động tìm nguồn 1688 từ kho sản phẩm
    const products = Array.from(inMemoryProducts.values());
    const enrichedItems: CustomerOrderItem[] = (payload.items || []).map(item => {
      let matchedProd: WebProduct | undefined;
      let matchedVariant: any;

      for (const p of products) {
        const v = p.variants.find(
          varItem => varItem.sourceSkuId === item.sourceSkuId || p.skuCode === item.skuCode
        );
        if (v) {
          matchedProd = p;
          matchedVariant = v;
          break;
        }
      }

      const costVND = item.costVND ?? matchedVariant?.costPriceVND ?? 0;

      return {
        ...item,
        costVND,
        source1688Url: item.source1688Url || matchedProd?.sourceUrl,
        sourceProductId: item.sourceProductId || (matchedProd ? matchedProd.sourceProductId : undefined),
        image: item.image || (matchedProd ? matchedProd.primaryImage : undefined)
      };
    });

    const itemAmountVND = enrichedItems.reduce((sum, item) => sum + item.sellingPriceVND * item.quantity, 0);
    const itemCostVND = enrichedItems.reduce((sum, item) => sum + (item.costVND || 0) * item.quantity, 0);
    const totalAmountVND = Number.isFinite(payload.totalAmountVND) ? payload.totalAmountVND! : itemAmountVND;
    const totalCostVND = Number.isFinite(payload.totalCostVND) ? payload.totalCostVND! : itemCostVND;
    const estimatedProfitVND = Number.isFinite(payload.estimatedProfitVND) ? payload.estimatedProfitVND! : totalAmountVND - totalCostVND;

    const newOrder: CustomerOrder = {
      id,
      orderNumber,
      platform: payload.platform || "MANUAL",
      customerName: payload.customerName || "",
      customerPhone: payload.customerPhone?.replace(/\D/g, ""),
      customerAddress: payload.customerAddress,
      items: enrichedItems,
      totalAmountVND,
      totalCostVND,
      estimatedProfitVND,
      status: payload.status || "PENDING_SOURCING",
      paymentMethod: payload.paymentMethod,
      paymentStatus: payload.paymentStatus,
      note: payload.note,
      giftAddonsSelected: payload.giftAddonsSelected,
      discountCode: payload.discountCode,
      discountAmountVND: payload.discountAmountVND,
      shippingFeeVND: payload.shippingFeeVND,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (supabaseService.isConfigured()) {
      const persisted = reservations
        ? await supabaseService.createStorefrontOrderAtomic(newOrder, reservations)
        : await supabaseService.saveOrder(newOrder);
      if (!persisted) throw new Error("PERSISTENCE_FAILED");
    } else if (reservations) {
      for (const reservation of reservations) {
        const product = inMemoryProducts.get(reservation.productId);
        const variant = product?.variants.find(item => item.sourceSkuId === reservation.sourceSkuId);
        if (!product || !variant || variant.sellingPriceVND !== reservation.expectedBasePriceVND || (variant.inventoryTracked !== false && variant.stockQuantity < reservation.quantity)) {
          throw new Error("STOCK_OR_PRICE_CHANGED");
        }
      }
      for (const reservation of reservations) {
        const product = inMemoryProducts.get(reservation.productId)!;
        const variant = product.variants.find(item => item.sourceSkuId === reservation.sourceSkuId)!;
        if (variant.inventoryTracked !== false) {
          variant.stockQuantity -= reservation.quantity;
          variant.sourceAvailable = variant.stockQuantity > 0;
        }
      }
    }
    inMemoryOrders.set(id, newOrder);
    return newOrder;
  }

  public async updateOrderStatus(id: string, status: OrderSourcingStatus, note?: string): Promise<CustomerOrder | null> {
    const order = await this.getOrderById(id);
    if (!order) return null;
    const updated = { ...order, status, note: note !== undefined ? note : order.note, updatedAt: new Date().toISOString() };
    if (supabaseService.isConfigured() && !(await supabaseService.saveOrder(updated))) throw new Error("PERSISTENCE_FAILED");
    inMemoryOrders.set(id, updated);
    return updated;
  }

  public async deleteOrder(id: string): Promise<boolean> {
    if (supabaseService.isConfigured()) {
      const deleted = await supabaseService.deleteOrder(id);
      if (deleted) inMemoryOrders.delete(id);
      return deleted;
    }
    return inMemoryOrders.delete(id);
  }
}

export const ordersService = new OrdersService();
