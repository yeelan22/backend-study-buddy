import axios from 'axios';

export async function askMindMapAgent({ prompt, noteText, nodes, edges }) {
  const systemPrompt = `You are an AI assistant inside a mind map app.

Your job:
- Help students improve or understand their mind map.
- If user asks a question, explain.
- If user asks to change or add something, return an UPDATE.

Rules:
- NEVER return multiple JSON blocks.
- NEVER include notes, markdown, or explanation outside of JSON.
- ALWAYS return ONE VALID JSON OBJECT with this format:

{
  "type": "explanation" | "update" | "error",
  "message": "Your message here.",
  ...(if "update") "nodes": [...], "edges": [...]
}

Here’s what you have access to:

USER PROMPT:
${prompt}

NOTE TEXT:
${noteText}

CURRENT NODES:
${JSON.stringify(nodes)}

CURRENT EDGES:
${JSON.stringify(edges)}
`;

  const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
    model: 'mistralai/mistral-7b-instruct',
    messages: [{ role: 'system', content: systemPrompt }],
  }, {
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  const reply = res.data.choices[0].message.content;
  console.log('🤖 Raw AI reply:\n', reply);

  try {
    const match = reply.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found in AI response');
    const parsed = JSON.parse(match[0]);

    if (parsed.type === 'update' || parsed.type === 'explanation') {
      return parsed;
    } else {
      throw new Error('Invalid type in AI response');
    }
  } catch (err) {
    console.error('❌ Failed to parse AI response:', err.message);
    return { type: 'error', message: 'Invalid response from AI.' };
  }
}
