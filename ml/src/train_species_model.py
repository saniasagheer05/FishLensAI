import os
import sys
import json
import time
import copy
from pathlib import Path
from typing import Dict, Tuple

import numpy as np
import pandas as pd
from PIL import Image

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import models, transforms
from torchvision.models import MobileNet_V3_Small_Weights

from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, top_k_accuracy_score

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

try:
    from .config import (
        PROCESSED_SPECIES_DIR,
        SPECIES_TRAIN_DIR,
        SPECIES_VAL_DIR,
        SPECIES_TEST_DIR,
        MODELS_DIR,
        REPORTS_DIR,
        TARGET_SPECIES,
        IMAGE_SIZE,
        NORMALIZE_MEAN,
        NORMALIZE_STD,
        RANDOM_SEED
    )
    from .data_loader import FishSpeciesDataset, get_mobile_transforms
except ImportError:
    from config import (
        PROCESSED_SPECIES_DIR,
        SPECIES_TRAIN_DIR,
        SPECIES_VAL_DIR,
        SPECIES_TEST_DIR,
        MODELS_DIR,
        REPORTS_DIR,
        TARGET_SPECIES,
        IMAGE_SIZE,
        NORMALIZE_MEAN,
        NORMALIZE_STD,
        RANDOM_SEED
    )
    from data_loader import FishSpeciesDataset, get_mobile_transforms


VALID_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def set_seed(seed: int = 42):
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    np.random.seed(seed)


def compute_class_weights(train_dir: Path, classes, device) -> torch.Tensor:
    """
    Computes inverse-frequency class weights directly from the train-set folder
    structure, in the exact order of `classes` (which must match the dataset's
    class_to_idx ordering). Used to counter class imbalance in CrossEntropyLoss.
    """
    class_counts = []
    for cls_name in classes:
        cls_dir = train_dir / cls_name
        count = sum(
            1 for f in cls_dir.iterdir()
            if f.is_file() and f.suffix.lower() in VALID_IMAGE_EXTENSIONS
        )
        class_counts.append(count)

    num_classes = len(classes)
    total_samples = sum(class_counts)
    weights = [total_samples / (num_classes * c) for c in class_counts]
    class_weights = torch.tensor(weights, dtype=torch.float32).to(device)

    print("Class weights (for imbalance-aware loss):")
    for cls_name, cnt, w in zip(classes, class_counts, weights):
        print(f"  {cls_name:18s}: {cnt:5d} images -> weight {w:.4f}")
    print()

    return class_weights


def build_mobilenetv3_model(num_classes: int = 7) -> nn.Module:
    """Builds MobileNetV3-Small with pretrained ImageNet weights and customized 7-class head."""
    print("Loading MobileNetV3-Small with official ImageNet pretrained weights...")
    weights = MobileNet_V3_Small_Weights.DEFAULT
    model = models.mobilenet_v3_small(weights=weights)

    # In MobileNetV3-Small, classifier structure is:
    # (0): Linear(in_features=576, out_features=1024, bias=True)
    # (1): Hardswish()
    # (2): Dropout(p=0.2, inplace=True)
    # (3): Linear(in_features=1024, out_features=1000, bias=True)
    in_features = model.classifier[3].in_features
    model.classifier[2] = nn.Dropout(p=0.3, inplace=True)
    model.classifier[3] = nn.Linear(in_features, num_classes)

    return model


def train_epoch(model, loader, criterion, optimizer, device) -> Tuple[float, float]:
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0

    for images, labels in loader:
        images = images.to(device)
        labels = labels.to(device)

        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        running_loss += loss.item() * images.size(0)
        _, preds = torch.max(outputs, 1)
        correct += torch.sum(preds == labels.data).item()
        total += labels.size(0)

    epoch_loss = running_loss / total
    epoch_acc = correct / total
    return epoch_loss, epoch_acc


def validate_epoch(model, loader, criterion, device) -> Tuple[float, float]:
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():
        for images, labels in loader:
            images = images.to(device)
            labels = labels.to(device)

            outputs = model(images)
            loss = criterion(outputs, labels)

            running_loss += loss.item() * images.size(0)
            _, preds = torch.max(outputs, 1)
            correct += torch.sum(preds == labels.data).item()
            total += labels.size(0)

    epoch_loss = running_loss / total
    epoch_acc = correct / total
    return epoch_loss, epoch_acc


def train_pipeline(
    batch_size: int = 16,
    stage1_epochs: int = 12,
    stage2_epochs: int = 18,
    device_name: str = "cpu"
):
    set_seed(RANDOM_SEED)
    device = torch.device(device_name)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    print("========================================================")
    print("     STARTING FISH SPECIES CLASSIFIER MODEL TRAINING    ")
    print(f"     Device: {device} | Batch Size: {batch_size}")
    print("========================================================")

    # 1. Prepare Transforms and DataLoaders
    train_tf, val_tf = get_mobile_transforms()
    train_dataset = FishSpeciesDataset(SPECIES_TRAIN_DIR, transform=train_tf)
    val_dataset = FishSpeciesDataset(SPECIES_VAL_DIR, transform=val_tf)
    test_dataset = FishSpeciesDataset(SPECIES_TEST_DIR, transform=val_tf)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, pin_memory=False)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, pin_memory=False)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, pin_memory=False)

    classes = train_dataset.classes
    num_classes = len(classes)
    print(f"Target Species Classes ({num_classes}): {classes}")
    print(f"Samples: Train={len(train_dataset)}, Val={len(val_dataset)}, Test={len(test_dataset)}\n")

    # Compute class weights from actual train-set distribution to counter class imbalance
    class_weights = compute_class_weights(SPECIES_TRAIN_DIR, classes, device)

    # 2. Build Model
    model = build_mobilenetv3_model(num_classes=num_classes).to(device)
    criterion = nn.CrossEntropyLoss(weight=class_weights)

    history = {
        "train_loss": [],
        "train_acc": [],
        "val_loss": [],
        "val_acc": []
    }

    best_val_loss = float("inf")
    best_val_acc = 0.0
    best_model_weights = copy.deepcopy(model.state_dict())
    best_epoch = 0

    # ----------------------------------------------------
    # STAGE 1: Frozen Backbone Training (Head warmup)
    # ----------------------------------------------------
    print("\n>>> STAGE 1: Training Classification Head (Backbone Frozen)...")
    for param in model.features.parameters():
        param.requires_grad = False

    optimizer_stage1 = torch.optim.AdamW(model.classifier.parameters(), lr=1e-3, weight_decay=1e-4)

    for epoch in range(1, stage1_epochs + 1):
        t_loss, t_acc = train_epoch(model, train_loader, criterion, optimizer_stage1, device)
        v_loss, v_acc = validate_epoch(model, val_loader, criterion, device)

        history["train_loss"].append(t_loss)
        history["train_acc"].append(t_acc)
        history["val_loss"].append(v_loss)
        history["val_acc"].append(v_acc)

        if v_loss < best_val_loss:
            best_val_loss = v_loss
            best_val_acc = v_acc
            best_model_weights = copy.deepcopy(model.state_dict())
            best_epoch = epoch

        print(f"Epoch [{epoch:02d}/{stage1_epochs:02d}] - Train Loss: {t_loss:.4f}, Acc: {t_acc*100:5.1f}% | Val Loss: {v_loss:.4f}, Acc: {v_acc*100:5.1f}%")

    # ----------------------------------------------------
    # STAGE 2: Fine-Tuning Top Backbone Layers
    # ----------------------------------------------------
    print("\n>>> STAGE 2: Fine-Tuning Top Feature Layers...")
    # Unfreeze top feature layers (layers 7 to 12)
    for i, block in enumerate(model.features):
        if i >= 6:
            for param in block.parameters():
                param.requires_grad = True

    optimizer_stage2 = torch.optim.AdamW(
        [
            {"params": model.features.parameters(), "lr": 1e-4},
            {"params": model.classifier.parameters(), "lr": 3e-4}
        ],
        weight_decay=1e-4
    )
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer_stage2, T_max=stage2_epochs, eta_min=1e-6)

    patience = 6
    patience_counter = 0

    for epoch in range(1, stage2_epochs + 1):
        curr_total_epoch = stage1_epochs + epoch
        t_loss, t_acc = train_epoch(model, train_loader, criterion, optimizer_stage2, device)
        v_loss, v_acc = validate_epoch(model, val_loader, criterion, device)
        scheduler.step()

        history["train_loss"].append(t_loss)
        history["train_acc"].append(t_acc)
        history["val_loss"].append(v_loss)
        history["val_acc"].append(v_acc)

        print(f"Epoch [{curr_total_epoch:02d}/{stage1_epochs+stage2_epochs:02d}] - Train Loss: {t_loss:.4f}, Acc: {t_acc*100:5.1f}% | Val Loss: {v_loss:.4f}, Acc: {v_acc*100:5.1f}% (LR: {scheduler.get_last_lr()[0]:.2e})")

        if v_loss < best_val_loss:
            best_val_loss = v_loss
            best_val_acc = v_acc
            best_model_weights = copy.deepcopy(model.state_dict())
            best_epoch = curr_total_epoch
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= patience:
                print(f"\n[!] Early stopping triggered at epoch {curr_total_epoch} (no improvement in {patience} epochs).")
                break

    # Save Best Model Checkpoint
    checkpoint_path = MODELS_DIR / "best_species_mobilenetv3.pth"
    model.load_state_dict(best_model_weights)
    torch.save({
        "epoch": best_epoch,
        "model_state_dict": model.state_dict(),
        "classes": classes,
        "class_to_idx": train_dataset.class_to_idx,
        "best_val_acc": best_val_acc,
        "best_val_loss": best_val_loss,
        "architecture": "MobileNetV3-Small",
        "input_size": IMAGE_SIZE,
        "normalize_mean": NORMALIZE_MEAN,
        "normalize_std": NORMALIZE_STD
    }, checkpoint_path)
    print(f"\n[OK] Best model checkpoint saved to: {checkpoint_path}")
    print(f"Best Validation Loss: {best_val_loss:.4f} | Accuracy: {best_val_acc*100:.2f}% (Epoch {best_epoch})")

    # ----------------------------------------------------
    # FINAL EVALUATION ON UNSEEN TEST SET
    # ----------------------------------------------------
    print("\n========================================================")
    print("           EVALUATING ON HELD-OUT TEST SET              ")
    print("========================================================")
    model.eval()

    all_preds = []
    all_targets = []
    all_probs = []

    with torch.no_grad():
        for images, labels in test_loader:
            images = images.to(device)
            outputs = model(images)
            probs = torch.softmax(outputs, dim=1).cpu().numpy()
            _, preds = torch.max(outputs, 1)

            all_probs.extend(probs)
            all_preds.extend(preds.cpu().numpy())
            all_targets.extend(labels.numpy())

    all_preds = np.array(all_preds)
    all_targets = np.array(all_targets)
    all_probs = np.array(all_probs)

    top1_acc = accuracy_score(all_targets, all_preds)
    top3_acc = top_k_accuracy_score(all_targets, all_probs, k=min(3, num_classes))

    clf_report = classification_report(
        all_targets,
        all_preds,
        target_names=classes,
        output_dict=True,
        zero_division=0
    )
    conf_mat = confusion_matrix(all_targets, all_preds)

    print(f"Top-1 Test Accuracy: {top1_acc*100:.2f}%")
    print(f"Top-3 Test Accuracy: {top3_acc*100:.2f}%")
    print(f"Macro Precision:     {clf_report['macro avg']['precision']:.4f}")
    print(f"Macro Recall:        {clf_report['macro avg']['recall']:.4f}")
    print(f"Macro F1-Score:      {clf_report['macro avg']['f1-score']:.4f}")

    print("\nDetailed Per-Class Performance:")
    print(f"{'Species':<20} | {'Precision':<10} | {'Recall':<10} | {'F1-Score':<10} | {'Support':<8}")
    print("-" * 65)
    for cls_name in classes:
        c_stats = clf_report[cls_name]
        print(f"{cls_name:<20} | {c_stats['precision']:<10.4f} | {c_stats['recall']:<10.4f} | {c_stats['f1-score']:<10.4f} | {int(c_stats['support']):<8d}")

    # Save Confusion Matrix CSV
    conf_df = pd.DataFrame(conf_mat, index=classes, columns=classes)
    conf_csv_path = REPORTS_DIR / "species_confusion_matrix.csv"
    conf_df.to_csv(conf_csv_path)

    # Save JSON Evaluation Report
    eval_report = {
        "model": "MobileNetV3-Small",
        "num_classes": num_classes,
        "classes": classes,
        "test_samples_total": len(all_targets),
        "top1_accuracy": round(float(top1_acc), 4),
        "top3_accuracy": round(float(top3_acc), 4),
        "macro_precision": round(float(clf_report['macro avg']['precision']), 4),
        "macro_recall": round(float(clf_report['macro avg']['recall']), 4),
        "macro_f1": round(float(clf_report['macro avg']['f1-score']), 4),
        "per_class_metrics": {
            cls_name: {
                "precision": round(clf_report[cls_name]["precision"], 4),
                "recall": round(clf_report[cls_name]["recall"], 4),
                "f1_score": round(clf_report[cls_name]["f1-score"], 4),
                "support": int(clf_report[cls_name]["support"])
            }
            for cls_name in classes
        },
        "confusion_matrix": conf_mat.tolist(),
        "training_history": history
    }

    eval_json_path = REPORTS_DIR / "species_model_evaluation.json"
    with open(eval_json_path, "w", encoding="utf-8") as f:
        json.dump(eval_report, f, indent=2)

    print(f"\n[OK] Test evaluation report exported to: {eval_json_path}")
    print(f"[OK] Confusion matrix CSV exported to:   {conf_csv_path}")

    return eval_report


if __name__ == "__main__":
    train_pipeline()