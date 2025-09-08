// models/mindmap.js
import mongoose from 'mongoose';

const nodeSchema = new mongoose.Schema({
  id: String,
  label: String,
  x: Number,
  y: Number,
});

const edgeSchema = new mongoose.Schema({
  id: String,
  source: String,
  target: String,
});

const mindMapSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  noteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Note', required: true },
  nodes: [nodeSchema],
  edges: [edgeSchema],
}, { timestamps: true });

mindMapSchema.index({ userId: 1, noteId: 1 }, { unique: true });

export default mongoose.model('MindMap', mindMapSchema);
