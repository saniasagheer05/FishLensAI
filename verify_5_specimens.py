import json
import os
import sys
import subprocess
from pathlib import Path
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parent
PYTHON_EXE = str(PROJECT_ROOT / "tflite_env" / "Scripts" / "python.exe")

SPECIES_CHECKPOINT = PROJECT_ROOT / "ml" / "models" / "best_species_mobilenetv3.pth"
FRESHNESS_CHECKPOINT = PROJECT_ROOT / "ml" / "models" / "best_freshness_mobilenetv3.pth"

# Load PyTorch species model
def load_pytorch_species():
    cp = torch.load(SPECIES_CHECKPOINT, map_location="cpu", weights_only=False)
    classes = cp["classes"]
    model = models.mobilenet_v3_small(weights=None)
    in_features = model.classifier[3].in_features
    model.classifier[2] = nn.Dropout(p=0.3, inplace=True)
    model.classifier[3] = nn.Linear(in_features, len(classes))
    model.load_state_dict(cp["model_state_dict"])
    model.eval()
    return model, classes, cp["normalize_mean"], cp["normalize_std"], cp["input_size"]

# Load PyTorch freshness model if available
def load_pytorch_freshness():
    if not FRESHNESS_CHECKPOINT.exists():
        return None, None, None, None, None
    cp = torch.load(FRESHNESS_CHECKPOINT, map_location="cpu", weights_only=False)
    classes = cp["classes"]
    model = models.mobilenet_v3_small(weights=None)
    in_features = model.classifier[3].in_features
    model.classifier[2] = nn.Dropout(p=0.3, inplace=True)
    model.classifier[3] = nn.Linear(in_features, len(classes))
    model.load_state_dict(cp["model_state_dict"])
    model.eval()
    return model, classes, cp["normalize_mean"], cp["normalize_std"], cp["input_size"]

def infer_pytorch(img_path, model, classes, mean, std, img_size):
    if model is None:
        return None, 0.0, {}
    transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.CenterCrop(img_size),
        transforms.ToTensor(),
        transforms.Normalize(mean=mean, std=std)
    ])
    img = Image.open(img_path).convert("RGB")
    tensor = transform(img).unsqueeze(0)
    with torch.no_grad():
        out = model(tensor)
        probs = torch.softmax(out, dim=1)[0]
    top_idx = torch.argmax(probs).item()
    top_class = classes[top_idx]
    top_prob = probs[top_idx].item()
    all_probs = {c: round(p.item(), 4) for c, p in zip(classes, probs)}
    return top_class, top_prob, all_probs

def run_tflite_unified(img_path):
    cmd = [PYTHON_EXE, str(PROJECT_ROOT / "ml" / "src" / "predict_unified.py"), str(img_path)]
    res = subprocess.run(cmd, capture_output=True, text=True, cwd=str(PROJECT_ROOT))
    if res.returncode != 0:
        return {"error": res.stderr}
    for line in reversed(res.stdout.strip().split("\n")):
        line = line.strip()
        if line.startswith("{") and line.endswith("}"):
            try:
                return json.loads(line)
            except:
                pass
    return {"error": "Failed to parse json: " + res.stdout}

def run_backend_api(img_path):
    import urllib.request
    url = "http://localhost:5000/api/scans/analyze"
    req_data = json.dumps({"image_uri": str(img_path)}).encode("utf-8")
    req = urllib.request.Request(url, data=req_data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        return {"error": str(e)}

def main():
    test_cases = [
        {"name": "1. Catla Specimen", "path": "ml/data/raw/species/catla/Katla1002.jpg", "expected_species": "catla"},
        {"name": "2. Mrigal Specimen", "path": "ml/data/raw/species/mrigal/Mrigal (100).JPG", "expected_species": "mrigal"},
        {"name": "3. Pomfret Specimen", "path": "ml/data/raw/species/pomfret/Black Pomfret001.jpg", "expected_species": "pomfret"},
        {"name": "4. Fresh Fish (Day 1)", "path": "ml/data/raw/freshness/fresh/dafif_day1_Mackerel_1000212414.jpg", "expected_freshness": "Fresh"},
        {"name": "5. Spoiled Fish (Day 10)", "path": "ml/data/raw/freshness/spoiled/dafif_day10_Mackerel_IMG_20240128_094310.jpg", "expected_freshness": "Spoiled"},
    ]

    sp_model, sp_classes, sp_mean, sp_std, sp_size = load_pytorch_species()
    fr_model, fr_classes, fr_mean, fr_std, fr_size = load_pytorch_freshness()

    results = []

    print("\n" + "="*80)
    print("RUNNING 5-SPECIMEN VERIFICATION PIPELINE (PyTorch vs TFLite vs Backend API)")
    print("="*80)

    for tc in test_cases:
        p = PROJECT_ROOT / tc["path"]
        print(f"\nEvaluating: {tc['name']} -> {tc['path']}")

        # 1. PyTorch Species
        pt_species, pt_sp_conf, pt_sp_dist = infer_pytorch(p, sp_model, sp_classes, sp_mean, sp_std, sp_size)
        
        # 2. PyTorch Freshness
        pt_freshness, pt_fr_conf, pt_fr_dist = infer_pytorch(p, fr_model, fr_classes, fr_mean, fr_std, fr_size)

        # 3. TFLite Unified
        tflite_res = run_tflite_unified(p)

        # 4. Backend REST API
        api_res = run_backend_api(p)

        results.append({
            "test_case": tc["name"],
            "image_path": tc["path"],
            "pytorch_species": f"{pt_species} ({pt_sp_conf*100:.1f}%)",
            "pytorch_freshness": f"{pt_freshness} ({pt_fr_conf*100:.1f}%)" if pt_freshness else "N/A",
            "tflite_species": f"{tflite_res.get('species', {}).get('commonName', 'Error')} ({tflite_res.get('species', {}).get('confidence', 0)*100:.1f}%)",
            "tflite_freshness": f"{tflite_res.get('freshness', {}).get('status', 'Error')} (Score: {tflite_res.get('freshness', {}).get('score', 0)})",
            "morphometrics": f"L:{tflite_res.get('morphometrics', {}).get('lengthCm')}cm, W:{tflite_res.get('morphometrics', {}).get('widthCm')}cm, Wt:~{tflite_res.get('morphometrics', {}).get('estimatedWeightKg')}kg",
            "api_status": "Success (200)" if api_res.get("success") else f"Failed: {api_res.get('error')}",
            "match": (pt_species.lower() == tflite_res.get("species", {}).get("id", "").lower())
        })

    print("\n" + "="*80)
    print("SUMMARY RESULTS TABLE:")
    print("="*80)
    print(json.dumps(results, indent=2))

    # Save to json file for artifact reporting
    with open(PROJECT_ROOT / "ml_verification_report.json", "w") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    main()
