# 📖 **MyRead - Web-Based App for Reading Manga**

![ayank](https://github.com/user-attachments/assets/92fa70d4-bede-4124-82ed-085c450ca7ca)

**MyRead** is a web-based application that allows users to read and translate raw manga at the same time. 

---

## 🛠️ **Tech Stack**

### **Frontend:**
- **React** with **TypeScript**
- **Tailwind CSS** for styling

### **Backend:**
- **Flask** (Python)
- **Mokuro-OCR** for japanese character recognition, https://github.com/kha-white/mokuro
- **YOLOv8s** for automatic detection

---

## ⚙️ **Installation**

### Clone
```bash
git clone https://github.com/Fariz36/MyRead-ReaderAndTranslation.git
```

### Backend
```bash
cd backend                       # Moes into the backend directory
python -m venv venv              # Make a venv
venv/Script/activate      # Activate the venv
pip install -r requirement.txt
```

### Frontend

```bash
cd frontend                      # goes to the frontend directory
npm install
npm install axios
```

## Usage

Activate the frontend
```bash
npm start
```

Activate the backend
```bash
python app.py
```

Then you can access the app at ```localhost:3000```

You can upload a single image (.png, .jpg, .jpeg, or .webp extension), or a zip file. This app can perform perfectly on sub-directories zip. 
After you finish uploading, the image will be shown.

To start translating the manga, you can press the "crop button", and start selecting the text you want to translate. Afterward, it should be pretty straightforward. Have fun!

## 🚧 Limitation and Plan
- While this app is working perfectly on small amount of japanese character, 
- The labour to drag the text is time-consuming. I already made a model to recognize those text, but it still not work as great as normal human attemp
- Im planning to add image editing feature next
