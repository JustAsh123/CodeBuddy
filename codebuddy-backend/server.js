import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const REQUEST_BODY_LIMIT = "1mb";
const OPENAI_TIMEOUT_MS = 15000;
const MAX_OPENAI_ATTEMPTS = 3;
const VALID_CONFIDENCE_VALUES = new Set(["high", "medium", "low"]);
const BASE_FALLBACK_HINTS = Object.freeze({
  analysis: "We couldn't analyze the code right now.",
  mistake: "Please try again in a moment.",
  progress: "",
  confidence: "low",
  hint1: "Re-read the problem statement and confirm what the output should be.",
  hint2: "Walk through a small example by hand and check each branch of your logic.",
  hint3: "Review edge cases like empty input, duplicates, and off-by-one boundaries.",
});

app.use(cors());
app.use(express.json({ limit: REQUEST_BODY_LIMIT }));

function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });
}

function sanitizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function hasText(value) {
  return sanitizeText(value).length > 0;
}

function normalizeConfidence(value) {
  const normalizedValue = sanitizeText(value).toLowerCase();
  return VALID_CONFIDENCE_VALUES.has(normalizedValue) ? normalizedValue : "";
}

function normalizeHints(data = {}) {
  return {
    analysis: sanitizeText(data.analysis),
    mistake: sanitizeText(data.mistake),
    progress: sanitizeText(data.progress),
    confidence: normalizeConfidence(data.confidence),
    hint1: sanitizeText(data.hint1),
    hint2: sanitizeText(data.hint2),
    hint3: sanitizeText(data.hint3),
  };
}

function buildSafeHints(data = {}) {
  const normalized = normalizeHints(data);

  return {
    analysis: normalized.analysis || BASE_FALLBACK_HINTS.analysis,
    mistake: normalized.mistake || BASE_FALLBACK_HINTS.mistake,
    progress: normalized.progress || BASE_FALLBACK_HINTS.progress,
    confidence: normalized.confidence || BASE_FALLBACK_HINTS.confidence,
    hint1: normalized.hint1 || BASE_FALLBACK_HINTS.hint1,
    hint2: normalized.hint2 || BASE_FALLBACK_HINTS.hint2,
    hint3: normalized.hint3 || BASE_FALLBACK_HINTS.hint3,
  };
}

function buildFallbackHints(overrides = {}) {
  return buildSafeHints({
    ...BASE_FALLBACK_HINTS,
    ...overrides,
  });
}

function parseJsonCandidate(candidate) {
  if (!hasText(candidate)) {
    return null;
  }

  try {
    const parsed = JSON.parse(candidate);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    console.error("Failed to parse AI JSON response:", error);
    return null;
  }
}

function extractJsonObject(rawText = "") {
  const trimmedText = sanitizeText(rawText);

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
  const directParse = parseJsonCandidate(rawText);

  if (directParse) {
    return buildSafeHints(directParse);
  }

  const extractedJson = extractJsonObject(rawText);

  if (extractedJson) {
    const extractedParse = parseJsonCandidate(extractedJson);

    if (extractedParse) {
      return buildSafeHints(extractedParse);
    }
  }

  return buildFallbackHints({
    analysis: "We couldn't safely parse the AI response.",
    mistake: hasText(rawText) ? "The AI returned an unexpected response format." : "The AI response was empty.",
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

async function withTimeout(promise, timeoutMs, label) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getHints(problem, userCode, userApproach) {
  const client = getOpenAIClient();
  const programmingLanguage = extractProgrammingLanguage(userCode, userApproach);
  let lastError;

  for (let attempt = 1; attempt <= MAX_OPENAI_ATTEMPTS; attempt += 1) {
    try {
      const response = await withTimeout(
        client.chat.completions.create({
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
${userCode}

User Approach:
${userApproach}

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
        }),
        OPENAI_TIMEOUT_MS,
        "AI analysis"
      );

      const rawText = sanitizeText(response.choices?.[0]?.message?.content);
      return parseAiResponse(rawText);
    } catch (error) {
      lastError = error;
      console.error(`AI analysis attempt ${attempt} failed:`, error);
    }
  }

  return buildFallbackHints({
    analysis: "We couldn't analyze the code right now.",
    mistake: lastError?.message || "The mentor service was unavailable.",
  });
}

function buildValidationFallback(message) {
  return buildFallbackHints({
    analysis: "We couldn't analyze this request yet.",
    mistake: message,
    hint1: "Open a LeetCode problem and make sure the problem statement is loaded.",
    hint2: "Write some code in the editor before asking for analysis.",
    hint3: "Try the request again after the page finishes loading.",
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
    const { problem, user_code: userCode, user_approach: userApproach = "" } = req.body || {};

    if (
      typeof problem !== "string" ||
      typeof userCode !== "string" ||
      typeof userApproach !== "string"
    ) {
      return res
        .status(400)
        .json(buildValidationFallback("Problem, user_code, and user_approach must be strings."));
    }

    const normalizedProblem = problem.trim();
    const normalizedUserCode = userCode.trim();

    if (!normalizedProblem || !normalizedUserCode) {
      return res
        .status(400)
        .json(buildValidationFallback("Problem text and user code are required before analysis."));
    }

    if (!process.env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY is not configured");
      return res.json(
        buildFallbackHints({
          analysis: "The mentor service isn't configured right now.",
          mistake: "The server is missing its API key.",
        })
      );
    }

    const hints = await getHints(normalizedProblem, normalizedUserCode, userApproach);
    return res.json(hints);
  } catch (error) {
    console.error("Unexpected /get-hints error:", error);
    return res.json(
      buildFallbackHints({
        analysis: "The mentor service hit an unexpected error.",
        mistake: error?.message || "Unknown error",
      })
    );
  }
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const isJsonParseError =
    error instanceof SyntaxError || error?.type === "entity.parse.failed";

  console.error("Unhandled API error:", error);

  res.status(isJsonParseError ? 400 : 500).json(
    buildFallbackHints({
      analysis: "We couldn't analyze this request right now.",
      mistake: isJsonParseError
        ? "The request body must be valid JSON."
        : "An unexpected server error occurred.",
    })
  );
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
