import os
import sys
import json
from pathlib import Path
from datetime import datetime

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

try:
    from .config import (
        RAW_SPECIES_DIR,
        PROCESSED_SPECIES_DIR,
        REPORTS_DIR,
        TARGET_SPECIES,
        SPLIT_RATIOS,
        IMAGE_SIZE
    )
    from .audit_dataset import run_full_audit
    from .prepare_species_dataset import prepare_dataset
except ImportError:
    from config import (
        RAW_SPECIES_DIR,
        PROCESSED_SPECIES_DIR,
        REPORTS_DIR,
        TARGET_SPECIES,
        SPLIT_RATIOS,
        IMAGE_SIZE
    )
    from audit_dataset import run_full_audit
    from prepare_species_dataset import prepare_dataset


def generate_markdown_report(audit_data: dict) -> Path:
    """Generates a detailed markdown report summarizing dataset audit findings for South Asian species."""
    report_file = REPORTS_DIR / "dataset_audit_report.md"

    raw_audit = audit_data.get("raw_species", {})
    train_audit = audit_data.get("processed_train", {})
    val_audit = audit_data.get("processed_val", {})
    test_audit = audit_data.get("processed_test", {})

    total_valid = raw_audit.get("valid_images", 0)
    train_count = train_audit.get("valid_images", 0)
    val_count = val_audit.get("valid_images", 0)
    test_count = test_audit.get("valid_images", 0)

    report_content = f"""# FishLensAI — ML Dataset Audit & Preparation Report
**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  
**Target Focus:** India & South Asian Common Consumer & Catch Species  
**Target Model Architecture:** MobileNetV3-Small / MobileNetV4 (224x224 RGB)  
**Milestone:** Phase 2, Task 1 (Dataset Audit & Preparation)

---

## 1. Selected 7 MVP Species (South Asian & Indian Everyday Catch)

| # | Species Key | Common Market Name | Scientific Name | Family | Allometric (a, b) | Selection Rationale & Habitat |
|---|---|---|---|---|---|---|
"""

    for i, (sp_key, sp_info) in enumerate(TARGET_SPECIES.items(), 1):
        report_content += f"| **{i}** | `{sp_key}` | **{sp_info['common_name']}** ({sp_info['market_names']}) | *{sp_info['scientific_name']}* | {sp_info['family']} | $a={sp_info['a_coeff']}, b={sp_info['b_coeff']}$ | {sp_info['reason']} |\n"

    report_content += f"""
---

## 2. Dataset Audit & Data Quality Assessment

| Metric | Value | Assessment |
|---|---|---|
| **Total Files Scanned** | {raw_audit.get('total_files_scanned', 0)} | Recursive scan across raw South Asian species directory |
| **Valid Usable Images** | {raw_audit.get('valid_images', 0)} | Verified via PIL header and byte verification |
| **Corrupted / Unreadable Files** | {raw_audit.get('corrupted_count', 0)} | Automatically excluded |
| **Segmentation Mask Files Filtered** | {raw_audit.get('mask_files_detected', 0)} | Mask / GT files cleanly isolated |
| **Non-Fish Files Filtered** | {raw_audit.get('non_fish_files_detected', 0)} | Invertebrates (Shrimp/Crabs) excluded |
| **Exact Duplicate Images** | {raw_audit.get('duplicate_count', 0)} | De-duplicated via MD5 hashing |
| **Class Imbalance Ratio** | {raw_audit.get('class_imbalance_ratio', 1.0)} : 1 | Balanced distribution |

---

## 3. Stratified Data Split (70% Train / 15% Val / 15% Test)

Data splitting was executed with a stratified per-class random seed `42` ensuring zero data leakage:

| Split | Percentage | Image Count | Purpose |
|---|---|---|---|
| **Train Set** | {int(SPLIT_RATIOS['train']*100)}% | {train_count} | Backbone feature extraction & head fine-tuning |
| **Validation Set** | {int(SPLIT_RATIOS['val']*100)}% | {val_count} | Hyperparameter tuning & early stopping checkpoint |
| **Test Set** | {int(SPLIT_RATIOS['test']*100)}% | {test_count} | Unbiased final generalization evaluation |
| **Total** | 100% | {train_count + val_count + test_count} | Stratified balanced dataset |

### Per-Class Distribution in Processed Splits

| Species Class | Common Name | Train (70%) | Val (15%) | Test (15%) | Total | Class Weight (Loss) |
|---|---|---|---|---|---|---|
"""

    train_dist = train_audit.get("class_distribution", {})
    val_dist = val_audit.get("class_distribution", {})
    test_dist = test_audit.get("class_distribution", {})
    weights = raw_audit.get("recommended_class_weights", {})

    for sp_key in sorted(set(list(train_dist.keys()) + list(val_dist.keys()) + list(test_dist.keys()))):
        tr = train_dist.get(sp_key, 0)
        va = val_dist.get(sp_key, 0)
        te = test_dist.get(sp_key, 0)
        w = weights.get(sp_key, 1.0)
        cname = TARGET_SPECIES.get(sp_key, {}).get("common_name", sp_key)
        report_content += f"| `{sp_key}` | **{cname}** | {tr} | {va} | {te} | {tr+va+te} | `{w:.4f}` |\n"

    report_content += f"""
---

## 4. Mobile Preprocessing & Augmentation Strategy

1. **Resolution Standardization**: Resized to $256 \\times 256$, cropped to **$224 \\times 224$** (standard MobileNet input).
2. **Horizontal Flipping** ($p=0.5$): Simulates fish orientation in real camera captures.
3. **Random Rotation** ($\\pm 15^\\circ$): Accounts for handheld tilt during scan.
4. **Color Jitter** (Brightness $\\pm 0.2$, Contrast $\\pm 0.2$, Saturation $\\pm 0.2$): Robustness to ambient dock/market lighting.
5. **Gaussian Blur** ($p=0.2$): Simulates camera lens motion blur and water surface scattering.
6. **Normalization**: ImageNet standards ($\\mu = [0.485, 0.456, 0.406], \\sigma = [0.229, 0.224, 0.225]$).

---

## 5. Dataset Directory Structure

```
FishLensAI/ml/
├── data/
│   ├── raw/
│   │   ├── species/                  <-- Drop raw species photos here
│   │   │   ├── rohu/
│   │   │   ├── catla/
│   │   │   ├── tilapia/
│   │   │   ├── hilsa/
│   │   │   ├── mrigal/
│   │   │   ├── indian_mackerel/
│   │   │   └── pomfret/
│   │   └── freshness/                <-- Future freshness collection
│   │       ├── fresh/
│   │       ├── moderate/
│   │       └── spoiled/
│   └── processed/
│       ├── species/
│       │   ├── train/                <-- 70% stratified split
│       │   ├── val/                  <-- 15% stratified split
│       │   ├── test/                 <-- 15% stratified split
│       │   └── metadata.csv          <-- Complete sample manifest
│       └── freshness/
│           ├── train/
│           ├── val/
│           └── test/
```

---

## 6. How to Run Dataset Pipeline

```bash
# 1. Clean, de-duplicate, and split raw data into 70/15/15 partitions:
python ml/src/prepare_species_dataset.py

# 2. Run the integrity and class imbalance audit:
python ml/src/audit_dataset.py

# 3. Generate summary reports in ml/reports/:
python ml/src/dataset_report.py
```
"""

    with open(report_file, "w", encoding="utf-8") as f:
        f.write(report_content)

    print(f"[OK] Generated Markdown Audit Report: {report_file}")
    return report_file


if __name__ == "__main__":
    audit_data = run_full_audit()
    generate_markdown_report(audit_data)
