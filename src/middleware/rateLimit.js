'use strict';

const rateLimit = require('express-rate-limit');
const { AppError } = require('../lib/errors');

function createRateLimiter({ windowMs, max }) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res, next) =>
      next(new AppError(429, 'RATE_LIMITED', 'Too many requests, please try again later')),
  });
}

module.exports = { createRateLimiter };
