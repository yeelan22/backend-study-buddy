from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import fitz  # PyMuPDF
import io
import pytesseract
from PIL import Image

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/extract_pdf_text")
async def extract_pdf_text(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        pdf_doc = fitz.open(stream=contents, filetype="pdf")
        full_text = ""

        for page_num in range(pdf_doc.page_count):
            page = pdf_doc.load_page(page_num)
            text = page.get_text("text")
            if text.strip():
                full_text += text + "\n"
            else:
                # If no text layer, fallback to OCR
                pix = page.get_pixmap(dpi=300)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                ocr_text = pytesseract.image_to_string(img, lang='fra+eng')
                full_text += ocr_text + "\n"

        return {"text": full_text}

    except Exception as e:
        return {"error": str(e)}
