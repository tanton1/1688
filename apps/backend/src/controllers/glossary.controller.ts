import { Request, Response } from "express";
import { DEFAULT_GLOSSARY } from "@hub1688/shared-utils";

let inMemoryGlossary: Record<string, string> = { ...DEFAULT_GLOSSARY };

export class GlossaryController {
  public async getGlossary(req: Request, res: Response): Promise<void> {
    const list = Object.entries(inMemoryGlossary).map(([sourceText, targetText]) => ({
      sourceText,
      targetText
    }));
    res.json({ total: list.length, items: list });
  }

  public async setTerm(req: Request, res: Response): Promise<void> {
    const { sourceText, targetText } = req.body;
    if (!sourceText || !targetText) {
      res.status(400).json({ error: "sourceText and targetText are required" });
      return;
    }

    inMemoryGlossary[sourceText] = targetText;
    res.json({ success: true, term: { sourceText, targetText } });
  }
}
