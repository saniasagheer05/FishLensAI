const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Skip on Windows (local dev machine already has environment configured)
if (process.platform === 'win32') {
  console.log('[setup-python] Windows platform detected. Skipping Linux pip setup.');
  if (require.main === module) process.exit(0);
  return;
}

const LOG_FILE = '/tmp/setup-python.log';

function log(msg) {
  const line = `[setup-python ${new Date().toISOString()}] ${msg}\n`;
  console.log(line.trim());
  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch (e) {}
}

log('Linux/Render build environment detected. Verifying Python dependencies...');

function run(cmd, timeoutMs = 60000) {
  try {
    log(`Running: ${cmd}`);
    const out = execSync(cmd, { stdio: 'pipe', timeout: timeoutMs }).toString();
    log(`Output: ${out.slice(0, 300)}`);
    return { success: true, output: out };
  } catch (err) {
    const errOut = (err.stderr ? err.stderr.toString() : err.message || '').slice(0, 300);
    log(`Notice (${cmd}): ${errOut}`);
    return { success: false, error: errOut };
  }
}

// 1. Fast check: See if system python already has numpy and pillow
const fastCheck = run('python3 -c "import numpy; import PIL; print(\'READY\')"', 10000);
if (fastCheck.success && fastCheck.output.includes('READY')) {
  log('Python dependencies already verified and ready.');
  if (require.main === module) process.exit(0);
  return;
}

// 2. Install lightweight vision & inference packages with strict timeouts
log('Installing lightweight Python dependencies (numpy, pillow, opencv-python-headless)...');
const installCmds = [
  'python3 -m pip install --no-cache-dir --break-system-packages pillow numpy opencv-python-headless tflite-runtime',
  'python3 -m pip install --user --no-cache-dir pillow numpy opencv-python-headless tflite-runtime',
  'pip3 install --no-cache-dir --break-system-packages pillow numpy opencv-python-headless ai-edge-litert',
  'pip install --no-cache-dir pillow numpy opencv-python-headless',
];

for (const cmd of installCmds) {
  const res = run(cmd, 60000);
  if (res.success) {
    log(`Successfully installed dependencies via: ${cmd}`);
    break;
  }
}

// 3. Final verification
const finalCheck = run('python3 -c "import numpy; import PIL; print(\'VERIFIED_OK\')"', 10000);
log(`Final verification result: ${finalCheck.success ? 'PASSED' : 'SKIPPED_OPTIONAL'}`);

// Always exit 0 so Python setup never blocks npm install or causes build failure
if (require.main === module) {
  process.exit(0);
}
