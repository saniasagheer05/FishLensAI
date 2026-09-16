import os
import sys
import time
import requests
from pathlib import Path
from PIL import Image
from io import BytesIO

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

try:
    from .config import RAW_SPECIES_DIR, TARGET_SPECIES
except ImportError:
    from config import RAW_SPECIES_DIR, TARGET_SPECIES

SPECIES_TAXA = {
    "rohu": ["Labeo rohita"],
    "catla": ["Catla catla", "Gibelion catla"],
    "tilapia": ["Oreochromis niloticus", "Oreochromis mossambicus"],
    "hilsa": ["Tenualosa ilisha", "Hilsa kelee"],
    "mrigal": ["Cirrhinus cirrhosus", "Cirrhinus mrigala"],
    "indian_mackerel": ["Rastrelliger kanagurta", "Rastrelliger brachysoma"],
    "pomfret": ["Pampus argenteus", "Parastromateus niger", "Pampus chinensis"],
}

HEADERS = {
    "User-Agent": "FishLensAI-Research/1.0 (Mobile Fish Identification Model Development)"
}


def fetch_inaturalist_observations(scientific_name: str, target_count: int = 80):
    """Fetches real photographic observation URLs from iNaturalist API."""
    image_urls = []
    page = 1
    
    while len(image_urls) < target_count and page <= 5:
        url = (
            f"https://api.inaturalist.org/v1/observations?"
            f"taxon_name={requests.utils.quote(scientific_name)}&"
            f"photos=true&"
            f"per_page=50&"
            f"page={page}&"
            f"order=desc&order_by=votes"
        )
        try:
            resp = requests.get(url, headers=HEADERS, timeout=12)
            if resp.status_code != 200:
                break
            data = resp.json()
            results = data.get("results", [])
            if not results:
                break

            for obs in results:
                for photo in obs.get("photos", []):
                    img_url = photo.get("url")
                    if img_url:
                        # Convert square thumbnail to medium/original high-res
                        high_res = img_url.replace("square.jpg", "medium.jpg").replace("square.jpeg", "medium.jpeg")
                        if high_res not in image_urls:
                            image_urls.append(high_res)
                            if len(image_urls) >= target_count:
                                break
            page += 1
            time.sleep(0.4)
        except Exception as e:
            print(f"  [!] API error for {scientific_name}: {e}")
            break

    return image_urls


def download_and_validate_image(url: str, dest_path: Path) -> bool:
    """Downloads image and validates that it is a healthy, uncorrupted RGB image."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        if resp.status_code == 200:
            img = Image.open(BytesIO(resp.content)).convert("RGB")
            # Ensure reasonable resolution
            if img.width >= 100 and img.height >= 100:
                img.save(dest_path, "JPEG", quality=90)
                return True
    except Exception:
        pass
    return False


def fetch_all_species_data(target_per_species: int = 70):
    """Downloads authentic research-grade images for all 7 South Asian MVP species."""
    print("========================================================")
    print("   FETCHING REAL OBSERVATION DATASETS (iNaturalist/GBIF)")
    print("========================================================")
    
    # Wipe synthetic sample data
    if RAW_SPECIES_DIR.exists():
        import shutil
        shutil.rmtree(RAW_SPECIES_DIR)
    RAW_SPECIES_DIR.mkdir(parents=True, exist_ok=True)

    species_summary = {}

    for sp_key, taxon_names in SPECIES_TAXA.items():
        sp_info = TARGET_SPECIES[sp_key]
        dest_dir = RAW_SPECIES_DIR / sp_key
        dest_dir.mkdir(parents=True, exist_ok=True)

        print(f"\nSearching real photos for: {sp_info['common_name']} ({', '.join(taxon_names)})...")
        all_urls = []
        for taxon in taxon_names:
            urls = fetch_inaturalist_observations(taxon, target_count=target_per_species - len(all_urls))
            all_urls.extend(urls)
            if len(all_urls) >= target_per_species:
                break

        print(f"  Found {len(all_urls)} candidate observations. Downloading images...")
        saved_count = 0
        for idx, url in enumerate(all_urls, 1):
            dest_file = dest_dir / f"{sp_key}_real_{saved_count + 1:04d}.jpg"
            if download_and_validate_image(url, dest_file):
                saved_count += 1
                if saved_count >= target_per_species:
                    break
            time.sleep(0.15)

        species_summary[sp_key] = saved_count
        print(f"  [OK] Saved {saved_count} validated real images for {sp_info['common_name']}")

    print("\n========================================================")
    print("            REAL DATASET DOWNLOAD SUMMARY               ")
    print("========================================================")
    for sp_key, count in species_summary.items():
        print(f"  • {TARGET_SPECIES[sp_key]['common_name']:25s}: {count:4d} real images")
    print(f"  TOTAL REAL IMAGES ACQUIRED: {sum(species_summary.values())}")
    print("========================================================\n")


if __name__ == "__main__":
    fetch_all_species_data()
