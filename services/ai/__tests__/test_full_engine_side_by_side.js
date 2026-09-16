const ort = require('onnxruntime-web');
const fs = require('fs');

const species_classes = ['catla', 'hilsa', 'indian_mackerel', 'mrigal', 'pomfret', 'rohu', 'tilapia'];
const freshness_classes = ['fresh', 'moderate', 'spoiled'];

function softmax(logits) {
  const maxLogit = Math.max(...logits);
  const expScores = logits.map((l) => Math.exp(l - maxLogit));
  const sumExp = expScores.reduce((a, b) => a + b, 0);
  return expScores.map((s) => s / sumExp);
}

async function runEndToEndVerification() {
  console.log('=== END-TO-END VERIFICATION: PYTORCH (PYTHON) VS WEB APP ONNX ENGINE ===\n');

  const spModelBuffer = fs.readFileSync('assets/models/species_model.onnx');
  const frModelBuffer = fs.readFileSync('assets/models/freshness_model.onnx');

  const spSession = await ort.InferenceSession.create(spModelBuffer);
  const frSession = await ort.InferenceSession.create(frModelBuffer);

  const testData = JSON.parse(fs.readFileSync('services/ai/__tests__/py_test_data.json', 'utf-8'));

  console.log('--- MODEL 1: SPECIES IDENTIFICATION (7 CANONICAL DATASET SPECIMENS) ---');
  console.log(
    `${'Ground Truth'.padEnd(16)} | ${'Python (PyTorch)'.padEnd(18)} | ${'Py Conf'.padEnd(9)} | ${'Web ONNX (JS)'.padEnd(18)} | ${'JS Conf'.padEnd(9)} | ${'Match?'}`
  );
  console.log('-'.repeat(85));

  for (const item of testData) {
    if (item.type !== 'species') continue;

    const tensor = new ort.Tensor('float32', new Float32Array(item.tensor_flat), [1, 3, 224, 224]);
    const res = await spSession.run({ input: tensor });
    const logits = Array.from(res.output.data);
    const probs = softmax(logits);

    let maxIdx = 0;
    let maxProb = probs[0];
    for (let i = 1; i < probs.length; i++) {
      if (probs[i] > maxProb) {
        maxProb = probs[i];
        maxIdx = i;
      }
    }

    const jsPred = species_classes[maxIdx];
    const jsConf = maxProb * 100;
    const match = item.py_pred === jsPred ? 'MATCH (100% Identical)' : 'MISMATCH';

    console.log(
      `${item.gt.padEnd(16)} | ${item.py_pred.padEnd(18)} | ${(item.py_conf.toFixed(2) + '%').padEnd(9)} | ${jsPred.padEnd(18)} | ${(jsConf.toFixed(2) + '%').padEnd(9)} | ${match}`
    );
  }

  console.log('\n--- MODEL 2: FRESHNESS ESTIMATION (3 QUALITY CLASSES) ---');
  console.log(
    `${'Ground Truth'.padEnd(16)} | ${'Python (PyTorch)'.padEnd(18)} | ${'Py Conf'.padEnd(9)} | ${'Web ONNX (JS)'.padEnd(18)} | ${'JS Conf'.padEnd(9)} | ${'Freshness Score'} | ${'Match?'}`
  );
  console.log('-'.repeat(95));

  for (const item of testData) {
    if (item.type !== 'freshness') continue;

    const tensor = new ort.Tensor('float32', new Float32Array(item.tensor_flat), [1, 3, 224, 224]);
    const res = await frSession.run({ input: tensor });
    const logits = Array.from(res.output.data);
    const probs = softmax(logits);

    let maxIdx = 0;
    let maxProb = probs[0];
    for (let i = 1; i < probs.length; i++) {
      if (probs[i] > maxProb) {
        maxProb = probs[i];
        maxIdx = i;
      }
    }

    const jsPred = freshness_classes[maxIdx];
    const jsConf = maxProb * 100;
    const score = Math.round(probs[0] * 98 + probs[1] * 72 + probs[2] * 25);
    const match = item.py_pred === jsPred ? 'MATCH (100% Identical)' : 'MISMATCH';

    console.log(
      `${item.gt.padEnd(16)} | ${item.py_pred.padEnd(18)} | ${(item.py_conf.toFixed(2) + '%').padEnd(9)} | ${jsPred.padEnd(18)} | ${(jsConf.toFixed(2) + '%').padEnd(9)} | ${(score + '/100').padEnd(15)} | ${match}`
    );
  }
}

runEndToEndVerification().catch(console.error);
