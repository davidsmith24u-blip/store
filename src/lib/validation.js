'use strict';

const { AppError } = require('./errors');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+[1-9]\d{6,14}$/;

function fail(field, message) {
  throw new AppError(400, 'VALIDATION_ERROR', message, { field });
}

function requireObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    fail('body', 'Request body must be a JSON object');
  }
  return body;
}

function requireString(value, field, { max } = {}) {
  if (typeof value !== 'string') fail(field, `${field} is required and must be a string`);

  const trimmed = value.trim();
  if (trimmed.length === 0) fail(field, `${field} must not be empty`);
  if (max && trimmed.length > max) fail(field, `${field} must be at most ${max} characters`);

  return trimmed;
}

function requirePhone(value, field = 'to') {
  const phone = requireString(value, field, { max: 16 });
  if (!PHONE_PATTERN.test(phone)) {
    fail(field, `${field} must be an E.164 phone number, for example +14155552671`);
  }
  return phone;
}

function requireEmail(value, field = 'to') {
  const email = requireString(value, field, { max: 254 });
  if (!EMAIL_PATTERN.test(email)) fail(field, `${field} must be a valid email address`);
  return email;
}

function requireRecipients(value, { maxRecipients, validate, field = 'recipients' }) {
  if (!Array.isArray(value) || value.length === 0) {
    fail(field, `${field} must be a non-empty array`);
  }
  if (value.length > maxRecipients) {
    fail(field, `${field} must contain at most ${maxRecipients} entries`);
  }

  const seen = new Set();
  const recipients = [];

  value.forEach((item, index) => {
    const recipient = validate(item, `${field}[${index}]`);
    const key = recipient.toLowerCase();
    if (seen.has(key)) {
      fail(`${field}[${index}]`, `Duplicate recipient: ${recipient}`);
    }
    seen.add(key);
    recipients.push(recipient);
  });

  return recipients;
}

function requireContent(data) {
  const text = data.text === undefined ? undefined : requireString(data.text, 'text', { max: 100_000 });
  const html = data.html === undefined ? undefined : requireString(data.html, 'html', { max: 100_000 });

  if (!text && !html) fail('text', 'Either text or html content is required');

  return { text, html };
}

function validateSmsBody(body) {
  const data = requireObject(body);
  return {
    to: requirePhone(data.to),
    message: requireString(data.message, 'message', { max: 1600 }),
  };
}

function validateBulkSmsBody(body, maxRecipients) {
  const data = requireObject(body);
  return {
    recipients: requireRecipients(data.recipients, { maxRecipients, validate: requirePhone }),
    message: requireString(data.message, 'message', { max: 1600 }),
  };
}

function validateEmailBody(body) {
  const data = requireObject(body);
  return {
    to: requireEmail(data.to),
    subject: requireString(data.subject, 'subject', { max: 998 }),
    ...requireContent(data),
  };
}

function validateBulkEmailBody(body, maxRecipients) {
  const data = requireObject(body);
  return {
    recipients: requireRecipients(data.recipients, { maxRecipients, validate: requireEmail }),
    subject: requireString(data.subject, 'subject', { max: 998 }),
    ...requireContent(data),
  };
}

module.exports = {
  validateSmsBody,
  validateBulkSmsBody,
  validateEmailBody,
  validateBulkEmailBody,
};
