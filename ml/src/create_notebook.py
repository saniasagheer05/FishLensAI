import json
from pathlib import Path

notebook = {
  "cells": [
    {
      "cell_type": "markdown",
      "metadata": {},
      "source": [
        "# 🐟 FishLensAI — Milestone 2: Dataset Audit & Preparation (South Asian MVP Species)\n",
        "This notebook executes the complete data audit, cleaning, de-duplication, and stratified 70/15/15 train/val/test splitting for the **FishLensAI** mobile fish species classification model, configured specifically for common Indian and South Asian catch species:\n",
        "1. **Rohu** (*Labeo rohita*)\n",
        "2. **Catla** (*Catla catla*)\n",
        "3. **Tilapia** (*Oreochromis niloticus*)\n",
        "4. **Hilsa** (*Tenualosa ilisha*)\n",
        "5. **Mrigal** (*Cirrhinus cirrhosus*)\n",
        "6. **Indian Mackerel / Bangda** (*Rastrelliger kanagurta*)\n",
        "7. **Pomfret / Paplet** (*Pampus argenteus* / *Parastromateus niger*)"
      ]
    },
    {
      "cell_type": "code",
      "execution_count": None,
      "metadata": {},
      "outputs": [],
      "source": [
        "# Step 1: Imports and System Check\n",
        "import os\n",
        "import sys\n",
        "import json\n",
        "from pathlib import Path\n",
        "import numpy as np\n",
        "from PIL import Image\n",
        "import matplotlib.pyplot as plt\n",
        "\n",
        "src_path = Path(\"../src\").resolve()\n",
        "if str(src_path) not in sys.path:\n",
        "    sys.path.append(str(src_path))\n",
        "\n",
        "from config import TARGET_SPECIES, RAW_SPECIES_DIR, PROCESSED_SPECIES_DIR, SPLIT_RATIOS\n",
        "from audit_dataset import audit_image_directory, run_full_audit\n",
        "from prepare_species_dataset import prepare_dataset\n",
        "from generate_sample_dataset import generate_sample_dataset\n",
        "\n",
        "print(\"Configuration loaded successfully.\")\n",
        "print(f\"Target species count: {len(TARGET_SPECIES)}\")"
      ]
    },
    {
      "cell_type": "markdown",
      "metadata": {},
      "source": [
        "## 2. Selected Target Species\n",
        "Table of 7 South Asian MVP species with taxonomy and market names:"
      ]
    },
    {
      "cell_type": "code",
      "execution_count": None,
      "metadata": {},
      "outputs": [],
      "source": [
        "import pandas as pd\n",
        "species_df = pd.DataFrame([\n",
        "    {\n",
        "        \"Species Key\": k,\n",
        "        \"Common Market Name\": v[\"common_name\"],\n",
        "        \"Scientific Name\": v[\"scientific_name\"],\n",
        "        \"Family\": v[\"family\"],\n",
        "        \"Regional Names\": v[\"market_names\"],\n",
        "        \"Target Samples\": v[\"target_image_count\"],\n",
        "        \"Allometric Coefficients\": f\"a={v['a_coeff']}, b={v['b_coeff']}\"\n",
        "    }\n",
        "    for k, v in TARGET_SPECIES.items()\n",
        "])\n",
        "species_df"
      ]
    },
    {
      "cell_type": "markdown",
      "metadata": {},
      "source": [
        "## 3. Generate Verification Samples (or inspect raw downloaded data)"
      ]
    },
    {
      "cell_type": "code",
      "execution_count": None,
      "metadata": {},
      "outputs": [],
      "source": [
        "generate_sample_dataset(samples_per_class=40)"
      ]
    },
    {
      "cell_type": "markdown",
      "metadata": {},
      "source": [
        "## 4. Run Data Audit & Integrity Check"
      ]
    },
    {
      "cell_type": "code",
      "execution_count": None,
      "metadata": {},
      "outputs": [],
      "source": [
        "raw_audit = audit_image_directory(RAW_SPECIES_DIR, \"Raw Species Dataset\")"
      ]
    },
    {
      "cell_type": "markdown",
      "metadata": {},
      "source": [
        "## 5. Clean, De-duplicate, and Split (70% Train, 15% Val, 15% Test)"
      ]
    },
    {
      "cell_type": "code",
      "execution_count": None,
      "metadata": {},
      "outputs": [],
      "source": [
        "prepare_dataset()"
      ]
    },
    {
      "cell_type": "markdown",
      "metadata": {},
      "source": [
        "## 6. Post-Split Audit and Verification"
      ]
    },
    {
      "cell_type": "code",
      "execution_count": None,
      "metadata": {},
      "outputs": [],
      "source": [
        "full_results = run_full_audit()"
      ]
    }
  ],
  "metadata": {
    "kernelspec": {
      "display_name": "Python 3",
      "language": "python",
      "name": "python3"
    },
    "language_info": {
      "name": "python",
      "version": "3.10.0"
    }
  },
  "nbformat": 4,
  "nbformat_minor": 4
}

out_path = Path("ml/notebooks/01_dataset_audit_and_prep.ipynb")
out_path.parent.mkdir(parents=True, exist_ok=True)
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(notebook, f, indent=2)

print(f"[OK] Successfully updated notebook: {out_path}")
