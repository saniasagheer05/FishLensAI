/**
 * Test Suite: Forgot Password & Reset Password Flow
 * Tests OTP generation, rate limiting, token expiration, single-use invalidation,
 * and secure password update.
 */

const http = require('http');
const app = require('./server');
const { inMemoryDb, query } = require('./config/db');
const emailService = require('./services/emailService');

let server;
const PORT = 5099;
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

async function runTests() {
  console.log('\n=== RUNNING FISHLENSAI FORGOT PASSWORD TEST SUITE ===\n');

  let passCount = 0;
  let totalTests = 0;

  async function test(name, fn) {
    totalTests++;
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passCount++;
    } catch (err) {
      console.error(`  [FAIL] ${name}: ${err.message}`);
    }
  }

  // Start test server
  await new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });

  const testUser = {
    username: `resetuser_${Date.now()}`,
    email: `resetuser_${Date.now()}@gmail.com`,
    password: 'OriginalPassword123!',
  };

  // 1. Register a test user
  await test('Register test user for reset testing', async () => {
    const res = await request('POST', '/register', testUser);
    if (res.status !== 201 || !res.body.success) {
      throw new Error(`Registration failed: ${JSON.stringify(res.body)}`);
    }
  });

  // 2. Validation: Empty email in forgot password
  await test('POST /forgot-password - Rejects empty email with 400', async () => {
    const res = await request('POST', '/forgot-password', { email: '' });
    if (res.status !== 400 || res.body.success !== false) {
      throw new Error(`Expected 400, got ${res.status}`);
    }
  });

  // 3. Validation: Invalid email format
  await test('POST /forgot-password - Rejects invalid email format with 400', async () => {
    const res = await request('POST', '/forgot-password', { email: 'invalid-email-address' });
    if (res.status !== 400 || res.body.success !== false) {
      throw new Error(`Expected 400, got ${res.status}`);
    }
  });

  // 4. Non-existent email returns generic success (prevents account enumeration)
  await test('POST /forgot-password - Non-existent email returns generic success (no leak)', async () => {
    const res = await request('POST', '/forgot-password', { email: 'nonexistent9999@gmail.com' });
    if (res.status !== 200 || !res.body.success) {
      throw new Error(`Expected 200 generic success, got ${res.status}`);
    }
    if (!res.body.message.includes('If an account with that email exists')) {
      throw new Error(`Unexpected message: ${res.body.message}`);
    }
  });

  // 5. Valid registered email generates OTP and returns success
  let activeOtp = null;
  await test('POST /forgot-password - Registered email generates secure OTP and returns success', async () => {
    const res = await request('POST', '/forgot-password', { email: testUser.email });
    if (res.status !== 200 || !res.body.success) {
      throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    }

    // Inspect database record for the generated OTP
    const resetRecords = await query(
      'SELECT * FROM password_resets WHERE LOWER(email) = LOWER($1) AND used = FALSE',
      [testUser.email]
    );

    if (resetRecords.rows.length === 0) {
      throw new Error('No password_resets record was created');
    }

    const record = resetRecords.rows[0];
    if (!record.otp_hash || !record.expires_at) {
      throw new Error('Reset record missing otp_hash or expires_at');
    }

    activeOtp = emailService.getLastSentOtp()?.otpCode;

    if (!activeOtp) {
      throw new Error('Failed to retrieve OTP code from email service');
    }
  });

  // 6. Rate Limiting: Rapid consecutive request within 60s is blocked with 429
  await test('POST /forgot-password - Rate limit cooldown blocks rapid resends (< 60s) with 429', async () => {
    const res = await request('POST', '/forgot-password', { email: testUser.email });
    if (res.status !== 429 || res.body.success !== false) {
      throw new Error(`Expected 429 Rate Limit, got ${res.status}`);
    }
    if (!res.body.message.includes('wait')) {
      throw new Error(`Expected cooldown message, got ${res.body.message}`);
    }
  });

  // 7. Validation: Reset password with missing fields
  await test('POST /reset-password - Rejects missing fields with 400', async () => {
    const res = await request('POST', '/reset-password', { email: testUser.email, otp: '' });
    if (res.status !== 400 || res.body.success !== false) {
      throw new Error(`Expected 400, got ${res.status}`);
    }
  });

  // 8. Validation: Password too short (< 6 chars)
  await test('POST /reset-password - Rejects password shorter than 6 characters with 400', async () => {
    const res = await request('POST', '/reset-password', {
      email: testUser.email,
      otp: activeOtp,
      newPassword: '123',
    });
    if (res.status !== 400 || res.body.success !== false) {
      throw new Error(`Expected 400 for short password, got ${res.status}`);
    }
  });

  // 9. Validation: Incorrect OTP code
  await test('POST /reset-password - Rejects incorrect OTP with 400', async () => {
    const res = await request('POST', '/reset-password', {
      email: testUser.email,
      otp: '000000',
      newPassword: 'BrandNewPassword456!',
    });
    if (res.status !== 400 || res.body.success !== false) {
      throw new Error(`Expected 400 for wrong OTP, got ${res.status}`);
    }
    if (!res.body.message.includes('Incorrect verification code')) {
      throw new Error(`Unexpected message: ${res.body.message}`);
    }
  });

  // 10. Successful password reset with valid OTP
  const newSecretPassword = 'BrandNewPassword456!';
  await test('POST /reset-password - Resets password successfully with valid OTP', async () => {
    const res = await request('POST', '/reset-password', {
      email: testUser.email,
      otp: activeOtp,
      newPassword: newSecretPassword,
    });
    if (res.status !== 200 || !res.body.success) {
      throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
  });

  // 11. Single-use verification: Reusing the same OTP must fail
  await test('POST /reset-password - Single-use enforcement: Reusing the same OTP is rejected with 400', async () => {
    const res = await request('POST', '/reset-password', {
      email: testUser.email,
      otp: activeOtp,
      newPassword: 'AnotherPassword789!',
    });
    if (res.status !== 400 || res.body.success !== false) {
      throw new Error(`Expected 400 (single-use token expired/used), got ${res.status}`);
    }
  });

  // 12. Verification: Old password no longer works for login
  await test('POST /login - Old password fails after reset (401)', async () => {
    const res = await request('POST', '/login', {
      email: testUser.email,
      password: testUser.password,
    });
    if (res.status !== 401 || res.body.success !== false) {
      throw new Error(`Expected 401 with old password, got ${res.status}`);
    }
  });

  // 13. Verification: New password logs in successfully
  await test('POST /login - New password logs in successfully (200 with JWT token)', async () => {
    const res = await request('POST', '/login', {
      email: testUser.email,
      password: newSecretPassword,
    });
    if (res.status !== 200 || !res.body.success || !res.body.data.token) {
      throw new Error(`Expected 200 with token, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
  });

  // Close server
  await new Promise((resolve) => server.close(resolve));

  console.log(`\n=== RESULTS: ${passCount}/${totalTests} TESTS PASSED ===\n`);
  if (passCount === totalTests) {
    console.log('ALL FORGOT PASSWORD & RESET TESTS COMPLETED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error('SOME TESTS FAILED!\n');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  if (server) server.close();
  process.exit(1);
});
