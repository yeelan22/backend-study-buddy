import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { queryNotesForRAG } from '../utils/EmbedAndStore.js'; // updated import
import Chat from '../models/chat.js';

const router = express.Router();
router.use(authenticate);

router.post('/', async (req, res) => {
  const { query, chatId } = req.body;
  if (!query) return res.status(400).json({ error: 'No query' });

  try {
    let chat;

    // Retrieve existing chat if chatId provided
    if (chatId) {
      chat = await Chat.findOne({ _id: chatId, userId: req.userId });
    }

    // If chat not found, create new one
    if (!chat) {
      chat = await Chat.create({ userId: req.userId, messages: [] });
    }

    const userMessage = { role: 'user', content: query };

    // ✅ Use the new queryNotesForRAG that handles embeddings properly
    const results = await queryNotesForRAG(query, req.userId);

    // Construct assistant message
    const assistantContent =
      results && results.documents && results.documents.length
        ? results.documents.map((doc, i) => `Chunk ${i}: ${doc}`).join('\n\n')
        : 'No relevant notes found.';

    const assistantMessage = { role: 'assistant', content: assistantContent };

    // Store messages in chat
    chat.messages.push(userMessage, assistantMessage);
    await chat.save();

    res.json({ reply: assistantMessage, chatId: chat._id });
  } catch (err) {
    console.error('❌ Chat route error:', err);
    res.status(500).json({ error: 'RAG error' });
  }
});

export default router;
