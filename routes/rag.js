import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { answerWithRAG } from '../utils/queryRAG.js';
import Chat from '../models/chat.js';

const router = express.Router();
router.use(authenticate);

router.post('/', async (req, res) => {
  const { query, chatId } = req.body;
  if (!query) return res.status(400).json({ error: 'No query' });

  try {
    let chat;

    if (chatId) {
      chat = await Chat.findOne({ _id: chatId, userId: req.userId });
    }

    // If chat not found, create new one
    if (!chat) {
      chat = await Chat.create({ userId: req.userId, messages: [] });
    }

    const userMessage = { role: 'user', content: query };
    const assistantMessage = await answerWithRAG(req.userId, query);

    // Store messages
    chat.messages.push(userMessage, assistantMessage);
    await chat.save();

    res.json({ reply: assistantMessage, chatId: chat._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'RAG error' });
  }
});

export default router;

