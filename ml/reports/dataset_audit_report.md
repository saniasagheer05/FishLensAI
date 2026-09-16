# FishLensAI — ML Dataset Audit & Preparation Report
**Generated:** 2026-08-31 00:51:53  
**Target Focus:** India & South Asian Common Consumer & Catch Species  
**Target Model Architecture:** MobileNetV3-Small / MobileNetV4 (224x224 RGB)  
**Milestone:** Phase 2, Task 1 (Dataset Audit & Preparation)

---

## 1. Selected 7 MVP Species (South Asian & Indian Everyday Catch)

| # | Species Key | Common Market Name | Scientific Name | Family | Allometric (a, b) | Selection Rationale & Habitat |
|---|---|---|---|---|---|---|
| **1** | `rohu` | **Rohu** (Rohu, Rui, Tapra) | *Labeo rohita* | Cyprinidae | $a=0.0125, b=3.02$ | Most widely consumed major Indian carp; column feeder, high commercial prominence. |
| **2** | `catla` | **Catla** (Catla, Katla, Bhakur) | *Catla catla* | Cyprinidae | $a=0.0142, b=2.98$ | Top surface-feeding major carp, characterized by large head, upturned mouth, and deep body. |
| **3** | `tilapia` | **Tilapia** (Tilapia, Jilapi, Nile Tilapia) | *Oreochromis niloticus* | Cichlidae | $a=0.0189, b=2.89$ | High-volume freshwater aquaculture staple across coastal and inland fish markets. |
| **4** | `hilsa` | **Hilsa** (Hilsa, Ilish, Palla) | *Tenualosa ilisha* | Clupeidae | $a=0.0098, b=3.12$ | Premium culinary delicacy in South Asia (Bay of Bengal / river estuaries); silvery, oily herring. |
| **5** | `mrigal` | **Mrigal** (Mrigal, Morakhi, Mirka) | *Cirrhinus cirrhosus* | Cyprinidae | $a=0.0118, b=3.05$ | Third major carp of the Indian polyculture triad; distinct slender body, bottom-feeder with golden fins. |
| **6** | `indian_mackerel` | **Indian Mackerel / Bangda** (Bangda, Ayala, Bangude, Indian Mackerel) | *Rastrelliger kanagurta* | Scombridae | $a=0.0105, b=3.08$ | Ubiquitous coastal marine fish; torpediform body, iridescent green-gold wavy dorsal lines, dark spots near pectoral fin. |
| **7** | `pomfret` | **Pomfret / Paplet** (Silver Pomfret (White / Paplet), Black Pomfret (Halwa)) | *Pampus argenteus / Parastromateus niger* | Stromateidae / Carangidae | $a=0.021, b=2.92$ | Highly prized table fish across Indian coastal markets; distinct flat rhomboid/compressed body, silvery or dark slate coloration. |

---

## 2. Dataset Audit & Data Quality Assessment

| Metric | Value | Assessment |
|---|---|---|
| **Total Files Scanned** | 490 | Recursive scan across raw South Asian species directory |
| **Valid Usable Images** | 490 | Verified via PIL header and byte verification |
| **Corrupted / Unreadable Files** | 0 | Automatically excluded |
| **Segmentation Mask Files Filtered** | 0 | Mask / GT files cleanly isolated |
| **Non-Fish Files Filtered** | 0 | Invertebrates (Shrimp/Crabs) excluded |
| **Exact Duplicate Images** | 1 | De-duplicated via MD5 hashing |
| **Class Imbalance Ratio** | 1.0 : 1 | Balanced distribution |

---

## 3. Stratified Data Split (70% Train / 15% Val / 15% Test)

Data splitting was executed with a stratified per-class random seed `42` ensuring zero data leakage:

| Split | Percentage | Image Count | Purpose |
|---|---|---|---|
| **Train Set** | 70% | 342 | Backbone feature extraction & head fine-tuning |
| **Validation Set** | 15% | 70 | Hyperparameter tuning & early stopping checkpoint |
| **Test Set** | 15% | 77 | Unbiased final generalization evaluation |
| **Total** | 100% | 489 | Stratified balanced dataset |

### Per-Class Distribution in Processed Splits

| Species Class | Common Name | Train (70%) | Val (15%) | Test (15%) | Total | Class Weight (Loss) |
|---|---|---|---|---|---|---|
| `catla` | **Catla** | 48 | 10 | 11 | 69 | `1.0000` |
| `hilsa` | **Hilsa** | 49 | 10 | 11 | 70 | `1.0000` |
| `indian_mackerel` | **Indian Mackerel / Bangda** | 49 | 10 | 11 | 70 | `1.0000` |
| `mrigal` | **Mrigal** | 49 | 10 | 11 | 70 | `1.0000` |
| `pomfret` | **Pomfret / Paplet** | 49 | 10 | 11 | 70 | `1.0000` |
| `rohu` | **Rohu** | 49 | 10 | 11 | 70 | `1.0000` |
| `tilapia` | **Tilapia** | 49 | 10 | 11 | 70 | `1.0000` |

---

## 4. Mobile Preprocessing & Augmentation Strategy

1. **Resolution Standardization**: Resized to $256 \times 256$, cropped to **$224 \times 224$** (standard MobileNet input).
2. **Horizontal Flipping** ($p=0.5$): Simulates fish orientation in real camera captures.
3. **Random Rotation** ($\pm 15^\circ$): Accounts for handheld tilt during scan.
4. **Color Jitter** (Brightness $\pm 0.2$, Contrast $\pm 0.2$, Saturation $\pm 0.2$): Robustness to ambient dock/market lighting.
5. **Gaussian Blur** ($p=0.2$): Simulates camera lens motion blur and water surface scattering.
6. **Normalization**: ImageNet standards ($\mu = [0.485, 0.456, 0.406], \sigma = [0.229, 0.224, 0.225]$).

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
