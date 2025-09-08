import { getUserCollection } from '../vector/chroma.js';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { pipeline } from '@xenova/transformers';

const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

export async function processNoteForRAG(noteText, noteId, userId) {
  try {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
    });

    const chunks = await splitter.splitText(noteText);
    console.log(`📝 Note split into ${chunks.length} chunks`);

    const collection = await getUserCollection(userId);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const id = `${noteId}-${i}`;

      const embeddingTensor = await embedder(chunk, { pooling: 'mean', normalize: true });
      const embedding = Array.from(embeddingTensor.data);

      await collection.add({
        ids: [id],
        documents: [chunk],
        embeddings: [embedding],
        metadatas: [{ userId, noteId, chunkIndex: i }],
      });

      console.log(`✅ Stored chunk ${i} for note ${noteId}:`, chunk.slice(0, 50), '...');
      console.log(`✅ Added embedding for chunk ${i}:`, chunk.slice(0, 50));
    }

    return chunks.length;

  } catch (err) {
    console.error('❌ Error in processNoteForRAG:', err);
    throw err;
  }
}
