import os
import sys
import hashlib
import shutil
import random
import csv
from pathlib import Path
from collections import defaultdict
from PIL import Image

import imagehash
import numpy as np

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

try:
    from .config import (
        RAW_SPECIES_DIR,
        PROCESSED_SPECIES_DIR,
        SPECIES_TRAIN_DIR,
        SPECIES_VAL_DIR,
        SPECIES_TEST_DIR,
        REPORTS_DIR,
        TARGET_SPECIES,
        SPLIT_RATIOS,
        RANDOM_SEED
    )
except ImportError:
    from config import (
        RAW_SPECIES_DIR,
        PROCESSED_SPECIES_DIR,
        SPECIES_TRAIN_DIR,
        SPECIES_VAL_DIR,
        SPECIES_TEST_DIR,
        REPORTS_DIR,
        TARGET_SPECIES,
        SPLIT_RATIOS,
        RANDOM_SEED
    )


def compute_md5(filepath: Path) -> str:
    hasher = hashlib.md5()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def compute_hashes(filepath: Path):
    """Computes MD5, 64-bit pHash, and 64-bit dHash for an image."""
    md5 = compute_md5(filepath)
    with Image.open(filepath) as img:
        img_rgb = img.convert("RGB")
        phash = str(imagehash.phash(img_rgb, hash_size=8))
        dhash = str(imagehash.dhash(img_rgb, hash_size=8))
        width, height = img.size
    return md5, phash, dhash, width, height


def cluster_near_duplicates(samples, hamming_threshold: int = 6):
    """
    Groups samples with pHash Hamming distance <= threshold into the same observation cluster.
    Prevents photos of the same physical fish / session from leaking across train/val/test splits.
    """
    n = len(samples)
    parent = list(range(n))

    def find(i):
        if parent[i] == i:
            return i
        parent[i] = find(parent[i])
        return parent[i]

    def union(i, j):
        root_i = find(i)
        root_j = find(j)
        if root_i != root_j:
            parent[root_i] = root_j

    # Compute pairwise Hamming distances within the species
    phash_objs = [imagehash.hex_to_hash(s["phash"]) for s in samples]

    for i in range(n):
        for j in range(i + 1, n):
            dist = phash_objs[i] - phash_objs[j]
            if dist <= hamming_threshold:
                union(i, j)

    # Group into clusters
    clusters = defaultdict(list)
    for i in range(n):
        root = find(i)
        clusters[root].append(samples[i])

    return list(clusters.values())


def run_provenance_and_group_split(hamming_threshold: int = 6):
    """
    Audits raw images, performs pHash deduplication, groups near-duplicates,
    and executes strict Group-Stratified 70/15/15 splitting.
    """
    random.seed(RANDOM_SEED)
    np.random.seed(RANDOM_SEED)

    print("========================================================")
    print("  STEP 1: PROVENANCE, PHASH DEDUPLICATION & GROUP SPLIT  ")
    print(f"  pHash Hamming Distance Threshold: {hamming_threshold}")
    print("========================================================")

    # Clean destination directories
    for split_dir in [SPECIES_TRAIN_DIR, SPECIES_VAL_DIR, SPECIES_TEST_DIR]:
        if split_dir.exists():
            shutil.rmtree(split_dir)
        split_dir.mkdir(parents=True, exist_ok=True)

    species_folders = [d for d in RAW_SPECIES_DIR.iterdir() if d.is_dir()]
    
    total_raw_scanned = 0
    total_exact_duplicates = 0
    total_near_duplicates_found = 0
    valid_unique_images = 0

    all_species_clusters = {}
    metadata_records = []

    print("\nExtracting image hashes and provenance...")
    for sp_dir in species_folders:
        sp_key = sp_dir.name
        samples = []
        seen_md5 = set()

        for fpath in sp_dir.iterdir():
            if fpath.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp", ".bmp"}:
                continue
            total_raw_scanned += 1

            try:
                md5, phash, dhash, width, height = compute_hashes(fpath)
            except Exception as e:
                print(f"  [!] Corrupt file excluded: {fpath.name} ({e})")
                continue

            # Exact duplicate check
            if md5 in seen_md5:
                total_exact_duplicates += 1
                continue
            seen_md5.add(md5)

            samples.append({
                "source_path": fpath,
                "filename": fpath.name,
                "species": sp_key,
                "md5": md5,
                "phash": phash,
                "dhash": dhash,
                "width": width,
                "height": height
            })

        # Cluster near-duplicates by pHash
        clusters = cluster_near_duplicates(samples, hamming_threshold=hamming_threshold)
        all_species_clusters[sp_key] = clusters

        num_near_dups = sum(len(c) - 1 for c in clusters if len(c) > 1)
        total_near_duplicates_found += num_near_dups
        valid_unique_images += len(samples)

        print(f"  • {sp_key:18s}: {len(samples):3d} unique images in {len(clusters):3d} observation clusters ({num_near_dups} near-duplicates grouped)")

    print(f"\nAudit Totals:")
    print(f"  - Total Raw Files Scanned:       {total_raw_scanned}")
    print(f"  - Exact Bit-for-Bit Duplicates:  {total_exact_duplicates}")
    print(f"  - Near-Duplicate Pairs Grouped:  {total_near_duplicates_found}")
    print(f"  - Total Independent Clusters:    {sum(len(c) for c in all_species_clusters.values())}")
    print(f"  - Total Usable Images:           {valid_unique_images}")

    # Group-Stratified 70 / 15 / 15 Split (by cluster / observation group)
    split_counts = defaultdict(lambda: defaultdict(int))
    split_cluster_counts = defaultdict(lambda: defaultdict(int))

    train_ratio = SPLIT_RATIOS["train"]
    val_ratio = SPLIT_RATIOS["val"]

    for sp_key, clusters in all_species_clusters.items():
        random.shuffle(clusters)
        
        # Partition clusters so whole clusters go together
        n_clusters = len(clusters)
        n_train_cl = max(1, int(round(n_clusters * train_ratio)))
        n_val_cl = max(1, int(round(n_clusters * val_ratio)))
        n_test_cl = n_clusters - n_train_cl - n_val_cl
        if n_test_cl < 1:
            n_test_cl = 1
            n_train_cl -= 1

        train_clusters = clusters[:n_train_cl]
        val_clusters = clusters[n_train_cl:n_train_cl + n_val_cl]
        test_clusters = clusters[n_train_cl + n_val_cl:]

        for split_name, split_cl_set in [("train", train_clusters), ("val", val_clusters), ("test", test_clusters)]:
            dest_dir = PROCESSED_SPECIES_DIR / split_name / sp_key
            dest_dir.mkdir(parents=True, exist_ok=True)

            for group_idx, cluster in enumerate(split_cl_set, 1):
                group_id = f"{sp_key}_{split_name}_grp{group_idx:03d}"
                split_cluster_counts[split_name][sp_key] += 1

                for sample in cluster:
                    dest_file = dest_dir / sample["filename"]
                    shutil.copy2(sample["source_path"], dest_file)

                    split_counts[split_name][sp_key] += 1
                    metadata_records.append({
                        "filename": sample["filename"],
                        "species": sp_key,
                        "split": split_name,
                        "observation_group_id": group_id,
                        "cluster_size": len(cluster),
                        "relative_path": f"{split_name}/{sp_key}/{sample['filename']}",
                        "width": sample["width"],
                        "height": sample["height"],
                        "md5_hash": sample["md5"],
                        "phash": sample["phash"],
                        "dhash": sample["dhash"]
                    })

    # Save Provenance Metadata Manifest
    csv_path = PROCESSED_SPECIES_DIR / "metadata.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        fieldnames = [
            "filename", "species", "split", "observation_group_id",
            "cluster_size", "relative_path", "width", "height",
            "md5_hash", "phash", "dhash"
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(metadata_records)

    # Print Group-Stratified Summary Table
    print("\n========================================================================")
    print("      GROUP-STRATIFIED 70/15/15 SPLIT SUMMARY (LEAKAGE-FREE)")
    print("========================================================================")
    print(f"{'Species':<18} | {'Train Img(Grp)':<16} | {'Val Img(Grp)':<14} | {'Test Img(Grp)':<14} | {'Total Img':<10}")
    print("-" * 78)

    for sp in sorted(all_species_clusters.keys()):
        tr_img = split_counts["train"][sp]
        tr_grp = split_cluster_counts["train"][sp]
        va_img = split_counts["val"][sp]
        va_grp = split_cluster_counts["val"][sp]
        te_img = split_counts["test"][sp]
        te_grp = split_cluster_counts["test"][sp]
        tot = tr_img + va_img + te_img
        print(f"{sp:<18} | {tr_img:3d} ({tr_grp:2d} grps)    | {va_img:2d} ({va_grp:2d} grps)    | {te_img:2d} ({te_grp:2d} grps)    | {tot:4d}")

    print("-" * 78)
    tot_tr = sum(split_counts["train"].values())
    tot_va = sum(split_counts["val"].values())
    tot_te = sum(split_counts["test"].values())
    tot_all = tot_tr + tot_va + tot_te
    print(f"{'TOTAL':<18} | {tot_tr:3d} images       | {tot_va:2d} images       | {tot_te:2d} images       | {tot_all:4d}")
    print(f"\n[OK] Metadata manifest saved with complete pHash provenance: {csv_path}")
    print("========================================================================\n")

    return metadata_records


if __name__ == "__main__":
    run_provenance_and_group_split()
