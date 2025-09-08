import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { readFile, access } from 'fs/promises';
import path from 'path';
import Tesseract from 'tesseract.js';

export async function extractTextFromPDF(filePath) {
  const buffer = await readFile(path.resolve(filePath));
  const data = await pdf(buffer);
  return data.text;
}

export async function extractTextFromDocx(filePath) {
  const buffer = await readFile(path.resolve(filePath));
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function extractTextFromImage(filePath) {
  const result = await Tesseract.recognize(filePath, 'eng');
  return result.data.text;
}
