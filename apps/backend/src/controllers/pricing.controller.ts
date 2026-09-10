import { Request, Response } from "express";
import { PricingEngineService } from "../services/pricing.service.js";
import { z } from "zod";
import { supabaseService } from "../services/supabase.service.js";

const pricingService = new PricingEngineService();

const ruleSchema = z.object({
  id: z.string().trim().min(2).max(64).regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().trim().min(2).max(120),
  categoryKeyword: z.string().trim().max(120).optional(),
  exchangeRate: z.number().positive().max(100_000),
  domesticChinaShipVND: z.number().nonnegative().max(100_000_000),
  intlShipPerKgVND: z.number().nonnegative().max(100_000_000),
  estimatedWeightKg: z.number().nonnegative().max(10_000),
  multiplier: z.number().positive().max(100),
  platformFeeRate: z.number().min(0).max(0.95),
  minProfitVND: z.number().nonnegative().max(1_000_000_000),
  minMarginPercent: z.number().min(0).max(100),
  roundToThousand: z.boolean()
});

export class PricingController {
  public async getRules(req: Request, res: Response): Promise<void> {
    if (supabaseService.isConfigured()) {
      const persisted = await supabaseService.getPricingRules();
      if (persisted) pricingService.replaceRules(persisted);
    }
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

  public async createRule(req: Request, res: Response): Promise<void> {
    const parsed = ruleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
      return;
    }
    if (pricingService.getAllRules().some(rule => rule.id === parsed.data.id)) {
      res.status(409).json({ error: "PRICING_RULE_EXISTS" });
      return;
    }
    if (supabaseService.isConfigured() && !(await supabaseService.savePricingRule(parsed.data))) {
      res.status(503).json({ error: "PERSISTENCE_FAILED" }); return;
    }
    res.status(201).json({ success: true, rule: pricingService.createRule(parsed.data) });
  }

  public async updateRule(req: Request, res: Response): Promise<void> {
    const parsed = ruleSchema.partial().omit({ id: true }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() });
      return;
    }
    const existing = pricingService.getAllRules().find(rule => rule.id === req.params.id);
    if (!existing) {
      res.status(404).json({ error: "PRICING_RULE_NOT_FOUND" });
      return;
    }
    const candidate = { ...existing, ...parsed.data, id: req.params.id };
    if (supabaseService.isConfigured() && !(await supabaseService.savePricingRule(candidate))) {
      res.status(503).json({ error: "PERSISTENCE_FAILED" }); return;
    }
    const rule = pricingService.updateRule(req.params.id, parsed.data)!;
    res.json({ success: true, rule });
  }

  public async deleteRule(req: Request, res: Response): Promise<void> {
    if (supabaseService.isConfigured() && !(await supabaseService.deletePricingRule(req.params.id))) {
      res.status(404).json({ error: "PRICING_RULE_NOT_FOUND" }); return;
    }
    const deleted = pricingService.deleteRule(req.params.id);
    if (!deleted) {
      res.status(409).json({ error: "PRICING_RULE_NOT_DELETABLE" });
      return;
    }
    res.json({ success: true });
  }
}
