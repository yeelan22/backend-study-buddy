import express from 'express';
import Note from '../models/note.js';
import Upload from '../models/upload.js';
import { authenticate } from '../middleware/auth.js';
import { generateMemoryData } from '../utils/llm.js'; 
import { computeNextInterval } from '../utils/computeNextInterval.js';
const router = express.Router()

router.post('/process', authenticate, async (req, res) => {
  const userId = req.userId;

  try {
    const uploads = await Upload.find({ owner: userId, processed: false });

    const processed = [];
    for (const up of uploads) {
      const { text, _id: uploadId } = up;

      const { category, title, qa } = await generateMemoryData(text); // ⬅️ make sure this function exists

      const note = new Note({
        userId, // ✅ matches your Note model
        upload: uploadId,
        category,
        title,
        qa,
        processed: true,
      });

      await note.save();

      up.processed = true;
      await up.save();

      processed.push(note);
    }

    res.json(processed);
  } catch (err) {
    console.error("❌ Error processing notes:", err);
    res.status(500).json({ error: 'Server error during note processing' });
  }
});

// Fetch all notes grouped by category
router.get('/', authenticate, async (req, res) => {
  const userId = req.userId; // ✅ fixed
  const notes = await Note.find({ userId }); // ✅ match your Note schema

  const byCat = notes.reduce((acc, n) => {
    (acc[n.category] ||= []).push(n);
    return acc;
  }, {});
  res.json(byCat);
});

router.post('/session/:noteId', authenticate, async (req, res) => {
  const { noteId } = req.params;
  const { rating, wrongCount, durationMs } = req.body;
  const note = await Note.findOne({ _id: noteId, userId: req.userId });
  if (!note) return res.status(404).send();

  const quality = rating === 'Easy' ? 5 : rating === 'Medium' ? 3 : 1;
  const nextInterval = computeNextInterval(note.intervalDays, quality, wrongCount);
  note.lastReviewed = new Date();
  note.intervalDays = nextInterval;
  note.nextDue = new Date(Date.now() + nextInterval * 86400000);
  note.incorrectCount = (note.incorrectCount || 0) + wrongCount;
  note.totalTimeMs = (note.totalTimeMs || 0) + durationMs;
  note.difficulty = rating;
  await note.save();

  const maxInterval = 60;

  if (nextInterval > maxInterval || (quality === 5 && note.intervalDays >= 30)) {
    note.nextDue = null;
    note.mastered = true;
  } else {
    note.nextDue = new Date(Date.now() + nextInterval * 86400000);
  }


  res.json({ nextDue: note.nextDue });
});

router.get('/schedule', authenticate, async (req, res) => {
  try {
    console.log('✅ AUTH userId:', req.userId); // <-- Add this!

    const sessions = await Note.find({
      userId: req.userId,
      nextDue: { $gte: new Date(), $lte: new Date(Date.now() + 30 * 86400000) }
    }).select('_id title nextDue intervalDays');

    const result = sessions.map(s => ({
      noteId: s._id,
      title: s.title,
      nextDue: s.nextDue,
      intervalDays: s.intervalDays,
    }));

    console.log('✅ Sessions returned:', result.length);

    res.json(result);
  } catch (err) {
    console.error('❌ Error in /schedule route:', err); // <-- This is key
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});
router.get('/:userId', async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.params.userId }).sort({ uploadedAt: -1 });
    res.json(notes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch notes' });
  }
});



export default router;
