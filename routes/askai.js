import express from 'express';
import { authenticate } from '../middleware/auth.js';
import MindMap from '../models/mindmap.js';
import Note from '../models/note.js';
import { askMindMapAgent } from '../utils/askAgent.js';

const router = express.Router();

// POST /api/askai/:noteId
router.post('/:noteId', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { noteId } = req.params;
    const { prompt, nodes, edges } = req.body;

    console.log('📥 AskAI request received:', { userId, noteId, prompt });

    const note = await Note.findOne({ _id: noteId, userId });
    if (!note) {
      console.warn('⚠️ Note not found');
      return res.status(404).json({ error: 'Note not found' });
    }

    const map = await MindMap.findOne({ userId, noteId });
    if (!map) {
      console.warn('⚠️ Mind map not found');
      return res.status(404).json({ error: 'Mind map not found' });
    }

    const response = await askMindMapAgent({
      prompt,
      noteText: note.extractedText,
      nodes: map.nodes,
      edges: map.edges,
    });

    console.log('🤖 AI agent response:', response);
    res.json(response);
  } catch (err) {
    console.error('❌ AskAI route error:', err);
    res.status(500).json({ error: 'AI assistant error' });
  }
});


export default router;
