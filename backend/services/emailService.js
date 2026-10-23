const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const nodemailer = require('nodemailer');

let lastSentOtp = null;

function getLastSentOtp() {
  return lastSentOtp;
}

/**
 * Masks an email for safe logging (e.g., saniasagheer9@gmail.com -> s***9@gmail.com).
 * Never exposes complete email or any credentials.
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') return 'unknown';
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const name = parts[0];
  const domain = parts[1];
  const maskedName = name.length <= 2 
    ? `${name[0]}***` 
    : `${name[0]}***${name[name.length - 1]}`;
  return `${maskedName}@${domain}`;
}

/**
 * Creates and returns a nodemailer transporter configured for Gmail SMTP.
 * Credentials:
 * - GMAIL_USER / SMTP_USER / EMAIL_USER
 * - GMAIL_APP_PASSWORD / SMTP_PASS / EMAIL_PASSWORD
 */
function createTransporter() {
  const user = (process.env.GMAIL_USER || process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
  const rawPass = (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || '').trim();
  const pass = rawPass.replace(/\s+/g, ''); // Strip spaces from Gmail app passwords

  if (!user || !pass || user.includes('your_gmail') || pass.includes('your_16_character')) {
    return null;
  }

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 7000,
    greetingTimeout: 7000,
    socketTimeout: 9000,
  });
}

/**
 * Checks email configuration and returns non-sensitive status.
 */
async function getServiceStatus() {
  const brevoKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const user = (process.env.GMAIL_USER || process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
  const pass = (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || '').trim();

  const hasBrevo = Boolean(brevoKey && !brevoKey.includes('your_'));
  const hasResend = Boolean(resendKey && !resendKey.includes('your_'));
  const hasSmtp = Boolean(user && pass && !user.includes('your_') && !pass.includes('your_'));

  let activeProvider = 'none';
  if (hasBrevo) activeProvider = 'brevo_https';
  else if (hasResend) activeProvider = 'resend_https';
  else if (hasSmtp) activeProvider = 'gmail_smtp';

  return {
    configured: hasBrevo || hasResend || hasSmtp,
    activeProvider,
    providers: {
      brevoHttps: hasBrevo,
      resendHttps: hasResend,
      gmailSmtp: hasSmtp,
    },
    senderEmail: hasSmtp || hasBrevo ? maskEmail(user || 'no-reply@fishlensai.app') : null,
  };
}

/**
 * Sends email via Brevo REST API over HTTPS (Port 443).
 * Immune to cloud host SMTP port blocking (Render Free Tier blocks ports 25, 465, 587).
 */
async function sendViaBrevo({ toEmail, subject, htmlContent, textContent, displayName }) {
  const apiKey = (process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY || '').trim();
  const senderEmail = (process.env.GMAIL_USER || process.env.SMTP_USER || 'no-reply@fishlensai.app').trim();
  const senderName = process.env.SENDER_NAME || 'FishLens AI';

  const fetchFn = globalThis.fetch;
  if (!fetchFn) {
    throw new Error('Native fetch is not available in this Node runtime');
  }

  const response = await fetchFn('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: toEmail, name: displayName }],
      subject,
      htmlContent,
      textContent,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = body.message || `HTTP ${response.status} ${response.statusText}`;
    throw new Error(`Brevo HTTP delivery failed: ${errorMsg}`);
  }

  return {
    success: true,
    mode: 'brevo_https',
    messageId: body.messageId || 'brevo-queued',
  };
}

/**
 * Sends email via Resend REST API over HTTPS (Port 443).
 */
async function sendViaResend({ toEmail, subject, htmlContent, textContent }) {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  const sender = (process.env.RESEND_FROM || 'FishLens AI <onboarding@resend.dev>').trim();

  const fetchFn = globalThis.fetch;
  if (!fetchFn) {
    throw new Error('Native fetch is not available in this Node runtime');
  }

  const response = await fetchFn('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: sender,
      to: [toEmail],
      subject,
      html: htmlContent,
      text: textContent,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = body.message || `HTTP ${response.status} ${response.statusText}`;
    throw new Error(`Resend HTTP delivery failed: ${errorMsg}`);
  }

  return {
    success: true,
    mode: 'resend_https',
    messageId: body.id || 'resend-queued',
  };
}

/**
 * Sends a single-use password reset OTP email.
 * Multi-transport delivery:
 * 1. Brevo HTTPS API (Port 443, Render Free Tier friendly)
 * 2. Resend HTTPS API (Port 443)
 * 3. Gmail SMTP / Nodemailer (Port 465 / 587)
 * 4. Dev mock (non-production fallback)
 */
async function sendPasswordResetOtp({ toEmail, otpCode, username }) {
  lastSentOtp = { toEmail, otpCode, timestamp: new Date() };

  const masked = maskEmail(toEmail);
  const displayName = username || 'FishLensAI User';
  const senderEmail = (process.env.GMAIL_USER || process.env.SMTP_USER || 'no-reply@fishlensai.app').trim();
  const subject = `Your FishLensAI Password Reset Code: ${otpCode}`;

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
  `.trim();

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

  // 1. Try Brevo HTTPS API first (Preferred on cloud hosts like Render Free Tier)
  const brevoKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
  if (brevoKey && !brevoKey.includes('your_')) {
    try {
      const result = await sendViaBrevo({ toEmail, subject, htmlContent, textContent, displayName });
      console.log(`[EmailService] Password reset email sent via Brevo HTTPS to ${masked}`);
      return result;
    } catch (brevoErr) {
      console.error(`[EmailService] Brevo HTTPS delivery failed:`, brevoErr.message);
      // Fall through to next available provider
    }
  }

  // 2. Try Resend HTTPS API next
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && !resendKey.includes('your_')) {
    try {
      const result = await sendViaResend({ toEmail, subject, htmlContent, textContent });
      console.log(`[EmailService] Password reset email sent via Resend HTTPS to ${masked}`);
      return result;
    } catch (resendErr) {
      console.error(`[EmailService] Resend HTTPS delivery failed:`, resendErr.message);
      // Fall through to next available provider
    }
  }

  // 3. Try Gmail SMTP / Nodemailer
  const transporter = createTransporter();
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: `"FishLens AI" <${senderEmail}>`,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });

      console.log(`[EmailService] Password reset email sent via Gmail SMTP to ${masked}`);
      return { success: true, mode: 'smtp', messageId: info.messageId };
    } catch (error) {
      const isBlocked = error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED' || error.message.includes('timeout');
      let friendlyError = error.message;
      if (isBlocked) {
        friendlyError = `Outbound SMTP timeout (${error.code || 'ETIMEDOUT'}). Render Free Tier blocks outbound SMTP ports 25, 465, and 587. To send emails on Render Free Tier, please add a free BREVO_API_KEY to Render Environment Variables.`;
      }
      console.error(`[EmailService] Gmail SMTP delivery error:`, friendlyError);
      throw new Error(`Email delivery failed: ${friendlyError}`);
    }
  }

  // 4. Missing Credentials in Production: Never claim false success
  if (process.env.NODE_ENV === 'production') {
    const errorMsg = 'Email service is not configured on the server. Please configure GMAIL_USER/GMAIL_APP_PASSWORD or BREVO_API_KEY in server environment.';
    console.error(`[EmailService] ${errorMsg}`);
    return {
      success: false,
      mode: 'missing_credentials',
      message: errorMsg,
    };
  }

  // 5. Development / Test Only Fallback
  console.log('=================================================================');
  console.log('[EmailService (DEV FALLBACK)] No live email provider configured.');
  console.log(`[EmailService (DEV FALLBACK)] Target recipient: ${masked}`);
  console.log(`[EmailService (DEV FALLBACK)] Set GMAIL_USER and GMAIL_APP_PASSWORD in backend/.env for live delivery.`);
  console.log('=================================================================');

  return { success: true, mode: 'dev_mock', otpCode };
}

module.exports = {
  createTransporter,
  sendPasswordResetOtp,
  getLastSentOtp,
  getServiceStatus,
  maskEmail,
};
