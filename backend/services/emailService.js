const nodemailer = require('nodemailer');

let lastSentOtp = null;

function getLastSentOtp() {
  return lastSentOtp;
}

/**
 * Creates and returns a nodemailer transporter configured for Gmail SMTP.
 * Credentials are read from environment variables:
 * - GMAIL_USER / SMTP_USER / EMAIL_USER
 * - GMAIL_APP_PASSWORD / SMTP_PASS / EMAIL_PASSWORD
 */
function createTransporter() {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;

  // Check if credentials are placeholders or missing
  if (!user || !pass || user.includes('your_gmail') || pass.includes('your_16_character')) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user.trim(),
      pass: pass.trim().replace(/\s+/g, ''), // Strip spaces from Gmail app passwords
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });
}

/**
 * Sends a single-use password reset OTP email using Gmail SMTP.
 * If credentials are not yet configured in local development, it logs the OTP
 * to the server console so developers can test the complete flow immediately.
 */
async function sendPasswordResetOtp({ toEmail, otpCode, username }) {
  lastSentOtp = { toEmail, otpCode, timestamp: new Date() };
  const transporter = createTransporter();
  const senderEmail = process.env.GMAIL_USER || process.env.SMTP_USER || 'no-reply@fishlensai.app';
  const displayName = username || 'FishLensAI User';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your FishLensAI Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #081220; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FAF6F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #081220; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #0C1B2F; border: 1px solid #1F3C47; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <!-- Header Banner -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; text-align: center; background: linear-gradient(180deg, #13263B 0%, #0C1B2F 100%); border-bottom: 1px solid #1F3C47;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #FAF6F0; letter-spacing: 0.5px;">
                🐟 FishLens AI
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #73AA87; font-weight: 500;">
                Smart Fish Species & Freshness Intelligence
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #FAF6F0; font-weight: 600;">
                Password Reset Request
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #B0C4DE;">
                Hello <strong>${displayName}</strong>,<br><br>
                We received a request to reset the password for your FishLensAI account associated with <span style="color: #73AA87;">${toEmail}</span>. Use the 6-digit verification code below to complete the reset:
              </p>

              <!-- OTP Code Display Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                <tr>
                  <td align="center" style="background-color: #13263B; border: 1.5px dashed #73AA87; border-radius: 12px; padding: 20px;">
                    <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #73AA87; font-weight: 600; margin-bottom: 8px;">
                      Your One-Time Reset Code
                    </div>
                    <div style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #FAF6F0; font-family: 'SF Mono', Consolas, Monaco, monospace;">
                      ${otpCode}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Expiry & Security Notice -->
              <div style="background-color: rgba(115, 170, 135, 0.08); border-left: 3px solid #73AA87; padding: 12px 16px; border-radius: 4px; margin: 24px 0 16px 0;">
                <p style="margin: 0; font-size: 12.5px; line-height: 1.5; color: #FAF6F0;">
                  ⏱️ <strong>Code expires in 15 minutes.</strong><br>
                  🔒 This code is single-use and will be invalidated once used.
                </p>
              </div>

              <p style="margin: 16px 0 0 0; font-size: 12.5px; line-height: 1.5; color: #7B8FA1;">
                If you did not request a password reset, you can safely ignore this email — your existing password remains secure and no changes have been made.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #081220; text-align: center; border-top: 1px solid #1F3C47;">
              <p style="margin: 0; font-size: 11px; color: #5C7268;">
                © ${new Date().getFullYear()} FishLensAI. Automated security notification. Please do not reply directly to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const textContent = `
FishLens AI - Password Reset Code

Hello ${displayName},

We received a request to reset the password for your FishLensAI account (${toEmail}).

Your 6-digit verification code is: ${otpCode}

This code expires in 15 minutes and is valid for a single use only.

If you did not request a password reset, please ignore this email. Your account remains secure.

--
FishLensAI Security Team
  `.trim();

  // If Gmail SMTP credentials are configured, send the real email
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: `"FishLens AI" <${senderEmail}>`,
        to: toEmail,
        subject: `Your FishLensAI Password Reset Code: ${otpCode}`,
        text: textContent,
        html: htmlContent,
      });

      console.log(`[EmailService] Password reset email sent successfully to ${toEmail}. MessageId: ${info.messageId}`);
      return { success: true, mode: 'smtp', messageId: info.messageId };
    } catch (error) {
      console.error(`[EmailService] Gmail SMTP error sending to ${toEmail}:`, error.message);
      throw new Error(`Failed to send email via Gmail SMTP: ${error.message}`);
    }
  }

  // Fallback when Gmail SMTP credentials are not configured in environment
  if (process.env.NODE_ENV === 'production') {
    console.warn(`[EmailService] Password reset requested for ${toEmail}, but GMAIL_USER / GMAIL_APP_PASSWORD are not configured in environment variables. Email cannot be delivered.`);
    return {
      success: false,
      mode: 'missing_credentials',
      message: 'Email service is not configured on the server. Please contact support.',
    };
  }

  // Development / Test only: Log OTP to console for local developer testing
  console.log('=================================================================');
  console.log('[EmailService (DEV FALLBACK)] GMAIL_USER / GMAIL_APP_PASSWORD not set in backend/.env');
  console.log(`[EmailService (DEV FALLBACK)] Password reset OTP for: ${toEmail}`);
  console.log(`[EmailService (DEV FALLBACK)] ===> OTP CODE: ${otpCode} <===`);
  console.log('[EmailService (DEV FALLBACK)] Set GMAIL_USER and GMAIL_APP_PASSWORD in backend/.env for live email delivery.');
  console.log('=================================================================');

  return { success: true, mode: 'dev_mock', otpCode };
}

module.exports = {
  createTransporter,
  sendPasswordResetOtp,
  getLastSentOtp,
};
