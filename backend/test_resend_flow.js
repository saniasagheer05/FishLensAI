process.env.NODE_ENV = 'test';

const http = require('http');
const bcrypt = require('bcryptjs');
const app = require('./server');
const { query } = require('./config/db');

let server;
const PORT = 5098;
const BASE_URL = `http://localhost:${PORT}/api/auth`;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const data = body ? JSON.stringify(body) : null;

    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(raw);
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, text: raw });
          }
        });
      }
    );

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runResendTests() {
  console.log('\n=== RUNNING FISHLENSAI RESEND & MULTI-CODE OTP TEST SUITE ===\n');

  await new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });

  try {
    // 1. Register a test user
    const user = {
      username: `resendtest_${Date.now()}`,
      email: `resendtest_${Date.now()}@gmail.com`,
      password: 'OldPassword123!',
    };

    console.log('[Test 1] Registering user for resend test...');
    const regRes = await request('POST', '/register', user);
    if (regRes.status !== 201) throw new Error(`Register failed: ${JSON.stringify(regRes.body)}`);
    console.log('  [PASS] User registered');

    // 2. Simulate two sequential OTPs issued to this email (Resend flow)
    console.log('[Test 2] Simulating OTP 1 and OTP 2 issued on resend...');
    const otp1 = '334455';
    const otp2 = '778899';
    const salt = await bcrypt.genSalt(10);
    const hash1 = await bcrypt.hash(otp1, salt);
    const hash2 = await bcrypt.hash(otp2, salt);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await query(
      'INSERT INTO password_resets (email, otp_hash, token, expires_at) VALUES ($1, $2, $3, $4)',
      [user.email, hash1, 'token1', expiresAt]
    );
    await query(
      'INSERT INTO password_resets (email, otp_hash, token, expires_at) VALUES ($1, $2, $3, $4)',
      [user.email, hash2, 'token2', expiresAt]
    );
    console.log('  [PASS] OTP 1 and OTP 2 stored in DB as active');

    // 3. User submits earlier OTP 1 (arrived first in email)
    console.log('[Test 3] Verifying that earlier OTP 1 is accepted (no eager invalidation trap)...');
    const resetRes = await request('POST', '/reset-password', {
      email: user.email,
      otp: otp1,
      newPassword: 'BrandNewPassword123!',
    });
    if (resetRes.status !== 200 || !resetRes.body.success) {
      throw new Error(`Expected 200 accepting OTP 1, got ${resetRes.status}: ${JSON.stringify(resetRes.body)}`);
    }
    console.log('  [PASS] OTP 1 accepted and password successfully reset');

    // 4. Verify login with the new password
    console.log('[Test 4] Verifying login with newly reset password...');
    const loginRes = await request('POST', '/login', {
      email: user.email,
      password: 'BrandNewPassword123!',
    });
    if (loginRes.status !== 200 || !loginRes.body.data?.token) {
      throw new Error(`Login with new password failed: ${JSON.stringify(loginRes.body)}`);
    }
    console.log('  [PASS] Login with new password succeeded');

    // 5. Verify that second OTP (otp2) was also invalidated (single-use guarantee)
    console.log('[Test 5] Verifying that second OTP is invalidated after password was reset...');
    const reuseRes = await request('POST', '/reset-password', {
      email: user.email,
      otp: otp2,
      newPassword: 'YetAnotherPassword!',
    });
    if (reuseRes.status !== 400 || reuseRes.body.success !== false) {
      throw new Error(`Expected 400 rejecting OTP 2, got ${reuseRes.status}`);
    }
    console.log('  [PASS] Second OTP successfully invalidated (Single-use guarantee enforced)');

    console.log('\n=== ALL RESEND TESTS PASSED SUCCESSFULLY! ===\n');
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
  }
}

runResendTests().catch((err) => {
  console.error('Test failed:', err);
  if (server) server.close();
  process.exit(1);
});
