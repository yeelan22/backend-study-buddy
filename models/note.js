import mongoose from 'mongoose';

const QAPair = new mongoose.Schema({
  question: String,
  answer: String,
}, { _id: false });

const noteSchema = new mongoose.Schema({
  filename: String,
  filetype: String,
  filepath: String,
  extractedText: String,
  hash: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  // MemoryZone fields
  category: String,
  title: String,
  qa: [QAPair],
  processed: {
    type: Boolean,
    default: false,
  },
  lastReviewed: Date,
  intervalDays: { type: Number, default: 1 },
  incorrectCount: { type: Number, default: 0 },
  totalTimeMs: { type: Number, default: 0 },
  difficulty: { type: String, enum: ['Easy','Medium','Hard'], default: 'Medium' },
  nextDue: Date // computed from lastReviewed + intervalDays

});

// ✅ FIXED: Unique per file **per user**
noteSchema.index({ hash: 1, userId: 1 }, { unique: true });

export default mongoose.model('Note', noteSchema);
