// scripts/cleanupBrokenCollections.js
import { ChromaClient } from 'chromadb';

const client = new ChromaClient({ path: 'http://localhost:8000' });

async function cleanup() {
  const collections = await client.listCollections();

  for (const col of collections) {
    const isBroken = !col.embeddingFunction;
    const isUserCollection = col.name.startsWith('notes-');

    if (isBroken && isUserCollection) {
      try {
        console.warn(`🧨 Deleting broken collection: ${col.name}`);
        await client.deleteCollection(col.name);
      } catch (err) {
        console.error(`❌ Failed to delete ${col.name}:`, err.message);
      }
    }
  }

  console.log('✅ Done cleaning broken collections');
}

cleanup().catch(console.error);
