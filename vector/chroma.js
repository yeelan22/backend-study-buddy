import { ChromaClient } from 'chromadb';

const client = new ChromaClient({ path: 'http://localhost:8000' });

// Dummy embedding function to satisfy Chroma interface
const dummyEmbeddingFunction = {
  generate: async () => {
    throw new Error('Use Xenova to embed manually.');
  },
};

export const getUserCollection = async (userId) => {
  const collectionName = `notes-${userId}`;

  // 1. Check if collection exists
  const existing = await client.listCollections();
  console.log('🧠 Existing collections:', existing.map(c => c.name));

  const match = existing.find(c => c.name === collectionName);

  // 2. If it exists, get it (and inject dummyEmbedder just in memory)
  if (match) {
    try {
      const col = await client.getCollection({ name: collectionName });
      col.embeddingFunction = dummyEmbeddingFunction; // Safe inject
      console.log(`✅ Using existing collection: ${collectionName}`);
      console.log('📁 Collection ready:', collectionName);
      return col;
    } catch (err) {
      console.warn(`❌ Broken collection: ${collectionName}. Please delete it manually.`);
      throw new Error(`Collection "${collectionName}" is corrupted.`);
    }
  }

  // 3. Otherwise, create a new one
  const newCol = await client.createCollection({
    name: collectionName,
    embeddingFunction: dummyEmbeddingFunction,
  });

  console.log(`✨ Created new collection: ${collectionName}`);
  return newCol;
};
