"""
flask_api/oral_gate.py
════════════════════════════════════════════════════════════════════════════════
"Is this an oral photo?" gate that runs BEFORE the YOLO detector.

The detector was only ever trained on images that contain a disease, so it has no concept of
"nothing here" and will happily box a chocolate as calculus. This zero-shot CLIP check rejects
images that are clearly not a mouth / teeth / gums / tongue / lips photo.
════════════════════════════════════════════════════════════════════════════════
"""

import logging
import os

import torch
from PIL import Image

logger = logging.getLogger(__name__)

GATE_ENABLED   = os.getenv("ORAL_GATE_ENABLED", "true").lower() == "true"
GATE_MODEL     = os.getenv("ORAL_GATE_MODEL", "openai/clip-vit-base-patch32")
GATE_THRESHOLD = float(os.getenv("ORAL_GATE_THRESHOLD", 0.65))

# Probability mass on these prompts = "looks like an oral photo".
ORAL_PROMPTS = [
    "a close-up photo of the inside of a human mouth",
    "a close-up photo of teeth and gums",
    "a photo of a human tongue",
    "a photo of a mouth ulcer or a sore on the lip or tongue",
    "a dental photo of decayed or stained teeth",
    "a photo of inflamed red gums",
    "a clinical photo of a lesion inside the mouth",
]
# Things people accidentally (or deliberately) upload.
OTHER_PROMPTS = [
    "a photo of food, candy or chocolate",
    "a photo of a product box or packaging",
    "a photo of an animal",
    "a photo of a landscape or a building",
    "a photo of a car or a vehicle",
    "a photo of a plant or a flower",
    "a screenshot, a document or text",
    "a drawing, a logo or a cartoon",
    "a photo of a hand, an arm or a leg",
    "a photo of furniture or a room",
]

_model = None
_processor = None


def _load():
    global _model, _processor
    if _model is None:
        from transformers import CLIPModel, CLIPProcessor
        logger.info(f"Loading oral gate model: {GATE_MODEL}")
        _model = CLIPModel.from_pretrained(GATE_MODEL).eval()
        _processor = CLIPProcessor.from_pretrained(GATE_MODEL)
        logger.info("✅ Oral gate model loaded.")
    return _model, _processor


def oral_score(image_path: str) -> float:
    """Return P(image is an oral photo) in [0, 1]."""
    model, processor = _load()
    image = Image.open(image_path).convert("RGB")
    prompts = ORAL_PROMPTS + OTHER_PROMPTS
    inputs = processor(text=prompts, images=image, return_tensors="pt", padding=True)
    with torch.no_grad():
        probs = model(**inputs).logits_per_image.softmax(dim=-1)[0]
    return float(probs[: len(ORAL_PROMPTS)].sum())


def is_oral_image(image_path: str):
    """(accepted, score). Fails OPEN (accepts) if the gate itself errors, so a gate bug never
    blocks real users; the error is logged."""
    if not GATE_ENABLED:
        return True, 1.0
    try:
        score = oral_score(image_path)
        return score >= GATE_THRESHOLD, score
    except Exception as e:  # noqa: BLE001
        logger.error(f"Oral gate failed, letting image through: {e}")
        return True, -1.0
