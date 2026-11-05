'use strict';

const { createApp } = require('../src/app');

const baseConfig = {
  nodeEnv: 'test',
  port: 0,
  apiKey: 'test-api-key',
  corsOrigin: '*',
  trustProxy: 0,
  maxRecipients: 3,
  rateLimit: { windowMs: 60_000, max: 1_000 },
};

const silentLogger = { log() {}, warn() {}, error() {} };

async function request(baseUrl, path, options = {}) {
  const {
    method = 'GET',
    body,
    rawBody,
    apiKey = 'test-api-key',
    headers = {},
  } = options;

  const requestHeaders = { ...headers };
  let payload;

  if (rawBody !== undefined) {
    payload = rawBody;
    requestHeaders['content-type'] = 'application/json';
  } else if (body !== undefined) {
    payload = JSON.stringify(body);
    requestHeaders['content-type'] = 'application/json';
  }

  if (apiKey !== null) requestHeaders['x-api-key'] = apiKey;

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: requestHeaders,
    body: payload,
  });

  const text = await response.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  return { status: response.status, body: parsed, headers: response.headers };
}

async function startTestServer({ smsService = null, emailService = null, config = {} } = {}) {
  const app = createApp({
    config: { ...baseConfig, ...config },
    smsService,
    emailService,
    logger: silentLogger,
  });

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    baseUrl,
    request: (path, options) => request(baseUrl, path, options),
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      ),
  };
}

function createSmsDouble() {
  const double = {
    calls: [],
    sendError: null,
    bulkResults: null,

    async send(payload) {
      double.calls.push(payload);
      if (double.sendError) throw double.sendError;
      return { to: payload.to, sid: 'SM123', status: 'queued' };
    },

    async sendBulk(payload) {
      double.calls.push(payload);
      if (double.bulkResults) return double.bulkResults;
      return payload.recipients.map((to, index) =>
        index === 0
          ? { ok: true, to, sid: 'SM123', status: 'queued' }
          : {
              ok: false,
              to,
              error: { code: 'SEND_FAILED', message: 'Delivery failed' },
            }
      );
    },
  };
  return double;
}

function createEmailDouble() {
  const double = {
    calls: [],
    sendError: null,
    bulkResults: null,

    async send(payload) {
      double.calls.push(payload);
      if (double.sendError) throw double.sendError;
      return { to: payload.to, statusCode: 202, messageId: 'msg-123' };
    },

    async sendBulk(payload) {
      double.calls.push(payload);
      if (double.bulkResults) return double.bulkResults;
      return payload.recipients.map((to, index) =>
        index === 0
          ? { ok: true, to, statusCode: 202, messageId: 'msg-123' }
          : {
              ok: false,
              to,
              error: { code: 'SEND_FAILED', message: 'Delivery failed' },
            }
      );
    },
  };
  return double;
}

module.exports = {
  request,
  startTestServer,
  createSmsDouble,
  createEmailDouble,
};
