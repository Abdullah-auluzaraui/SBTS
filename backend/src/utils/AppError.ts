import { ErrorCode } from '../../../shared/types/errorCodes';

export class AppError extends Error {
  public readonly isOperational = true;

  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    public readonly details?: any
  ) {
    super(code);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
