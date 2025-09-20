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

    console.debug(`[mindmap] Generating mindmap for note ${noteId} (text length: ${String(note.extractedText || "").length})`);

    const { nodes, edges, summary } = await generateMindMapFromText(note.extractedText);

    console.debug(`[mindmap] LLM returned nodes:${nodes?.length ?? 0} edges:${edges?.length ?? 0}`);
    if (nodes?.length) console.debug("First node:", nodes[0]);
    if (edges?.length) console.debug("First edge:", edges[0]);

    // Save nodes, edges, and summary to DB
    const map = await MindMap.findOneAndUpdate(
      { userId, noteId },
      { nodes, edges, summary },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.debug(`[mindmap] Saved map for note ${noteId} (mapId: ${map._id})`);

    res.json({ nodes, edges, summary });
  } catch (err) {
    console.error('❌ Mind map generation failed:', err);
    res.status(500).json({ error: 'Mind map generation error', detail: err?.message ?? String(err) });
  }
});

// GET /mindmap/:noteId - get saved map
router.get('/:noteId', authenticate, async (req, res) => {
  try {
    const map = await MindMap.findOne({ userId: req.userId, noteId: req.params.noteId });
    if (!map) return res.status(404).json({ error: 'Mind map not found' });
    res.json({ nodes: map.nodes, edges: map.edges, summary: map.summary });
  } catch (err) {
    console.error('❌ Error fetching mindmap:', err);
    res.status(500).json({ error: 'Failed to fetch mind map' });
  }
});

// PUT /mindmap/:noteId - update mind map nodes/edges (optional summary)
router.put('/:noteId', authenticate, async (req, res) => {
  const userId = req.userId;
  const { noteId } = req.params;
  const { nodes, edges, summary } = req.body;

  try {
    // Basic validation
    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      return res.status(400).json({ error: 'Invalid payload. "nodes" and "edges" arrays required.' });
    }

    const map = await MindMap.findOneAndUpdate(
      { userId, noteId },
      { nodes, edges, ...(summary ? { summary } : {}) },
      { upsert: true, new: true }
    );

    res.json(map);
  } catch (err) {
    console.error('❌ Mind map update failed:', err);
    res.status(500).json({ error: 'Mind map update error' });
  }
});

export default router;
