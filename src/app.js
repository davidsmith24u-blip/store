'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createApiKeyAuth } = require('./middleware/auth');
const { createRateLimiter } = require('./middleware/rateLimit');
const { createErrorHandler, notFound } = require('./middleware/errorHandler');
const { createHealthRouter } = require('./routes/health');
const { createSmsRouter } = require('./routes/sms');
const { createEmailRouter } = require('./routes/email');

function createApp({ config, smsService = null, emailService = null, logger = console }) {
  const app = express();

  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '1mb' }));
  app.use(createRateLimiter(config.rateLimit));

  // Public liveness probe.
  app.use('/api/health', createHealthRouter());

  // Everything else under /api requires a valid API key.
  app.use('/api', createApiKeyAuth(config.apiKey));
  app.use('/api', createSmsRouter({ smsService, maxRecipients: config.maxRecipients }));
  app.use(
    '/api',
    createEmailRouter({ emailService, maxRecipients: config.maxRecipients })
  );

  app.use(notFound);
  app.use(createErrorHandler(logger));

  return app;
}

module.exports = { createApp };
