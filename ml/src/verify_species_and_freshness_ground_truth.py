import os
import torch
from torchvision import models, transforms
from PIL import Image
import numpy as np
import tensorflow as tf
from pathlib import Path

def test_models():
    # 1. Load PyTorch Species Model
    sp_ckpt = torch.load("ml/models/best_species_mobilenetv3.pth", map_location="cpu", weights_only=False)
    species_classes = sp_ckpt["classes"]
    print("Species Classes:", species_classes)

    sp_model = models.mobilenet_v3_small(weights=None)
    sp_model.classifier[2] = torch.nn.Dropout(p=0.3, inplace=True)
    sp_model.classifier[3] = torch.nn.Linear(sp_model.classifier[3].in_features, len(species_classes))
    sp_model.load_state_dict(sp_ckpt["model_state_dict"])
    sp_model.eval()

    # 2. Load TFLite Species Model
    sp_interp = tf.lite.Interpreter(model_path="assets/models/species_model.tflite")
    sp_interp.allocate_tensors()
    sp_in = sp_interp.get_input_details()
    sp_out = sp_interp.get_output_details()
    print("Species TFLite Input:", sp_in[0]["shape"], sp_in[0]["dtype"])

    # 3. Load PyTorch Freshness Model
    fr_ckpt = torch.load("ml/models/best_freshness_mobilenetv3.pth", map_location="cpu", weights_only=False)
    freshness_classes = fr_ckpt["classes"]
    print("\nFreshness Classes:", freshness_classes)

    fr_model = models.mobilenet_v3_small(weights=None)
    fr_model.classifier[2] = torch.nn.Dropout(p=0.3, inplace=True)
    fr_model.classifier[3] = torch.nn.Linear(fr_model.classifier[3].in_features, len(freshness_classes))
    fr_model.load_state_dict(fr_ckpt["model_state_dict"])
    fr_model.eval()

    # 4. Load TFLite Freshness Model
    fr_interp = tf.lite.Interpreter(model_path="assets/models/freshness_model.tflite")
    fr_interp.allocate_tensors()
    fr_in = fr_interp.get_input_details()
    fr_out = fr_interp.get_output_details()
    print("Freshness TFLite Input:", fr_in[0]["shape"], fr_in[0]["dtype"])

    transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    def softmax(x):
        e_x = np.exp(x - np.max(x))
        return e_x / e_x.sum()

    # =========================================================================
    # SPECIES VERIFICATION (7 Canonical Ground Truth Classes)
    # =========================================================================
    print("\n" + "="*95)
    print("MODEL 1 (SPECIES CLASSIFIER): PYTORCH vs TFLITE ON REAL DATASET IMAGES")
    print("="*95)
    print(f"{'Ground Truth':<18} | {'PyTorch Pred':<18} | {'PyTorch Conf':<12} | {'TFLite Pred':<18} | {'TFLite Conf':<12} | {'Match?'}")
    print("-"*95)

    species_dir = Path("ml/data/raw/species")
    for sp in species_classes:
        sp_folder = species_dir / sp
        if not sp_folder.exists():
            continue
        imgs = list(sp_folder.glob("*.jpg")) + list(sp_folder.glob("*.png")) + list(sp_folder.glob("*.jpeg"))
        if not imgs:
            continue
        img_path = imgs[0]

        img = Image.open(img_path).convert("RGB")
        tensor = transform(img).unsqueeze(0)

        # PyTorch
        with torch.no_grad():
            pt_out = sp_model(tensor)
            pt_probs = torch.softmax(pt_out, dim=1)[0].numpy()
        pt_winner = species_classes[np.argmax(pt_probs)]
        pt_conf = np.max(pt_probs) * 100

        # TFLite (NHWC)
        tflite_input_nhwc = tensor.permute(0, 2, 3, 1).numpy().astype(np.float32)
        sp_interp.set_tensor(sp_in[0]["index"], tflite_input_nhwc)
        sp_interp.invoke()
        tflite_out = sp_interp.get_tensor(sp_out[0]["index"])[0]
        tflite_probs = softmax(tflite_out)
        tflite_winner = species_classes[np.argmax(tflite_probs)]
        tflite_conf = np.max(tflite_probs) * 100

        match_str = "MATCH" if pt_winner == tflite_winner else "MISMATCH"
        print(f"{sp:<18} | {pt_winner:<18} | {pt_conf:10.2f}% | {tflite_winner:<18} | {tflite_conf:10.2f}% | {match_str}")

    # =========================================================================
    # FRESHNESS VERIFICATION (3 Ground Truth Classes: Fresh, Moderate, Spoiled)
    # =========================================================================
    print("\n" + "="*95)
    print("MODEL 2 (FRESHNESS CLASSIFIER): PYTORCH vs TFLITE ON REAL DATASET IMAGES")
    print("="*95)
    print(f"{'Ground Truth':<18} | {'PyTorch Pred':<18} | {'PyTorch Conf':<12} | {'TFLite Pred':<18} | {'TFLite Conf':<12} | {'Match?'}")
    print("-"*95)

    freshness_dir = Path("ml/data/raw/freshness")
    for fr in freshness_classes:
        fr_folder = freshness_dir / fr
        if not fr_folder.exists():
            continue
        imgs = list(fr_folder.glob("*.jpg")) + list(fr_folder.glob("*.png")) + list(fr_folder.glob("*.jpeg"))
        if not imgs:
            continue
        img_path = imgs[0]

        img = Image.open(img_path).convert("RGB")
        tensor = transform(img).unsqueeze(0)

        # PyTorch
        with torch.no_grad():
            pt_out = fr_model(tensor)
            pt_probs = torch.softmax(pt_out, dim=1)[0].numpy()
        pt_winner = freshness_classes[np.argmax(pt_probs)]
        pt_conf = np.max(pt_probs) * 100

        # TFLite (NHWC)
        tflite_input_nhwc = tensor.permute(0, 2, 3, 1).numpy().astype(np.float32)
        fr_interp.set_tensor(fr_in[0]["index"], tflite_input_nhwc)
        fr_interp.invoke()
        tflite_out = fr_interp.get_tensor(fr_out[0]["index"])[0]
        tflite_probs = softmax(tflite_out)
        tflite_winner = freshness_classes[np.argmax(tflite_probs)]
        tflite_conf = np.max(tflite_probs) * 100

        match_str = "MATCH" if pt_winner == tflite_winner else "MISMATCH"
        print(f"{fr:<18} | {pt_winner:<18} | {pt_conf:10.2f}% | {tflite_winner:<18} | {tflite_conf:10.2f}% | {match_str}")

if __name__ == "__main__":
    test_models()
