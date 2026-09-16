import os
import sys
import time
import json
import hashlib
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

CARP_TAXONOMY = {
    "catla": [
        {"taxon": "Catla catla", "canonical": "catla"},
        {"taxon": "Gibelion catla", "canonical": "catla"}
    ],
    "mrigal": [
        {"taxon": "Cirrhinus mrigala", "canonical": "mrigal"},
        {"taxon": "Cirrhinus cirrhosus", "canonical": "mrigal"},
        {"taxon": "Cirrhinus reba", "canonical": "mrigal"}
    ],
    "rohu": [
        {"taxon": "Labeo rohita", "canonical": "rohu"},
        {"taxon": "Labeo calbasu", "canonical": "rohu"},
        {"taxon": "Labeo bata", "canonical": "rohu"}
    ]
}

HEADERS = {
    "User-Agent": "FishLensAI-CarpExpansion/2.0 (Mobile Fish Model Research; contact: sania.sagheer@fishlens.ai)"
}


def robust_get(url: str, max_retries: int = 4):
    for attempt in range(max_retries):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            if resp.status_code == 200:
                return resp
        except Exception:
            time.sleep(1.0 * (attempt + 1))
    return None


def download_image(url: str) -> Image.Image:
    resp = robust_get(url, max_retries=3)
    if resp and len(resp.content) > 3000:
        try:
            img = Image.open(BytesIO(resp.content)).convert("RGB")
            if img.width >= 120 and img.height >= 120:
                return img
        except Exception:
            pass
    return None


def fetch_carps_with_retries():
    print("========================================================")
    print("   FETCHING CARP IMAGES (WITH ROBUST RETRIES & LOGGING) ")
    print("========================================================")

    all_downloaded = []

    for sp_key, taxa_list in CARP_TAXONOMY.items():
        sp_dir = RAW_SPECIES_DIR / sp_key
        sp_dir.mkdir(parents=True, exist_ok=True)
        sp_new = 0

        for item in taxa_list:
            taxon_name = item["taxon"]
            print(f"\n[iNaturalist] Querying {taxon_name} for {sp_key}...")

            page = 1
            while page <= 8:
                url = (
                    f"https://api.inaturalist.org/v1/observations?"
                    f"taxon_name={requests.utils.quote(taxon_name)}&"
                    f"photos=true&per_page=100&page={page}&order=desc&order_by=votes"
                )
                resp = robust_get(url)
                if not resp:
                    break
                try:
                    data = resp.json()
                except Exception:
                    break

                observations = data.get("results", [])
                if not observations:
                    break

                for obs in observations:
                    obs_id = obs.get("id")
                    user_login = obs.get("user", {}).get("login", "unknown")
                    license_code = obs.get("license_code", "CC-BY")
                    photos = obs.get("photos", [])

                    for p_idx, photo in enumerate(photos):
                        p_id = photo.get("id", p_idx)
                        photo_url = photo.get("url", "")
                        if not photo_url:
                            continue

                        high_res = photo_url.replace("square.jpg", "large.jpg").replace("square.jpeg", "large.jpeg")
                        if "large" not in high_res:
                            high_res = photo_url.replace("square.jpg", "medium.jpg").replace("square.jpeg", "medium.jpeg")

                        dest_name = f"{sp_key}_inat_{obs_id}_{p_id}.jpg"
                        dest_path = sp_dir / dest_name

                        if dest_path.exists():
                            continue

                        img = download_image(high_res)
                        if img:
                            img.save(dest_path, "JPEG", quality=92)
                            sp_new += 1
                            all_downloaded.append({
                                "filename": dest_name,
                                "species": sp_key,
                                "source": "inaturalist",
                                "observation_id": f"inat_{obs_id}",
                                "photographer": user_login,
                                "license": license_code,
                                "original_taxon": taxon_name,
                                "url": high_res
                            })
                            time.sleep(0.05)

                page += 1
                time.sleep(0.3)

            # Also query GBIF for this taxon
            print(f"[GBIF] Querying {taxon_name} for {sp_key}...")
            offset = 0
            while offset < 200:
                gbif_url = (
                    f"https://api.gbif.org/v1/occurrence/search?"
                    f"scientificName={requests.utils.quote(taxon_name)}&"
                    f"mediaType=StillImage&limit=50&offset={offset}"
                )
                resp = robust_get(gbif_url)
                if not resp:
                    break
                try:
                    data = resp.json()
                except Exception:
                    break

                occurrences = data.get("results", [])
                if not occurrences:
                    break

                for occ in occurrences:
                    occ_id = occ.get("key")
                    recorded_by = occ.get("recordedBy", "unknown")
                    license_val = occ.get("license", "CC-BY")
                    media_items = occ.get("media", [])

                    for m_idx, media in enumerate(media_items):
                        if media.get("type") != "StillImage":
                            continue
                        media_url = media.get("identifier")
                        if not media_url:
                            continue

                        dest_name = f"{sp_key}_gbif_{occ_id}_{m_idx}.jpg"
                        dest_path = sp_dir / dest_name

                        if dest_path.exists():
                            continue

                        img = download_image(media_url)
                        if img:
                            img.save(dest_path, "JPEG", quality=92)
                            sp_new += 1
                            all_downloaded.append({
                                "filename": dest_name,
                                "species": sp_key,
                                "source": "gbif",
                                "observation_id": f"gbif_{occ_id}",
                                "photographer": recorded_by,
                                "license": license_val,
                                "original_taxon": taxon_name,
                                "url": media_url
                            })
                            time.sleep(0.05)

                offset += 50
                time.sleep(0.3)

        print(f"[OK] Total new images collected for {sp_key}: {sp_new}")

    print(f"\nCompleted carp expansion. Total new downloads in this run: {len(all_downloaded)}")


if __name__ == "__main__":
    fetch_carps_with_retries()
