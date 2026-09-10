import { Request, Response } from "express";
import { DEFAULT_GLOSSARY } from "@hub1688/shared-utils";
import { z } from "zod";

let inMemoryGlossary: Record<string, string> = { ...DEFAULT_GLOSSARY };

export class GlossaryController {
  public async getGlossary(req: Request, res: Response): Promise<void> {
    const list = Object.entries(inMemoryGlossary).map(([sourceText, targetText]) => ({
      sourceText,
      targetText
    }));
    res.json({ total: list.length, items: list, glossary: { ...inMemoryGlossary } });
  }

  public async setTerm(req: Request, res: Response): Promise<void> {
    const schema = z.union([
      z.object({ sourceText: z.string().trim().min(1).max(200), targetText: z.string().trim().min(1).max(500) }),
      z.object({ chineseTerm: z.string().trim().min(1).max(200), vietnameseTerm: z.string().trim().min(1).max(500) })
        .transform(value => ({ sourceText: value.chineseTerm, targetText: value.vietnameseTerm }))
    ]);
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_ERROR", message: "sourceText và targetText là bắt buộc" });
      return;
    }
    const { sourceText, targetText } = parsed.data;
    inMemoryGlossary[sourceText] = targetText;
    res.json({ success: true, term: { sourceText, targetText } });
  }
}
