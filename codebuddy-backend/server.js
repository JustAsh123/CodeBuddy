import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });
}

function normalizeHints(data) {
  const normalizedConfidence =
    typeof data?.confidence === "string" &&
    ["high", "medium", "low"].includes(data.confidence.trim().toLowerCase())
      ? data.confidence.trim().toLowerCase()
      : "";

  return {
    analysis: typeof data?.analysis === "string" ? data.analysis : "",
    mistake: typeof data?.mistake === "string" ? data.mistake : "",
    progress: typeof data?.progress === "string" ? data.progress : "",
    confidence: normalizedConfidence,
    hint1: typeof data?.hint1 === "string" ? data.hint1 : "",
    hint2: typeof data?.hint2 === "string" ? data.hint2 : "",
    hint3: typeof data?.hint3 === "string" ? data.hint3 : "",
  };
}

function buildFallbackHints(overrides = {}) {
  return normalizeHints({
    analysis: "Unable to analyze the response right now.",
    mistake: "The AI response could not be parsed safely.",
    progress: "",
    confidence: "low",
    hint1: "",
    hint2: "",
    hint3: "",
    ...overrides,
  });
}

function parseJsonCandidate(candidate, label) {
  if (!candidate) {
    return null;
  }

  try {
    const parsed = JSON.parse(candidate);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    console.error(`JSON PARSE ERROR (${label}):`, error);
    return null;
  }
}

function extractJsonObject(rawText = "") {
  const trimmedText = typeof rawText === "string" ? rawText.trim() : "";

  if (!trimmedText) {
    return "";
  }

  const fencedMatch = trimmedText.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const startIndex = trimmedText.indexOf("{");

  if (startIndex === -1) {
    return "";
  }

  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let index = startIndex; index < trimmedText.length; index += 1) {
    const char = trimmedText[index];

    if (escaping) {
      escaping = false;
      continue;
    }

    if (char === "\\") {
      escaping = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return trimmedText.slice(startIndex, index + 1);
      }
    }
  }

  return "";
}

function parseAiResponse(rawText = "") {
  console.log("AI RAW RESPONSE:", rawText);

  const directParse = parseJsonCandidate(rawText, "direct");

  if (directParse) {
    const normalizedData = normalizeHints(directParse);
    console.log("PARSED DATA:", normalizedData);
    return normalizedData;
  }

  const extractedJson = extractJsonObject(rawText);

  if (extractedJson) {
    console.log("AI EXTRACTED JSON:", extractedJson);
    const extractedParse = parseJsonCandidate(extractedJson, "extracted");

    if (extractedParse) {
      const normalizedData = normalizeHints(extractedParse);
      console.log("PARSED DATA:", normalizedData);
      return normalizedData;
    }
  }

  return buildFallbackHints({
    analysis: rawText || "The AI response was empty.",
    mistake: rawText
      ? "Could not parse structured AI response safely."
      : "The AI response was empty.",
  });
}

function extractProgrammingLanguage(userCode = "", userApproach = "") {
  const approachMatch = userApproach.match(/Programming Language:\s*([^\n]+)/i);

  if (approachMatch?.[1]?.trim()) {
    return approachMatch[1].trim();
  }

  if (/^\s*def\s+\w+\s*\(/m.test(userCode) || /\bprint\(/.test(userCode)) {
    return "Python";
  }

  if (/#include\s*</.test(userCode) || /\bstd::/.test(userCode)) {
    return "C++";
  }

  if (/\bSystem\.out\.println\(/.test(userCode) || /\bpublic\s+class\b/.test(userCode)) {
    return "Java";
  }

  if (/\bconsole\.log\(/.test(userCode) || /\bfunction\s+\w+\s*\(/.test(userCode)) {
    return "JavaScript";
  }

  if (/\binterface\s+\w+/.test(userCode) || /:\s*(number|string|boolean|unknown|any)\b/.test(userCode)) {
    return "TypeScript";
  }

  if (/\bConsole\.WriteLine\(/.test(userCode) || /\bnamespace\s+\w+/.test(userCode)) {
    return "C#";
  }

  if (/^\s*func\s+\w+\s*\(/m.test(userCode) || /\bfmt\./.test(userCode)) {
    return "Go";
  }

  if (/^\s*fn\s+\w+\s*\(/m.test(userCode) || /\blet\s+mut\b/.test(userCode)) {
    return "Rust";
  }

  return "Unknown";
}

async function getHints(problem, user_code, user_approach) {
  const client = getOpenAIClient();
  let lastError;
  const programmingLanguage = extractProgrammingLanguage(user_code, user_approach);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      console.log(`Calling OpenAI... Attempt ${attempt}`);

      const response = await client.chat.completions.create({
        model: "llama-3.1-8b-instant",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: `You are an expert coding mentor.

CRITICAL RULES:
- You are NOT always correct - avoid overconfidence
- If unsure, say "this may be incorrect" instead of asserting
- Always consider the programming language used
- Python, Java, C++, etc. behave differently (especially modulo, division, overflow)
- Do NOT assume behavior from other languages

GUIDELINES:
- Do NOT give full solution
- Guide thinking step-by-step
- Be concise but accurate
- Prefer correctness over confidence
- Return ONLY valid JSON
- Do not include markdown, code fences, or extra text outside JSON`,
          },
          {
            role: "user",
            content: `Problem:
${problem}

User Code:
${user_code}

User Approach:
${user_approach}

Programming Language:
${programmingLanguage}

TASK:

1. Analyze the logic carefully
2. Identify inefficiencies (time/space)
3. Identify real mistakes ONLY (do not hallucinate)
4. If unsure about behavior, explicitly say uncertainty
5. Evaluate if the user is close to correct solution
6. Provide progressive hints

OUTPUT (STRICT JSON):
{
  "analysis": "...",
  "mistake": "...",
  "confidence": "high | medium | low",
  "progress": "...",
  "hint1": "...",
  "hint2": "...",
  "hint3": "..."
}

RULES:
- If confidence is not high, say so clearly
- Do NOT invent errors
- Keep hints short (1-2 sentences)
- Return ONLY valid JSON with exactly these keys`,
          },
        ],
      });

      console.log("OPENAI RESPONSE:", response);
      console.log("AI CONTENT:", response.choices?.[0]?.message?.content);

      const rawText = response.choices?.[0]?.message?.content?.trim() || "";
      console.log("Parsing AI response...");
      return parseAiResponse(rawText);
    } catch (error) {
      lastError = error;
      console.error(`OPENAI CALL ERROR (attempt ${attempt}):`, error);

      if (attempt < 3) {
        console.log(`Retrying OpenAI call... Attempt ${attempt + 1}`);
      }
    }
  }

  console.error("Returning fallback after repeated OpenAI failures:", lastError);
  return buildFallbackHints({
    analysis: "The mentor service could not complete this request.",
    mistake: lastError?.message || "Failed to generate hints",
  });
}

app.get("/", (req, res) => {
  res.json({ message: "CodeBuddy API running" });
});

app.get("/test", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/get-hints", async (req, res) => {
  try {
    console.log("REQ BODY:", req.body);

    const { problem, user_code, user_approach = "" } = req.body;

    console.log("PROBLEM:", problem);
    console.log("USER CODE:", user_code);
    console.log("USER APPROACH:", user_approach);

    if (!problem || !user_code) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    if (
      typeof problem !== "string" ||
      typeof user_code !== "string" ||
      typeof user_approach !== "string"
    ) {
      return res.status(400).json({
        error: "problem, user_code, and user_approach must all be strings",
      });
    }

    if (!process.env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY is not configured");
      return res.json(
        buildFallbackHints({
          analysis: "The mentor service is not configured right now.",
          mistake: "GROQ_API_KEY is missing.",
        })
      );
    }

    const hints = await getHints(problem, user_code, user_approach);
    return res.json(hints);
  } catch (error) {
    console.error("Error generating hints:", error);

    return res.json(
      buildFallbackHints({
        analysis: "The mentor service hit an unexpected error.",
        mistake: error.message || "Unknown error",
      })
    );
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
