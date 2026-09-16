import os
import sys
import random
from pathlib import Path
from PIL import Image, ImageDraw

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

try:
    from .config import RAW_SPECIES_DIR, TARGET_SPECIES
except ImportError:
    from config import RAW_SPECIES_DIR, TARGET_SPECIES


def generate_sample_dataset(samples_per_class: int = 40):
    """
    Generates synthetic sample fish images for each South Asian target MVP species:
    1. Rohu (Labeo rohita)
    2. Catla (Catla catla)
    3. Tilapia (Oreochromis niloticus)
    4. Hilsa (Tenualosa ilisha)
    5. Mrigal (Cirrhinus cirrhosus)
    6. Indian Mackerel / Bangda (Rastrelliger kanagurta)
    7. Pomfret / Paplet (Pampus argenteus / Parastromateus niger)
    """
    print(f"Generating verification dataset ({samples_per_class} unique images/class)...")
    RAW_SPECIES_DIR.mkdir(parents=True, exist_ok=True)

    species_palettes = {
        "rohu": {
            "body": (140, 150, 160),      # Silvery blue-gray
            "fin": (190, 80, 70),          # Reddish-orange fins
            "shape": "elongated_carp"
        },
        "catla": {
            "body": (105, 115, 125),      # Deep grayish-black
            "fin": (90, 100, 110),
            "shape": "deep_body_big_head"
        },
        "tilapia": {
            "body": (95, 120, 110),       # Olive dark gray with bands
            "fin": (120, 140, 130),
            "shape": "oval_cichlid"
        },
        "hilsa": {
            "body": (210, 220, 230),      # Bright silver with iridescent sheen
            "fin": (180, 190, 200),
            "shape": "streamlined_clupeid"
        },
        "mrigal": {
            "body": (150, 145, 135),      # Dark copper-gray with golden tinge
            "fin": (215, 120, 60),         # Bright orange-gold fins
            "shape": "slender_bottom_carp"
        },
        "indian_mackerel": {
            "body": (75, 145, 135),       # Greenish-blue metallic with stripes
            "fin": (160, 180, 170),
            "shape": "torpedo_scombrid"
        },
        "pomfret": {
            "body": (220, 225, 235),      # Bright silver-white flat rhomboid
            "fin": (175, 185, 195),
            "shape": "flat_rhomboid"
        }
    }

    for sp_key, sp_info in TARGET_SPECIES.items():
        sp_dir = RAW_SPECIES_DIR / sp_key
        sp_dir.mkdir(parents=True, exist_ok=True)

        palette = species_palettes.get(sp_key, {
            "body": (130, 140, 150),
            "fin": (150, 150, 150),
            "shape": "standard"
        })

        base_r, base_g, base_b = palette["body"]
        fin_r, fin_g, fin_b = palette["fin"]

        for i in range(1, samples_per_class + 1):
            r = min(255, max(0, base_r + (i * 3) % 30 - 15))
            g = min(255, max(0, base_g + (i * 5) % 30 - 15))
            b = min(255, max(0, base_b + (i * 7) % 30 - 15))
            body_color = (r, g, b)
            fin_color = (fin_r, fin_g, fin_b)

            img = Image.new("RGB", (256, 256), color=(248 + (i % 6), 246, 242 + (i % 5)))
            draw = ImageDraw.Draw(img)

            dx = (i % 7) - 3
            dy = (i % 5) - 2

            # Morphological variations
            if sp_key == "pomfret":
                # Diamond / flat rhomboid body
                draw.polygon([
                    (128 + dx, 55 + dy),
                    (215 + dx, 128 + dy),
                    (128 + dx, 200 + dy),
                    (45 + dx, 128 + dy)
                ], fill=body_color, outline=(50, 50, 50), width=2)
                # Forked tail
                draw.polygon([(45 + dx, 128 + dy), (15, 95 + dy), (25, 128 + dy), (15, 160 + dy)], fill=fin_color)
                # Eye
                draw.ellipse([185 + dx, 118 + dy, 197 + dx, 130 + dy], fill=(255, 255, 255), outline=(0, 0, 0))
                draw.ellipse([189 + dx, 122 + dy, 193 + dx, 126 + dy], fill=(0, 0, 0))
            elif sp_key == "catla":
                # Deep body + huge head
                draw.ellipse([45 + dx, 75 + dy, 215 + dx, 185 + dy], fill=body_color, outline=(40, 40, 40), width=2)
                draw.polygon([(45 + dx, 130 + dy), (15, 95 + dy), (15, 165 + dy)], fill=fin_color)
                draw.ellipse([175 + dx, 105 + dy, 195 + dx, 125 + dy], fill=(255, 255, 255), outline=(0, 0, 0))
                draw.ellipse([181 + dx, 111 + dy, 189 + dx, 119 + dy], fill=(0, 0, 0))
            elif sp_key == "mrigal" or sp_key == "indian_mackerel":
                # Slender torpedo body
                draw.ellipse([35 + dx, 100 + dy, 220 + dx, 160 + dy], fill=body_color, outline=(40, 40, 40), width=2)
                draw.polygon([(35 + dx, 130 + dy), (10, 105 + dy), (10, 155 + dy)], fill=fin_color)
                draw.ellipse([185 + dx, 118 + dy, 197 + dx, 130 + dy], fill=(255, 255, 255), outline=(0, 0, 0))
                draw.ellipse([189 + dx, 122 + dy, 193 + dx, 126 + dy], fill=(0, 0, 0))
            else:
                # Classic Rohu / Tilapia / Hilsa profile
                draw.ellipse([40 + dx, 88 + dy, 215 + dx, 172 + dy], fill=body_color, outline=(40, 40, 40), width=2)
                draw.polygon([(40 + dx, 130 + dy), (12, 100 + dy), (12, 160 + dy)], fill=fin_color)
                draw.ellipse([182 + dx, 114 + dy, 194 + dx, 126 + dy], fill=(255, 255, 255), outline=(0, 0, 0))
                draw.ellipse([186 + dx, 118 + dy, 190 + dx, 122 + dy], fill=(0, 0, 0))

            # Identifier text for visual inspection
            draw.text((15, 12), f"{sp_info['common_name']} #{i}", fill=(110, 110, 110))

            filename = f"{sp_key}_{i:04d}.png"
            img.save(sp_dir / filename)

        # Verification mask file
        mask_file = sp_dir / f"{sp_key}_GT_0001.png"
        mask_img = Image.new("L", (256, 256), color=0)
        mask_draw = ImageDraw.Draw(mask_img)
        mask_draw.ellipse([40, 90, 210, 170], fill=255)
        mask_img.save(mask_file)

    print(f"[OK] Generated {len(TARGET_SPECIES) * samples_per_class} unique verification samples across {len(TARGET_SPECIES)} classes in: {RAW_SPECIES_DIR}")


if __name__ == "__main__":
    generate_sample_dataset()
