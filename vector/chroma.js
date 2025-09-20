import { ChromaClient } from "chromadb";

console.log("🔧 Loading Chroma client...");

const chromaUrl = process.env.CHROMA_URL || "http://localhost:8000";
console.log("🌍 CHROMA_URL resolved to:", chromaUrl);

// Parse URL into host/port/ssl
const url = new URL(chromaUrl);
const client = new ChromaClient({
  host: url.hostname,
  port: url.port || (url.protocol === "https:" ? "443" : "80"),
  ssl: url.protocol === "https:",
});

// Connectivity test
(async () => {
  try {
    console.log("🔗 Testing Chroma connectivity...");
    const raw = await fetch(`${chromaUrl}/api/v2/collections`);
    const text = await raw.text();
    console.log("📡 Raw response:", text);
    const res = JSON.parse(text);
    console.log("✅ Parsed response:", res);
  } catch (err) {
    console.error("❌ Direct fetch to Chroma failed:", err.message);
  }
})();

// Dummy embedding function (never used because we embed manually)
const dummyEmbeddingFunction = {
  generate: async () => {
    throw new Error("Use Xenova to embed manually.");
  },
};

export const getUserCollection = async (userId) => {
  const collectionName = `notes-${userId}`;
  console.log(`📂 Requesting collection: ${collectionName}`);

  try {
    const existing = await client.listCollections();
    console.log("🧠 Existing collections:", existing.map(c => c.name));

    const match = existing.find(c => c.name === collectionName);

    if (match) {
      const col = await client.getCollection({ name: collectionName });
      col.embeddingFunction = dummyEmbeddingFunction; // ✅ avoid accidental auto-embedding
      console.log(`📁 Collection ready: ${collectionName}`);
      return col;
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
