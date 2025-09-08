import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Note from '../models/note.js';
import { processNoteForRAG } from '../utils/EmbedAndStore.js';

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
console.log('✅ MongoDB connected');

const notes = await Note.find();

for (const note of notes) {
  console.log(`🔁 Re-indexing note: ${note.filename} (${note._id})`);
  try {
    await processNoteForRAG(note.extractedText, note._id.toString(), note.userId.toString());
  } catch (err) {
    console.error(`❌ Failed to process note ${note._id}:`, err.message);
  }
}

console.log('✅ Re-indexing complete');
process.exit();
