# YOLOv8 Oral Disease Detection - Models & Algorithms Guide

## Model Architecture: YOLOv8 (You Only Look Once v8)

### What is YOLOv8?
YOLOv8 is a state-of-the-art real-time object detection model developed by Ultralytics. It's designed to detect, classify, and segment objects in images with high speed and accuracy.

### Key Characteristics:
- **Real-time Detection**: Processes images in milliseconds
- **High Accuracy**: mAP scores above 50% on standard benchmarks
- **Multiple Model Sizes**: Nano, Small, Medium, Large, XLarge
- **Easy to Use**: Simple API via Ultralytics library
- **GPU Optimized**: Leverages CUDA for fast inference on GPUs

---

## YOLOv8 Model Variants

| Model | Parameters | Speed | Accuracy | Use Case |
|-------|-----------|-------|----------|----------|
| **Nano** | 11M | ⚡⚡⚡ Fastest | ⭐ Lower | Edge devices, mobile |
| **Small** | 25M | ⚡⚡ Fast | ⭐⭐⭐ Good | **Recommended** |
| **Medium** | 49M | ⚡ Moderate | ⭐⭐⭐⭐ Better | **Recommended** |
| **Large** | 104M | 🐢 Slow | ⭐⭐⭐⭐⭐ Best | High accuracy required |
| **XLarge** | 161M | 🐢🐢 Slowest | ⭐⭐⭐⭐⭐ Best | Maximum accuracy |

**For your oral disease dataset: Use Small or Medium**

---

## Core Algorithm: CNN-Based Object Detection

### Architecture Components:

#### 1. **Backbone Network**
- Extracts features from input images
- Uses CSPDarknet (Cross Stage Partial Darknet)
- Progressively reduces spatial dimensions while increasing semantic features
- Processes: 640×640 → 320×320 → 160×160 → 80×80

#### 2. **Neck (Feature Pyramid Network - FPN)**
- Combines multi-scale features
- Creates feature maps at different resolutions
- Enables detection of both small and large objects
- Small lesions and large diseased areas both detectable

#### 3. **Head (Detection Head)**
- Generates predictions for each grid cell
- Outputs:
  - **Bounding box coordinates** (x, y, width, height)
  - **Objectness score** (probability of object presence)
  - **Class probabilities** (Calculus, Cancer, Caries, Gingivitis, Ulcer)

### Detection Process:
```
Input Image (640×640)
    ↓
Feature Extraction (Backbone)
    ↓
Multi-scale Features (Neck/FPN)
    ↓
Detection Predictions (Head)
    ↓
Post-processing (NMS - Non-Maximum Suppression)
    ↓
Final Detections
```

---

## Loss Functions Used During Training

### 1. **Box Loss (GIoU/DIoU)**
Measures accuracy of bounding box predictions:
- Compares predicted vs actual bounding boxes
- Uses Generalized IoU (GIoU) for better overlap measurement
- Lower box loss = more accurate localization

### 2. **Objectness Loss (BCE)**
Measures if an object is present:
- Binary Cross Entropy loss
- Determines which grid cells contain objects
- Reduces false positives

### 3. **Classification Loss (CE)**
Measures correct disease classification:
- Cross Entropy loss across 5 classes (Calculus, Cancer, Caries, Gingivitis, Ulcer)
- Penalizes incorrect disease predictions
- Higher for classes with fewer training samples

### Total Loss = Box Loss + Objectness Loss + Classification Loss

---

## Data Augmentation Techniques

Applied during training to improve model robustness:

| Technique | Purpose | Settings |
|-----------|---------|----------|
| **Mosaic** | Combines 4 images into 1 | 100% probability |
| **Flipping** | Horizontal/Vertical flip | 50% probability |
| **Rotation** | Random rotation | ±10 degrees |
| **Translation** | Random shift | ±10% |
| **Scaling** | Random zoom | 0.5x - 2.0x |
| **HSV** | Color jittering | H:±1.5%, S:±70%, V:±40% |
| **Blur** | Gaussian blur | Random |
| **Noise** | Random noise addition | Low level |

**Benefits**: Makes model robust to various lighting, angles, and image qualities

---

## Training Hyperparameters

### Optimization
- **Optimizer**: SGD with momentum (default) or Adam
- **Learning Rate**: 0.01 (initial) → 0.1 (final)
- **Momentum**: 0.937
- **Weight Decay**: 0.0005

### Training
- **Epochs**: 100-200 iterations through entire dataset
- **Batch Size**: 16 (adjustable based on GPU memory)
  - Smaller batch = less GPU memory but slower training
  - Larger batch = more stable gradients but more memory
- **Early Stopping**: Stops if validation mAP doesn't improve for 20 epochs

### Data Split
For this project, the dataset was split into:
- **Training (80%)**: Used to teach the model.
- **Validation (10%)**: Used to tune hyperparameters.
- **Testing (10%)**: Used to evaluate final performance.

---

## Targeted Oral Diseases

The model is specifically trained to detect and distinguish between:

1. **Calculus**: Hardened plaque that forms on teeth.
2. **Cancer**: Oral squamous cell carcinoma and other malignancies.
3. **Caries**: Tooth decay or cavities.
4. **Gingivitis**: Gum inflammation and early-stage periodontal disease.
5. **Ulcer**: Mouth sores or aphthous ulcers.

---

## Inference & Annotation Logic

Post-inference, the system applies specific visual mapping:
- **Labeling**: Top detection label is shown with its confidence percentage.
- **Color Coding (BGR)**:
  - Calculus: Orange
  - Cancer: Red
  - Caries: Yellow
  - Gingivitis: Magenta
  - Ulcer: Deep Blue/Cyan- **Training**: 35,761 images (used to learn)
- **Validation**: 0 images (automatically split from training: 10%)
- **Testing**: 2,264 images (final evaluation)

---

## Evaluation Metrics

### 1. **mAP (Mean Average Precision)**
- Primary metric for object detection
- mAP@0.5: Strict overlap requirement (50% IoU threshold)
- mAP@0.5:0.95: Average across multiple thresholds
- **Good**: > 0.5 (50%)
- **Excellent**: > 0.7 (70%)

### 2. **Precision**
```
Precision = TP / (TP + FP)
```
- How many detected objects are correct?
- High precision = fewer false positives

### 3. **Recall**
```
Recall = TP / (TP + FN)
```
- What percentage of actual objects are detected?
- High recall = fewer false negatives

### 4. **F1-Score**
```
F1 = 2 × (Precision × Recall) / (Precision + Recall)
```
- Harmonic mean of precision and recall
- Balanced metric when both matter equally

---

## ── YOLOv8 Artifacts & Models ─────────────────────────────
*.pt
training_results/
args.yaml
runs/
.ipynb_checkpoints/
*.csv
*.png
*.jpg
!frontend/public/*.png
!frontend/public/*.jpg
!frontend/public/*.svg

## Why YOLOv8 for Oral Disease Detection?

✅ **Advantages:**
- Fast inference (real-time capable)
- Handles multiple object types (5 diseases)
- Good accuracy-speed tradeoff
- Pre-trained weights (transfer learning)
- Easy deployment and inference

✅ **Suitable for Medical Imaging:**
- Can detect small lesions
- Works with various image qualities
- Robust to different lighting conditions
- Scalable to production deployment

---

## Alternative Models (Not Used, But Available)

| Model | Pros | Cons |
|-------|------|------|
| **Faster R-CNN** | Very accurate | Slower inference |
| **RetinaNet** | Good for small objects | More complex training |
| **SSD** | Fast, lightweight | Lower accuracy |
| **EfficientDet** | Efficient scaling | Less community support |
| **Mask R-CNN** | Instance segmentation | Overkill for detection |

**We chose YOLOv8** for optimal speed-accuracy tradeoff.

---

## Training Progress Indicators

### Good Signs 🟢
- Loss decreases steadily
- mAP increases over epochs
- No sudden spikes in loss
- Precision and recall both high

### Warning Signs 🟡
- Loss plateaus (not improving)
- mAP oscillates wildly
- Diverging (loss increases)
- Huge gap between train/validation

### Problem Signs 🔴
- Loss goes to infinity (NaN)
- Negative loss values
- Complete divergence
- mAP stuck at very low values

---

## Expected Performance

For your 5-class oral disease dataset:

**Conservative Estimate (Medium model, 100 epochs):**
- mAP@0.5: 0.55-0.65 (55-65%)
- mAP@0.5:0.95: 0.35-0.45 (35-45%)
- Inference Time: 50-100ms per image

**Optimistic (Large model, 200 epochs, well-tuned):**
- mAP@0.5: 0.70-0.80 (70-80%)
- mAP@0.5:0.95: 0.50-0.60 (50-60%)
- Inference Time: 100-200ms per image

---

## Deployment Considerations

### Model Format
- **PyTorch (.pt)**: Used for training and fine-tuning
- **ONNX (.onnx)**: For cross-platform inference
- **TensorRT (.engine)**: For NVIDIA GPU optimization
- **CoreML (.mlmodel)**: For Apple devices
- **TFLite (.tflite)**: For mobile/edge devices

### Export from Trained Model
```python
model = YOLO('best.pt')
model.export(format='onnx')  # or 'tflite', 'coreml', etc.
```

---

## References

- **YOLOv8 Official**: https://github.com/ultralytics/ultralytics
- **YOLO Paper**: https://arxiv.org/abs/2304.00501
- **Transfer Learning**: Fine-tune on your data using pre-trained weights
- **Roboflow Dataset**: Prepared in YOLO format for easy training

---

## Next Steps After Training

1. ✅ **Evaluate**: Check performance on test set
2. ✅ **Analyze**: Review confusion matrix and per-class metrics
3. ✅ **Improve**: Collect more data for poorly performing classes
4. ✅ **Deploy**: Export model and integrate into applications
5. ✅ **Monitor**: Track performance on real-world data

---

*Created for Oral Disease Detection with YOLOv8 on Google Colab*
