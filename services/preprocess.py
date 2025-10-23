import cv2 as cv
import numpy as np
from PIL import Image
import PIL.ExifTags as ExifTags
import os

class ImagePreprocessor:
    """
    Preprocessing untuk gambar luka sebelum deteksi
    """
    def __init__(self, target_size=640, enhance=True):
        """
        Args:
            target_size: Target size untuk YOLO (640x640 default)
            enhance: Apply image enhancement atau tidak
        """
        self.taget_size = target_size
        self.enhance = enhance

    def preprocess(self, image_path, output_path=None):
        """
        Preprocess gambar untuk deteksi optimal
        
        Args:
            image_path: Path ke gambar input
            output_path: Path untuk save hasil preprocessing
            
        Returns:
            str: Path ke preprocessed image
        """
        image = cv.imread(image_path)
        if image is None:
            raise ValueError(f"Gagal membaca gambar: {image_path}")
        
        image = self._resize_with_padding(image)

        if self.enhance:
            image = self._enhance_contrast(image)
            image = self._denoise(image)
            image = self._sharpen(image)

        if output_path:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            cv.imwrite(output_path, image)
            return output_path
        
        temp_path = image_path.replace('.', '_preprocessed.')
        cv.imwrite(temp_path, image)
        return temp_path
    
    def _resize_with_padding(self, image):
        """
        Resize image dengan maintain aspect ratio dan padding
        """
        h, w = image.shape[:2]

        scale = min(self.taget_size / h, self.taget_size / w)
        new_w = int(w * scale)
        new_h = int(h * scale)

        resized = cv.resize(image, (new_w, new_h), interpolation=cv.INTER_AREA)
        
        padded = np.zeros((self.taget_size, self.taget_size, 3), dtype=np.uint8)
        padded.fill(114)

        offset_x = (self.taget_size - new_w) // 2
        offset_y = (self.taget_size - new_h) // 2

        padded[offset_y:offset_y+new_h, offset_x:offset_x+new_w] = resized

        return padded
    
    def _enhance_contrast(self, image):
        """
        Enhance contrast menggunakan CLAHE (Contrast Limited Adaptive Histogram Equalization)
        Bagus untuk gambar dengan lighting yang kurang bagus
        """
        lab = cv.cvtColor(image, cv.COLOR_BGR2LAB)
        l, a, b = cv.split(lab)

        clahe = cv.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l = clahe.apply(l)

        enhanced = cv.merge([l, a, b])

        return cv.cvtColor(enhanced, cv.COLOR_Lab2BGR)
    
    def _denoise(self, image):
        """
        Reduce noise dengan fastNlMeansDenoisingColored
        Bagus untuk gambar dari kamera smartphone yang noisy
        """
        return cv.fastNlMeansDenoisingColored(
            image, 
            None,
            h=10,
            hColor=10,
            templateWindowSize=7,
            searchWindowSize=21
        )
    
    def _sharpen(self, image):
        """
        Sharpen image untuk detail lebih jelas
        """
        kernel = np.array([[-1, -1, -1],
                           [-1, 9, -1],
                           [-1, -1, -1]])
        return cv.filter2D(image, -1, kernel)
    
    def validate_image(self, image_path):
        """
        Validate image quality dan format
        
        Returns:
            dict: Validation results
        """
        try:
            image = cv.imread(image_path)
            if image is None:
                return {
                    'valid': False,
                    'error': 'Cannot read image'
                }
            
            h, w = image.shape[:2]

            if h < 100 or w < 100:
                return {
                    'valid': False,
                    'error': 'Image too small'
                }
            
            blur_score = self._calculate_blur(image)

            return {
                'valid': True,
                'width': w,
                'height': h,
                'blur_score': blur_score,
                'is_blurry': blur_score < 100
            }
        except Exception as e:
            return {
                'valid': False,
                'error': str(e)
            }
        
    def _calculate_blur(self, image):
        """
        Calculate blur score menggunakan Laplacian variance
        Lower score = more blurry
        """
        gray = cv.cvtColor(image, cv.COLOR_BGR2GRAY)
        return cv.Laplacian(gray, cv.CV_64F).var()
    
    def auto_orient(self, image_path):
        """
        Auto-orient image berdasarkan EXIF data
        Useful untuk gambar dari smartphone
        """
        try:
            image = Image.open(image_path)

            for orientation in ExifTags.TAGS.keys():
                if ExifTags.TAGS[orientation] == 'Orientation':
                    break

            exif = image._getexif()
            if exif is not None:
                orientation_value = exif.get(orientation)

                if orientation_value == 3:
                    image = image.rotate(180, expand=True)
                elif orientation_value == 6:
                    image = image.rotate(270, expand=True)
                elif orientation_value == 8:
                    image = image.rotate(90, expand=True)
            
            image.save(image_path)

        except Exception as e:
            print(f"Auto-orient failed: {e}")
            pass
    
def preprocess_for_detection(image_path, output_path=None, enhance=True):
    """
    Quick function untuk preprocess image
    
    Args:
        image_path: Path ke gambar
        output_path: Output path (optional)
        enhance: Apply enhancement atau tidak
        
    Returns:
        str: Path ke preprocessed image
    """
    preprocessor = ImagePreprocessor(enhance=enhance)

    preprocessor.auto_orient(image_path)
    return preprocessor.preprocess(image_path, output_path)