'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig } = require('../src/config');

test('loadConfig applies defaults', () => {
  const config = loadConfig({ NODE_ENV: 'test' });

  assert.equal(config.apiKey, 'test-api-key');
  assert.equal(config.port, 3000);
  assert.equal(config.corsOrigin, '*');
  assert.equal(config.maxRecipients, 100);
});

test('loadConfig requires an API key outside tests', () => {
  assert.throws(() => loadConfig({ NODE_ENV: 'production' }), /API_KEY is required/);
});

test('loadConfig parses cors origins and numeric values', () => {
  const config = loadConfig({
    NODE_ENV: 'test',
    API_KEY: 'secret',
    PORT: '8080',
    CORS_ORIGIN: 'https://a.example, https://b.example',
    MAX_BULK_RECIPIENTS: '25',
    RATE_LIMIT_MAX: '5',
  });

  assert.equal(config.port, 8080);
  assert.deepEqual(config.corsOrigin, ['https://a.example', 'https://b.example']);
  assert.equal(config.maxRecipients, 25);
  assert.equal(config.rateLimit.max, 5);
});
