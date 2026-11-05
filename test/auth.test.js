'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, createSmsDouble } = require('../test-utils/helpers');

const validSms = { to: '+14155552671', message: 'Hello' };

test('rejects requests without an API key', async (t) => {
  const api = await startTestServer({ smsService: createSmsDouble() });
  t.after(() => api.close());

  const response = await api.request('/api/send-sms', {
    method: 'POST',
    body: validSms,
    apiKey: null,
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'UNAUTHORIZED');
});

test('rejects requests with a wrong API key', async (t) => {
  const api = await startTestServer({ smsService: createSmsDouble() });
  t.after(() => api.close());

  const response = await api.request('/api/send-sms', {
    method: 'POST',
    body: validSms,
    apiKey: 'wrong-key',
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'UNAUTHORIZED');
});

test('accepts the API key as a bearer token', async (t) => {
  const api = await startTestServer({ smsService: createSmsDouble() });
  t.after(() => api.close());

  const response = await api.request('/api/send-sms', {
    method: 'POST',
    body: validSms,
    apiKey: null,
    headers: { authorization: 'Bearer test-api-key' },
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
});

test('rate limits requests after the configured maximum', async (t) => {
  const api = await startTestServer({
    config: { rateLimit: { windowMs: 60_000, max: 2 } },
  });
  t.after(() => api.close());

  const first = await api.request('/api/health', { apiKey: null });
  const second = await api.request('/api/health', { apiKey: null });
  const third = await api.request('/api/health', { apiKey: null });

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(third.status, 429);
  assert.equal(third.body.error.code, 'RATE_LIMITED');
});
