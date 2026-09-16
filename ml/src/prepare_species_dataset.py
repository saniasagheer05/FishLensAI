import os
import sys
import shutil
import random
import csv
from pathlib import Path
from collections import defaultdict
from PIL import Image

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

try:
    from .config import (
        RAW_SPECIES_DIR,
        PROCESSED_SPECIES_DIR,
        SPECIES_TRAIN_DIR,
        SPECIES_VAL_DIR,
        SPECIES_TEST_DIR,
        TARGET_SPECIES,
        SPLIT_RATIOS,
        RANDOM_SEED
    )
    from .audit_dataset import compute_file_hash
except ImportError:
    from config import (
        RAW_SPECIES_DIR,
        PROCESSED_SPECIES_DIR,
        SPECIES_TRAIN_DIR,
        SPECIES_VAL_DIR,
        SPECIES_TEST_DIR,
        TARGET_SPECIES,
        SPLIT_RATIOS,
        RANDOM_SEED
    )
    from audit_dataset import compute_file_hash


def normalize_class_name(folder_name: str) -> str:
    """
    Normalize folder/class name to standard target keys for
    India / South Asian species.
    """
    cleaned = folder_name.lower().replace("-", "_").replace(" ", "_").strip()
    mapping = {
        # Rohu
        "rohu": "rohu",
        "rui": "rohu",
        "labeo_rohita": "rohu",
        "labeo": "rohu",
        # Catla
        "catla": "catla",
        "katla": "catla",
        "bhakur": "catla",
        "catla_catla": "catla",
        "gibelion_catla": "catla",
        # Tilapia
        "tilapia": "tilapia",
        "nile_tilapia": "tilapia",
        "oreochromis_niloticus": "tilapia",
        "oreochromis": "tilapia",
        # Hilsa
        "hilsa": "hilsa",
        "ilish": "hilsa",
        "palla": "hilsa",
        "tenualosa_ilisha": "hilsa",
        "tenualosa": "hilsa",
        # Mrigal
        "mrigal": "mrigal",
        "mrigala": "mrigal",
        "morakhi": "mrigal",
        "mrigal_carp": "mrigal",
        "cirrhinus_cirrhosus": "mrigal",
        "cirrhinus_mrigala": "mrigal",
        # Indian Mackerel / Bangda
        "indian_mackerel": "indian_mackerel",
        "bangda": "indian_mackerel",
        "ayala": "indian_mackerel",
        "bangude": "indian_mackerel",
        "rastrelliger_kanagurta": "indian_mackerel",
        "mackerel": "indian_mackerel",
        # Pomfret
        "pomfret": "pomfret",
        "silver_pomfret": "pomfret",
        "white_pomfret": "pomfret",
        "black_pomfret": "pomfret",
        "paplet": "pomfret",
        "halwa": "pomfret",
        "pampus_argenteus": "pomfret",
        "parastromateus_niger": "pomfret",
    }
    return mapping.get(cleaned, cleaned)


def prepare_dataset():
    """
    Cleans raw species dataset and splits into stratified Train (70%), Val (15%), Test (15%).
    Filters out masks, non-fish images, zero-byte files, and duplicate hashes.
    """
    random.seed(RANDOM_SEED)

    print("========================================================")
    print("      PREPARING AND SPLITTING SPECIES DATASET")
    print("      Focus: India & South Asian Common Species")
    print("========================================================")

    if not RAW_SPECIES_DIR.exists():
        RAW_SPECIES_DIR.mkdir(parents=True, exist_ok=True)
        print(f"[!] Raw species directory is empty: {RAW_SPECIES_DIR}")
        print("Please place your downloaded fish dataset in this directory.")
        return

    # Clean destination directories
    for split_dir in [SPECIES_TRAIN_DIR, SPECIES_VAL_DIR, SPECIES_TEST_DIR]:
        if split_dir.exists():
            shutil.rmtree(split_dir)
        split_dir.mkdir(parents=True, exist_ok=True)

    valid_extensions = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    species_samples = defaultdict(list)
    seen_hashes = set()
    filtered_masks = 0
    filtered_duplicates = 0
    filtered_corrupt = 0
    filtered_non_fish = 0

    print("Scanning and verifying raw images...")
    for root, _, files in os.walk(RAW_SPECIES_DIR):
        for fname in files:
            fpath = Path(root) / fname
            ext = fpath.suffix.lower()

            if ext not in valid_extensions:
                continue

            # Filter masks / GT
            name_lower = fpath.stem.lower()
            parent_lower = fpath.parent.name.lower()
            if "gt" in name_lower or "mask" in name_lower or "gt" in parent_lower:
                filtered_masks += 1
                continue

            # Filter non-fish
            if "shrimp" in parent_lower or "shrimp" in name_lower or "crab" in parent_lower:
                filtered_non_fish += 1
                continue

            # Validate Image Integrity
            try:
                with Image.open(fpath) as img:
                    img.verify()
                with Image.open(fpath) as img:
                    w, h = img.size
            except Exception:
                filtered_corrupt += 1
                continue

            # Check duplicate hash
            file_hash = compute_file_hash(fpath)
            if file_hash in seen_hashes:
                filtered_duplicates += 1
                continue
            seen_hashes.add(file_hash)

            # Assign species
            cls_key = normalize_class_name(fpath.parent.name)
            species_samples[cls_key].append({
                "source_path": fpath,
                "filename": fname,
                "species": cls_key,
                "width": w,
                "height": h,
                "hash": file_hash
            })

    print(f"\nFiltering Summary:")
    print(f"  - Mask files filtered:        {filtered_masks}")
    print(f"  - Non-fish files filtered:    {filtered_non_fish}")
    print(f"  - Duplicate images filtered:  {filtered_duplicates}")
    print(f"  - Corrupted files filtered:   {filtered_corrupt}")

    if not species_samples:
        print("\n[!] No valid raw images found to split.")
        print(f"Place dataset in: {RAW_SPECIES_DIR.resolve()}")
        return

    # Perform Stratified 70/15/15 Split
    metadata_records = []
    split_counts = defaultdict(lambda: defaultdict(int))

    train_ratio = SPLIT_RATIOS["train"]
    val_ratio = SPLIT_RATIOS["val"]

    for species, samples in species_samples.items():
        random.shuffle(samples)
        n = len(samples)
        n_train = int(n * train_ratio)
        n_val = int(n * val_ratio)
        n_test = n - n_train - n_val

        train_samples = samples[:n_train]
        val_samples = samples[n_train:n_train + n_val]
        test_samples = samples[n_train + n_val:]

        for split_name, split_set in [("train", train_samples), ("val", val_samples), ("test", test_samples)]:
            dest_dir = PROCESSED_SPECIES_DIR / split_name / species
            dest_dir.mkdir(parents=True, exist_ok=True)

            for sample in split_set:
                dest_file = dest_dir / sample["filename"]
                shutil.copy2(sample["source_path"], dest_file)

                split_counts[split_name][species] += 1
                metadata_records.append({
                    "filename": sample["filename"],
                    "species": species,
                    "split": split_name,
                    "relative_path": f"{split_name}/{species}/{sample['filename']}",
                    "width": sample["width"],
                    "height": sample["height"],
                    "md5_hash": sample["hash"]
                })

    # Write metadata.csv
    csv_path = PROCESSED_SPECIES_DIR / "metadata.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        fieldnames = ["filename", "species", "split", "relative_path", "width", "height", "md5_hash"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(metadata_records)

    # Print Table
    print("\n========================================================")
    print("           STRATIFIED SPLIT SUMMARY (70/15/15)          ")
    print("========================================================")
    print(f"{'Species':<22} | {'Train (70%)':<12} | {'Val (15%)':<10} | {'Test (15%)':<10} | {'Total':<8}")
    print("-" * 72)
    for sp in sorted(species_samples.keys()):
        tr = split_counts["train"][sp]
        va = split_counts["val"][sp]
        te = split_counts["test"][sp]
        tot = tr + va + te
        print(f"{sp:<22} | {tr:<12} | {va:<10} | {te:<10} | {tot:<8}")

    print("-" * 72)
    total_tr = sum(split_counts["train"].values())
    total_va = sum(split_counts["val"].values())
    total_te = sum(split_counts["test"].values())
    print(f"{'TOTAL':<22} | {total_tr:<12} | {total_va:<10} | {total_te:<10} | {total_tr + total_va + total_te:<8}")
    print(f"\n[OK] Processed dataset saved to: {PROCESSED_SPECIES_DIR}")
    print(f"[OK] Metadata manifest saved to: {csv_path}")


if __name__ == "__main__":
    prepare_dataset()
