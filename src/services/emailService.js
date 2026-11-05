'use strict';

const { ProviderError } = require('../lib/errors');

const FAILED_RESULT = {
  code: 'SEND_FAILED',
  message: 'Delivery failed',
};

function createEmailService({ client, from }) {
  async function send({ to, subject, text, html }) {
    const message = { to, from, subject };
    if (text !== undefined) message.text = text;
    if (html !== undefined) message.html = html;

    try {
      const [response] = await client.send(message);
      return {
        to,
        statusCode: response?.statusCode ?? 202,
        messageId: response?.headers?.['x-message-id'] ?? null,
      };
    } catch (error) {
      throw new ProviderError('SendGrid', error);
    }
  }

  async function sendBulk({ recipients, subject, text, html }) {
    return Promise.all(
      recipients.map(async (to) => {
        try {
          const result = await send({ to, subject, text, html });
          return { ok: true, ...result };
        } catch (error) {
          return { ok: false, to, error: { ...FAILED_RESULT } };
        }
      })
    );
  }

  return { send, sendBulk };
}

module.exports = { createEmailService };
