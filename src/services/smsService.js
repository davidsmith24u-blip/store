'use strict';

const { ProviderError } = require('../lib/errors');

const FAILED_RESULT = {
  code: 'SEND_FAILED',
  message: 'Delivery failed',
};

function createSmsService({ client, from }) {
  async function send({ to, message }) {
    try {
      const result = await client.messages.create({ to, from, body: message });
      return {
        to: result.to || to,
        sid: result.sid,
        status: result.status || 'queued',
      };
    } catch (error) {
      throw new ProviderError('Twilio', error);
    }
  }

  async function sendBulk({ recipients, message }) {
    return Promise.all(
      recipients.map(async (to) => {
        try {
          const result = await send({ to, message });
          return { ok: true, ...result };
        } catch (error) {
          return { ok: false, to, error: { ...FAILED_RESULT } };
        }
      })
    );
  }

  return { send, sendBulk };
}

module.exports = { createSmsService };
