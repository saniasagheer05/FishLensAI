import subprocess
import tensorflow as tf
from pathlib import Path

ONNX_PATH = Path("ml/models/species_model.onnx")
SAVEDMODEL_DIR = Path("ml/models/species_savedmodel")
TFLITE_PATH = Path("ml/models/species_model.tflite")

print("Converting ONNX -> TensorFlow SavedModel via onnx2tf...")
subprocess.run([
    "onnx2tf",
    "-i", str(ONNX_PATH),
    "-o", str(SAVEDMODEL_DIR)
], check=True)
print(f"[OK] SavedModel exported to: {SAVEDMODEL_DIR}")

print("Converting SavedModel -> TFLite...")
converter = tf.lite.TFLiteConverter.from_saved_model(str(SAVEDMODEL_DIR))
converter.optimizations = [tf.lite.Optimize.DEFAULT]
tflite_model = converter.convert()

with open(TFLITE_PATH, "wb") as f:
    f.write(tflite_model)

print(f"[OK] TFLite model exported to: {TFLITE_PATH}")
print(f"File size: {TFLITE_PATH.stat().st_size / (1024*1024):.2f} MB")