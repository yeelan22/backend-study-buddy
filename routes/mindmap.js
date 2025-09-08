// routes/mindmap.js
import express from 'express';
import MindMap from '../models/mindmap.js';
import Note from '../models/note.js';
import { authenticate } from '../middleware/auth.js';
import { generateMindMapFromText } from '../utils/llm.js';

const router = express.Router();

// POST /mindmap/:noteId - generate & store mind map
router.post('/:noteId', authenticate, async (req, res) => {
  const userId = req.userId;
  const { noteId } = req.params;

  try {
    const note = await Note.findOne({ _id: noteId, userId });
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const { nodes, edges, summary } = await generateMindMapFromText(note.extractedText);

    const map = await MindMap.findOneAndUpdate(
      { userId, noteId },
      { nodes, edges },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ nodes, edges, summary });
  } catch (err) {
    console.error('❌ Mind map generation failed:', err);
    res.status(500).json({ error: 'Mind map generation error' });
  }
});

// GET /mindmap/:noteId - get saved map
router.get('/:noteId', authenticate, async (req, res) => {
  const map = await MindMap.findOne({ userId: req.userId, noteId: req.params.noteId });
  if (!map) return res.status(404).json({ error: 'Mind map not found' });
  res.json({ nodes: map.nodes, edges: map.edges });
});

// PUT /mindmap/:noteId - update mind map nodes/edges
router.put('/:noteId', authenticate, async (req, res) => {
  const userId = req.userId;
  const { noteId } = req.params;
  const { nodes, edges } = req.body;

  try {
    const map = await MindMap.findOneAndUpdate(
      { userId, noteId },
      { nodes, edges },
      { upsert: true, new: true } // upsert = create if doesn't exist
    );

    res.json(map);
  } catch (err) {
    console.error('❌ Mind map update failed:', err);
    res.status(500).json({ error: 'Mind map update error' });
  }
});


export default router;
