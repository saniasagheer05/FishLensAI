import os
import sys
import json
import hashlib
from pathlib import Path
from collections import defaultdict
from PIL import Image

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

try:
    from .config import RAW_SPECIES_DIR, PROCESSED_SPECIES_DIR, REPORTS_DIR, TARGET_SPECIES, SPLIT_RATIOS
except ImportError:
    from config import RAW_SPECIES_DIR, PROCESSED_SPECIES_DIR, REPORTS_DIR, TARGET_SPECIES, SPLIT_RATIOS


def compute_file_hash(filepath: Path) -> str:
    """Compute MD5 hash of a file to detect duplicates."""
    hasher = hashlib.md5()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def audit_image_directory(directory_path: Path, dataset_name: str = "Species Dataset"):
    """
    Audits an image directory for:
    1. Valid readable image files vs corrupt files.
    2. File size & resolution distribution.
    3. Duplicate detection via MD5 hashing.
    4. Segmentation mask / ground-truth pollution detection.
    5. Non-target class detection (e.g. Shrimp).
    6. Class imbalance analysis and recommended loss weights.
    """
    print(f"\n========================================================")
    print(f"       DATASET AUDIT: {dataset_name.upper()}")
    print(f"       Path: {directory_path}")
    print(f"========================================================")

    if not directory_path.exists():
        print(f"[!] Directory does not exist: {directory_path}")
        return {
            "status": "missing",
            "message": f"Directory not found: {directory_path}"
        }

    valid_extensions = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    
    total_files = 0
    valid_images = 0
    corrupted_images = []
    zero_byte_files = []
    mask_files = []
    non_fish_files = []
    
    hashes = {}
    duplicates = []
    
    species_counts = defaultdict(int)
    resolutions = []
    channels_dist = defaultdict(int)
    formats_dist = defaultdict(int)

    for root, _, files in os.walk(directory_path):
        for fname in files:
            total_files += 1
            fpath = Path(root) / fname
            ext = fpath.suffix.lower()

            if ext not in valid_extensions:
                continue

            # Check 1: Zero-byte file
            if fpath.stat().st_size == 0:
                zero_byte_files.append(str(fpath))
                continue

            # Check 2: Mask / GT detection
            name_lower = fpath.stem.lower()
            if "gt" in name_lower or "mask" in name_lower or "segmentation" in name_lower or "gt" in fpath.parent.name.lower():
                mask_files.append(str(fpath))
                continue

            # Check 3: Non-fish class detection
            if "shrimp" in fpath.parent.name.lower() or "shrimp" in name_lower:
                non_fish_files.append(str(fpath))
                continue

            # Check 4: Image verification & integrity
            try:
                with Image.open(fpath) as img:
                    img.verify()
                
                # Re-open to read dimensions & mode (verify closes the file)
                with Image.open(fpath) as img:
                    width, height = img.size
                    mode = img.mode
                    fmt = img.format
                    resolutions.append((width, height))
                    channels_dist[mode] += 1
                    formats_dist[fmt] += 1
                    
                    # Species class determination
                    class_name = fpath.parent.name.lower().replace(" ", "_")
                    species_counts[class_name] += 1
                    valid_images += 1

                # Check 5: Duplicate detection
                file_hash = compute_file_hash(fpath)
                if file_hash in hashes:
                    duplicates.append((str(fpath), hashes[file_hash]))
                else:
                    hashes[file_hash] = str(fpath)

            except Exception as e:
                corrupted_images.append({"file": str(fpath), "error": str(e)})

    # Calculate statistics
    widths = [r[0] for r in resolutions] if resolutions else [0]
    heights = [r[1] for r in resolutions] if resolutions else [0]
    
    # Class imbalance calculation
    counts_list = list(species_counts.values())
    if counts_list:
        max_count = max(counts_list)
        min_count = min(counts_list)
        imbalance_ratio = round(max_count / max(min_count, 1), 2)
        total_samples = sum(counts_list)
        num_classes = len(counts_list)
        # Standard balanced class weight: N / (C * N_c)
        class_weights = {
            cls: round(total_samples / (num_classes * count), 4)
            for cls, count in species_counts.items()
        }
    else:
        imbalance_ratio = 1.0
        class_weights = {}

    audit_summary = {
        "dataset_name": dataset_name,
        "directory": str(directory_path),
        "total_files_scanned": total_files,
        "valid_images": valid_images,
        "corrupted_count": len(corrupted_images),
        "corrupted_files": corrupted_images[:10],
        "zero_byte_count": len(zero_byte_files),
        "mask_files_detected": len(mask_files),
        "non_fish_files_detected": len(non_fish_files),
        "duplicate_count": len(duplicates),
        "unique_classes_count": len(species_counts),
        "class_distribution": dict(species_counts),
        "class_imbalance_ratio": imbalance_ratio,
        "recommended_class_weights": class_weights,
        "resolutions": {
            "min_width": min(widths),
            "max_width": max(widths),
            "avg_width": round(sum(widths) / len(widths), 1) if widths else 0,
            "min_height": min(heights),
            "max_height": max(heights),
            "avg_height": round(sum(heights) / len(heights), 1) if heights else 0,
        },
        "color_channels_distribution": dict(channels_dist),
        "image_formats": dict(formats_dist),
    }

    # Print Summary Report
    print(f"Total Files Scanned:       {total_files}")
    print(f"Valid Usable Images:       {valid_images}")
    print(f"Corrupted Images:          {len(corrupted_images)}")
    print(f"Mask/GT Files Filtered:    {len(mask_files)}")
    print(f"Non-Fish Files Filtered:   {len(non_fish_files)}")
    print(f"Duplicate Images Found:    {len(duplicates)}")
    print(f"Detected Classes ({len(species_counts)}):")
    for cls, cnt in sorted(species_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  - {cls:25s}: {cnt:5d} images (Weight: {class_weights.get(cls, 1.0):.4f})")
    print(f"Class Imbalance Ratio:     {imbalance_ratio}:1")
    if resolutions:
        print(f"Resolution Range:          {min(widths)}x{min(heights)} to {max(widths)}x{max(heights)} (Avg: {audit_summary['resolutions']['avg_width']}x{audit_summary['resolutions']['avg_height']})")
    print("========================================================\n")

    return audit_summary


def run_full_audit():
    """Runs audit on both raw and processed datasets."""
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    results = {}
    
    # 1. Audit Raw Species Data
    raw_results = audit_image_directory(RAW_SPECIES_DIR, "Raw Species Dataset")
    results["raw_species"] = raw_results

    # 2. Audit Processed Species Data (Train / Val / Test)
    if PROCESSED_SPECIES_DIR.exists():
        for split in ["train", "val", "test"]:
            split_dir = PROCESSED_SPECIES_DIR / split
            if split_dir.exists():
                results[f"processed_{split}"] = audit_image_directory(
                    split_dir, f"Processed Species ({split.upper()} Set)"
                )

    # Save to JSON
    report_path = REPORTS_DIR / "dataset_stats.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print(f"[OK] Audit results exported to: {report_path}")
    return results


if __name__ == "__main__":
    run_full_audit()
