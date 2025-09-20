import { getUserCollection } from '../vector/chroma.js';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { pipeline } from '@xenova/transformers';

// ✅ Load Xenova embedding model once
const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

/**
 * Splits a note into chunks, embeds them, and stores them in Chroma.
 */
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

      // ✅ Generate embedding with Xenova
      const embeddingTensor = await embedder(chunk, { pooling: 'mean', normalize: true });
      const embedding = Array.from(embeddingTensor.data);

      await collection.add({
        ids: [id],
        documents: [chunk],
        embeddings: [embedding], // ✅ Explicitly store embeddings
        metadatas: [{ userId, noteId, chunkIndex: i }],
      });

      console.log(`✅ Stored chunk ${i} for note ${noteId}:`, chunk.slice(0, 50), '...');
    }

    return chunks.length;
  } catch (err) {
    console.error('❌ Error in processNoteForRAG:', err);
    throw err;
  }
}

/**
 * Queries Chroma with a user’s question, using manual embeddings (avoids dummyEmbeddingFunction).
 */
export async function queryNotesForRAG(queryText, userId, nResults = 5) {
  try {
    const collection = await getUserCollection(userId);

    // ✅ Embed the query manually (don’t rely on Chroma’s embeddingFunction)
    const queryTensor = await embedder(queryText, { pooling: 'mean', normalize: true });
    const queryEmbedding = Array.from(queryTensor.data);

    console.log(`🔍 Querying Chroma with: "${queryText}"`);

    const results = await collection.query({
      queryEmbeddings: [queryEmbedding], // ✅ FIX: manual embeddings only
      nResults,
      include: ['documents', 'metadatas'],
    });

    console.log('📊 Chroma query results:', JSON.stringify(results, null, 2));
    return results;
  } catch (err) {
    console.error('❌ Error in queryNotesForRAG:', err);
    throw err;
  }
}
