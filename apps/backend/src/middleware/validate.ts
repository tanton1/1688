import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

export const validateBody = (schema: ZodType) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const flattened = parsed.error.flatten();
      res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Dữ liệu gửi lên chưa hợp lệ",
        details: {
          ...flattened,
          issues: parsed.error.issues.map(issue => ({
            path: issue.path,
            message: issue.message,
            code: issue.code
          }))
        },
        requestId: req.requestId
      });
      return;
    }
    req.body = parsed.data;
    next();
  };
