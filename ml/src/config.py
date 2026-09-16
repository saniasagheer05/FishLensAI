import os
from pathlib import Path

# Base Paths
ML_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ML_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"

# Species Dataset Paths
RAW_SPECIES_DIR = RAW_DATA_DIR / "species"
PROCESSED_SPECIES_DIR = PROCESSED_DATA_DIR / "species"
SPECIES_TRAIN_DIR = PROCESSED_SPECIES_DIR / "train"
SPECIES_VAL_DIR = PROCESSED_SPECIES_DIR / "val"
SPECIES_TEST_DIR = PROCESSED_SPECIES_DIR / "test"

# Freshness Dataset Paths
RAW_FRESHNESS_DIR = RAW_DATA_DIR / "freshness"
PROCESSED_FRESHNESS_DIR = PROCESSED_DATA_DIR / "freshness"
FRESHNESS_TRAIN_DIR = PROCESSED_FRESHNESS_DIR / "train"
FRESHNESS_VAL_DIR = PROCESSED_FRESHNESS_DIR / "val"
FRESHNESS_TEST_DIR = PROCESSED_FRESHNESS_DIR / "test"

# Outputs & Reports
REPORTS_DIR = ML_DIR / "reports"
MODELS_DIR = ML_DIR / "models"

# 7 Target MVP Species for India / South Asia Catch & Market Focus
TARGET_SPECIES = {
    "rohu": {
        "common_name": "Rohu",
        "scientific_name": "Labeo rohita",
        "family": "Cyprinidae",
        "market_names": "Rohu, Rui, Tapra",
        "target_image_count": 1000,
        "a_coeff": 0.0125,
        "b_coeff": 3.02,
        "reason": "Most widely consumed major Indian carp; column feeder, high commercial prominence."
    },
    "catla": {
        "common_name": "Catla",
        "scientific_name": "Catla catla",
        "family": "Cyprinidae",
        "market_names": "Catla, Katla, Bhakur",
        "target_image_count": 1000,
        "a_coeff": 0.0142,
        "b_coeff": 2.98,
        "reason": "Top surface-feeding major carp, characterized by large head, upturned mouth, and deep body."
    },
    "tilapia": {
        "common_name": "Tilapia",
        "scientific_name": "Oreochromis niloticus",
        "family": "Cichlidae",
        "market_names": "Tilapia, Jilapi, Nile Tilapia",
        "target_image_count": 1000,
        "a_coeff": 0.0189,
        "b_coeff": 2.89,
        "reason": "High-volume freshwater aquaculture staple across coastal and inland fish markets."
    },
    "hilsa": {
        "common_name": "Hilsa",
        "scientific_name": "Tenualosa ilisha",
        "family": "Clupeidae",
        "market_names": "Hilsa, Ilish, Palla",
        "target_image_count": 1000,
        "a_coeff": 0.0098,
        "b_coeff": 3.12,
        "reason": "Premium culinary delicacy in South Asia (Bay of Bengal / river estuaries); silvery, oily herring."
    },
    "mrigal": {
        "common_name": "Mrigal",
        "scientific_name": "Cirrhinus cirrhosus",
        "family": "Cyprinidae",
        "market_names": "Mrigal, Morakhi, Mirka",
        "target_image_count": 1000,
        "a_coeff": 0.0118,
        "b_coeff": 3.05,
        "reason": "Third major carp of the Indian polyculture triad; distinct slender body, bottom-feeder with golden fins."
    },
    "indian_mackerel": {
        "common_name": "Indian Mackerel / Bangda",
        "scientific_name": "Rastrelliger kanagurta",
        "family": "Scombridae",
        "market_names": "Bangda, Ayala, Bangude, Indian Mackerel",
        "target_image_count": 1000,
        "a_coeff": 0.0105,
        "b_coeff": 3.08,
        "reason": "Ubiquitous coastal marine fish; torpediform body, iridescent green-gold wavy dorsal lines, dark spots near pectoral fin."
    },
    "pomfret": {
        "common_name": "Pomfret / Paplet",
        "scientific_name": "Pampus argenteus / Parastromateus niger",
        "family": "Stromateidae / Carangidae",
        "market_names": "Silver Pomfret (White / Paplet), Black Pomfret (Halwa)",
        "target_image_count": 1000,
        "a_coeff": 0.0210,
        "b_coeff": 2.92,
        "reason": "Highly prized table fish across Indian coastal markets; distinct flat rhomboid/compressed body, silvery or dark slate coloration."
    }
}

# Freshness Classes
FRESHNESS_CLASSES = ["fresh", "moderate", "spoiled"]

# Image Preprocessing & Model Hyperparameters
IMAGE_SIZE = (224, 224)  # Standard input for MobileNetV3 / MobileNetV4 / EfficientNet-Lite
NORMALIZE_MEAN = [0.485, 0.456, 0.406]
NORMALIZE_STD = [0.229, 0.224, 0.225]

# Dataset Splits (70% Train, 15% Validation, 15% Test)
SPLIT_RATIOS = {
    "train": 0.70,
    "val": 0.15,
    "test": 0.15
}

RANDOM_SEED = 42
