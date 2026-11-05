'use strict';

require('dotenv').config();

const { loadConfig } = require('./config');
const { createApp } = require('./app');
const { createTwilioClient } = require('./clients/twilio');
const { createSendgridClient } = require('./clients/sendgrid');
const { createSmsService } = require('./services/smsService');
const { createEmailService } = require('./services/emailService');

function buildServices(config) {
  const twilioClient = createTwilioClient(config.providers.twilio);
  const smsService =
    twilioClient && config.providers.twilio.from
      ? createSmsService({ client: twilioClient, from: config.providers.twilio.from })
      : null;

  const sendgridClient = createSendgridClient(config.providers.sendgrid);
  const emailService =
    sendgridClient && config.providers.sendgrid.from
      ? createEmailService({
          client: sendgridClient,
          from: config.providers.sendgrid.from,
        })
      : null;

  return { smsService, emailService };
}

function start() {
  const config = loadConfig();
  const { smsService, emailService } = buildServices(config);
  const app = createApp({ config, smsService, emailService });

  const server = app.listen(config.port, () => {
    console.log(`SMS/email service listening on port ${config.port} (${config.nodeEnv})`);
    if (!smsService) {
      console.warn('Twilio is not configured; SMS endpoints will return 503');
    }
    if (!emailService) {
      console.warn('SendGrid is not configured; email endpoints will return 503');
    }
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close((error) => {
      if (error) {
        console.error(error);
        process.exit(1);
      }
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
}

if (require.main === module) start();

module.exports = { start, buildServices };
