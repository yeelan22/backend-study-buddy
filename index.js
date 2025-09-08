import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import chatRoutes from './routes/chat.js';
import authRoutes from './routes/auth.js';
import uploadRoute from './routes/upload.js';
import notesRoutes from './routes/notes.js';
import ragRoutes from './routes/rag.js';
import mindmapRoutes from './routes/mindmap.js';
import askaiRoutes from './routes/askai.js';



dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads')); 


app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoute);
app.use('/api/notes', notesRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/mindmap', mindmapRoutes);
app.use('/api/askai', askaiRoutes);


mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(process.env.PORT, () => console.log(`Server running on ${process.env.PORT}`));
  })
  .catch((err) => console.error('Mongo error', err));

