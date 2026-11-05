'use strict';

class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    if (details) this.details = details;
    Error.captureStackTrace?.(this, AppError);
  }
}

class ProviderError extends Error {
  constructor(provider, cause) {
    super(`${provider} request failed`);
    this.name = 'ProviderError';
    this.provider = provider;
    this.cause = cause;
    Error.captureStackTrace?.(this, ProviderError);
  }
}

module.exports = { AppError, ProviderError };
