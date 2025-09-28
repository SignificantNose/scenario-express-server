import * as v from 'valibot';
import { Request, Response, NextFunction } from 'express';

export function validateBody(schema: v.BaseSchema<any, any, any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = v.safeParse(schema, req.body);

    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        issues: result.issues,
      });
      return;
    }

    next();
  };
}
