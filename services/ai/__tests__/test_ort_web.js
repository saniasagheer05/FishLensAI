const ort = require('onnxruntime-web');
const fs = require('fs');

async function test() {
  console.log('Testing onnxruntime-web session creation...');
  const modelBuffer = fs.readFileSync('assets/models/species_model.onnx');
  const session = await ort.InferenceSession.create(modelBuffer);
  console.log('Session created successfully!');
  console.log('Input names:', session.inputNames);
  console.log('Output names:', session.outputNames);

  // Create dummy input tensor (1, 3, 224, 224)
  const dummyData = new Float32Array(1 * 3 * 224 * 224);
  const tensor = new ort.Tensor('float32', dummyData, [1, 3, 224, 224]);
  const results = await session.run({ input: tensor });
  console.log('Inference results shape:', results.output.dims);
  console.log('Raw output logits:', Array.from(results.output.data));
}

test().catch(console.error);
