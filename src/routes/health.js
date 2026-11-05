'use strict';

const express = require('express');
const packageJson = require('../../package.json');

function createHealthRouter() {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json({
      status: 'ok',
      service: packageJson.name,
      version: packageJson.version,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}

module.exports = { createHealthRouter };
