# FishLensAI Model 1 — Systematic Experimentation Log
**Evaluated On:** 77 Unseen Test Images (Group-Stratified, Zero Leakage)  
**Baseline:** Milestone 3 Initial Run (59.74% Top-1, 89.61% Top-3, 0.6032 Macro F1)

---

## 1. Overall Model Comparison

| Exp ID | Model & Strategy | Val Acc | Test Top-1 Acc | Test Top-3 Acc | Macro Precision | Macro Recall | Macro F1 |
|---|---|---|---|---|---|---|---|
| `exp1_baseline` | MobileNetV3-Small Baseline (Leakage-Free pHash Data) | 67.1% | **57.14%** | 84.42% | 0.5834 | 0.5779 | **0.5676** |
| `exp2_advanced_aug` | MobileNetV3-Small + Advanced Domain Augmentation & RandomErasing | 57.1% | **64.94%** | 93.51% | 0.6631 | 0.6537 | **0.6505** |
| `exp3_label_smoothing` | MobileNetV3-Small + Label Smoothing (eps=0.1) & High Dropout (0.4) | 54.3% | **58.44%** | 90.91% | 0.5685 | 0.5851 | **0.5683** |
| `exp4_deep_finetune` | MobileNetV3-Small + Full Backbone Progressive Fine-Tuning | 62.9% | **67.53%** | 92.21% | 0.6854 | 0.6797 | **0.6775** |
| `exp5_mobilenet_large` | MobileNetV3-Large Architecture Comparison **(BEST)** | 65.7% | **68.83%** | 96.10% | 0.7243 | 0.6933 | **0.6961** |

---

## 2. Per-Class F1-Score Breakdown (Carp Triad Analysis)

| Species Class | Exp 1 (Base) | Exp 2 (Aug) | Exp 3 (Smooth) | Exp 4 (Deep FT) | Exp 5 (Large) |
|---|---|---|---|---|---|
| `catla` **[CARP]** | 0.526 | 0.556 | 0.583 | 0.632 | 0.667 |
| `hilsa` | 0.560 | 0.636 | 0.545 | 0.609 | 0.692 |
| `indian_mackerel` | 0.667 | 0.696 | 0.700 | 0.696 | 0.762 |
| `mrigal` **[CARP]** | 0.118 | 0.400 | 0.000 | 0.500 | 0.519 |
| `pomfret` | 0.952 | 0.952 | 0.842 | 0.952 | 0.889 |
| `rohu` **[CARP]** | 0.400 | 0.552 | 0.545 | 0.593 | 0.526 |
| `tilapia` | 0.750 | 0.762 | 0.762 | 0.762 | 0.818 |

---

## 3. Best Model Summary

- **Best Experiment:** `exp5_mobilenet_large` (MobileNetV3-Large Architecture Comparison)
- **Top-1 Accuracy:** `68.83%`
- **Top-3 Accuracy:** `96.10%`
- **Macro F1:** `0.6961`
- **Checkpoint Location:** `ml/models/best_species_model_overall.pth`
