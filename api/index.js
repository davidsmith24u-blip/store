'use strict';

// Vercel entrypoint. Vercel builds every file in /api as a serverless function.
const { loadConfig } = require('../src/config');
const { createApp } = require('../src/app');
const { buildServices } = require('../src/index');

const config = loadConfig();
const { smsService, emailService } = buildServices(config);

module.exports = createApp({ config, smsService, emailService });
