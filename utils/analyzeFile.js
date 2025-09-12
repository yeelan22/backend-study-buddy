import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';

// ✅ PDF extractor: now takes a Buffer directly
export async function extractTextFromPDF(buffer) {
  const data = await pdf(buffer);
  return data.text;
}

// ✅ DOCX extractor: now takes a Buffer directly
export async function extractTextFromDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

// ✅ Image extractor: Tesseract accepts Buffer too
export async function extractTextFromImage(buffer) {
  const result = await Tesseract.recognize(buffer, 'eng');
  return result.data.text;
}
