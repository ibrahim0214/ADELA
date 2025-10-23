from flask import Flask, render_template, request, jsonify
import os
from werkzeug.utils import secure_filename
from utils.yolo_models import get_detector
from services.preprocess import preprocess_for_detection
import traceback

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['RESULT_FOLDER'] = 'static/results'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024 #max file size 16MB
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

# buat folder untuk upload gambar jika belum ada
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['RESULT_FOLDER'], exist_ok=True)

try:
    detector = get_detector(
        model_path = 'yolov8/model_yolo_luka.pt',
        conf_threshold = 0.25
    )

    print("YOLO model loaded successfully!!!")

except Exception as e:
    print(f"Warning: could not load YOLO model: {e}")
    detector=None

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/detect', methods=['POST'])
def detect():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and allowed_file(file.filename):
        try:
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)

            # Preprocess image
            preprocessed_path = preprocess_for_detection(filepath, enhance=True)

            if detector is None:
                return jsonify({
                    'error': 'Error dulu bre bentaran'
                })
            
            result_filename = f"result_{filename}"
            result_path = os.path.join(app.config['RESULT_FOLDER'], result_filename)

            results = detector.predict(
                image_path=filepath,
                output_path=result_path
            )

            response = {
                'image_url': f'/static/results/{result_filename}',
                'detections': results['detections'],
                'total_wounds': results['total_wounds']
            }

            return jsonify(response)
        
        except Exception as e:
            print((f"Error during detection: {e}"))
            traceback.print_exc()
            return jsonify({'error': f'Detection failed: {str(e)}'}), 500
        
    return jsonify({'error': 'Invalid file format'}), 400

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')