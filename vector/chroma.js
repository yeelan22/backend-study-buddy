import { ChromaClient } from "chromadb";

console.log("🔧 Loading Chroma client...");

const chromaUrl =
  process.env.CHROMA_URL || "http://localhost:8000";
console.log("🌍 CHROMA_URL resolved to:", chromaUrl);

// Parse into host/port/ssl
const url = new URL(chromaUrl);
const client = new ChromaClient({
  host: url.hostname,
  port: url.port || (url.protocol === "https:" ? "443" : "80"),
  ssl: url.protocol === "https:",
});

// Optional: quick connectivity test
(async () => {
  try {
    console.log("🔗 Testing Chroma connectivity...");
    const res = await fetch(`${chromaUrl}/api/v2/collections`).then((r) =>
      r.json()
    );
    console.log("✅ Direct fetch to Chroma v2 succeeded:", res);
  } catch (err) {
    console.error("❌ Direct fetch to Chroma failed:", err.message);
  }
})();

// Dummy embedding function placeholder (manual embeddings handled elsewhere)
const dummyEmbeddingFunction = {
  generate: async () => {
    throw new Error("Use Xenova to embed manually.");
  },
};

export const getUserCollection = async (userId) => {
  const collectionName = `notes-${userId}`;
  console.log(`📂 Requesting collection: ${collectionName}`);

  try {
    console.log("🔍 Listing collections from Chroma...");
    const existing = await client.listCollections();
    console.log("🧠 Existing collections:", existing.map((c) => c.name));

    const match = existing.find((c) => c.name === collectionName);

    if (match) {
      try {
        console.log(
          `✅ Found existing collection: ${collectionName}, fetching...`
        );
        const col = await client.getCollection({ name: collectionName });
        col.embeddingFunction = dummyEmbeddingFunction;
        console.log(`📁 Collection ready: ${collectionName}`);
        return col;
      } catch (err) {
        console.warn(
          `❌ Failed to fetch collection: ${collectionName}`,
          err.message
        );
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
    console.error("🔥 Chroma v2 connection or query failed:", err.message);
    throw err;
  }
};
