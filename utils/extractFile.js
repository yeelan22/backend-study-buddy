import axios from "axios";
import mammoth from "mammoth";
import Tesseract from "tesseract.js";

const PYTHON_API = process.env.PYTHON_EXTRACTOR_URL || "http://localhost:8001/extract";

// DOCX extraction
export async function extractTextFromDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

// Image extraction
export async function extractTextFromImage(buffer) {
  const result = await Tesseract.recognize(buffer, "fra+eng");
  return result.data.text;
}

// PDF extraction via Python service
export async function extractTextFromPDF(buffer, filename = "file.pdf") {
  const formData = new FormData();
  formData.append("file", new Blob([buffer]), filename);

  const headers = formData.getHeaders ? formData.getHeaders() : { "Content-Type": "multipart/form-data" };

  const response = await axios.post(PYTHON_API, formData, {
    headers,
    timeout: 60000, // 1 minute
  });

  if (response.data.error) {
    throw new Error(response.data.error);
  }

  return response.data.text;
}
