from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import zipfile
import uuid
from PIL import Image
import io
from together import Together
from manga_ocr import MangaOcr
from dotenv import load_dotenv
import threading
import deepl
from ultralytics import YOLO

lock = threading.Lock()

load_dotenv(".env.local")

client = Together(api_key=os.getenv('TOGETHER_API_KEY'))
message = [
    {"role": "system",
             "content": "Translate the given text into English while preserving the tone, politeness level, and atmosphere of the original manga dialogue. Maintain a natural manga-style flow, keeping speech patterns and expressions authentic to the genre. If you detect any lewdness on the text given, you the tone should be more flirtatious. Do not add explanations, interpretations, or additional comments—only return the translated dialogue."}
]

app = Flask(__name__)
CORS(app)

ocr = MangaOcr()
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
PROCESS_FOLDER = os.path.join(os.getcwd(), 'process')
ALLOWED_EXTENSIONS = {'zip', 'png', 'jpg', 'jpeg', 'webp'}

deepl_translator = deepl.Translator(os.getenv('DEEPL_API_KEY'))

best1 = YOLO("best1.pt")
best2 = YOLO("best2.pt")

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

if not os.path.exists(PROCESS_FOLDER):
    os.makedirs(PROCESS_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['UPLOAD_PROCESS'] = PROCESS_FOLDER


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

        if filename.endswith('.zip'):
            file.save(file_path)
            handle_zip(file_path)
        else:
            file.save(file_path)

        images = []
        for files in os.listdir(app.config['UPLOAD_FOLDER']):
            if files.endswith('.png') or files.endswith('.jpg') or files.endswith('.jpeg') or files.endswith('.webp'):
                images.append(f"/uploads/{files}")

        print(f"images : {images}")

        return jsonify({'images': images}), 200
    return jsonify({'error': 'File type not allowed'}), 400


@app.route('/clear', methods=['POST'])
def clear_uploads():
    print("Clearing uploads folder...")
    try:
        for root, dirs, files in os.walk(UPLOAD_FOLDER, topdown=False):
            for file in files:
                file_path = os.path.join(root, file)
                if os.path.isfile(file_path):
                    print(f"Removing file: {file_path}")
                    os.remove(file_path)

            # Optionally, remove empty directories
            for dir in dirs:
                dir_path = os.path.join(root, dir)
                if not os.listdir(dir_path):  # Check if the directory is empty
                    print(f"Removing empty directory: {dir_path}")
                    os.rmdir(dir_path)

        return jsonify({'message': 'All files and empty directories cleared successfully'}), 200
    except Exception as e:
        print(f"Error clearing files: {e}")
        return jsonify({'error': str(e)}), 500


def handle_zip(zip_path: str) -> list[str]:
    images = []
    upload_folder = app.config['UPLOAD_FOLDER']

    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        for file in zip_ref.namelist():
            # Check if the file is an image with allowed extensions
            if file.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                # Get only the file name without the directory path
                file_name = os.path.basename(file)

                # Extract the image directly to the upload folder
                destination_path = os.path.join(upload_folder, file_name)

                # Avoid overwriting files with the same name
                counter = 1
                base_name, extension = os.path.splitext(file_name)
                while os.path.exists(destination_path):
                    file_name = f"{base_name}_{counter}{extension}"
                    destination_path = os.path.join(upload_folder, file_name)
                    counter += 1

                # Extract the file
                with zip_ref.open(file) as source, open(destination_path, 'wb') as target:
                    target.write(source.read())

                # Store the relative path for returning
                images.append(f"/uploads/{file_name}")
                print(f"Extracted {file_name} to {destination_path}")

    # Remove the original zip file
    os.remove(zip_path)
    return images


@app.route('/uploads/<filename>')
def serve_uploaded_file(filename):
    print(f"Serving file: {filename}")
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


@app.route('/process_region', methods=['POST'])
def process_region():
    lock.acquire()
    try:
        data = request.json
        image_url = data['image']
        region = data['region']
        method = data['method']

        # Extract the filename from the URL
        image_filename = image_url.split('/')[-1]
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], image_filename)

        with Image.open(image_path) as img:
            # Ensure the region is within the image bounds
            region['x'] = max(0, min(region['x'], img.width))
            region['y'] = max(0, min(region['y'], img.height))
            region['width'] = min(region['width'], img.width - region['x'])
            region['height'] = min(region['height'], img.height - region['y'])

            cropped_img = img.crop((region['x'], region['y'],
                                    region['x'] + region['width'],
                                    region['y'] + region['height']))

            # Process the cropped image here
            # For this example, we'll just save it as a new file
            output_filename = f"processed_{uuid.uuid4()}.png"
            output_path = os.path.join(
                app.config['UPLOAD_PROCESS'], output_filename)
            cropped_img.save(output_path)

            # Perform OCR on the processed image
            text = ocr(output_path)
            print(f"OCR text (raw): {text}")

            translated_text = ""
            if (method == "method1"):
                print("Using method 1")

                new_message = message.copy()
                new_message.append({"role": "user", "content": text})

                response = client.chat.completions.create(
                    model="meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
                    messages=new_message,
                    max_tokens=None,
                    temperature=0.7,
                    top_p=0.7,
                    top_k=50,
                    repetition_penalty=1,
                    stop=["<｜end▁of▁sentence｜>"],
                    stream=True
                )

                for token in response:
                    if hasattr(token, 'choices'):
                        translated_text += token.choices[0].delta.content

            # UNCOMMENT THIS TO USE DEEPL
            else:
                print("Using method 2")
                translated = deepl_translator.translate_text(
                    text, target_lang="EN-US")
                translated_text = translated.text

            print(type(translated_text))
            print(f"Translated text: {translated_text}")

            return jsonify({
                'message': 'Region processed successfully',
                'processed_image': f"/uploads/{output_filename}",
                'text': text,
                'translated_text': translated_text
            }), 200
    except Exception as e:
        print(f"Error processing region: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        lock.release()


@app.route('/scan', methods=['POST'])
def scan():
    data = request.json
    try:
        print("Scanning all images in the uploads folder...")
        image_url = data['image']
        method = data['method']

        image_filename = image_url.split('/')[-1]
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], image_filename)

        if (method == "model1"):
            # scan using best1.pt
            boxes = []
            results = best1.predict(
                source=image_path,
                project=app.config['UPLOAD_PROCESS'],
                device="cpu",
            )
        else:
            # scan using best2.pt
            results = best2.predict(
                source=image_path,
                project=app.config['UPLOAD_PROCESS'],
                device="cpu",
            )

        final_boxes = []

        if len(results) == 0:
            return jsonify({'message': 'No boxes detected', 'boxes': []}), 200

        boxes = results[0].boxes.xyxy
        confidences = results[0].boxes.conf

        for box, conf in zip(boxes, confidences):
            if (conf >= 0.3):
                x1, y1, x2, y2 = box.tolist()
                final_boxes.append({"x1": x1, "y1": y1, "x2": x2, "y2": y2})

        return jsonify({
            'message': 'Images scanned successfully',
            'boxes': final_boxes
        }), 200
    except Exception as e:
        print(f"images : {data['image']}")
        print(f"Error scanning images: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/clear_cache', methods=['POST'])
def clear_translation_cache():
    try:
        for root, dirs, files in os.walk(PROCESS_FOLDER, topdown=False):
            for file in files:
                file_path = os.path.join(root, file)
                if os.path.isfile(file_path):
                    print(f"Removing file: {file_path}")
                    os.remove(file_path)

        return jsonify({'message': 'Translation cache cleared successfully'}), 200
    except Exception as e:
        print(f"Error clearing translation cache: {e}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
