'use strict';

function createTwilioClient({ accountSid, authToken }) {
  if (!accountSid || !authToken) return null;

  // Required lazily so the app can boot (and serve /api/health) without Twilio.
  const twilio = require('twilio');
  return twilio(accountSid, authToken);
}

module.exports = { createTwilioClient };
