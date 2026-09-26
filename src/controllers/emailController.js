const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async (req, res, next) => {
  try {
    const { to, subject, html, text } = req.body;

    // Validation
    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({
        error: 'Missing required fields: to, subject, and (html or text)',
      });
    }

    // Construct email message
    const msg = {
      to,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject,
      text: text || '',
      html: html || '',
    };

    // Send email via SendGrid
    const result = await sgMail.send(msg);

    res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

const sendBulkEmail = async (req, res, next) => {
  try {
    const { recipients, subject, html, text } = req.body;

    if (!recipients || !Array.isArray(recipients) || !subject || (!html && !text)) {
      return res.status(400).json({
        error: 'Missing required fields: recipients (array), subject, and (html or text)',
      });
    }

    // Create personalized messages for each recipient
    const messages = recipients.map((to) => ({
      to,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject,
      text: text || '',
      html: html || '',
    }));

    // Send emails
    const results = await sgMail.send(messages);

    res.status(200).json({
      success: true,
      message: 'Bulk emails sent successfully',
      count: recipients.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendEmail,
  sendBulkEmail,
};
