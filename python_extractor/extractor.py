from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
from io import BytesIO
from docx import Document

app = FastAPI()

# Allow CORS so your frontend can call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/extract")
async def extract_text(file: UploadFile = File(...)):
    """
    Extract text from PDF, DOCX/DOC, or images.
    Returns JSON: { "text": "<extracted_text>" }
    """
    content = await file.read()
    text = ""

    # PDF: accept multiple content types
    if file.content_type in ["application/pdf", "application/octet-stream", "application/x-pdf"]:
        try:
            doc = fitz.open(stream=content, filetype="pdf")
            for page in doc:
                text += page.get_text()
        except Exception as e:
            return {"error": f"PDF parsing failed: {str(e)}"}

    # DOCX / DOC
    elif file.content_type in [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword"
    ]:
        try:
            doc = Document(BytesIO(content))
            for p in doc.paragraphs:
                text += p.text + "\n"
        except Exception as e:
            return {"error": f"DOC/DOCX parsing failed: {str(e)}"}

    # Images
    elif file.content_type.startswith("image/"):
        try:
            image = Image.open(BytesIO(content))
            text = pytesseract.image_to_string(image, lang='fra+eng')
        except Exception as e:
            return {"error": f"Image OCR failed: {str(e)}"}

    # Unsupported
    else:
        return {"error": f"Unsupported file type: {file.content_type}"}

    return {"text": text}
