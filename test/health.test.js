'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer } = require('../test-utils/helpers');

test('GET /api/health is public and reports status', async (t) => {
  const api = await startTestServer();
  t.after(() => api.close());

  const response = await api.request('/api/health', { apiKey: null });

  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.service, 'sms-email-service');
  assert.equal(typeof response.body.uptime, 'number');
});
