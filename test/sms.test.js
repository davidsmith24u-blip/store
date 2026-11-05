'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ProviderError } = require('../src/lib/errors');
const { startTestServer, createSmsDouble } = require('../test-utils/helpers');

test('sends an SMS through the configured service', async (t) => {
  const smsService = createSmsDouble();
  const api = await startTestServer({ smsService });
  t.after(() => api.close());

  const response = await api.request('/api/send-sms', {
    method: 'POST',
    body: { to: '+14155552671', message: 'Hello there' },
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.sid, 'SM123');
  assert.deepEqual(smsService.calls, [
    { to: '+14155552671', message: 'Hello there' },
  ]);
});

test('rejects an invalid phone number', async (t) => {
  const api = await startTestServer({ smsService: createSmsDouble() });
  t.after(() => api.close());

  const response = await api.request('/api/send-sms', {
    method: 'POST',
    body: { to: '415-555-2671', message: 'Hello' },
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  assert.equal(response.body.error.details.field, 'to');
});

test('rejects a missing message', async (t) => {
  const api = await startTestServer({ smsService: createSmsDouble() });
  t.after(() => api.close());

  const response = await api.request('/api/send-sms', {
    method: 'POST',
    body: { to: '+14155552671' },
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.details.field, 'message');
});

test('returns 503 when Twilio is not configured', async (t) => {
  const api = await startTestServer();
  t.after(() => api.close());

  const response = await api.request('/api/send-sms', {
    method: 'POST',
    body: { to: '+14155552671', message: 'Hello' },
  });

  assert.equal(response.status, 503);
  assert.equal(response.body.error.code, 'SMS_NOT_CONFIGURED');
});

test('maps provider failures to 502', async (t) => {
  const smsService = createSmsDouble();
  smsService.sendError = new ProviderError('Twilio', new Error('carrier rejected'));
  const api = await startTestServer({ smsService });
  t.after(() => api.close());

  const response = await api.request('/api/send-sms', {
    method: 'POST',
    body: { to: '+14155552671', message: 'Hello' },
  });

  assert.equal(response.status, 502);
  assert.equal(response.body.error.code, 'PROVIDER_ERROR');
  assert.equal(response.body.error.message, 'Twilio request failed');
});

test('sends bulk SMS and reports partial failures with 207', async (t) => {
  const smsService = createSmsDouble();
  const api = await startTestServer({ smsService });
  t.after(() => api.close());

  const response = await api.request('/api/send-bulk-sms', {
    method: 'POST',
    body: {
      recipients: ['+14155552671', '+14155552672'],
      message: 'Hello',
    },
  });

  assert.equal(response.status, 207);
  assert.equal(response.body.success, false);
  assert.equal(response.body.data.sent, 1);
  assert.equal(response.body.data.failed, 1);
  assert.equal(response.body.data.results.length, 2);
});

test('rejects bulk requests over the recipient limit', async (t) => {
  const api = await startTestServer({ smsService: createSmsDouble() });
  t.after(() => api.close());

  const response = await api.request('/api/send-bulk-sms', {
    method: 'POST',
    body: {
      recipients: ['+14155552671', '+14155552672', '+14155552673', '+14155552674'],
      message: 'Hello',
    },
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.details.field, 'recipients');
});

test('rejects duplicate recipients', async (t) => {
  const api = await startTestServer({ smsService: createSmsDouble() });
  t.after(() => api.close());

  const response = await api.request('/api/send-bulk-sms', {
    method: 'POST',
    body: {
      recipients: ['+14155552671', '+14155552671'],
      message: 'Hello',
    },
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
});

test('returns 400 for a malformed JSON body', async (t) => {
  const api = await startTestServer({ smsService: createSmsDouble() });
  t.after(() => api.close());

  const response = await api.request('/api/send-sms', {
    method: 'POST',
    rawBody: '{"to":',
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'INVALID_JSON');
});

test('returns 404 for unknown routes when authenticated', async (t) => {
  const api = await startTestServer();
  t.after(() => api.close());

  const response = await api.request('/api/does-not-exist');

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, 'NOT_FOUND');
});
