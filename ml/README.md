# 🐟 FishLensAI — Machine Learning Pipeline

This directory contains the dataset preparation, audit, training, and mobile model export pipelines for **FishLensAI**.

---

## 📁 Directory Structure

```
ml/
├── data/
│   ├── raw/
│   │   ├── species/                  # Raw downloaded datasets (Kaggle / Fish4Knowledge)
│   │   │   ├── sea_bass/
│   │   │   ├── trout/
│   │   │   ├── red_mullet/
│   │   │   ├── gilt_head_bream/
│   │   │   ├── black_sea_sprat/
│   │   │   ├── horse_mackerel/
│   │   │   └── striped_red_mullet/
│   │   └── freshness/                # Freshness collection (eyes, gills, skin photos)
│   │       ├── fresh/
│   │       ├── moderate/
│   │       └── spoiled/
│   └── processed/
│       ├── species/
│       │   ├── train/                # Stratified 70% split
│       │   ├── val/                  # Stratified 15% split
│       │   ├── test/                 # Stratified 15% split
│       │   └── metadata.csv          # Sample manifest (hash, dimensions, split)
│       └── freshness/
│           ├── train/
│           ├── val/
│           └── test/
├── src/
│   ├── config.py                     # Species definitions, paths, split ratios, image size (224x224)
│   ├── audit_dataset.py              # Audits image validity, corruptions, masks, duplicates, class balance
│   ├── prepare_species_dataset.py    # De-duplicates, filters masks, and creates stratified 70/15/15 split
│   ├── data_loader.py                # PyTorch / Torchvision DataLoaders with mobile-oriented augmentations
│   ├── dataset_report.py             # Generates JSON stats & Markdown summary audit report
│   └── generate_sample_dataset.py    # Generates verification dataset samples for pipeline dry-runs
├── notebooks/
│   └── 01_dataset_audit_and_prep.ipynb # Interactive Jupyter / Colab notebook for audit & data preparation
├── models/                           # Exported .tflite / ONNX models (for mobile integration)
├── reports/                          # Audit reports and statistical summaries
│   ├── dataset_stats.json
│   └── dataset_audit_report.md
└── requirements.txt                  # Minimal Python dependencies
```

---

## 🎯 Target MVP Species (7 Classes)

1. **Sea Bass** (*Dicentrarchus labrax*) — 1,000 target samples
2. **Trout** (*Oncorhynchus mykiss*) — 1,000 target samples
3. **Red Mullet** (*Mullus barbatus*) — 1,000 target samples
4. **Gilt-Head Bream** (*Sparus aurata*) — 1,000 target samples
5. **Black Sea Sprat** (*Clupeonella cultriventris*) — 1,000 target samples
6. **Horse Mackerel** (*Trachurus trachurus*) — 1,000 target samples
7. **Striped Red Mullet** (*Mullus surmuletus*) — 1,000 target samples

*(Mapped alongside South Asian aquaculture species: Rohu, Catla, Tilapia, Hilsa)*

---

## 📥 How to Download and Place Real Datasets

### 1. Kaggle "A Large Scale Fish Dataset" (Recommended for Species Model)
```bash
# Option A: via Kaggle CLI
kaggle datasets download -d crowww/a-large-scale-fish-dataset

# Option B: Manual Download
# Download from: https://www.kaggle.com/datasets/crowww/a-large-scale-fish-dataset
# Extract the folders from `Fish_Dataset/Fish_Dataset/{Species_Name}` into `ml/data/raw/species/{species_name}`
```

### 2. Run the Automated Ingestion & Audit Pipeline
```bash
# 1. Clean, de-duplicate, and split raw data into 70/15/15 partitions:
python ml/src/prepare_species_dataset.py

# 2. Run the integrity and class imbalance audit:
python ml/src/audit_dataset.py

# 3. Generate summary reports in ml/reports/:
python ml/src/dataset_report.py
```

---

## 📱 Mobile Image Transforms (224x224)

- **Input Resolution**: $224 \times 224 \times 3$
- **Training Augmentations**:
  - `RandomResizedCrop(224, scale=(0.85, 1.0))`
  - `RandomHorizontalFlip(p=0.5)`
  - `RandomRotation(degrees=15)`
  - `ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.05)`
  - `Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])`
