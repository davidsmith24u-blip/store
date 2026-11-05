# SMS & Email Service

A small, production-minded HTTP API for sending SMS through Twilio and email
through SendGrid. Built with Node.js and Express, with input validation, API-key
authentication, rate limiting, and a dependency-injected test suite that never
calls a real provider.

## Features

- `POST /api/send-sms` and `POST /api/send-bulk-sms` via Twilio
- `POST /api/send-email` and `POST /api/send-bulk-email` via SendGrid
- E.164 phone and email validation, duplicate and size limits on bulk requests
- Constant-time API-key comparison (`x-api-key` or `Authorization: Bearer`)
- Per-IP rate limiting, Helmet security headers, configurable CORS
- Partial-failure reporting for bulk sends (`207 Multi-Status`)
- Lazy provider initialization: the API and `/api/health` boot without credentials
- Node's built-in test runner; no test framework dependencies
- Multi-stage Dockerfile and GitHub Actions CI

## Requirements

- Node.js 20 or newer
- A Twilio account for SMS (optional)
- A SendGrid account for email (optional)

## Quick start

```bash
npm install
cp .env.example .env
# edit .env and set API_KEY, then add Twilio/SendGrid credentials
npm start
```

The server listens on `http://localhost:3000`. Without provider credentials it
still starts, `/api/health` works, and the send endpoints return `503` with a
clear "not configured" error.

Generate a strong API key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Configuration

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `API_KEY` | yes | — | Shared secret required on every `/api/*` route except health |
| `PORT` | no | `3000` | HTTP port |
| `NODE_ENV` | no | `development` | Runtime environment |
| `CORS_ORIGIN` | no | `*` | Allowed origin(s), comma-separated |
| `TRUST_PROXY` | no | `0` | Set to `1` behind one reverse proxy |
| `RATE_LIMIT_WINDOW_MS` | no | `60000` | Rate-limit window |
| `RATE_LIMIT_MAX` | no | `120` | Requests per IP per window |
| `MAX_BULK_RECIPIENTS` | no | `100` | Maximum entries per bulk request |
| `TWILIO_ACCOUNT_SID` | for SMS | — | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | for SMS | — | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | for SMS | — | Sender in E.164 format |
| `SENDGRID_API_KEY` | for email | — | SendGrid API key |
| `SENDGRID_FROM_EMAIL` | for email | — | Verified sender address |

## API

All routes except `GET /api/health` require an API key:

```http
x-api-key: <API_KEY>
```

`Authorization: Bearer <API_KEY>` is also accepted.

### Health

```bash
curl http://localhost:3000/api/health
```

```json
{
  "status": "ok",
  "service": "sms-email-service",
  "version": "1.0.0",
  "uptime": 12,
  "timestamp": "2026-11-05T10:00:00.000Z"
}
```

### Send an SMS

```bash
curl -X POST http://localhost:3000/api/send-sms \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to":"+14155552671","message":"Your appointment is confirmed."}'
```

```json
{
  "success": true,
  "data": { "to": "+14155552671", "sid": "SM...", "status": "queued" },
  "timestamp": "2026-11-05T10:00:00.000Z"
}
```

### Send bulk SMS

```bash
curl -X POST http://localhost:3000/api/send-bulk-sms \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"recipients":["+14155552671","+14155552672"],"message":"Reminder"}'
```

Returns `200` when every message is accepted, or `207` when some fail:

```json
{
  "success": false,
  "data": {
    "sent": 1,
    "failed": 1,
    "results": [
      { "to": "+14155552671", "sid": "SM...", "status": "queued" },
      { "to": "+14155552672", "error": { "code": "SEND_FAILED", "message": "Delivery failed" } }
    ]
  },
  "timestamp": "2026-11-05T10:00:00.000Z"
}
```

### Send an email

```bash
curl -X POST http://localhost:3000/api/send-email \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to":"person@example.com","subject":"Hello","text":"Plain text body"}'
```

Use `html` instead of (or alongside) `text`. At least one is required.

### Send bulk email

```bash
curl -X POST http://localhost:3000/api/send-bulk-email \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"recipients":["a@example.com","b@example.com"],"subject":"Hello","text":"Body"}'
```

Bulk email follows the same `200` / `207` partial-failure contract as bulk SMS.

### Errors

Errors share one shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "to must be an E.164 phone number, for example +14155552671",
    "details": { "field": "to" }
  },
  "timestamp": "2026-11-05T10:00:00.000Z"
}
```

| Status | Code | Meaning |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | Missing or invalid input |
| `400` | `INVALID_JSON` | Request body is not valid JSON |
| `401` | `UNAUTHORIZED` | Missing or incorrect API key |
| `404` | `NOT_FOUND` | Unknown route |
| `429` | `RATE_LIMITED` | Rate limit exceeded |
| `502` | `PROVIDER_ERROR` | Twilio or SendGrid rejected the request |
| `503` | `SMS_NOT_CONFIGURED` / `EMAIL_NOT_CONFIGURED` | Provider credentials missing |

Bulk item failures use `SEND_FAILED` and intentionally omit provider error
details so internal provider responses are not leaked.

## Development

```bash
npm run dev    # watch mode
npm test       # node --test
npm run test:watch
```

Tests inject fake SMS/email services into `createApp`, so no Twilio or SendGrid
credentials are needed and no network calls are made.

## Project layout

```text
api/index.js              Vercel serverless entrypoint
src/index.js              process bootstrap, provider wiring, graceful shutdown
src/app.js                Express app factory (dependency injection)
src/config.js             environment parsing and validation
src/clients/              thin Twilio and SendGrid client factories
src/services/             send/sendBulk logic and provider error mapping
src/routes/               health, SMS, and email routers
src/middleware/           auth, rate limiting, error handling
src/lib/                  validation, error types, async wrapper
test/                     node:test suites and fakes
```

## Docker

```bash
docker build -t sms-email-service .
docker run --rm -p 3000:3000 --env-file .env sms-email-service
```

Or with Compose:

```bash
docker compose up --build
```

## Vercel

`api/index.js` exports the same Express app used by the standalone server. Set
the environment variables from the table above in the Vercel project. Note that
the in-memory rate limiter is per instance on serverless platforms.

## Security notes

- The API key is compared in constant time over SHA-256 digests.
- Request bodies are capped at 1 MB and bulk recipient counts are bounded.
- Helmet and CORS are enabled by default; set `CORS_ORIGIN` to your frontend.
- Provider credentials are never returned in responses.

## License

Apache-2.0. See [LICENSE](LICENSE).
