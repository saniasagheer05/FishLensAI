// Comprehensive API End-to-End Test Suite

async function runTests() {
  const BASE_URL = 'http://localhost:5000';
  console.log(`\n=== RUNNING FISHLENSAI BACKEND API VERIFICATION ===`);
  console.log(`Base URL: ${BASE_URL}\n`);

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

  let authToken = null;
  let testScanId = null;

  // 1. Health Check
  await test('GET /api/health - Health check endpoint', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    if (!data.service || !data.database) throw new Error('Invalid health response structure');
  });

  // 2. Register
  const testUser = {
    username: `tester_${Date.now()}`,
    email: `tester_${Date.now()}@fishlensai.local`,
    password: 'password123',
  };

  await test('POST /api/auth/register - User registration', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    const data = await res.json();
    if (!data.success || !data.data.token) throw new Error(data.message || 'Registration failed');
    authToken = data.data.token;
  });

  // 3. Login
  await test('POST /api/auth/login - User login', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email, password: testUser.password }),
    });
    const data = await res.json();
    if (!data.success || !data.data.token) throw new Error(data.message || 'Login failed');
  });

  // 4. Get Species List
  await test('GET /api/species - List fish species catalogue', async () => {
    const res = await fetch(`${BASE_URL}/api/species`);
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data) || data.data.length === 0) {
      throw new Error('Expected non-empty array of fish species');
    }
  });

  // 5. Get Species by ID
  await test('GET /api/species/rohu - Get individual species details', async () => {
    const res = await fetch(`${BASE_URL}/api/species/rohu`);
    const data = await res.json();
    if (!data.success || data.data.id !== 'rohu') {
      throw new Error('Failed to retrieve Rohu species');
    }
  });

  // 6. Create Scan Result (Ready for ML output structure)
  const sampleScan = {
    id: `scan-test-${Date.now()}`,
    species_id: 'rohu',
    species_name: 'Rohu',
    species_scientific_name: 'Labeo rohita',
    species_confidence: 0.965,
    freshness_status: 'Fresh',
    freshness_score: 94.5,
    freshness_confidence: 0.92,
    length_cm: 38.5,
    width_cm: 11.2,
    estimated_weight_kg: 1.25,
    estimated_volume_cm3: 1180,
    allometric_formula: 'W = 0.0125 × L^3.02',
    image_uri: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
    bounding_box: { x: 0.12, y: 0.18, width: 0.76, height: 0.64 },
    model_info: {
      model1: 'MobileNetV3 Small (Species)',
      model2: 'MobileNetV3 Small (Freshness)',
      model3: 'Allometric Morphometrics',
    },
    timestamp: new Date().toISOString(),
  };

  await test('POST /api/scans - Create/save scan result', async () => {
    const res = await fetch(`${BASE_URL}/api/scans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify(sampleScan),
    });
    const data = await res.json();
    if (!data.success || !data.data.id) throw new Error(data.message || 'Failed to save scan');
    testScanId = data.data.id;
  });

  // 7. Get Scan History
  await test('GET /api/scans - Retrieve scan history', async () => {
    const res = await fetch(`${BASE_URL}/api/scans`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data) || data.data.length === 0) {
      throw new Error('Expected list of scan history items');
    }
  });

  // 8. Get Scan by ID
  await test(`GET /api/scans/:id - Retrieve single scan result`, async () => {
    const res = await fetch(`${BASE_URL}/api/scans/${testScanId}`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    const data = await res.json();
    if (!data.success || data.data.id !== testScanId) {
      throw new Error(`Failed to retrieve scan ${testScanId}`);
    }
  });

  // 9. Delete Scan
  await test(`DELETE /api/scans/:id - Delete single scan result`, async () => {
    const res = await fetch(`${BASE_URL}/api/scans/${testScanId}`, {
      method: 'DELETE',
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Failed to delete scan');
  });

  // 10. Clear History
  await test('DELETE /api/scans - Clear scan history', async () => {
    const res = await fetch(`${BASE_URL}/api/scans`, {
      method: 'DELETE',
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Failed to clear history');
  });

  console.log(`\n=== RESULTS: ${passCount}/${totalTests} TESTS PASSED ===\n`);
  process.exit(passCount === totalTests ? 0 : 1);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
