import cv2 as cv
import numpy as np
from ultralytics import YOLO
import os
from pathlib import Path

class WoundDetector:
    def __init__(self, model_path='../yolov8/model_yolo_luka.pt', conf_threshold=0.25):
        """
        Initialize YOLO wound detector
        
        Args:
            model_path: Path to YOLO model weights
            conf_threshold: Confidence threshold for detections
        """

        self.conf_threshold = conf_threshold

        # Load model 
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model tidak ditemukan di: {model_path}")
            
        print(f"Loading YOLO model from {model_path}....")
        self.model = YOLO(model_path)
        print("Model loaded successfully!")

        self.class_names = self.model.names

        self.colors = self._generate_colors(len(self.class_names))
    
    def _generate_colors(self, num_classes):
        """Generate distinct colors untuk setiap class"""
        np.random.seed(42)
        colors = []
        for i in range(num_classes):
            color = tuple(np.random.randint(0, 225, 3).tolist())
            colors.append(color)
        return colors

    def predict(self, image_path, output_path=None):
        """
        Detect wounds dalam gambar

        Args:
            image_path: Path ke gambar imput
            output_path: Path untuk save hasil deteksi

        Returns:
            dict: Detection results
        """
        
        image = cv.imread(image_path)
        if image is None:
            raise ValueError(f"Gagal membaca gambar: {image_path}")
        
        original_image = image.copy()

        results = self.model.predict(
            source=image,
            conf=self.conf_threshold,
            verbose=False
        )[0]

        detections = []

        if len(results.boxes) > 0:
            for box in results.boxes:
                # x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)

                conf = float(box.conf[0].item())
                cls = int(box.cls[0].item())
                class_name = self.class_names[cls]

                detection = {
                    'class': class_name,
                    'confidence': conf,
                    'bbox': [x1, y1, x2, y2]
                }
                detections.append(detection)

                color = self.colors[cls]
                self._draw_detection(image, detection, color)

        if output_path:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            cv.imwrite(output_path, image)
        
        return {
            'detections': detections,
            'total_wounds': len(detections),
            'annotated_image': image,
            'original_imge': original_image
        }
    
    def _draw_detection(self, image, detection, color):
        """
        Draw bounding box dengan overlay dan label
        
        Args:
            image: Image array (akan dimodifikasi)
            detection: Dict berisi info deteksi
            color: RGB color tuple
        """
        x1, y1, x2, y2 = detection['bbox']
        x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
        class_name = detection['class']
        confidence = float(detection['confidence'])

        color = tuple(int(c) for c in color)

        overlay = image.copy()
        cv.rectangle(overlay, (x1, y1), (x2, y2), color, -1)
        alpha = 0.3
        cv.addWeighted(overlay, alpha, image, 1 - alpha, 0, image)

        thickness = 3
        cv.rectangle(image, (x1, y1), (x2, y2), color, thickness)

        cornor_length = 20
        cornor_thickness = 4

        label = (f"{class_name}: {confidence:.2f}")

        font = cv.FONT_HERSHEY_SIMPLEX
        font_scale = 0.6
        font_thickness = 2
        (text_width, text_height), baseline = cv.getTextSize(
            label, font, font_scale, font_thickness 
        )

        label_y = y1 - 10 if y1 - 10 > text_height else y1 + text_height + 10

        padding = 2
        bg_x1 = x1
        bg_y1 = label_y - text_height - padding
        bg_x2 = x1 - text_width + padding * 2
        bg_y2 = label_y + baseline + padding

        bg_x1, bg_y1 = max(0, bg_x1), max(0, bg_y1)
        bg_x2 = min(image.shape[1], bg_x2)
        bg_y2 = min(image.shape[0], bg_y2)

        text_x = x1 + padding
        text_y = label_y
        cv.putText(
            image, label, (text_x, text_y),
            font, font_scale, (255, 255, 255), font_thickness, cv.LINE_AA
        )

        bar_width = x2 - x1
        bar_height = 8
        bar_x1 = x1
        bar_y1 = y2 + 5
        bar_x2 = x1 + int(bar_width * confidence)
        bar_y2 = bar_y1 + bar_height

        if bar_y2 < image.shape[0]:
            cv.rectangle(image, (bar_x1, bar_y1), (x2, bar_x2), (200, 200, 200), -1)
            cv.rectangle(image, (bar_x1, bar_y1), (bar_x2, bar_y2), color, -1)
            cv.rectangle(image, (bar_x1, bar_y1), (x2, bar_y2), (255, 255, 255), 1)

    def predict_batch(self, image_paths, output_dir=None):
        """
        Detect wounds di multiple images
        
        Args:
            image_paths: List of image paths
            output_dir: Directory untuk save hasil
            
        Returns:
            list: List of detection results
        """

        all_results = []

        for i, img_path in enumerate(image_paths):
            print(f"Processing {i+1}.{len(image_paths)}: {img_path}")
        
            output_path = None
            if output_dir:
                filename = Path(img_path).name
                output_path = os.path.join(output_dir, f"detected_{filename}")
            
            result = self.predict(img_path, output_path)
            all_results.append(result)
        
        return all_results
    
_detector_instance = None

def get_detector(model_path = '../yolov8/model_yolo_luka.pt', conf_threshold=0.25):
    global _detector_instance
    if _detector_instance is None:
        _detector_instance = WoundDetector(model_path, conf_threshold)
    return _detector_instance
