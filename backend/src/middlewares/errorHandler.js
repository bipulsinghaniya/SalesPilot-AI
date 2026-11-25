import { env } from '../config/env.js';

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
}

export function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;
  const payload = {
    success: false,
    code: err.code || 'INTERNAL_ERROR',
    message: err.message || 'Internal server error',
  };

  if (err.details) {
    payload.details = err.details;
  }

  if (env.nodeEnv === 'development' && statusCode >= 500) {
    payload.stack = err.stack;
  }

  if (statusCode >= 500) {
    console.error('[Error]', err);
  }

  res.status(statusCode).json(payload);
}
