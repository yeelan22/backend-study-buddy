import express from 'express';
import crypto from 'crypto';

import { generateMemoryData } from '../utils/llm.js';
import upload from '../middleware/upload.js';
import { extractTextFromPDF, extractTextFromDocx, extractTextFromImage } from '../utils/extractFile.js';
import Note from '../models/note.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, upload.single('note'), async (req, res) => {
  try {
    const file = req.file;
    const userId = req.userId;
    if (!file || !userId) {
      return res.status(400).json({ error: 'No file or user ID' });
    }

    const buffer = file.buffer;
    const hash = crypto.createHash('md5').update(buffer).digest('hex');

    const existing = await Note.findOne({ hash, userId });
    if (existing) {
      return res.status(409).json({
        error: 'Duplicate file detected',
        filename: existing.filename,
        extractedText: existing.extractedText,
      });
    }

    let extractedText = '';
    const mimetype = file.mimetype;

    if (mimetype === 'application/pdf') {
      extractedText = await extractTextFromPDF(buffer, file.originalname);
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      extractedText = await extractTextFromDocx(buffer);
    } else if (mimetype.startsWith('image/')) {
      extractedText = await extractTextFromImage(buffer);
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    let category = '', title = '', qa = [];
    try {
      console.log('📝 Extracted text for LLM:', extractedText.slice(0, 300));
      const memoryData = await generateMemoryData(extractedText);
      category = memoryData.category || '';
      title = memoryData.title || '';
      qa = memoryData.qa || [];
      console.log('✅ LLM result:', { category, title, qaCount: qa.length });
    } catch (err) {
      console.error('❌ AI Q&A generation failed:', err);
    }

    const note = await Note.create({
      filename: file.originalname,
      filetype: mimetype,
      extractedText,
      hash,
      userId,
      category,
      title,
      qa,
      processed: true,
    });

    console.log('✅ Note saved:', note);
    res.json(note);
  } catch (err) {
    console.error('❌ Upload error:', err);
    res.status(500).json({ error: 'Failed to process uploaded file' });
  }
});

export default router;
