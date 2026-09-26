const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendSMS = async (req, res, next) => {
  try {
    const { to, message } = req.body;

    // Validation
    if (!to || !message) {
      return res.status(400).json({
        error: 'Missing required fields: to, message',
      });
    }

    // Send SMS via Twilio
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });

    res.status(200).json({
      success: true,
      message: 'SMS sent successfully',
      sid: result.sid,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

const sendBulkSMS = async (req, res, next) => {
  try {
    const { recipients, message } = req.body;

    if (!recipients || !Array.isArray(recipients) || !message) {
      return res.status(400).json({
        error: 'Missing required fields: recipients (array), message',
      });
    }

    const results = await Promise.all(
      recipients.map((to) =>
        client.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to,
        })
      )
    );

    res.status(200).json({
      success: true,
      message: 'Bulk SMS sent successfully',
      count: results.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendSMS,
  sendBulkSMS,
};
