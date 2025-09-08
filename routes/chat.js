import express from 'express';
import axios from 'axios';
import Chat from '../models/chat.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/history/latest', async (req, res) => {
  try {
    const chat = await Chat.findOne({ userId: req.userId }).sort({ updatedAt: -1 });
    if (!chat) return res.json({ chat: null });
    res.json({ chat });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch latest chat' });
  }
});

router.post('/', async (req, res) => {
  const { messages, content, chatId } = req.body;

  try {
    if (!chatId) {
      return res.status(400).json({ error: 'No chatId provided' });
    }

    let chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const userText = typeof content === 'string' ? content : messages?.at(-1)?.content;
    if (!userText) {
      return res.status(400).json({ error: 'No content provided' });
    }

    chat.messages.push({ role: 'user', content: userText });

    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: "mistralai/mistral-7b-instruct",
      messages: chat.messages.slice(-20),
    }, {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const assistantMsg = response.data.choices[0].message;
    chat.messages.push(assistantMsg);
    await chat.save();

    res.json({ reply: assistantMsg, chatId: chat._id });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Chat error' });
  }
});

router.get('/history/all', async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.userId }).sort({ updatedAt: -1 });

    const formattedChats = chats.map(chat => ({
      _id: chat._id,
      preview: chat.messages?.[0]?.content || '',
      updatedAt: chat.updatedAt
    }));

    res.json({ chats: formattedChats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

router.post('/new', async (req, res) => {
  try {
    const newChat = await Chat.create({ userId: req.userId, messages: [] });
    res.status(201).json({ chatId: newChat._id });
  } catch (err) {
    console.error('Error creating new chat:', err);
    res.status(500).json({ error: 'Failed to create new chat' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.userId });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    res.json({ chat });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load chat' });
  }
});

export default router;
