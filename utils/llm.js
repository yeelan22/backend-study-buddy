import axios from "axios";

// --- Soft color palette by level ---
export const LEVEL_COLORS = [
  { bg: "#ffe082", text: "#795548" }, // Level 0 (center)
  { bg: "#b3e5fc", text: "#01579b" }, // Level 1
  { bg: "#c8e6c9", text: "#2e7d32" }, // Level 2
  { bg: "#f8bbd0", text: "#ad1457" }, // Level 3
  { bg: "#d1c4e9", text: "#4527a0" }, // Level 4
  { bg: "#fff9c4", text: "#fbc02d" }, // Level 5
  { bg: "#e0e0e0", text: "#424242" }, // Level 6
  { bg: "#ffccbc", text: "#bf360c" }, // Level 7
];

// --- Utility: Safe JSON extractor ---
function safeJSONParse(text, fallback = {}) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e) {
        console.warn("⚠️ JSON parse failed after cleanup:", e.message);
      }
    }
    return fallback;
  }
}

// --- Memory Data Generator ---
export async function generateMemoryData(text) {
  try {
    const systemPrompt = `You are a memory coach. Based on the note content:

1. Categorize the note (single word or short subject) as "category".
2. Generate a 2-word concise title as "title".
3. Create 5–10 Q&A flashcards as an array "qa", each with "question" and "answer".

⚠️ Only reply with a valid JSON object and no extra text.`;

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30s safety timeout
      }
    );

    const assistantReply =
      response?.data?.choices?.[0]?.message?.content || "{}";

    const parsed = safeJSONParse(assistantReply, {
      category: "Uncategorized",
      title: text.slice(0, 20) || "Untitled",
      qa: [],
    });

    return parsed;
  } catch (err) {
    console.error("❌ LLM processing error:", err.response?.data || err.message);
    return {
      category: "Uncategorized",
      title: text.slice(0, 20) || "Untitled",
      qa: [],
    };
  }
}

// --- Radial layout helpers ---
function assignLevels(nodes, edges) {
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const root = nodes.find((n) => !edges.some((e) => e.target === n.id));
  if (!root) return nodes.map((n) => ({ ...n, level: 0 }));
  root.level = 0;
  const queue = [root];
  while (queue.length) {
    const current = queue.shift();
    const children = edges
      .filter((e) => e.source === current.id)
      .map((e) => nodeMap[e.target]);
    children.forEach((child) => {
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

  const centerX = 500,
    centerY = 350;
  const mainRadius = 220,
    subRadius = 120,
    subSubRadius = 80;

  const root = nodes.find((n) => n.level === 0);
  if (!root) return nodes;
  root.x = centerX;
  root.y = centerY;

  const mainBranches = nodes.filter((n) => n.level === 1);
  const angleStep = (2 * Math.PI) / Math.max(mainBranches.length, 1);

  mainBranches.forEach((main, i) => {
    const angle = i * angleStep - Math.PI / 2;
    main.x = centerX + Math.cos(angle) * mainRadius;
    main.y = centerY + Math.sin(angle) * mainRadius;

    const subBranches = nodes.filter(
      (n) =>
        n.level === 2 &&
        edges.some((e) => e.source === main.id && e.target === n.id)
    );
    const subAngleStep = Math.PI / (subBranches.length + 1);
    subBranches.forEach((sub, j) => {
      const subAngle = angle - Math.PI / 2 + (j + 1) * subAngleStep;
      sub.x = main.x + Math.cos(subAngle) * subRadius;
      sub.y = main.y + Math.sin(subAngle) * subRadius;

      const subSubBranches = nodes.filter(
        (n) =>
          n.level === 3 &&
          edges.some((e) => e.source === sub.id && e.target === n.id)
      );
      const subSubAngleStep = Math.PI / (subSubBranches.length + 1);
      subSubBranches.forEach((subsub, k) => {
        const subSubAngle =
          subAngle - Math.PI / 2 + (k + 1) * subSubAngleStep;
        subsub.x = sub.x + Math.cos(subSubAngle) * subSubRadius;
        subsub.y = sub.y + Math.sin(subSubAngle) * subSubRadius;
      });
    });
  });

  nodes.forEach((n, i) => {
    if (n.x === undefined || n.y === undefined) {
      n.x = centerX + Math.cos(i) * (mainRadius + 100);
      n.y = centerY + Math.sin(i) * (mainRadius + 100);
    }
  });

  return nodes;
}

// --- Mind Map Generator ---
export async function generateMindMapFromText(text) {
  try {
    const prompt = `
You are a mind map generator for study notes.

Rules:
- Central node = main topic
- 4–10 main branches around center
- Sub-branches 3–4 levels max
- Node labels = descriptive (5–15 words)
- Edge labels = descriptive (5–10 words), avoid "is/has/type of"
- Output ONLY JSON: 
{
 "summary": "Short summary",
 "nodes": [{ "id": "1", "label": "Main topic", "x": 500, "y": 350 }],
 "edges": [{ "id": "e1-2", "source": "1", "target": "2", "label": "Provides ..." }]
}
Lesson Text: ${text}
`;

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct",
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      }
    );

    const reply = response?.data?.choices?.[0]?.message?.content || "{}";
    let result = safeJSONParse(reply, { nodes: [], edges: [], summary: "" });

    if (!Array.isArray(result.nodes) || !Array.isArray(result.edges)) {
      console.warn("⚠️ Mind map response incomplete, returning fallback");
      result = { nodes: [], edges: [], summary: "" };
    }

    result.nodes = assignLevels(result.nodes, result.edges);
    result.nodes = classicRadialArrange(result.nodes, result.edges);

    result.nodes = result.nodes.map((n) => {
      const color =
        LEVEL_COLORS[n.level % LEVEL_COLORS.length] || LEVEL_COLORS[0];
      return { ...n, bg: color.bg, text: color.text };
    });

    return result;
  } catch (err) {
    console.error("❌ Mind map generation error:", err.response?.data || err);
    return { nodes: [], edges: [], summary: "Mind map generation failed" };
  }
}
