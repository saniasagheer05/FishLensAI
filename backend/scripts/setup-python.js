const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Skip on Windows (local dev machine already has tflite_env configured)
if (process.platform === 'win32') {
  console.log('[setup-python] Windows platform detected. Skipping Linux pip setup.');
  process.exit(0);
}

console.log('[setup-python] Linux/Render environment detected. Setting up Python ML dependencies...');

function runCommand(cmd) {
  try {
    console.log(`[setup-python] Running: ${cmd}`);
    execSync(cmd, { stdio: 'inherit' });
    return true;
  } catch (err) {
    console.warn(`[setup-python] Command failed: ${cmd}`, err.message);
    return false;
  }
}

// 1. Check Python version
runCommand('python3 --version || python --version');

// 2. Install ML dependencies (tflite-runtime is only ~2MB vs TensorFlow's 500MB)
const pipCommands = [
  'python3 -m pip install --no-cache-dir --break-system-packages tflite-runtime pillow numpy opencv-python-headless',
  'python3 -m pip install --no-cache-dir tflite-runtime pillow numpy opencv-python-headless',
  'pip3 install --no-cache-dir --break-system-packages tflite-runtime pillow numpy opencv-python-headless',
  'pip install --no-cache-dir tflite-runtime pillow numpy opencv-python-headless',
  'python3 -m pip install --no-cache-dir --break-system-packages ai-edge-litert pillow numpy opencv-python-headless',
  'python3 -m pip install --no-cache-dir ai-edge-litert pillow numpy opencv-python-headless',
];

let success = false;
for (const cmd of pipCommands) {
  if (runCommand(cmd)) {
    success = true;
    console.log('[setup-python] Python ML packages installed successfully.');
    break;
  }
}

if (!success) {
  console.warn('[setup-python] Notice: Could not install all packages via pip. Inference will attempt fallback.');
}

process.exit(0);
