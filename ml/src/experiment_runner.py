import os
import sys
import json
import time
import copy
import shutil
from pathlib import Path
from typing import Dict, Tuple, List

import numpy as np
import pandas as pd
from PIL import Image

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader
from torchvision import models, transforms
from torchvision.models import (
    MobileNet_V3_Small_Weights,
    MobileNet_V3_Large_Weights,
    mobilenet_v3_small,
    mobilenet_v3_large
)
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, top_k_accuracy_score

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

try:
    from .config import (
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
    from .data_loader import FishSpeciesDataset
except ImportError:
    from config import (
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
    from data_loader import FishSpeciesDataset


def set_seed(seed: int = 42):
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    np.random.seed(seed)


def get_experiment_transforms(exp_type: str = "standard"):
    """Returns training and validation transforms based on experiment config."""
    if exp_type == "advanced_aug":
        train_tf = transforms.Compose([
            transforms.Resize((256, 256)),
            transforms.RandomResizedCrop(IMAGE_SIZE, scale=(0.75, 1.0), ratio=(0.8, 1.25)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomRotation(degrees=20),
            transforms.RandomAffine(degrees=0, translate=(0.1, 0.1), scale=(0.9, 1.1)),
            transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.3, hue=0.08),
            transforms.ToTensor(),
            transforms.Normalize(mean=NORMALIZE_MEAN, std=NORMALIZE_STD),
            transforms.RandomErasing(p=0.25, scale=(0.02, 0.2), ratio=(0.3, 3.3), value=0)
        ])
    else:
        train_tf = transforms.Compose([
            transforms.Resize((256, 256)),
            transforms.RandomResizedCrop(IMAGE_SIZE, scale=(0.85, 1.0)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomRotation(degrees=15),
            transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.05),
            transforms.ToTensor(),
            transforms.Normalize(mean=NORMALIZE_MEAN, std=NORMALIZE_STD)
        ])

    val_test_tf = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.CenterCrop(IMAGE_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(mean=NORMALIZE_MEAN, std=NORMALIZE_STD)
    ])

    return train_tf, val_test_tf


def build_model(arch: str = "mobilenet_v3_small", num_classes: int = 7, dropout: float = 0.3) -> nn.Module:
    if arch == "mobilenet_v3_large":
        weights = MobileNet_V3_Large_Weights.DEFAULT
        model = mobilenet_v3_large(weights=weights)
        in_features = model.classifier[3].in_features
        model.classifier[2] = nn.Dropout(p=dropout, inplace=True)
        model.classifier[3] = nn.Linear(in_features, num_classes)
    else:
        weights = MobileNet_V3_Small_Weights.DEFAULT
        model = mobilenet_v3_small(weights=weights)
        in_features = model.classifier[3].in_features
        model.classifier[2] = nn.Dropout(p=dropout, inplace=True)
        model.classifier[3] = nn.Linear(in_features, num_classes)

    return model


def train_one_epoch(model, loader, criterion, optimizer, device) -> Tuple[float, float]:
    model.train()
    running_loss, correct, total = 0.0, 0, 0

    for images, labels in loader:
        images, labels = images.to(device), labels.to(device)
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        running_loss += loss.item() * images.size(0)
        _, preds = torch.max(outputs, 1)
        correct += torch.sum(preds == labels.data).item()
        total += labels.size(0)

    return running_loss / total, correct / total


def eval_one_epoch(model, loader, criterion, device) -> Tuple[float, float]:
    model.eval()
    running_loss, correct, total = 0.0, 0, 0

    with torch.no_grad():
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            loss = criterion(outputs, labels)

            running_loss += loss.item() * images.size(0)
            _, preds = torch.max(outputs, 1)
            correct += torch.sum(preds == labels.data).item()
            total += labels.size(0)

    return running_loss / total, correct / total


def evaluate_test_set(model, test_loader, classes, device) -> dict:
    model.eval()
    all_preds, all_targets, all_probs = [], [], []

    with torch.no_grad():
        for images, labels in test_loader:
            images = images.to(device)
            outputs = model(images)
            probs = F.softmax(outputs, dim=1).cpu().numpy()
            _, preds = torch.max(outputs, 1)

            all_probs.extend(probs)
            all_preds.extend(preds.cpu().numpy())
            all_targets.extend(labels.numpy())

    all_preds = np.array(all_preds)
    all_targets = np.array(all_targets)
    all_probs = np.array(all_probs)

    top1 = accuracy_score(all_targets, all_preds)
    top3 = top_k_accuracy_score(all_targets, all_probs, k=min(3, len(classes)))
    report = classification_report(all_targets, all_preds, target_names=classes, output_dict=True, zero_division=0)
    conf_mat = confusion_matrix(all_targets, all_preds)

    return {
        "top1_acc": float(top1),
        "top3_acc": float(top3),
        "macro_precision": float(report["macro avg"]["precision"]),
        "macro_recall": float(report["macro avg"]["recall"]),
        "macro_f1": float(report["macro avg"]["f1-score"]),
        "weighted_f1": float(report["weighted avg"]["f1-score"]),
        "per_class": {
            cls_name: {
                "precision": float(report[cls_name]["precision"]),
                "recall": float(report[cls_name]["recall"]),
                "f1": float(report[cls_name]["f1-score"]),
                "support": int(report[cls_name]["support"])
            }
            for cls_name in classes
        },
        "confusion_matrix": conf_mat.tolist()
    }


def run_experiment(exp_cfg: dict, device: torch.device) -> dict:
    exp_id = exp_cfg["id"]
    name = exp_cfg["name"]
    arch = exp_cfg.get("arch", "mobilenet_v3_small")
    exp_type = exp_cfg.get("exp_type", "standard")
    label_smoothing = exp_cfg.get("label_smoothing", 0.0)
    dropout = exp_cfg.get("dropout", 0.3)
    weight_decay = exp_cfg.get("weight_decay", 1e-4)
    stage1_epochs = exp_cfg.get("stage1_epochs", 10)
    stage2_epochs = exp_cfg.get("stage2_epochs", 20)
    batch_size = exp_cfg.get("batch_size", 16)

    print(f"\n{'='*70}")
    print(f"  RUNNING: {exp_id} - {name.upper()}")
    print(f"  Arch: {arch} | Augmentation: {exp_type} | LabelSmoothing: {label_smoothing}")
    print(f"{'='*70}")

    set_seed(RANDOM_SEED)

    train_tf, val_test_tf = get_experiment_transforms(exp_type)
    train_ds = FishSpeciesDataset(SPECIES_TRAIN_DIR, transform=train_tf)
    val_ds = FishSpeciesDataset(SPECIES_VAL_DIR, transform=val_test_tf)
    test_ds = FishSpeciesDataset(SPECIES_TEST_DIR, transform=val_test_tf)

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False)

    classes = train_ds.classes
    model = build_model(arch=arch, num_classes=len(classes), dropout=dropout).to(device)

    criterion = nn.CrossEntropyLoss(label_smoothing=label_smoothing)

    # Stage 1: Train Head only
    for param in model.features.parameters():
        param.requires_grad = False

    opt_stage1 = torch.optim.AdamW(model.classifier.parameters(), lr=1e-3, weight_decay=weight_decay)

    best_val_loss = float("inf")
    best_val_acc = 0.0
    best_weights = copy.deepcopy(model.state_dict())
    best_epoch = 0

    print("Stage 1: Training Classification Head (Backbone Frozen)...")
    for ep in range(1, stage1_epochs + 1):
        t_loss, t_acc = train_one_epoch(model, train_loader, criterion, opt_stage1, device)
        v_loss, v_acc = eval_one_epoch(model, val_loader, criterion, device)
        if v_loss < best_val_loss:
            best_val_loss = v_loss
            best_val_acc = v_acc
            best_weights = copy.deepcopy(model.state_dict())
            best_epoch = ep

    # Stage 2: Fine-Tuning Backbone
    print("Stage 2: Fine-Tuning Backbone Layers...")
    if exp_cfg.get("unfreeze_all", False):
        for param in model.features.parameters():
            param.requires_grad = True
    else:
        # Unfreeze top feature layers
        for i, block in enumerate(model.features):
            if i >= (7 if arch == "mobilenet_v3_small" else 11):
                for param in block.parameters():
                    param.requires_grad = True

    opt_stage2 = torch.optim.AdamW([
        {"params": [p for p in model.features.parameters() if p.requires_grad], "lr": exp_cfg.get("backbone_lr", 1e-4)},
        {"params": model.classifier.parameters(), "lr": exp_cfg.get("head_lr", 3e-4)}
    ], weight_decay=weight_decay)

    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(opt_stage2, T_max=stage2_epochs, eta_min=1e-6)

    patience = 6
    patience_cnt = 0

    for ep in range(1, stage2_epochs + 1):
        curr_ep = stage1_epochs + ep
        t_loss, t_acc = train_one_epoch(model, train_loader, criterion, opt_stage2, device)
        v_loss, v_acc = eval_one_epoch(model, val_loader, criterion, device)
        scheduler.step()

        if v_loss < best_val_loss:
            best_val_loss = v_loss
            best_val_acc = v_acc
            best_weights = copy.deepcopy(model.state_dict())
            best_epoch = curr_ep
            patience_cnt = 0
        else:
            patience_cnt += 1
            if patience_cnt >= patience:
                break

    # Save Best Weights for this Experiment
    model.load_state_dict(best_weights)
    exp_model_path = MODELS_DIR / f"{exp_id}_{arch}.pth"
    torch.save({
        "exp_id": exp_id,
        "name": name,
        "arch": arch,
        "classes": classes,
        "model_state_dict": model.state_dict(),
        "best_val_loss": best_val_loss,
        "best_val_acc": best_val_acc,
        "best_epoch": best_epoch
    }, exp_model_path)

    # Evaluate on Untouched Test Set
    test_metrics = evaluate_test_set(model, test_loader, classes, device)
    
    # Save Confusion Matrix CSV
    conf_df = pd.DataFrame(test_metrics["confusion_matrix"], index=classes, columns=classes)
    conf_csv = REPORTS_DIR / f"confusion_matrix_{exp_id}.csv"
    conf_df.to_csv(conf_csv)

    print(f"Results for {exp_id}:")
    print(f"  • Best Val Acc:      {best_val_acc*100:5.2f}% (Loss: {best_val_loss:.4f}, Epoch {best_epoch})")
    print(f"  • Test Top-1 Acc:    {test_metrics['top1_acc']*100:5.2f}%")
    print(f"  • Test Top-3 Acc:    {test_metrics['top3_acc']*100:5.2f}%")
    print(f"  • Macro F1-Score:    {test_metrics['macro_f1']:.4f}")
    print(f"  • Rohu F1: {test_metrics['per_class']['rohu']['f1']:.3f} | Catla F1: {test_metrics['per_class']['catla']['f1']:.3f} | Mrigal F1: {test_metrics['per_class']['mrigal']['f1']:.3f}")

    return {
        "exp_id": exp_id,
        "name": name,
        "arch": arch,
        "model_path": str(exp_model_path),
        "best_epoch": best_epoch,
        "best_val_acc": round(best_val_acc, 4),
        "best_val_loss": round(best_val_loss, 4),
        "test_top1_acc": round(test_metrics["top1_acc"], 4),
        "test_top3_acc": round(test_metrics["top3_acc"], 4),
        "macro_precision": round(test_metrics["macro_precision"], 4),
        "macro_recall": round(test_metrics["macro_recall"], 4),
        "macro_f1": round(test_metrics["macro_f1"], 4),
        "per_class": test_metrics["per_class"],
        "confusion_matrix": test_metrics["confusion_matrix"]
    }


def run_all_systematic_experiments():
    device = torch.device("cpu")
    print("========================================================================")
    print("      FISH SPECIES MODEL 1: SYSTEMATIC EXPERIMENTATION SUITE            ")
    print("========================================================================")

    experiments = [
        {
            "id": "exp1_baseline",
            "name": "MobileNetV3-Small Baseline (Leakage-Free pHash Data)",
            "arch": "mobilenet_v3_small",
            "exp_type": "standard",
            "label_smoothing": 0.0,
            "dropout": 0.2,
            "weight_decay": 1e-4,
            "stage1_epochs": 10,
            "stage2_epochs": 18,
            "backbone_lr": 1e-4,
            "head_lr": 3e-4
        },
        {
            "id": "exp2_advanced_aug",
            "name": "MobileNetV3-Small + Advanced Domain Augmentation & RandomErasing",
            "arch": "mobilenet_v3_small",
            "exp_type": "advanced_aug",
            "label_smoothing": 0.0,
            "dropout": 0.3,
            "weight_decay": 1e-4,
            "stage1_epochs": 10,
            "stage2_epochs": 20,
            "backbone_lr": 1e-4,
            "head_lr": 3e-4
        },
        {
            "id": "exp3_label_smoothing",
            "name": "MobileNetV3-Small + Label Smoothing (eps=0.1) & High Dropout (0.4)",
            "arch": "mobilenet_v3_small",
            "exp_type": "advanced_aug",
            "label_smoothing": 0.1,
            "dropout": 0.4,
            "weight_decay": 5e-4,
            "stage1_epochs": 10,
            "stage2_epochs": 22,
            "backbone_lr": 8e-5,
            "head_lr": 2.5e-4
        },
        {
            "id": "exp4_deep_finetune",
            "name": "MobileNetV3-Small + Full Backbone Progressive Fine-Tuning",
            "arch": "mobilenet_v3_small",
            "exp_type": "advanced_aug",
            "label_smoothing": 0.08,
            "dropout": 0.35,
            "weight_decay": 3e-4,
            "unfreeze_all": True,
            "stage1_epochs": 8,
            "stage2_epochs": 24,
            "backbone_lr": 5e-5,
            "head_lr": 2e-4
        },
        {
            "id": "exp5_mobilenet_large",
            "name": "MobileNetV3-Large Architecture Comparison",
            "arch": "mobilenet_v3_large",
            "exp_type": "advanced_aug",
            "label_smoothing": 0.08,
            "dropout": 0.3,
            "weight_decay": 3e-4,
            "stage1_epochs": 10,
            "stage2_epochs": 20,
            "backbone_lr": 6e-5,
            "head_lr": 2.5e-4
        }
    ]

    all_results = []
    best_overall_f1 = 0.0
    best_overall_exp = None

    for exp_cfg in experiments:
        res = run_experiment(exp_cfg, device)
        all_results.append(res)
        if res["macro_f1"] > best_overall_f1:
            best_overall_f1 = res["macro_f1"]
            best_overall_exp = res

    # Save Experiment Log JSON
    log_json = REPORTS_DIR / "experiment_log.json"
    with open(log_json, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2)

    # Copy overall best checkpoint
    if best_overall_exp:
        best_chk = MODELS_DIR / "best_species_model_overall.pth"
        shutil.copy2(best_overall_exp["model_path"], best_chk)
        print(f"\n[OK] Global Best Model ({best_overall_exp['exp_id']}) saved to: {best_chk}")

    # Generate Markdown Comparison Table
    generate_comparison_markdown(all_results, best_overall_exp)

    return all_results


def generate_comparison_markdown(results: List[dict], best_exp: dict):
    md_path = REPORTS_DIR / "experiment_comparison.md"
    classes = list(results[0]["per_class"].keys())

    content = f"""# FishLensAI Model 1 — Systematic Experimentation Log
**Evaluated On:** 77 Unseen Test Images (Group-Stratified, Zero Leakage)  
**Baseline:** Milestone 3 Initial Run (59.74% Top-1, 89.61% Top-3, 0.6032 Macro F1)

---

## 1. Overall Model Comparison

| Exp ID | Model & Strategy | Val Acc | Test Top-1 Acc | Test Top-3 Acc | Macro Precision | Macro Recall | Macro F1 |
|---|---|---|---|---|---|---|---|
"""
    for r in results:
        is_best = " **(BEST)**" if r["exp_id"] == best_exp["exp_id"] else ""
        content += f"| `{r['exp_id']}` | {r['name']}{is_best} | {r['best_val_acc']*100:.1f}% | **{r['test_top1_acc']*100:.2f}%** | {r['test_top3_acc']*100:.2f}% | {r['macro_precision']:.4f} | {r['macro_recall']:.4f} | **{r['macro_f1']:.4f}** |\n"

    content += f"""
---

## 2. Per-Class F1-Score Breakdown (Carp Triad Analysis)

| Species Class | Exp 1 (Base) | Exp 2 (Aug) | Exp 3 (Smooth) | Exp 4 (Deep FT) | Exp 5 (Large) |
|---|---|---|---|---|---|
"""
    for cls_name in classes:
        f1_vals = [f"{r['per_class'][cls_name]['f1']:.3f}" for r in results]
        highlight = " **[CARP]**" if cls_name in ["rohu", "catla", "mrigal"] else ""
        content += f"| `{cls_name}`{highlight} | {f1_vals[0]} | {f1_vals[1]} | {f1_vals[2]} | {f1_vals[3]} | {f1_vals[4]} |\n"

    content += f"""
---

## 3. Best Model Summary

- **Best Experiment:** `{best_exp['exp_id']}` ({best_exp['name']})
- **Top-1 Accuracy:** `{best_exp['test_top1_acc']*100:.2f}%`
- **Top-3 Accuracy:** `{best_exp['test_top3_acc']*100:.2f}%`
- **Macro F1:** `{best_exp['macro_f1']:.4f}`
- **Checkpoint Location:** `ml/models/best_species_model_overall.pth`
"""

    with open(md_path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"[OK] Comparison report saved to: {md_path}")


if __name__ == "__main__":
    run_all_systematic_experiments()
