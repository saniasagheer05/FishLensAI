import sys
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
from pathlib import Path

CHECKPOINT_PATH = Path("ml/models/best_species_mobilenetv3.pth")

def load_model():
    checkpoint = torch.load(CHECKPOINT_PATH, map_location="cpu", weights_only=False)
    classes = checkpoint["classes"]
    num_classes = len(classes)

    model = models.mobilenet_v3_small(weights=None)
    in_features = model.classifier[3].in_features
    model.classifier[2] = nn.Dropout(p=0.3, inplace=True)
    model.classifier[3] = nn.Linear(in_features, num_classes)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    return model, classes, checkpoint["normalize_mean"], checkpoint["normalize_std"], checkpoint["input_size"]

def predict(image_path, model, classes, mean, std, img_size):
    transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.CenterCrop(img_size),
        transforms.ToTensor(),
        transforms.Normalize(mean=mean, std=std)
    ])

    img = Image.open(image_path).convert("RGB")
    tensor = transform(img).unsqueeze(0)

    with torch.no_grad():
        outputs = model(tensor)
        probs = torch.softmax(outputs, dim=1)[0]

    top3_probs, top3_idx = torch.topk(probs, k=min(3, len(classes)))

    print(f"\nImage: {image_path}")
    print("Top predictions:")
    for prob, idx in zip(top3_probs, top3_idx):
        print(f"  {classes[idx]:20s}: {prob.item()*100:.2f}%")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python ml\\src\\test_inference.py <image_path>")
        sys.exit(1)

    model, classes, mean, std, img_size = load_model()
    predict(sys.argv[1], model, classes, mean, std, img_size)