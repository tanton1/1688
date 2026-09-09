import { Request, Response } from "express";
import { PricingEngineService } from "../services/pricing.service.js";

const pricingService = new PricingEngineService();

export class PricingController {
  public async getRules(req: Request, res: Response): Promise<void> {
    const rules = pricingService.getAllRules();
    res.json({ rules });
  }

  public async calculate(req: Request, res: Response): Promise<void> {
    const { priceCNY, ruleId } = req.body;
    if (typeof priceCNY !== "number") {
      res.status(400).json({ error: "priceCNY must be a number" });
      return;
    }

    const breakdown = pricingService.calculate(priceCNY, ruleId);
    res.json({ breakdown });
  }
}
