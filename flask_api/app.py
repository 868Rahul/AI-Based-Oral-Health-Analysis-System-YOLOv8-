"""
flask_api/app.py
════════════════════════════════════════════════════════════════════════════════
Flask REST API that wraps the YOLOv8 oral lesion detection model.

Endpoints:
  POST /predict        — Accept an image, run YOLO inference, return JSON + annotated image
  GET  /health         — Health check
  GET  /uploads/<f>    — Serve original uploaded images
  GET  /annotated/<f>  — Serve annotated (bounding-box) images
════════════════════════════════════════════════════════════════════════════════
"""

import os
import uuid
import logging
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from ultralytics import YOLO
from dotenv import load_dotenv

# ── Load environment variables ────────────────────────────────────────────────
load_dotenv()

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
)
logger = logging.getLogger(__name__)

# ── App setup ─────────────────────────────────────────────────────────────────
app = Flask(__name__)

# Allow requests from the Node backend and React frontend
CORS(app, resources={r"/*": {"origins": "*"}})

# ── Directory paths ───────────────────────────────────────────────────────────
BASE_DIR      = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR    = os.path.join(BASE_DIR, "uploads")
ANNOTATED_DIR = os.path.join(BASE_DIR, "annotated")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(ANNOTATED_DIR, exist_ok=True)

# ── Model configuration ───────────────────────────────────────────────────────
# In Docker/HuggingFace, best.pt is in BASE_DIR. Locally, it might be in the parent folder.
default_model_path = os.path.join(BASE_DIR, "best.pt")
if not os.path.exists(default_model_path):
    default_model_path = os.path.join(os.path.dirname(BASE_DIR), "best.pt")

MODEL_PATH           = os.getenv("MODEL_PATH", default_model_path)
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", 0.25))

# ── Load YOLOv8 model (once at startup) ───────────────────────────────────────
logger.info(f"Loading YOLOv8 model from: {MODEL_PATH}")
try:
    model = YOLO(MODEL_PATH)
    logger.info("✅ YOLOv8 model loaded successfully.")
except Exception as e:
    logger.error(f"❌ Failed to load model: {e}")
    model = None

# ── Allowed extensions ────────────────────────────────────────────────────────
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

# ── Color mapping (BGR for OpenCV) ──────────────────────────────────────────
COLOR_MAP = {
    "calculus":   (0, 165, 255),   # Bright Orange
    "cancer":     (0, 0, 255),     # Deep Red
    "caries":     (0, 255, 255),   # Bright Yellow
    "gingivitis": (255, 0, 255),   # Vibrant Magenta
    "ulcer":      (255, 191, 0),   # Deep Sky Blue (Cyan-ish but distinct)
}

def allowed_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


# ════════════════════════════════════════════════════════════════════════════════
# Routes
# ════════════════════════════════════════════════════════════════════════════════

@app.route("/health", methods=["GET"])
def health():
    """Simple health check so Node backend can verify Flask is alive."""
    return jsonify({
        "status": "ok",
        "model_loaded": model is not None,
        "model_path": MODEL_PATH,
    })


@app.route("/predict", methods=["POST"])
def predict():
    """
    Accepts a multipart/form-data POST with field name 'image'.
    Runs YOLOv8 inference and returns:
      - detections  : list of {label, confidence, bbox}
      - annotated_image : filename of the bounding-box image
      - message     : human-readable summary
    """

    # ── Guard: model must be loaded ───────────────────────────────────────────
    if model is None:
        return jsonify({"error": "Model not loaded. Check server logs."}), 503

    # ── Guard: image must be present ──────────────────────────────────────────
    if "image" not in request.files:
        return jsonify({"error": "No image field in request."}), 400

    file = request.files["image"]

    if file.filename == "":
        return jsonify({"error": "Empty filename."}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Unsupported file type. Use JPEG, PNG, or WEBP."}), 400

    # ── Save original upload ──────────────────────────────────────────────────
    ext            = os.path.splitext(file.filename)[1].lower()
    unique_name    = f"{uuid.uuid4().hex}{ext}"
    original_path  = os.path.join(UPLOAD_DIR, unique_name)

    file.save(original_path)
    if os.path.exists(original_path):
        logger.info(f"✅ Successfully saved upload to: {original_path}")
    else:
        logger.error(f"❌ Failed to save upload to: {original_path}")

    # ── Run YOLOv8 inference ──────────────────────────────────────────────────
    try:
        results = model.predict(
            source=str(original_path),
            conf=CONFIDENCE_THRESHOLD,
            save=False,        # We'll draw boxes manually for full control
            verbose=False,
        )
    except Exception as e:
        logger.error(f"YOLO inference error: {e}")
        return jsonify({"error": f"Inference failed: {str(e)}"}), 500

    # ── Parse detections ──────────────────────────────────────────────────────
    detections = []
    result = results[0]  # Single image → single result

    if result.boxes is not None:
        for box in result.boxes:
            conf  = float(box.conf[0])
            cls   = int(box.cls[0])
            label = model.names.get(cls, f"class_{cls}")
            x1, y1, x2, y2 = map(float, box.xyxy[0])

            detections.append({
                "label":      label,
                "confidence": round(conf, 4),
                "bbox": {
                    "x1": round(x1, 2),
                    "y1": round(y1, 2),
                    "x2": round(x2, 2),
                    "y2": round(y2, 2),
                },
            })

    logger.info(f"Detections found: {len(detections)}")

    # ── Draw bounding boxes on image ──────────────────────────────────────────
    annotated_filename = None
    try:
        img_cv = cv2.imread(str(original_path))

        # Draw each bounding box with label and confidence
        for det in detections:
            b      = det["bbox"]
            x1, y1 = int(b["x1"]), int(b["y1"])
            x2, y2 = int(b["x2"]), int(b["y2"])
            conf   = det["confidence"]
            label  = det["label"].strip()

            # Use color from map or default to a teal
            color = COLOR_MAP.get(label.lower(), (200, 200, 0))

            cv2.rectangle(img_cv, (x1, y1), (x2, y2), color, 3)

            # Label background pill
            text      = f"{label}  {conf * 100:.1f}%"
            font      = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.65
            thickness  = 2
            (tw, th), baseline = cv2.getTextSize(text, font, font_scale, thickness)

            label_y1 = max(y1 - th - 10, 0)
            cv2.rectangle(img_cv, (x1, label_y1), (x1 + tw + 10, y1), color, -1)
            cv2.putText(
                img_cv, text,
                (x1 + 5, y1 - 5),
                font, font_scale,
                (255, 255, 255),
                thickness,
                cv2.LINE_AA,
            )

        # Save annotated image
        annotated_filename = f"ann_{unique_name}"
        annotated_path     = os.path.join(ANNOTATED_DIR, annotated_filename)
        cv2.imwrite(annotated_path, img_cv)
        if os.path.exists(annotated_path):
            logger.info(f"✅ Successfully saved annotated image to: {annotated_path}")
        else:
            logger.error(f"❌ Failed to save annotated image to: {annotated_path}")
        logger.info(f"Annotated image saved: {annotated_path}")

    except Exception as e:
        logger.warning(f"Could not draw bounding boxes: {e}")

    # ── Build response ────────────────────────────────────────────────────────
    detection_count = len(detections)
    if detection_count > 0:
        top_conf = max(d["confidence"] for d in detections)
        # Find top detection label for status
        top_detection = max(detections, key=lambda x: x["confidence"])
        status = f"{top_detection['label'].lower().replace(' ', '_')}_detected"
        
        # Create a summary of detected classes
        unique_labels = sorted(list(set(d["label"] for d in detections)))
        labels_str = ", ".join(unique_labels)
        message  = (
            f"Detected: {labels_str}. "
            f"Total findings: {detection_count}. "
            f"Highest confidence: {top_conf * 100:.1f}%."
        )
    else:
        status = "no_disease"
        message = "No oral diseases or abnormalities detected."

    return jsonify({
        "status":          status,
        "detections":      detections,
        "detection_count": detection_count,
        "annotated_image": annotated_filename,
        "original_image":  unique_name,
        "message":         message,
    })


# ── Static file serving ───────────────────────────────────────────────────────

@app.route("/uploads/<path:filename>")
def serve_upload(filename):
    """Serve original uploaded images."""
    return send_from_directory(UPLOAD_DIR, filename)


@app.route("/annotated/<path:filename>")
def serve_annotated(filename):
    """Serve annotated (bounding-box) images."""
    return send_from_directory(ANNOTATED_DIR, filename)


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    # Render uses the 'PORT' environment variable
    port = int(os.getenv("PORT", os.getenv("FLASK_PORT", 5001)))
    debug = os.getenv("FLASK_DEBUG", "False").lower() == "true"
    logger.info(f"🚀 Flask AI API starting on 0.0.0.0:{port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
