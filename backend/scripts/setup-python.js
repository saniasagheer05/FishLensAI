const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Skip on Windows (local dev machine already has tflite_env configured)
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

log('Linux/Render environment detected. Setting up Python environment & ML dependencies...');

function run(cmd) {
  try {
    log(`Running: ${cmd}`);
    const out = execSync(cmd, { stdio: 'pipe' }).toString();
    log(`Output: ${out.slice(0, 300)}`);
    return { success: true, output: out };
  } catch (err) {
    const errOut = (err.stderr ? err.stderr.toString() : err.message || '').slice(0, 300);
    log(`Failed (${cmd}): ${errOut}`);
    return { success: false, error: errOut };
  }
}

// 1. Determine target virtual environment directory
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const venvCandidates = [
  path.join(PROJECT_ROOT, 'tflite_env'),
  '/opt/render/project/src/tflite_env',
  path.resolve(__dirname, '../tflite_env'),
];

let targetVenv = venvCandidates[0];
for (const cand of venvCandidates) {
  const parent = path.dirname(cand);
  if (fs.existsSync(parent)) {
    targetVenv = cand;
    break;
  }
}

log(`Target venv path: ${targetVenv}`);

// 2. Check if target venv already has python and numpy
const venvPython = path.join(targetVenv, 'bin/python');
let venvReady = false;
if (fs.existsSync(venvPython)) {
  const check = run(`"${venvPython}" -c "import numpy; import PIL; print('READY')"`);
  if (check.success && check.output.includes('READY')) {
    log('Target venv is already populated and verified.');
    venvReady = true;
  }
}

// 3. If not ready, attempt creating virtualenv
if (!venvReady) {
  log('Attempting to create virtualenv...');
  const venvCreated = run(`python3 -m venv "${targetVenv}"`);
  if (venvCreated.success && fs.existsSync(path.join(targetVenv, 'bin/pip'))) {
    log('Virtualenv created successfully. Installing ML packages in venv...');
    const pipPath = path.join(targetVenv, 'bin/pip');
    const pipRes = run(`"${pipPath}" install --no-cache-dir tflite-runtime pillow numpy opencv-python-headless || "${pipPath}" install --no-cache-dir ai-edge-litert pillow numpy opencv-python-headless || "${pipPath}" install --no-cache-dir tensorflow-cpu pillow numpy opencv-python-headless`);
    if (pipRes.success) {
      log('ML packages installed in virtualenv successfully.');
      venvReady = true;
    }
  }
}

// 4. Fallback: Install into user or system python
if (!venvReady) {
  log('Virtualenv not ready, attempting pip install for system/user python...');
  const fallbackCmds = [
    'python3 -m pip install --no-cache-dir --break-system-packages tflite-runtime pillow numpy opencv-python-headless',
    'python3 -m pip install --user --no-cache-dir tflite-runtime pillow numpy opencv-python-headless',
    'pip3 install --no-cache-dir --break-system-packages tflite-runtime pillow numpy opencv-python-headless',
    'pip install --no-cache-dir tflite-runtime pillow numpy opencv-python-headless',
    'python3 -m pip install --no-cache-dir --break-system-packages ai-edge-litert pillow numpy opencv-python-headless',
    'python3 -m pip install --user --no-cache-dir ai-edge-litert pillow numpy opencv-python-headless',
  ];

  for (const cmd of fallbackCmds) {
    const res = run(cmd);
    if (res.success) {
      log(`Success with: ${cmd}`);
      break;
    }
  }
}

// 5. If pip itself is missing on system python, bootstrap pip
const pipCheck = run('which pip3 || which pip || python3 -m pip --version');
if (!pipCheck.success) {
  log('Pip appears to be missing. Bootstrapping pip via get-pip.py...');
  run('curl -sS https://bootstrap.pypa.io/get-pip.py -o /tmp/get-pip.py && python3 /tmp/get-pip.py --user --no-cache-dir && python3 -m pip install --user --no-cache-dir tflite-runtime pillow numpy opencv-python-headless');
}

// 6. Final verification test
const testPy = fs.existsSync(venvPython) ? venvPython : 'python3';
const finalCheck = run(`"${testPy}" -c "import numpy; import PIL; print('VERIFIED_OK')"`);
log(`Final verification result (${testPy}): ${finalCheck.success ? 'PASSED' : 'FAILED'}`);

if (require.main === module) {
  process.exit(0);
}
