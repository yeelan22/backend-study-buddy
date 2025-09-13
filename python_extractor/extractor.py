from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
from io import BytesIO
from docx import Document

app = FastAPI()

# Allow CORS so Vercel Node.js can call it
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict in prod
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/extract")
async def extract_text(file: UploadFile = File(...)):
    content = await file.read()
    text = ""

    if file.content_type == "application/pdf":
        doc = fitz.open(stream=content, filetype="pdf")
        for page in doc:
            text += page.get_text()
    elif file.content_type in [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword"
    ]:
        doc = Document(BytesIO(content))
        for p in doc.paragraphs:
            text += p.text + "\n"
    elif file.content_type.startswith("image/"):
        image = Image.open(BytesIO(content))
        text = pytesseract.image_to_string(image, lang='fra+eng')
    else:
        return {"error": "Unsupported file type"}

    return {"text": text}
