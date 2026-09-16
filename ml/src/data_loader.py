import os
from pathlib import Path
from typing import Tuple, Dict, Optional
from PIL import Image

try:
    import torch
    from torch.utils.data import Dataset, DataLoader
    from torchvision import transforms
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

try:
    from .config import (
        PROCESSED_SPECIES_DIR,
        SPECIES_TRAIN_DIR,
        SPECIES_VAL_DIR,
        SPECIES_TEST_DIR,
        IMAGE_SIZE,
        NORMALIZE_MEAN,
        NORMALIZE_STD
    )
except ImportError:
    from config import (
        PROCESSED_SPECIES_DIR,
        SPECIES_TRAIN_DIR,
        SPECIES_VAL_DIR,
        SPECIES_TEST_DIR,
        IMAGE_SIZE,
        NORMALIZE_MEAN,
        NORMALIZE_STD
    )


def get_mobile_transforms():
    """
    Returns image transformation pipelines for mobile model training.
    
    Training Augmentations:
    - RandomResizedCrop(224, scale=(0.8, 1.0)): Simulates distance variation from fish.
    - RandomHorizontalFlip(p=0.5): Fish can face left or right.
    - RandomRotation(degrees=15): Fish caught at slight angles.
    - ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2): Varying dock/market lighting.
    - ToTensor & Normalize: Standardizes pixel values to ImageNet statistics for MobileNet transfer learning.
    """
    if not TORCH_AVAILABLE:
        return None, None

    train_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomResizedCrop(IMAGE_SIZE, scale=(0.85, 1.0)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.05),
        transforms.ToTensor(),
        transforms.Normalize(mean=NORMALIZE_MEAN, std=NORMALIZE_STD)
    ])

    val_test_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.CenterCrop(IMAGE_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(mean=NORMALIZE_MEAN, std=NORMALIZE_STD)
    ])

    return train_transform, val_test_transform


if TORCH_AVAILABLE:
    class FishSpeciesDataset(Dataset):
        """PyTorch Dataset for Fish Species Classification."""
        def __init__(self, root_dir: Path, transform=None):
            self.root_dir = Path(root_dir)
            self.transform = transform
            self.samples = []
            self.classes = sorted([d.name for d in self.root_dir.iterdir() if d.is_dir()])
            self.class_to_idx = {cls_name: i for i, cls_name in enumerate(self.classes)}

            for cls_name in self.classes:
                cls_dir = self.root_dir / cls_name
                for fname in cls_dir.iterdir():
                    if fname.suffix.lower() in {".jpg", ".jpeg", ".png", ".bmp", ".webp"}:
                        self.samples.append((str(fname), self.class_to_idx[cls_name]))

        def __len__(self):
            return len(self.samples)

        def __getitem__(self, idx: int):
            fpath, label = self.samples[idx]
            image = Image.open(fpath).convert("RGB")
            if self.transform:
                image = self.transform(image)
            return image, label


def get_data_loaders(batch_size: int = 32, num_workers: int = 2) -> Dict[str, Optional[object]]:
    """Builds and returns Train, Validation, and Test DataLoaders."""
    if not TORCH_AVAILABLE:
        print("⚠️ PyTorch is not installed. DataLoaders cannot be created.")
        return {"train": None, "val": None, "test": None}

    train_tf, val_tf = get_mobile_transforms()

    train_dataset = FishSpeciesDataset(SPECIES_TRAIN_DIR, transform=train_tf)
    val_dataset = FishSpeciesDataset(SPECIES_VAL_DIR, transform=val_tf)
    test_dataset = FishSpeciesDataset(SPECIES_TEST_DIR, transform=val_tf)

    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=True
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=True
    )
    test_loader = DataLoader(
        test_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=True
    )

    return {
        "train": train_loader,
        "val": val_loader,
        "test": test_loader,
        "classes": train_dataset.classes,
        "class_to_idx": train_dataset.class_to_idx
    }
