import { pipeline } from '@xenova/transformers';
import { getUserCollection } from '../vector/chroma.js';
import { PromptTemplate } from '@langchain/core/prompts';
import axios from 'axios';

// 🔁 Load the embedder once
const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

// 🧠 Hard-guided Prompt Template for strict RAG
const retrievalTemplate = new PromptTemplate({
  inputVariables: ['query', 'context', 'history'],
  template: `
You are a helpful assistant. Use ONLY the context between the triple quotes below to answer the user's question.
If the answer is not in the context, respond with: "I don’t know based on the context provided."

Examples:
User: What is the capital of France?
Context: The capital of France is Paris.
Answer: Paris.

User: What is Brainium?
Context: Neurons communicate via synaptic transmission.
Answer: I don’t know based on the context provided.

Context:
"""
{context}
"""

Conversation history:
{history}

User asks:
{query}

Answer:
`
});

export async function answerWithRAG(userId, userQuery) {
  try {
    // 🔍 Step 1: Get the user's personal vector collection
    const col = await getUserCollection(userId);

    // 📐 Step 2: Embed the user question
    const qEmbTensor = await embedder(userQuery, {
      pooling: 'mean',
      normalize: true
    });
    const qEmb = Array.from(qEmbTensor.data);

    // 📚 Step 3: Query relevant note chunks from Chroma
    const res = await col.query({
      queryEmbeddings: [qEmb],
      nResults: 3,
      include: ['documents', 'metadatas']
    });

    console.log('📊 Raw Chroma Query Response:', JSON.stringify(res, null, 2));

    const documents = res?.documents?.[0] || [];
    const metadatas = res?.metadatas?.[0] || [];

    if (!documents.length) {
      console.warn('⚠️ No relevant documents returned from Chroma');
    }

    documents.forEach((doc, i) => {
      const meta = metadatas?.[i];
      console.log(`📄 Match ${i + 1}:`, doc.slice(0, 80), '...', meta || '');
    });

    // 🧠 Step 4: Prepare context
    const context = documents.length
      ? documents.join('\n---\n')
      : 'No relevant context found.';

    // 💬 Step 5: Fetch conversation history from MongoDB
    const chat = (await import('../models/chat.js')).default;
    const chatDoc = await chat.findOne({ userId });
    const history = chatDoc?.messages
      ?.map(m => `${m.role}: ${m.content}`)
      .join('\n') || '';

    // ✏️ Step 6: Format final RAG prompt
    const prompt = await retrievalTemplate.format({
      query: userQuery,
      context,
      history
    });

    console.log('📨 Final prompt sent to LLM:\n', prompt);

    // 🤖 Step 7: Send to OpenRouter API (Mistral or any supported model)
    const reply = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'mistralai/mistral-7b-instruct',
        messages: [{ role: 'system', content: prompt }]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'http://localhost:5173/',
          'X-Title': 'NeuroNote'
        }
      }
    );

    const assistantReply = reply.data.choices?.[0]?.message;
    console.log('🤖 LLM Reply:', assistantReply);

    return {
    role: 'assistant',
    content: assistantReply?.content || 'Sorry, no answer.',
  };
  } catch (err) {
    console.error('🔥 RAG error:', err);
    throw new Error('Failed to query relevant context from vector DB or generate a response.');
  }
}
