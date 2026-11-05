'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createSendgridClient, buildPayload } = require('../src/clients/sendgrid');

test('buildPayload includes text and html content', () => {
  const payload = buildPayload({
    to: 'person@example.com',
    from: 'sender@example.com',
    subject: 'Hello',
    text: 'Plain',
    html: '<p>Rich</p>',
  });

  assert.deepEqual(payload.personalizations, [{ to: [{ email: 'person@example.com' }] }]);
  assert.deepEqual(payload.from, { email: 'sender@example.com' });
  assert.deepEqual(payload.content, [
    { type: 'text/plain', value: 'Plain' },
    { type: 'text/html', value: '<p>Rich</p>' },
  ]);
});

test('createSendgridClient returns null without an API key', () => {
  assert.equal(createSendgridClient({ apiKey: undefined }), null);
});

test('send posts a SendGrid payload and returns headers', async () => {
  const calls = [];
  const client = createSendgridClient({
    apiKey: 'SG.test',
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return new Response('', {
        status: 202,
        headers: { 'x-message-id': 'message-123' },
      });
    },
  });

  const [response] = await client.send({
    to: 'person@example.com',
    from: 'sender@example.com',
    subject: 'Hello',
    text: 'Body',
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.sendgrid.com/v3/mail/send');
  assert.equal(calls[0].init.headers.authorization, 'Bearer SG.test');
  assert.equal(response.statusCode, 202);
  assert.equal(response.headers['x-message-id'], 'message-123');
});

test('send throws on a non-2xx response', async () => {
  const client = createSendgridClient({
    apiKey: 'SG.test',
    fetchImpl: async () => new Response('invalid sender', { status: 400 }),
  });

  await assert.rejects(
    () =>
      client.send({
        to: 'person@example.com',
        from: 'sender@example.com',
        subject: 'Hello',
        text: 'Body',
      }),
    /SendGrid returned 400/
  );
});
