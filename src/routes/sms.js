'use strict';

const express = require('express');
const { asyncHandler } = require('../lib/asyncHandler');
const { AppError } = require('../lib/errors');
const { validateSmsBody, validateBulkSmsBody } = require('../lib/validation');

function createSmsRouter({ smsService, maxRecipients }) {
  const router = express.Router();

  const getService = () => {
    if (!smsService) {
      throw new AppError(
        503,
        'SMS_NOT_CONFIGURED',
        'SMS delivery is not configured on this server'
      );
    }
    return smsService;
  };

  router.post(
    '/send-sms',
    asyncHandler(async (req, res) => {
      const { to, message } = validateSmsBody(req.body);
      const data = await getService().send({ to, message });

      res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    })
  );

  router.post(
    '/send-bulk-sms',
    asyncHandler(async (req, res) => {
      const { recipients, message } = validateBulkSmsBody(req.body, maxRecipients);
      const results = await getService().sendBulk({ recipients, message });

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

module.exports = { createSmsRouter };
