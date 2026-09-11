import { Request, Response } from "express";
import { ordersService } from "../services/orders.service.js";
import { OrderSourcingStatus } from "@hub1688/shared-types";

export class OrdersController {
  public async listOrders(req: Request, res: Response): Promise<void> {
    let orders;
    try { orders = await ordersService.listOrders(); }
    catch { res.status(503).json({ error: "PERSISTENCE_FAILED" }); return; }
    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmountVND, 0);
    const totalProfit = orders.reduce((sum, o) => sum + o.estimatedProfitVND, 0);
    const pendingSourcingCount = orders.filter(o => o.status === "PENDING_SOURCING").length;

    res.json({
      orders,
      stats: {
        totalOrders: orders.length,
        pendingSourcingCount,
        totalRevenue,
        totalProfit,
        avgProfitMargin: totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0
      }
    });
  }

  public async getOrderById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    let order;
    try { order = await ordersService.getOrderById(id); }
    catch { res.status(503).json({ error: "PERSISTENCE_FAILED" }); return; }
    if (!order) {
      res.status(404).json({ error: "Không tìm thấy đơn hàng" });
      return;
    }
    res.json(order);
  }

  public async createOrderWebhook(req: Request, res: Response): Promise<void> {
    const payload = req.body;
    try {
      const order = await ordersService.createOrder(payload);
      res.status(201).json({ success: true, order });
    } catch { res.status(503).json({ error: "PERSISTENCE_FAILED" }); }
  }

  public async updateOrderStatus(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { status, note } = req.body as { status: OrderSourcingStatus; note?: string };

    if (!status) {
      res.status(400).json({ error: "status là bắt buộc" });
      return;
    }

    let updated;
    try { updated = await ordersService.updateOrderStatus(id, status, note); }
    catch { res.status(503).json({ error: "PERSISTENCE_FAILED" }); return; }
    if (!updated) {
      res.status(404).json({ error: "Không tìm thấy đơn hàng" });
      return;
    }

    res.json({ success: true, order: updated });
  }

  public async deleteOrder(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const success = await ordersService.deleteOrder(id);
      res.status(success ? 200 : 404).json(success ? { success } : { success: false, error: "ORDER_NOT_FOUND" });
    } catch { res.status(503).json({ error: "PERSISTENCE_FAILED" }); }
  }
}
