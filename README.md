# 🦷 AI-Based Oral Health Analysis System (YOLOv8)

> **Full-stack project** — React · Node.js/Express · Flask · YOLOv8 · MongoDB Atlas
> Detects and classifies 5 oral conditions from a photo of the mouth, and shows colour-coded results.

**Live deployment:** Frontend → Vercel · Backend → Render · AI service → Hugging Face Spaces (`rahul868/oral-health-ai`)

---

## 📁 Folder Structure

```
ORAL/
├── best.pt                          ← deployed YOLOv8s weights (trained on the balanced dataset)
├── Dental-diseases.ipynb            ← Kaggle training notebook (executed run, with outputs)
├── Action.md                        ← dataset rebuild log: every step taken and why
├── README.md
├── .gitignore
│
├── scripts/
│   └── build_balanced_dataset.py    ← rebuilds the leakage-free, class-balanced dataset
├── oral_dataset_balanced/           ← train / valid / test (YOLO format)   [git-ignored]
├── oral_dataset_balanced.zip        ← same data, ready to upload to Kaggle [git-ignored]
├── training_results/                ← metrics, curves, confusion matrices   [git-ignored]
│
├── flask_api/                       ← Python AI microservice
│   ├── app.py                       ← /predict, /health, /classes, colour mapping, thresholds
│   ├── oral_gate.py                 ← "is this an oral photo?" CLIP pre-check
│   ├── requirements.txt
│   ├── uploads/ annotated/          ← runtime image storage                 [git-ignored]
│   └── oral-health-ai/              ← Hugging Face Space repo (Docker deploy; own git remote)
│       ├── Dockerfile  app.py  oral_gate.py  best.pt  requirements.txt  README.md
│
├── backend/                         ← Node.js + Express API
│   ├── server.js
│   ├── config/        (db.js, multer.js)
│   ├── controllers/   (authController, predictionController, userController)
│   ├── middleware/    (authMiddleware.js)
│   ├── models/        (User.js, Prediction.js)
│   └── routes/        (auth.js, predictions.js, users.js)
│
└── frontend/                        ← React app
    ├── public/        (index.html, logo.png)
    └── src/
        ├── App.js  index.js  index.css
        ├── pages/        (Login, Register, Dashboard, Predict, History)
        ├── components/   (Navbar, LoadingSpinner, DiseaseTag)
        ├── constants/    (diseases.js  ← class names + colours)
        ├── context/      (AuthContext.jsx)
        └── services/     (api.js)
```

---

## 🔬 Classes & Colour Coding

Each class has one colour, used for the boxes on the annotated image, the legend, and the result chips.
The single source of truth is `COLOR_HEX` in `flask_api/app.py`, mirrored in `frontend/src/constants/diseases.js`.

| Condition | Class ID | Hex | BGR (OpenCV) | Visual |
| :--- | :--- | :--- | :--- | :--- |
| **Calculus** | 0 | `#FFA500` | `(0, 165, 255)` | 🟠 Orange |
| **Cancer** | 1 | `#FF0000` | `(0, 0, 255)` | 🔴 Red |
| **Caries** | 2 | `#FFFF00` | `(0, 255, 255)` | 🟡 Yellow |
| **Gingivitis** | 3 | `#FF00FF` | `(255, 0, 255)` | 🟣 Magenta |
| **Ulcer** | 4 | `#00BFFF` | `(255, 191, 0)` | 🔵 Sky Blue |

---

## 📊 Model & Results

**Model:** YOLOv8s fine-tuned from `yolov8s.pt` on Kaggle (Tesla T4), 640 px, AdamW, cosine LR. Early-stopped at epoch 81 (best epoch 56, ≈1.04 h).

**Dataset:** `oral_dataset_balanced` — train 3,797 · valid 696 · test 503 images. It was rebuilt from the original
8,616-image set because the original had (a) a 6.1 : 1 box-count imbalance and (b) the same source photos
leaking across train/valid/test. The rebuilt set has **zero** source-photo overlap between splits and a ≈2 : 1 box imbalance.
See [`Action.md`](Action.md) for every step.

**Held-out test set (503 images, no photo shared with training):**

| Class | AP50 | AP50-95 |
|-------|-----:|--------:|
| ulcer | 0.905 | 0.451 |
| caries | 0.646 | 0.294 |
| calculus | 0.619 | 0.295 |
| gingivitis | 0.514 | 0.251 |
| cancer | 0.155 | 0.044 |
| **all** | **mAP50 0.568** | **mAP50-95 0.267** (P 0.514 · R 0.583) |

> **Read this honestly.** These numbers are lower than the previous model's reported scores because they are no longer
> inflated by train/test leakage. **Cancer is the weak class** (few distinct photos; low-confidence detections). The app
> therefore uses a lower confidence threshold for cancer (0.10 instead of 0.25) and always labels output as a
> *screening aid, not a medical diagnosis*.

---

## 🛡️ Oral-photo gate

The detector was only trained on images that contain a disease, so by itself it will box almost anything
(e.g. a chocolate was flagged as calculus). `flask_api/oral_gate.py` runs a zero-shot CLIP check **before** YOLO and
rejects clearly non-oral images with HTTP 422 `not_oral_image`; the Node backend forwards the message and the UI shows a friendly toast.

| Setting (env var) | Default | Meaning |
|---|---|---|
| `ORAL_GATE_ENABLED` | `true` | turn the gate off with `false` |
| `ORAL_GATE_THRESHOLD` | `0.65` | minimum "looks oral" probability to accept an image |
| `ORAL_GATE_MODEL` | `openai/clip-vit-base-patch32` | zero-shot model used by the gate |
| `CONFIDENCE_THRESHOLD` | `0.25` | default detection confidence |
| `CANCER_CONFIDENCE_THRESHOLD` | `0.10` | detection confidence for cancer |

If the gate itself errors it fails *open* (the image is let through and the error is logged).

---

## ⚙️ Prerequisites

| Tool | Minimum Version | Check |
|------|----------------|-------|
| Node.js | 18+ | `node -v` |
| Python | 3.9+ | `python --version` |
| MongoDB Atlas account | — | cloud.mongodb.com |

---

## 🚀 Local Setup

### 1 — Backend (Node.js)
1. `cd backend && npm install`
2. `.env`: `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `FLASK_API_URL`
3. `npm run dev`

### 2 — Flask AI API (Python)
1. `cd flask_api && pip install -r requirements.txt`
2. `.env` (optional): `MODEL_PATH=../best.pt`
3. `python app.py` — **restart it after changing the model, colours or thresholds.**
   The first request downloads the CLIP model (~600 MB) for the oral gate.

### 3 — React Frontend
1. `cd frontend && npm install`
2. `.env`: `REACT_APP_API_URL=http://localhost:5000/api`
3. `npm start`

---

## 🧪 Detection Workflow
1. **Upload** — user selects a photo in the React app.
2. **Proxy** — the Node backend forwards it to the Flask service.
3. **Gate** — CLIP checks it is an oral photo; otherwise `422 not_oral_image`.
4. **Inference** — YOLOv8 detects findings (per-class confidence thresholds).
5. **Annotation** — Flask draws boxes in the class colour and returns each detection's `color`.
6. **Storage** — Node saves the result in MongoDB Atlas.
7. **Display** — side-by-side original vs annotated, colour legend, per-class summary cards.

### Flask endpoints
| Method & path | Purpose |
|---|---|
| `GET /health` | status, `model_loaded`, model path |
| `GET /classes` | class names and colours (for UI legends) |
| `POST /predict` | multipart field `image` → detections + annotated image |
| `GET /uploads/<f>`, `GET /annotated/<f>` | serve stored images |

---

## ☁️ Deployment

| Part | Platform | How to update |
|---|---|---|
| React frontend | **Vercel** | push to GitHub `main` → auto-deploy |
| Node backend | **Render** | push to GitHub `main` → auto-deploy (`FLASK_API_URL` points at the Space) |
| Flask + model | **Hugging Face Space** `rahul868/oral-health-ai` | commit & push inside `flask_api/oral-health-ai/` (`best.pt` is stored with Git LFS) |

**Swapping the model:** copy the new weights to `best.pt` (root) **and** `flask_api/oral-health-ai/best.pt`, then push both repos.
Verify with `GET /health` on the Space and compare the SHA-256 of `best.pt` with the Space's LFS pointer.

---

## 🏋️ Retraining (Kaggle)

1. `python scripts/build_balanced_dataset.py` (or use `oral_dataset_balanced.zip`) and upload it as a Kaggle Dataset.
2. Open `Dental-diseases.ipynb`, add the dataset as input, enable **GPU T4**, run all cells (≈1–2 h).
3. Download `final_results/best.pt` and replace the weights as described above.

---

## 🛠️ Common Issues & Fixes

| Problem | Fix |
|---------|-----|
| All detections look the same colour | Restart Flask; hard-refresh the frontend (cache). |
| Cancer findings never appear | Check `CANCER_CONFIDENCE_THRESHOLD` (default 0.10). |
| Non-mouth image still gets boxes | Gate disabled or threshold too low — check `ORAL_GATE_*` env vars. |
| Legit oral photo rejected | Lower `ORAL_GATE_THRESHOLD` slightly (e.g. 0.50). |
| Local Flask loads the wrong model | A `.env` `MODEL_PATH` overrides the default; point it at the right `best.pt`. |
| Broken image in History | Old records may point to files that no longer exist; run a new scan. |

---

*Academic project — AI-Based Oral Health Analysis System using YOLOv8. Not a medical device; results are not a diagnosis.*
