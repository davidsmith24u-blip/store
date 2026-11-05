'use strict';

const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';

function buildPayload({ to, from, subject, text, html }) {
  const content = [];
  if (text !== undefined) content.push({ type: 'text/plain', value: text });
  if (html !== undefined) content.push({ type: 'text/html', value: html });

  return {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: from },
    subject,
    content,
  };
}

function createSendgridClient({ apiKey, fetchImpl = fetch, timeoutMs = 10_000 }) {
  if (!apiKey) return null;

  return {
    async send(message) {
      const response = await fetchImpl(SENDGRID_API_URL, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(buildPayload(message)),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        const body = await response.text();
        const error = new Error(`SendGrid returned ${response.status}: ${body.slice(0, 500)}`);
        error.statusCode = response.status;
        throw error;
      }

      return [
        {
          statusCode: response.status,
          headers: { 'x-message-id': response.headers.get('x-message-id') },
        },
      ];
    },
  };
}

module.exports = { createSendgridClient, buildPayload };
