require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const smsController = require('./controllers/smsController');
const emailController = require('./controllers/emailController');
const { errorHandler, validateApiKey } = require('./middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(validateApiKey);

// Routes
app.post('/api/send-sms', smsController.sendSMS);
app.post('/api/send-email', emailController.sendEmail);
app.post('/api/send-bulk-email', emailController.sendBulkEmail);
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📧 Email API: POST /api/send-email`);
  console.log(`📱 SMS API: POST /api/send-sms`);
});

module.exports = app;
