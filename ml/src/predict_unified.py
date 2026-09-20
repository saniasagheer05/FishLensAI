"""
FishLensAI - Unified ML Predictor
Executes real TFLite models:
- Model 1: Species Identification (MobileNetV3-Small, 7 classes)
- Model 2: Freshness Assessment (MobileNetV3-Small, 3 classes)
- Model 3: Geometric Morphometrics & Biomass Estimation (OpenCV Contours & Scale Priors)
"""

import sys
import os
import json
import base64
import io
import numpy as np
from PIL import Image

# Ensure project root is on sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Support tflite_runtime (lightweight), ai_edge_litert (LiteRT), and tensorflow
Interpreter = None
try:
    from tflite_runtime.interpreter import Interpreter
except ImportError:
    try:
        from ai_edge_litert.interpreter import Interpreter
    except ImportError:
        try:
            import tensorflow as tf
            Interpreter = tf.lite.Interpreter
        except ImportError:
            Interpreter = None

try:
    from ml.src.morphometric_estimator import MorphometricEstimator
except Exception:
    MorphometricEstimator = None

SPECIES_CLASSES = ['catla', 'hilsa', 'indian_mackerel', 'mrigal', 'pomfret', 'rohu', 'tilapia']
FRESHNESS_CLASSES = ['fresh', 'moderate', 'spoiled']

# Species canonical display details
SPECIES_METADATA = {
    'catla': {'commonName': 'Catla', 'scientificName': 'Catla catla', 'family': 'Cyprinidae'},
    'hilsa': {'commonName': 'Hilsa', 'scientificName': 'Tenualosa ilisha', 'family': 'Clupeidae'},
    'indian_mackerel': {'commonName': 'Indian Mackerel', 'scientificName': 'Rastrelliger kanagurta', 'family': 'Scombridae'},
    'mrigal': {'commonName': 'Mrigal', 'scientificName': 'Cirrhinus mrigala', 'family': 'Cyprinidae'},
    'pomfret': {'commonName': 'Pomfret', 'scientificName': 'Pampus argenteus', 'family': 'Stromateidae'},
    'rohu': {'commonName': 'Rohu', 'scientificName': 'Labeo rohita', 'family': 'Cyprinidae'},
    'tilapia': {'commonName': 'Tilapia', 'scientificName': 'Oreochromis niloticus', 'family': 'Cichlidae'},
}

# Resolve model paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPECIES_MODEL_PATH = os.path.join(BASE_DIR, 'models', 'species_model.tflite')
FRESHNESS_MODEL_PATH = os.path.join(BASE_DIR, 'models', 'freshness_model.tflite')

def load_models():
    if Interpreter is None:
        raise RuntimeError("Neither tflite_runtime nor tensorflow is installed in Python environment.")
    sp_interp = Interpreter(model_path=SPECIES_MODEL_PATH)
    sp_interp.allocate_tensors()
    sp_in = sp_interp.get_input_details()[0]
    sp_out = sp_interp.get_output_details()[0]

    fr_interp = Interpreter(model_path=FRESHNESS_MODEL_PATH)
    fr_interp.allocate_tensors()
    fr_in = fr_interp.get_input_details()[0]
    fr_out = fr_interp.get_output_details()[0]

    morph = MorphometricEstimator() if MorphometricEstimator is not None else None
    return sp_interp, sp_in, sp_out, fr_interp, fr_in, fr_out, morph

def preprocess_image(img: Image.Image) -> np.ndarray:
    """Preprocess matching train_species_model.py and test_inference.py:
    Resize to 256x256, Center Crop to 224x224, Normalize with ImageNet mean & std.
    """
    img_rgb = img.convert('RGB')
    res = img_rgb.resize((256, 256), Image.Resampling.BILINEAR)
    
    # 224x224 Center Crop
    left = (256 - 224) // 2
    top = (256 - 224) // 2
    crop = res.crop((left, top, left + 224, top + 224))
    
    # Float32 normalized array
    arr = np.array(crop, dtype=np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    norm = (arr - mean) / std
    
    # NHWC shape: (1, 224, 224, 3)
    return np.expand_dims(norm, axis=0)

def softmax(x):
    e_x = np.exp(x - np.max(x))
    return e_x / e_x.sum()

def run_prediction(image_source: str):
    sp_interp, sp_in, sp_out, fr_interp, fr_in, fr_out, morph = load_models()

    # Determine if image_source is a file path or base64
    if os.path.exists(image_source):
        img = Image.open(image_source)
    elif image_source.startswith('data:') or len(image_source) > 500:
        # Base64 string
        raw_b64 = image_source
        if ',' in raw_b64:
            raw_b64 = raw_b64.split(',', 1)[1]
        img_bytes = base64.b64decode(raw_b64)
        img = Image.open(io.BytesIO(img_bytes))
    else:
        raise ValueError(f"Invalid image source: file does not exist or invalid base64 data.")

    tensor_input = preprocess_image(img)

    # 1. Model 1: Species Recognition
    sp_interp.set_tensor(sp_in['index'], tensor_input)
    sp_interp.invoke()
    sp_logits = sp_interp.get_tensor(sp_out['index'])[0]
    sp_probs = softmax(sp_logits)
    sp_idx = int(np.argmax(sp_probs))
    pred_species_id = SPECIES_CLASSES[sp_idx]
    sp_confidence = float(sp_probs[sp_idx])
    sp_meta = SPECIES_METADATA.get(pred_species_id, {'commonName': pred_species_id.capitalize(), 'scientificName': ''})

    # 2. Model 2: Freshness Assessment
    fr_interp.set_tensor(fr_in['index'], tensor_input)
    fr_interp.invoke()
    fr_logits = fr_interp.get_tensor(fr_out['index'])[0]
    fr_probs = softmax(fr_logits)
    fr_idx = int(np.argmax(fr_probs))
    pred_freshness_status = FRESHNESS_CLASSES[fr_idx].capitalize()
    fr_confidence = float(fr_probs[fr_idx])
    
    # Freshness index score 0-100: weighted average (Fresh=98, Moderate=70, Spoiled=25)
    freshness_score = round(float(fr_probs[0] * 98.0 + fr_probs[1] * 70.0 + fr_probs[2] * 25.0), 1)

    # 3. Model 3: Geometric Morphometrics (Length, Width, Weight, Volume)
    morph_data = None
    if morph is not None:
        try:
            cv_img = np.array(img.convert('RGB'))[:, :, ::-1].copy() # RGB to BGR for OpenCV
            morph_data = morph.estimate_morphometrics(cv_img, species_id=pred_species_id)
        except Exception as e:
            morph_data = None

    if not morph_data:
        priors = {
            "rohu": {"length": 38.0, "width": 10.6, "weight": 1.2, "vol": 1150, "formula": "W = 0.0125 × L^3.02"},
            "catla": {"length": 46.0, "width": 14.2, "weight": 2.1, "vol": 2100, "formula": "W = 0.0142 × L^2.98"},
            "tilapia": {"length": 28.0, "width": 8.5, "weight": 0.8, "vol": 720, "formula": "W = 0.0189 × L^2.89"},
            "hilsa": {"length": 35.0, "width": 9.5, "weight": 1.5, "vol": 1350, "formula": "W = 0.0098 × L^3.12"},
            "mrigal": {"length": 34.0, "width": 9.0, "weight": 1.1, "vol": 1050, "formula": "W = 0.0118 × L^3.05"},
            "indian_mackerel": {"length": 25.0, "width": 6.8, "weight": 0.5, "vol": 480, "formula": "W = 0.0105 × L^3.08"},
            "pomfret": {"length": 27.0, "width": 12.0, "weight": 0.9, "vol": 850, "formula": "W = 0.0210 × L^2.92"},
        }
        sp_prior = priors.get(pred_species_id, {"length": 30.0, "width": 8.0, "weight": 1.0, "vol": 900, "formula": "W = 0.0125 × L^3.02"})
        morph_data = {
            "length_cm": sp_prior["length"],
            "width_cm": sp_prior["width"],
            "estimated_weight_kg": sp_prior["weight"],
            "estimated_volume_cm3": sp_prior["vol"],
            "allometric_formula": sp_prior["formula"],
            "reference_scaling": "species_prior_baseline",
            "bounding_box": {"x": 0.1, "y": 0.2, "width": 0.8, "height": 0.6}
        }

    result = {
        "success": True,
        "species": {
            "id": pred_species_id,
            "commonName": sp_meta['commonName'],
            "scientificName": sp_meta['scientificName'],
            "confidence": round(sp_confidence, 4),
            "probabilities": {c: round(float(p), 4) for c, p in zip(SPECIES_CLASSES, sp_probs)}
        },
        "freshness": {
            "status": pred_freshness_status,
            "score": freshness_score,
            "confidence": round(fr_confidence, 4),
            "probabilities": {c: round(float(p), 4) for c, p in zip(FRESHNESS_CLASSES, fr_probs)}
        },
        "morphometrics": {
            "lengthCm": morph_data["length_cm"],
            "widthCm": morph_data["width_cm"],
            "estimatedWeightKg": morph_data["estimated_weight_kg"],
            "estimatedVolumeCm3": morph_data["estimated_volume_cm3"],
            "allometricFormula": morph_data["allometric_formula"],
            "referenceScaling": morph_data["reference_scaling"],
            "validationStatus": "Unvalidated / Experimental Computer Vision Prior"
        },
        "boundingBox": morph_data.get("bounding_box", {"x": 0.1, "y": 0.2, "width": 0.8, "height": 0.6})
    }

    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Usage: python predict_unified.py <image_path_or_base64>"}))
        sys.exit(1)

    try:
        res = run_prediction(sys.argv[1])
        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)
