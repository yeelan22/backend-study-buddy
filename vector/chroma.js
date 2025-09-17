import { ChromaClient } from 'chromadb';

console.log("🔧 Loading Chroma client...");

const chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';
console.log("🌍 CHROMA_URL resolved to:", chromaUrl);

const client = new ChromaClient({ path: chromaUrl });

// Optional: quick connectivity test
(async () => {
  try {
    console.log("🔗 Testing Chroma connectivity...");
    const res = await fetch(`${chromaUrl}/api/v1/collections`).then(r => r.json());
    console.log("✅ Direct fetch to Chroma succeeded:", res);
  } catch (err) {
    console.error("❌ Direct fetch to Chroma failed:", err.message);
  }
})();

// Dummy embedding function
const dummyEmbeddingFunction = {
  generate: async () => {
    throw new Error('Use Xenova to embed manually.');
  },
};

export const getUserCollection = async (userId) => {
  const collectionName = `notes-${userId}`;
  console.log(`📂 Requesting collection: ${collectionName}`);

  try {
    console.log("🔍 Listing collections from Chroma...");
    const existing = await client.listCollections();
    console.log("🧠 Existing collections:", existing.map(c => c.name));

    const match = existing.find(c => c.name === collectionName);

    if (match) {
      try {
        console.log(`✅ Found existing collection: ${collectionName}, fetching...`);
        const col = await client.getCollection({ name: collectionName });
        col.embeddingFunction = dummyEmbeddingFunction;
        console.log(`📁 Collection ready: ${collectionName}`);
        return col;
      } catch (err) {
        console.warn(`❌ Failed to fetch collection: ${collectionName}`, err.message);
        throw new Error(`Collection "${collectionName}" is corrupted.`);
      }
    }

    console.log(`✨ Creating new collection: ${collectionName}`);
    const newCol = await client.createCollection({
      name: collectionName,
      embeddingFunction: dummyEmbeddingFunction,
    });

    console.log(`📦 Created new collection: ${collectionName}`);
    return newCol;
  } catch (err) {
    console.error("🔥 Chroma connection or query failed:", err.message);
    throw err;
  }
};
