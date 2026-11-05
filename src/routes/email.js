'use strict';

const express = require('express');
const { asyncHandler } = require('../lib/asyncHandler');
const { AppError } = require('../lib/errors');
const { validateEmailBody, validateBulkEmailBody } = require('../lib/validation');

function createEmailRouter({ emailService, maxRecipients }) {
  const router = express.Router();

  const getService = () => {
    if (!emailService) {
      throw new AppError(
        503,
        'EMAIL_NOT_CONFIGURED',
        'Email delivery is not configured on this server'
      );
    }
    return emailService;
  };

  router.post(
    '/send-email',
    asyncHandler(async (req, res) => {
      const { to, subject, text, html } = validateEmailBody(req.body);
      const data = await getService().send({ to, subject, text, html });

      res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    })
  );

  router.post(
    '/send-bulk-email',
    asyncHandler(async (req, res) => {
      const { recipients, subject, text, html } = validateBulkEmailBody(
        req.body,
        maxRecipients
      );
      const results = await getService().sendBulk({ recipients, subject, text, html });

      const sent = results.filter((result) => result.ok).length;
      const failed = results.length - sent;

      res.status(failed === 0 ? 200 : 207).json({
        success: failed === 0,
        data: {
          sent,
          failed,
          results: results.map(({ ok, ...result }) => result),
        },
        timestamp: new Date().toISOString(),
      });
    })
  );

  return router;
}

module.exports = { createEmailRouter };
