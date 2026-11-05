'use strict';

const crypto = require('node:crypto');
const { AppError } = require('../lib/errors');

function hash(value) {
  return crypto.createHash('sha256').update(value).digest();
}

function createApiKeyAuth(apiKey) {
  const expected = hash(apiKey);

  return (req, res, next) => {
    const header = req.get('x-api-key');
    const bearer = req.get('authorization');
    const provided = header || (bearer && bearer.replace(/^Bearer\s+/i, ''));

    if (typeof provided !== 'string' || provided.length === 0) {
      return next(new AppError(401, 'UNAUTHORIZED', 'A valid API key is required'));
    }

    if (!crypto.timingSafeEqual(hash(provided), expected)) {
      return next(new AppError(401, 'UNAUTHORIZED', 'A valid API key is required'));
    }

    return next();
  };
}

module.exports = { createApiKeyAuth };
