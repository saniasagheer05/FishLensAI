const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/db');
const emailService = require('../services/emailService');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET || 'fishlensai_default_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required.',
      });
    }

    // Check existing user
    const existing = await query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase(), username]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A user with that email or username already exists.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, created_at`,
      [username, email.toLowerCase(), passwordHash]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;
    const identifier = (email || username || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/email and password are required.',
      });
    }

    const cleanIdentifier = identifier.toLowerCase();

    // Resilient, case-insensitive lookup on BOTH email and username with trimmed lowercase input
    const result = await query(
      'SELECT id, username, email, password_hash, created_at FROM users WHERE LOWER(email) = $1 OR LOWER(username) = $1',
      [cleanIdentifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username/email or password.',
      });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    delete user.password_hash;
    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Login successful.',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await query(
      'SELECT id, username, email, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Initiates the Forgot Password flow.
 * - Validates registered email.
 * - Enforces rate limiting (max 3 requests per 15 mins, min 60s cooldown).
 * - Generates secure 6-digit OTP and reset token.
 * - Hashes OTP with bcrypt and saves with 15-minute expiry.
 * - Sends email using Gmail SMTP via emailService.
 * - Returns a generic message to prevent account enumeration.
 */
exports.requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    // 1. Rate Limiting Check
    const rateCheck = await query(
      `SELECT COUNT(*) as recent_count, MAX(created_at) as last_request_at
       FROM password_resets
       WHERE LOWER(email) = $1 AND created_at > (CURRENT_TIMESTAMP - INTERVAL '15 minutes')`,
      [cleanEmail]
    );

    const recentCount = parseInt(rateCheck.rows[0]?.recent_count || '0', 10);
    const lastRequestAt = rateCheck.rows[0]?.last_request_at;

    if (recentCount >= 5) {
      return res.status(429).json({
        success: false,
        emailSent: false,
        message: 'Too many password reset requests for this email. Please wait 15 minutes before trying again.',
      });
    }

    if (lastRequestAt) {
      const elapsedMs = Date.now() - new Date(lastRequestAt).getTime();
      if (elapsedMs < 60000) {
        const remainingSec = Math.ceil((60000 - elapsedMs) / 1000);
        return res.status(429).json({
          success: false,
          emailSent: false,
          message: `Please wait ${remainingSec} seconds before requesting another reset code.`,
        });
      }
    }

    // 2. Check if user exists in the database
    const userResult = await query(
      'SELECT id, username, email FROM users WHERE LOWER(email) = $1',
      [cleanEmail]
    );

    // Generic response message to avoid leaking user existence
    const genericSuccessMessage = 'If an account with that email exists, a password reset code has been sent.';

    if (userResult.rows.length === 0) {
      // Return anti-enumeration response, but explicitly mark emailSent: false
      // so client UI does not falsely transition to OTP entry screen
      return res.json({
        success: true,
        emailSent: false,
        message: genericSuccessMessage,
      });
    }

    const user = userResult.rows[0];

    // 3. Generate secure 6-digit OTP code and unique reset token
    const otp = crypto.randomInt(100000, 999999).toString();
    const token = crypto.randomBytes(32).toString('hex');

    // 4. Hash the OTP before storing for maximum security
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);

    // Expiry: 15 minutes from now (ISO 8601 UTC string for timezone-independent persistence)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // 5. Store new reset record in database (Do NOT eagerly invalidate previous codes - allows resends to work reliably without invalidating in-flight emails)
    await query(
      `INSERT INTO password_resets (email, otp_hash, token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [cleanEmail, otpHash, token, expiresAt]
    );

    // 6. Send the email via configured email service
    try {
      const emailResult = await emailService.sendPasswordResetOtp({
        toEmail: user.email,
        otpCode: otp,
        username: user.username,
      });

      if (!emailResult || emailResult.success === false) {
        return res.status(503).json({
          success: false,
          emailSent: false,
          message: emailResult?.message || 'Email delivery service is currently unavailable. Please contact support.',
        });
      }

      return res.json({
        success: true,
        emailSent: true,
        mode: emailResult.mode,
        message: 'A single-use 6-digit verification code has been sent to your email address.',
      });
    } catch (emailErr) {
      console.error('[requestPasswordReset Email Error]:', emailErr.message);
      return res.status(500).json({
        success: false,
        emailSent: false,
        message: emailErr.message || 'Failed to send password reset email. Please try again later.',
        error: emailErr.message,
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Verifies the single-use OTP / reset token and securely updates the user's password.
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, verification code, and new password are required.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.',
      });
    }

    // 1. Fetch all active (unused) reset codes for this email, ordered newest first
    const activeResult = await query(
      `SELECT id, email, otp_hash, token, expires_at, used, created_at
       FROM password_resets
       WHERE LOWER(email) = $1 AND used = FALSE
       ORDER BY id DESC`,
      [cleanEmail]
    );

    // If no active codes exist, inspect if previous codes existed to provide specific feedback
    if (activeResult.rows.length === 0) {
      const anyResult = await query(
        `SELECT id, used FROM password_resets WHERE LOWER(email) = $1 ORDER BY id DESC LIMIT 1`,
        [cleanEmail]
      );

      if (anyResult.rows.length > 0 && anyResult.rows[0].used) {
        return res.status(400).json({
          success: false,
          message: 'This verification code has already been used. Please request a new one.',
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset code. Please request a new one.',
      });
    }

    // 2. Iterate through active codes to find a match that has not expired
    const nowMs = Date.now();
    let matchedRecord = null;
    let anyExpiredMatch = false;

    for (const record of activeResult.rows) {
      const isExpired = nowMs > new Date(record.expires_at).getTime();

      // Check if the OTP matches this record's bcrypt hash
      const isMatch = await bcrypt.compare(cleanOtp, record.otp_hash);
      if (isMatch) {
        if (isExpired) {
          anyExpiredMatch = true;
        } else {
          matchedRecord = record;
          break;
        }
      }
    }

    if (!matchedRecord) {
      if (anyExpiredMatch) {
        return res.status(400).json({
          success: false,
          message: 'Your verification code has expired. Please request a new one.',
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Incorrect verification code. Please check your email and try again.',
      });
    }

    // 3. Hash the new password securely
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // 4. Update the user password in the users table
    await query(
      'UPDATE users SET password_hash = $1 WHERE LOWER(email) = $2',
      [newPasswordHash, cleanEmail]
    );

    // 5. Invalidate all reset codes for this email (single-use guarantee across all generated codes)
    await query(
      'UPDATE password_resets SET used = TRUE WHERE LOWER(email) = $1',
      [cleanEmail]
    );

    console.log(`[resetPassword] Successfully updated password for ${cleanEmail}`);

    return res.json({
      success: true,
      message: 'Your password has been reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Diagnostic endpoint to report active email service configuration (safe: no secrets exposed).
 */
exports.getEmailStatus = async (req, res, next) => {
  try {
    const status = await emailService.getServiceStatus();
    return res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
};
