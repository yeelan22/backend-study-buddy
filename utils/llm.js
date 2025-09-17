import axios from 'axios';

// --- Soft color palette by level ---
export const LEVEL_COLORS = [
  { bg: '#ffe082', text: '#795548' }, // Level 0 (center)
  { bg: '#b3e5fc', text: '#01579b' }, // Level 1
  { bg: '#c8e6c9', text: '#2e7d32' }, // Level 2
  { bg: '#f8bbd0', text: '#ad1457' }, // Level 3
  { bg: '#d1c4e9', text: '#4527a0' }, // Level 4
  { bg: '#fff9c4', text: '#fbc02d' }, // Level 5
  { bg: '#e0e0e0', text: '#424242' }, // Level 6
  { bg: '#ffccbc', text: '#bf360c' }, // Level 7
];

export async function generateMemoryData(text) {
  try {
    const systemPrompt = `You are a memory coach. Based on the note content:

1. Categorize the note (single word or short subject) as "category".
2. Generate a 2-word concise title as "title".
3. Create 5–10 Q&A flashcards as an array "qa", each with "question" and "answer".

⚠️ Only reply with a valid JSON object and no extra text.`;

    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'mistralai/mistral-7b-instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ]
    }, {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    const assistantReply = response.data.choices[0].message.content;
    
    // Robust JSON extraction
    function extractJSON(text) {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON found in model output");
      try {
        return JSON.parse(match[0]);
      } catch (err) {
        const cleaned = match[0].replace(/\n/g, " ");
        return JSON.parse(cleaned);
      }
    }

    return extractJSON(assistantReply);

  } catch (err) {
    console.error("LLM processing error:", err);
    return {
      category: "Uncategorized",
      title: text.slice(0, 20),
      qa: []
    };
  }
}


// --- Radial layout with level assignment ---
function assignLevels(nodes, edges) {
  // BFS to assign level to each node
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  const root = nodes.find(n => !edges.some(e => e.target === n.id));
  if (!root) return nodes.map(n => ({ ...n, level: 0 }));
  root.level = 0;
  const queue = [root];
  while (queue.length) {
    const current = queue.shift();
    const children = edges.filter(e => e.source === current.id).map(e => nodeMap[e.target]);
    children.forEach(child => {
      if (child && child.level === undefined) {
        child.level = (current.level || 0) + 1;
        queue.push(child);
      }
    });
  }
  return nodes;
}

function classicRadialArrange(nodes, edges) {
  if (!nodes.length) return nodes;
  assignLevels(nodes, edges);

  const centerX = 500, centerY = 350;
  const mainRadius = 220, subRadius = 120, subSubRadius = 80;

  // Find root
  const root = nodes.find(n => n.level === 0);
  root.x = centerX;
  root.y = centerY;

  // Level 1 (main branches)
  const mainBranches = nodes.filter(n => n.level === 1);
  const angleStep = (2 * Math.PI) / Math.max(mainBranches.length, 1);

  mainBranches.forEach((main, i) => {
    const angle = i * angleStep - Math.PI / 2;
    main.x = centerX + Math.cos(angle) * mainRadius;
    main.y = centerY + Math.sin(angle) * mainRadius;

    // Level 2 (sub-branches)
    const subBranches = nodes.filter(n => n.level === 2 && edges.some(e => e.source === main.id && e.target === n.id));
    const subAngleStep = Math.PI / (subBranches.length + 1);
    subBranches.forEach((sub, j) => {
      const subAngle = angle - (Math.PI / 2) + (j + 1) * subAngleStep;
      sub.x = main.x + Math.cos(subAngle) * subRadius;
      sub.y = main.y + Math.sin(subAngle) * subRadius;

      // Level 3 (sub-sub-branches)
      const subSubBranches = nodes.filter(n => n.level === 3 && edges.some(e => e.source === sub.id && e.target === n.id));
      const subSubAngleStep = Math.PI / (subSubBranches.length + 1);
      subSubBranches.forEach((subsub, k) => {
        const subSubAngle = subAngle - (Math.PI / 2) + (k + 1) * subSubAngleStep;
        subsub.x = sub.x + Math.cos(subSubAngle) * subSubRadius;
        subsub.y = sub.y + Math.sin(subSubAngle) * subSubRadius;
      });
    });
  });

  // Fallback for any node not placed
  nodes.forEach((n, i) => {
    if (n.x === undefined || n.y === undefined) {
      n.x = centerX + Math.cos(i) * (mainRadius + 100);
      n.y = centerY + Math.sin(i) * (mainRadius + 100);
    }
  });

  return nodes;
}

export async function generateMindMapFromText(text) {
  try {
    // 1. Build the prompt
    const prompt = `
You are a mind map generator for study notes.

Instructions:

The central node is the main topic,placed at the center of the map. 
Each major section is a main branch radiating outward from the center (aim for 4-10 main branches). 
Sub-points are sub-branches extending from each main branch, and so on (max 3-4 levels deep). 
Each node label must be a clear, descriptive phrase (5-15 words) summarizing the concept. 
If a node is a definition, include the actual definition as the label. 
For each edge, use a clear, descriptive phrase (5-10 words) that explains the relationship or action between the nodes. 
Avoid generic words like "has", "is", "type of". For example: "Provides a magnetic field", "Creates rotation", "Transfers mechanical power". 
Structure the mind map as a radial diagram: the main topic in the center, main branches evenly spaced around it, and sub-branches extending outward from their parent branch. 
Assign x/y values so that main branches are evenly distributed in a circle around the center, and sub-branches extend outward from their parent branch. 
Avoid overlapping nodes and crossing edges. 
The map should be clear and easy to read. 
Respond ONLY with this JSON: { "summary": "Short summary of the lesson.", "nodes": [ { "id": "1", "label": "Main topic", "x": 500, "y": 350 }, { "id": "2", "label": "Descriptive phrase for branch 1", "x": 700, "y": 200 }, ... ], "edges": [ { "id": "e1-2", "source": "1", "target": "2", "label": "Provides a magnetic field" }, ... ] }
Lesson Text: ${text}
`;

    // 2. Send to LLM
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'mistralai/mistral-7b-instruct',
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    // 3. Extract the reply
    const reply = response.data.choices[0].message.content;

    // 4. Try to parse JSON
    let result;
    try {
      result = JSON.parse(reply);
    } catch (err) {
      const match = reply.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          result = JSON.parse(match[0]);
        } catch (e) {
          throw new Error('Failed to parse mind map response');
        }
      } else {
        throw new Error('Failed to parse mind map response');
      }
    }

    // 5. Validate structure
    if (!result.nodes || !Array.isArray(result.nodes) || !result.edges || !Array.isArray(result.edges)) {
      throw new Error('Mind map data incomplete');
    }

    // 6. Assign levels and arrange
    result.nodes = assignLevels(result.nodes, result.edges);
    result.nodes = classicRadialArrange(result.nodes, result.edges);

    // 7. Assign color by level (with fallback)
    result.nodes = result.nodes.map(n => {
      const color = LEVEL_COLORS[n.level % LEVEL_COLORS.length] || LEVEL_COLORS[0];
      return {
        ...n,
        bg: color.bg,
        text: color.text,
      };
    });

    return result;
  } catch (err) {
    throw new Error('Mind map generation failed');
  }
}

// async function generateFullNoteAnalysis(note) {
//   const memoryData = await generateMemoryData(note.extractedText);
//   const mindMapData = await generateMindMapFromText(note.extractedText);

//   return { ...note, ...memoryData, mindMap: mindMapData };
// }