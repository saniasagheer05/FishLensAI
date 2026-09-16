import os
import json
import subprocess
import torch
from torchvision import models, transforms
from PIL import Image
import numpy as np
from pathlib import Path

# 1. Load PyTorch Species Model
sp_ckpt = torch.load("ml/models/best_species_mobilenetv3.pth", map_location="cpu", weights_only=False)
species_classes = sp_ckpt["classes"]

sp_model = models.mobilenet_v3_small(weights=None)
sp_model.classifier[2] = torch.nn.Dropout(p=0.3, inplace=True)
sp_model.classifier[3] = torch.nn.Linear(sp_model.classifier[3].in_features, len(species_classes))
sp_model.load_state_dict(sp_ckpt["model_state_dict"])
sp_model.eval()

# 2. Load PyTorch Freshness Model
fr_ckpt = torch.load("ml/models/best_freshness_mobilenetv3.pth", map_location="cpu", weights_only=False)
freshness_classes = fr_ckpt["classes"]

fr_model = models.mobilenet_v3_small(weights=None)
fr_model.classifier[2] = torch.nn.Dropout(p=0.3, inplace=True)
fr_model.classifier[3] = torch.nn.Linear(fr_model.classifier[3].in_features, len(freshness_classes))
fr_model.load_state_dict(fr_ckpt["model_state_dict"])
fr_model.eval()

transform = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

def softmax(x):
    e_x = np.exp(x - np.max(x))
    return e_x / e_x.sum()

# Pick 7 ground truth species images + 3 freshness images
test_suite = []

species_dir = Path("ml/data/raw/species")
for sp in species_classes:
    folder = species_dir / sp
    if folder.exists():
        imgs = list(folder.glob("*.jpg")) + list(folder.glob("*.png")) + list(folder.glob("*.jpeg"))
        if imgs:
            test_suite.append({"type": "species", "gt": sp, "path": str(imgs[0])})

freshness_dir = Path("ml/data/raw/freshness")
for fr in freshness_classes:
    folder = freshness_dir / fr
    if folder.exists():
        imgs = list(folder.glob("*.jpg")) + list(folder.glob("*.png")) + list(folder.glob("*.jpeg"))
        if imgs:
            test_suite.append({"type": "freshness", "gt": fr, "path": str(imgs[0])})

# Run PyTorch and prepare JSON for JS runner
py_results = []
for item in test_suite:
    img = Image.open(item["path"]).convert("RGB")
    tensor = transform(img).unsqueeze(0)
    
    if item["type"] == "species":
        with torch.no_grad():
            out = sp_model(tensor)
            probs = torch.softmax(out, dim=1)[0].numpy()
        winner_idx = int(np.argmax(probs))
        py_results.append({
            "type": "species",
            "gt": item["gt"],
            "path": item["path"],
            "py_pred": species_classes[winner_idx],
            "py_conf": float(probs[winner_idx] * 100),
            "py_probs": probs.tolist(),
            "tensor_flat": tensor.squeeze(0).numpy().flatten().tolist()
        })
    else:
        with torch.no_grad():
            out = fr_model(tensor)
            probs = torch.softmax(out, dim=1)[0].numpy()
        winner_idx = int(np.argmax(probs))
        py_results.append({
            "type": "freshness",
            "gt": item["gt"],
            "path": item["path"],
            "py_pred": freshness_classes[winner_idx],
            "py_conf": float(probs[winner_idx] * 100),
            "py_probs": probs.tolist(),
            "tensor_flat": tensor.squeeze(0).numpy().flatten().tolist()
        })

# Save py_results to temp JSON
Path("services/ai/__tests__/py_test_data.json").write_text(json.dumps(py_results), encoding="utf-8")
print(f"Generated test suite with {len(py_results)} samples.")
