import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: typeof err.details === 'string' ? err.details : err.message || err.code,
      details: err.details || null
    });
    return;
  }

  // Log unhandled unexpected errors
  console.error('💥 Unhandled Error:', err);

  res.status(500).json({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};
