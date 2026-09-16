import os
import sys
import shutil
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

import numpy as np
import torch
import torch.nn as nn
from torchvision.models import mobilenet_v3_small

import onnx2tf.onnx2tf as o2t
import onnx2tf.utils.common_functions as cf
import onnx2tf

dummy_fn = lambda *args, **kwargs: np.zeros((1, 3, 224, 224), dtype=np.float32)
o2t.download_test_image_data = dummy_fn
cf.download_test_image_data = dummy_fn

# 1. Export Freshness Model to static ONNX
print("Loading Freshness PyTorch checkpoint...")
chk = torch.load("ml/models/best_freshness_mobilenetv3.pth", map_location="cpu")
num_classes = len(chk["classes"])
print(f"Freshness classes ({num_classes}): {chk['classes']}")

model = mobilenet_v3_small(weights=None)
in_features = model.classifier[3].in_features
model.classifier[2] = nn.Dropout(p=0.3, inplace=True)
model.classifier[3] = nn.Linear(in_features, num_classes)
model.load_state_dict(chk["model_state_dict"])
model.eval()

dummy_input = torch.randn(1, 3, 224, 224, dtype=torch.float32)
onnx_path = Path("ml/models/freshness_model.onnx")
torch.onnx.export(
    model,
    dummy_input,
    str(onnx_path),
    input_names=["input"],
    output_names=["output"],
    opset_version=13
)
print(f"Freshness static ONNX exported to: {onnx_path}")

# 2. Convert Freshness ONNX to TFLite via onnx2tf
print("Converting Freshness ONNX to TFLite...")
out_folder = Path("ml/models/freshness_tflite_out")
if out_folder.exists():
    shutil.rmtree(out_folder)

onnx2tf.convert(
    input_onnx_file_path=str(onnx_path),
    output_folder_path=str(out_folder),
    not_use_onnxsim=True
)

# 3. Copy to destinations
models_dir = Path("ml/models")
assets_models_dir = Path("assets/models")
assets_models_dir.mkdir(parents=True, exist_ok=True)

fr_src = models_dir / "freshness_tflite_out" / "freshness_model_float32.tflite"
fr_dest = models_dir / "freshness_model.tflite"
fr_asset = assets_models_dir / "freshness_model.tflite"
shutil.copy2(fr_src, fr_dest)
shutil.copy2(fr_src, fr_asset)

print(f"[OK] Successfully updated {fr_dest} and {fr_asset}")
