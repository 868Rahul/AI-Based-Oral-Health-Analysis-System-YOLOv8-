# 🦷 AI-Based Oral Health Analysis System (YOLOv8)

> **Full-stack academic project** — React · Node.js · Flask · YOLOv8 · MongoDB Atlas
> A comprehensive system for detecting and classifying 5 types of oral diseases/abnormalities.

---

## 📁 Folder Structure

```
ORAL/
├── best.pt                    ← Your trained YOLOv8 model
├── .gitignore
├── training_results/          ← Model training curves, matrices, and metrics
│
├── backend/                   ← Node.js + Express API
│   ├── controllers/
│   │   ├── predictionController.js ← Logic for handling AI analysis
│   ├── models/
│   │   └── Prediction.js      ← Schema for findings and confidence
│   └── ...
│
├── flask_api/                 ← Python Flask + YOLOv8 API
│   ├── app.py                 ← Image processing & BGR color mapping
│   └── ...
│
└── frontend/                  ← React.js app
    ├── src/
    │   ├── pages/
    │   │   ├── Predict.jsx    ← Main analysis page
    │   │   ├── Dashboard.jsx  ← Stats overview
    │   │   └── History.jsx    ← Past reports
    └── ...
```

---

## 🔬 Classification & Color Coding

The system detects 5 specific oral conditions. Each is highlighted with a unique color in the AI-annotated results:

| Condition | Class ID | Color (BGR) | Visual |
| :--- | :--- | :--- | :--- |
| **Cancer** | 1 | `(0, 0, 255)` | 🔴 Red |
| **Calculus** | 0 | `(0, 165, 255)` | 🟠 Orange |
| **Caries** | 2 | `(0, 255, 255)` | 🟡 Yellow |
| **Gingivitis** | 3 | `(255, 0, 255)` | 🟣 Magenta |
| **Ulcer** | 4 | `(235, 206, 135)` | 🔵 Sky Blue |

---

## ⚙️ Prerequisites

| Tool | Minimum Version | Check |
|------|----------------|-------|
| Node.js | 18+ | `node -v` |
| Python | 3.9+ | `python --version` |
| MongoDB Atlas account | — | cloud.mongodb.com |

---

## 🚀 Step-by-Step Setup

### Step 1 — Backend (Node.js)
1. Navigate to `backend` and run `npm install`.
2. Configure `.env` with your `MONGO_URI` and `FLASK_API_URL`.
3. Start with `npm run dev`.

### Step 2 — Flask AI API (Python)
1. Navigate to `flask_api` and install dependencies: `pip install -r requirements.txt`.
2. Configure `.env` (ensure `MODEL_PATH=../best.pt`).
3. **CRITICAL:** Run `python app.py`. Restart this server if you change color mappings or model files.

### Step 3 — React Frontend
1. Navigate to `frontend` and run `npm install`.
2. Start with `npm start`.

---

## 🧪 Detection Workflow
1. **Upload**: User uploads an image via the React dashboard.
2. **Proxy**: Node backend proxies the image to the Flask AI server.
3. **Inference**: YOLOv8 model runs on the image.
4. **Annotation**: Flask draws specific colored bounding boxes based on the detected disease class.
5. **Storage**: Results (labels, confidence, image paths) are saved to MongoDB.
6. **Display**: Frontend displays side-by-side comparison with specific disease labels.

---

## 🛠️ Common Issues & Fixes

| Problem | Fix |
|---------|-----|
| **Broken Original Image** | Ensure Flask and Node are both running. The system uses the Flask-generated UUID for consistent image serving. |
| **Boxes are all Green** | Ensure you have restarted the Flask server after updating `app.py`. |
| **Missing History Images** | Old records might have broken links if filenames changed. Run a new scan to verify latest logic. |

---

*Built as an academic project — AI-Based Oral Health Analysis System using YOLOv8.*
