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

lock = threading.Lock()

load_dotenv(".env.local")

client = Together(api_key=os.getenv('TOGETHER_API_KEY'))
message = [
            {"role": "user", "content": "Your task is to translate text from Japanese to English. You can use before conversation for context, but your final answer should only give the translation. Do not provide any additional explanations or comments. Only return the translation of the given text. The result of the translate should pay attention to the atmosphere of the original text, and the translation should be accurate, maintain the original tone, handle cultural nuances, and ensure proper grammar and terminology."},
            {"role": "assistant", "content": "The task is to translate Japanese text into English, using prior conversations for context if necessary, but ensuring the final output is solely the translation without additional commentary. The translation should be accurate, maintain the original tone, handle cultural nuances, and ensure proper grammar and terminology."}
          ]

app = Flask(__name__)
CORS(app)

ocr = MangaOcr()
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
PROCESS_FOLDER = os.path.join(os.getcwd(), 'process') 
ALLOWED_EXTENSIONS = {'zip', 'png', 'jpg', 'jpeg', 'webp'}

deepl_translator = deepl.Translator(os.getenv('DEEPL_API_KEY'))

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
            output_path = os.path.join(app.config['UPLOAD_PROCESS'], output_filename)
            cropped_img.save(output_path)

            # Perform OCR on the processed image
            text = ocr(output_path)
            print(f"OCR text (raw): {text}")

            translated_text = ""
            if (method == "method1"):
                print("Using method 1")
                message.append({"role": "user", "content": text})
                
                response = client.chat.completions.create(
                    model="meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
                    messages=message,
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
                translated = deepl_translator.translate_text(text, target_lang="EN-US")
                translated_text = translated.text
            
            print(type(translated_text))
            print(f"Translated text: {translated_text}")
            message.append({"role": "assistant", "content": translated_text})

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

@app.route('/clear_cache', methods=['POST'])
def clear_translation_cache():
    try :
        message = [
            {"role": "user", "content": "Your task is to translate text from Japanese to English. You can use before conversation for context, but your final answer should only give the translation. Do not provide any additional explanations or comments. Only return the translation of the given text. The result of the translate should pay attention to the atmosphere of the original text, and the translation should be accurate, maintain the original tone, handle cultural nuances, and ensure proper grammar and terminology."},
            {"role": "assistant", "content": "The task is to translate Japanese text into English, using prior conversations for context if necessary, but ensuring the final output is solely the translation without additional commentary. The translation should be accurate, maintain the original tone, handle cultural nuances, and ensure proper grammar and terminology."}
            #
        ]

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

