// scripts/inspectCollection.js
import { ChromaClient } from 'chromadb';

const client = new ChromaClient({ path: 'http://localhost:8000' });

const collectionName = 'notes-<USER_ID>'; // replace with actual userId

const run = async () => {
  const col = await client.getCollection({ name: collectionName });
  const results = await col.get();

  console.log('✅ Collection Info:', results);
};

run().catch(console.error);
