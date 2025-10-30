import { Request, Response, NextFunction } from 'express';

/**
 * Global error handling middleware
 * Catches any errors passed via next(error)
 */
export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error occurred:', error);

  // Default error response
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  return res.status(statusCode).json({
    error: message
  });
}
