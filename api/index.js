'use strict';

// Vercel entrypoint. Vercel builds every file in /api as a serverless function.
const { loadConfig } = require('../src/config');
const { createApp } = require('../src/app');
const { buildServices } = require('../src/index');

let app;

function getApp() {
  if (!app) {
    const config = loadConfig();
    const { smsService, emailService } = buildServices(config);
    app = createApp({ config, smsService, emailService });
  }
  return app;
}

module.exports = (req, res) => {
  try {
    return getApp()(req, res);
  } catch (error) {
    // Keep the deployment bootable when environment variables are missing;
    // requests fail with a clear 503 instead of a build/runtime crash.
    console.error('Failed to initialize application', error);
    res.statusCode = 503;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        error: {
          code: 'SERVICE_NOT_CONFIGURED',
          message: 'Service is not configured on this deployment',
        },
        timestamp: new Date().toISOString(),
      })
    );
  }
};
