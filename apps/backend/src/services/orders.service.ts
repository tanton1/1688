import { CustomerOrder, CustomerOrderItem, OrderSourcingStatus, WebProduct } from "@hub1688/shared-types";
import { inMemoryProducts } from "../controllers/import.controller.js";

// Khởi tạo các đơn hàng mẫu để người dùng thấy ngay giá trị thực tế
export const inMemoryOrders = new Map<string, CustomerOrder>([
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
]);

export class OrdersService {
  public listOrders(): CustomerOrder[] {
    return Array.from(inMemoryOrders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getOrderById(id: string): CustomerOrder | null {
    return inMemoryOrders.get(id) || null;
  }

  public createOrder(payload: Partial<CustomerOrder>): CustomerOrder {
    const id = `ord_${Date.now()}`;
    const orderNumber = payload.orderNumber || `ORD-#${Date.now().toString().slice(-6)}`;

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

      const costVND = item.costVND || (matchedVariant ? Math.round(matchedVariant.sellingPriceVND * 0.45) : Math.round(item.sellingPriceVND * 0.45));

      return {
        ...item,
        costVND,
        source1688Url: item.source1688Url || (matchedProd ? matchedProd.sourceUrl : "https://1688.com"),
        sourceProductId: item.sourceProductId || (matchedProd ? matchedProd.sourceProductId : undefined),
        image: item.image || (matchedProd ? matchedProd.primaryImage : undefined)
      };
    });

    const totalAmountVND = enrichedItems.reduce((sum, item) => sum + item.sellingPriceVND * item.quantity, 0);
    const totalCostVND = enrichedItems.reduce((sum, item) => sum + (item.costVND || 0) * item.quantity, 0);
    const estimatedProfitVND = totalAmountVND - totalCostVND;

    const newOrder: CustomerOrder = {
      id,
      orderNumber,
      platform: payload.platform || "MANUAL",
      customerName: payload.customerName || "Khách Hàng Mới",
      customerPhone: payload.customerPhone,
      customerAddress: payload.customerAddress,
      items: enrichedItems,
      totalAmountVND,
      totalCostVND,
      estimatedProfitVND,
      status: payload.status || "PENDING_SOURCING",
      note: payload.note,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    inMemoryOrders.set(id, newOrder);
    return newOrder;
  }

  public updateOrderStatus(id: string, status: OrderSourcingStatus, note?: string): CustomerOrder | null {
    const order = inMemoryOrders.get(id);
    if (!order) return null;

    order.status = status;
    if (note !== undefined) order.note = note;
    order.updatedAt = new Date().toISOString();

    inMemoryOrders.set(id, order);
    return order;
  }

  public deleteOrder(id: string): boolean {
    return inMemoryOrders.delete(id);
  }
}

export const ordersService = new OrdersService();
