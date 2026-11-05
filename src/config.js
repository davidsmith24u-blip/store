'use strict';

function toInteger(value, fallback, { min = 0 } = {}) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return parsed;
}

function parseCorsOrigin(value) {
  if (!value) return '*';
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.length === 0) return '*';
  return origins.length === 1 ? origins[0] : origins;
}

function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development';
  const apiKey = env.API_KEY || (nodeEnv === 'test' ? 'test-api-key' : undefined);

  if (!apiKey) {
    throw new Error(
      'API_KEY is required. Copy .env.example to .env and set a long random API_KEY.'
    );
  }

  return {
    nodeEnv,
    port: toInteger(env.PORT, 3000, { min: 1 }),
    apiKey,
    corsOrigin: parseCorsOrigin(env.CORS_ORIGIN),
    trustProxy: toInteger(env.TRUST_PROXY, 0),
    maxRecipients: toInteger(env.MAX_BULK_RECIPIENTS, 100, { min: 1 }),
    rateLimit: {
      windowMs: toInteger(env.RATE_LIMIT_WINDOW_MS, 60_000, { min: 1 }),
      max: toInteger(env.RATE_LIMIT_MAX, 120, { min: 1 }),
    },
    providers: {
      twilio: {
        accountSid: env.TWILIO_ACCOUNT_SID,
        authToken: env.TWILIO_AUTH_TOKEN,
        from: env.TWILIO_PHONE_NUMBER,
      },
      sendgrid: {
        apiKey: env.SENDGRID_API_KEY,
        from: env.SENDGRID_FROM_EMAIL,
      },
    },
  };
}

module.exports = { loadConfig };
