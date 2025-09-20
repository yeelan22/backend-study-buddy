// utils/llm.js
import axios from "axios";

// --- Soft color palette by level ---
export const LEVEL_COLORS = [
  { bg: "#ffe082", text: "#795548" },
  { bg: "#b3e5fc", text: "#01579b" },
  { bg: "#c8e6c9", text: "#2e7d32" },
  { bg: "#f8bbd0", text: "#ad1457" },
  { bg: "#d1c4e9", text: "#4527a0" },
  { bg: "#fff9c4", text: "#fbc02d" },
  { bg: "#e0e0e0", text: "#424242" },
  { bg: "#ffccbc", text: "#bf360c" },
];

// --- Config ---
const LLM_RETRY_LIMIT = 2; // maximum retries for LLM calls

// --- Utility: Safe JSON extractor ---
function safeJSONParse(text, fallback = {}) {
  if (!text || typeof text !== "string") return fallback;
  try {
    return JSON.parse(text);
  } catch {
    // try to extract first {...}
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

// --- Validate & normalize mindmap output (ensures nodes/edges exist) ---
function normalizeMindmap(result, fallback) {
  // Start from fallback if result is falsy
  if (!result || typeof result !== "object") result = { ...fallback };

  // Ensure nodes array
  if (!Array.isArray(result.nodes)) result.nodes = Array.isArray(fallback.nodes) ? [...fallback.nodes] : [];

  // Ensure nodes have id and label
  result.nodes = result.nodes.map((n, idx) => {
    const id = String(n?.id ?? (idx + 1));
    const label = (n?.label && String(n.label).trim()) ? String(n.label).trim() : `Node ${id}`;
    const level = Number.isInteger(n?.level) ? n.level : undefined;
    return { ...n, id, label, level };
  });

  // Ensure edges array
  if (!Array.isArray(result.edges)) result.edges = [];

  // Normalize existing edges (fill missing fields)
  result.edges = result.edges
    .filter(Boolean)
    .map((e, i) => {
      const id = e?.id || `e${i + 1}`;
      const source = e?.source || result.nodes[0]?.id || "1";
      const target = e?.target || source;
      const label = (e?.label && String(e.label).trim()) ? String(e.label).trim() : "relates to";
      return { id, source, target, label };
    });

  // If no edges -> auto-generate safe edges
  if (result.edges.length === 0) {
    if (result.nodes.length === 1) {
      // self-edge if only one node
      const n = result.nodes[0];
      result.edges.push({ id: `e-${n.id}-${n.id}`, source: n.id, target: n.id, label: "self" });
    } else {
      // Choose root (level 0 if present, else first node), connect root -> others
      const root = result.nodes.find((n) => n.level === 0) || result.nodes[0];
      let counter = 1;
      for (const node of result.nodes) {
        if (node.id === root.id) continue;
        result.edges.push({
          id: `e-${counter}-${root.id}-${node.id}`,
          source: root.id,
          target: node.id,
          label: node.label ? `relates to ${node.label.split(" ").slice(0, 4).join(" ")}` : "relates to",
        });
        counter++;
      }
    }
  }

  // Ensure summary
  if (!result.summary || typeof result.summary !== "string") {
    result.summary = fallback.summary || "";
  }

  return result;
}

// --- Radial layout helpers ---
function assignLevels(nodes, edges) {
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));
  // Find node without incoming edges => root
  const root = nodes.find((n) => !edges.some((e) => e.target === n.id));
  if (!root) {
    // mark level 0 for first node
    return nodes.map((n, idx) => ({ ...n, level: n.level ?? (idx === 0 ? 0 : 1) }));
  }
  root.level = 0;
  const queue = [root];
  while (queue.length) {
    const current = queue.shift();
    const children = edges.filter((e) => e.source === current.id).map((e) => nodeMap[e.target]);
    children.forEach((child) => {
      if (child && child.level === undefined) {
        child.level = (current.level || 0) + 1;
        queue.push(child);
      }
    });
  }
  // fill missing levels
  return nodes.map((n) => ({ ...n, level: n.level ?? 1 }));
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
    const subAngleStep = Math.PI / (Math.max(subBranches.length, 1) + 1);
    subBranches.forEach((sub, j) => {
      const subAngle = angle - Math.PI / 2 + (j + 1) * subAngleStep;
      sub.x = main.x + Math.cos(subAngle) * subRadius;
      sub.y = main.y + Math.sin(subAngle) * subRadius;

      const subSubBranches = nodes.filter(
        (n) =>
          n.level === 3 &&
          edges.some((e) => e.source === sub.id && e.target === n.id)
      );
      const subSubAngleStep = Math.PI / (Math.max(subSubBranches.length, 1) + 1);
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
export async function generateMindMapFromText(text, retryCount = 0) {
  const fallback = {
    nodes: [{ id: "1", label: text?.slice(0, 20) || "Main Topic" }],
    edges: [],
    summary: "Auto-generated fallback mindmap",
  };

  const prompt = `
You are a mind map generator for study notes.

Rules:
- Central node = main topic
- 4–10 main branches around center (if possible)
- Sub-branches 3–4 levels max
- Node labels = descriptive (5–15 words)
- Edge labels = descriptive (3–10 words), avoid "is/has/type of"
- Output ONLY a valid JSON object and nothing else, in this exact format:

{
  "summary": "Short summary (max 1-2 sentences)",
  "nodes": [
    { "id": "1", "label": "Main topic", "level": 0 }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2", "label": "provides overview of ..." }
  ]
}

If you cannot generate many branches because the text is short, still return at least one node AND at least one edge (self-edge if necessary).

Lesson Text:
${text}
`;

  try {
    console.debug("🧾 Mindmap input length:", (text || "").length);
    console.debug("📨 Prompt sent to LLM (trimmed):", prompt.slice(0, 800));

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct",
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      }
    );

    const rawReply = response?.data?.choices?.[0]?.message?.content;
    console.debug("🤖 Raw mindmap LLM reply (first 2000 chars):", String(rawReply).slice(0, 2000));

    let parsed = safeJSONParse(rawReply, fallback);
    console.debug("🔎 Parsed mindmap object keys:", Object.keys(parsed));

    // Normalize & ensure nodes/edges exist
    parsed = normalizeMindmap(parsed, fallback);

    console.debug("📐 Normalized nodes:", parsed.nodes.length, "edges:", parsed.edges.length);

    // If nodes are empty (highly unlikely after normalization) -> retry up to limit
    if (!Array.isArray(parsed.nodes) || parsed.nodes.length === 0) {
      console.warn("⚠️ Empty nodes detected after parse/normalize.");
      if (retryCount < LLM_RETRY_LIMIT) {
        console.warn("↩️ Retrying generateMindMapFromText, attempt", retryCount + 1);
        return generateMindMapFromText(text, retryCount + 1);
      } else {
        console.error("❌ Mindmap LLM failed after retries. Returning fallback.");
        return fallback;
      }
    }

    // Safety: if edges array is empty (should be covered by normalize), log and continue
    if (!Array.isArray(parsed.edges) || parsed.edges.length === 0) {
      console.warn("⚠️ Edges empty after normalization — auto-generating edges.");
      parsed = normalizeMindmap(parsed, fallback);
    }

    // Arrange & color nodes
    parsed.nodes = assignLevels(parsed.nodes, parsed.edges);
    parsed.nodes = classicRadialArrange(parsed.nodes, parsed.edges);

    parsed.nodes = parsed.nodes.map((n) => {
      const color = LEVEL_COLORS[n.level % LEVEL_COLORS.length] || LEVEL_COLORS[0];
      return { ...n, bg: color.bg, text: color.text };
    });

    console.debug("✅ Mindmap generated: nodes:", parsed.nodes.length, "edges:", parsed.edges.length);

    return parsed;
  } catch (err) {
    console.error("❌ Mind map generation error:", err?.response?.data ?? err?.message ?? err);
    if (retryCount < LLM_RETRY_LIMIT) {
      console.warn("↩️ Retrying generateMindMapFromText after error, attempt", retryCount + 1);
      return generateMindMapFromText(text, retryCount + 1);
    }
    return fallback;
  }
}

// --- Memory Data Generator (improved logging + retry) ---
export async function generateMemoryData(text, retryCount = 0) {
  const fallback = {
    category: "Uncategorized",
    title: text?.slice(0, 20) || "Untitled",
    qa: [],
  };

  const prompt = `
You are a memory coach. Based on the note content below:

1. Categorize the note as "category".
2. Generate a 2-word concise title as "title".
3. Create 5–7 Q&A flashcards as an array "qa", each with "question" and "answer".
4. Return ONLY a valid JSON object. No extra text.

Example format:
{
  "category": "Physics",
  "title": "DC Motors",
  "qa": [
    {"question":"What is a DC motor?","answer":"A machine that converts DC electrical energy into mechanical energy."},
    {"question":"Name main components of a DC motor.","answer":"Stator, Rotor, Commutator, Brushes, Shaft, Windings."}
  ]
}

Note content:
${text}
`;

  try {
    console.debug("📨 Memory prompt length:", (text || "").length);
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct",
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      }
    );

    const rawReply = response?.data?.choices?.[0]?.message?.content;
    console.debug("🤖 Raw memory LLM reply (trim):", String(rawReply).slice(0, 1500));

    let parsed = safeJSONParse(rawReply, fallback);

    // Basic validation of QA structure
    if (!Array.isArray(parsed.qa) || parsed.qa.length === 0) {
      console.warn("⚠️ Empty QA detected after parse.");
      if (retryCount < LLM_RETRY_LIMIT) {
        console.warn("↩️ Retrying generateMemoryData, attempt", retryCount + 1);
        return generateMemoryData(text, retryCount + 1);
      } else {
        console.error("❌ Memory LLM failed to produce QA after retries. Returning fallback.");
        return fallback;
      }
    }

    // Ensure each QA item has question & answer keys
    parsed.qa = parsed.qa.map((item, idx) => {
      const q = item.question ?? item.q ?? item.prompt ?? "";
      const a = item.answer ?? item.a ?? item.response ?? "";
      return { question: String(q).trim() || `Question ${idx + 1}`, answer: String(a).trim() || "No answer provided." };
    });

    return parsed;
  } catch (err) {
    console.error("❌ LLM processing error (memory):", err?.response?.data ?? err?.message ?? err);
    if (retryCount < LLM_RETRY_LIMIT) {
      console.warn("↩️ Retrying generateMemoryData after error, attempt", retryCount + 1);
      return generateMemoryData(text, retryCount + 1);
    }
    return fallback;
  }
}
