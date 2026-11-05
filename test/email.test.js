'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ProviderError } = require('../src/lib/errors');
const { startTestServer, createEmailDouble } = require('../test-utils/helpers');

test('sends an email through the configured service', async (t) => {
  const emailService = createEmailDouble();
  const api = await startTestServer({ emailService });
  t.after(() => api.close());

  const response = await api.request('/api/send-email', {
    method: 'POST',
    body: {
      to: 'person@example.com',
      subject: 'Hello',
      text: 'Plain text body',
    },
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.messageId, 'msg-123');
  assert.deepEqual(emailService.calls, [
    {
      to: 'person@example.com',
      subject: 'Hello',
      text: 'Plain text body',
      html: undefined,
    },
  ]);
});

test('accepts html-only email content', async (t) => {
  const api = await startTestServer({ emailService: createEmailDouble() });
  t.after(() => api.close());

  const response = await api.request('/api/send-email', {
    method: 'POST',
    body: {
      to: 'person@example.com',
      subject: 'Hello',
      html: '<p>Hello</p>',
    },
  });

  assert.equal(response.status, 200);
});

test('rejects email without text or html', async (t) => {
  const api = await startTestServer({ emailService: createEmailDouble() });
  t.after(() => api.close());

  const response = await api.request('/api/send-email', {
    method: 'POST',
    body: {
      to: 'person@example.com',
      subject: 'Hello',
    },
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  assert.equal(response.body.error.details.field, 'text');
});

test('rejects an invalid email address', async (t) => {
  const api = await startTestServer({ emailService: createEmailDouble() });
  t.after(() => api.close());

  const response = await api.request('/api/send-email', {
    method: 'POST',
    body: { to: 'not-an-email', subject: 'Hello', text: 'Body' },
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.details.field, 'to');
});

test('returns 503 when SendGrid is not configured', async (t) => {
  const api = await startTestServer();
  t.after(() => api.close());

  const response = await api.request('/api/send-email', {
    method: 'POST',
    body: { to: 'person@example.com', subject: 'Hello', text: 'Body' },
  });

  assert.equal(response.status, 503);
  assert.equal(response.body.error.code, 'EMAIL_NOT_CONFIGURED');
});

test('maps provider failures to 502', async (t) => {
  const emailService = createEmailDouble();
  emailService.sendError = new ProviderError('SendGrid', new Error('rejected'));
  const api = await startTestServer({ emailService });
  t.after(() => api.close());

  const response = await api.request('/api/send-email', {
    method: 'POST',
    body: { to: 'person@example.com', subject: 'Hello', text: 'Body' },
  });

  assert.equal(response.status, 502);
  assert.equal(response.body.error.code, 'PROVIDER_ERROR');
});

test('sends bulk email and reports partial failures with 207', async (t) => {
  const api = await startTestServer({ emailService: createEmailDouble() });
  t.after(() => api.close());

  const response = await api.request('/api/send-bulk-email', {
    method: 'POST',
    body: {
      recipients: ['one@example.com', 'two@example.com'],
      subject: 'Hello',
      text: 'Body',
    },
  });

  assert.equal(response.status, 207);
  assert.equal(response.body.data.sent, 1);
  assert.equal(response.body.data.failed, 1);
});
