'use strict';

const { AppError, ProviderError } = require('../lib/errors');

function createErrorHandler(logger = console) {
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    let status = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal Server Error';
    let details;

    if (err instanceof AppError) {
      status = err.status;
      code = err.code;
      message = err.message;
      details = err.details;
    } else if (err instanceof ProviderError) {
      status = 502;
      code = 'PROVIDER_ERROR';
      message = `${err.provider} request failed`;
    } else if (err.type === 'entity.parse.failed') {
      status = 400;
      code = 'INVALID_JSON';
      message = 'Request body is not valid JSON';
    }

    // Log unexpected failures and provider causes, but not expected 4xx/503
    // responses such as "provider not configured".
    if (err instanceof ProviderError || !(err instanceof AppError)) {
      logger.error(`[${req.method} ${req.originalUrl}]`, err.cause || err);
    }

    const payload = {
      error: { code, message },
      timestamp: new Date().toISOString(),
    };
    if (details) payload.error.details = details;

    res.status(status).json(payload);
  };
}

function notFound(req, res, next) {
  next(new AppError(404, 'NOT_FOUND', `Cannot ${req.method} ${req.path}`));
}

module.exports = { createErrorHandler, notFound };
