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
  return {
    analysis: typeof data?.analysis === "string" ? data.analysis : "",
    mistake: typeof data?.mistake === "string" ? data.mistake : "",
    hint1: typeof data?.hint1 === "string" ? data.hint1 : "",
    hint2: typeof data?.hint2 === "string" ? data.hint2 : "",
    hint3: typeof data?.hint3 === "string" ? data.hint3 : "",
  };
}

async function getHints(problem, user_code, user_approach) {
  const client = getOpenAIClient();
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      console.log(`Calling OpenAI... Attempt ${attempt}`);

      const response = await client.chat.completions.create({
        model: "llama-3.1-8b-instant",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: `You are a coding mentor helping a student solve a problem.

Rules:
- DO NOT give the full solution
- DO NOT give complete code
- Guide the student step by step
- Focus on improving their thinking
- Point out inefficiencies if present
- Return ONLY valid JSON
- Do not include markdown, code fences, or extra text outside JSON
- Always include exactly these keys: analysis, mistake, hint1, hint2, hint3
- Keep each hint concise, at most 2-3 sentences`,
          },
          {
            role: "user",
            content: `Problem:
${problem}

User Code:
${user_code}

User Approach:
${user_approach}

Task:
1. Analyze the user's approach
2. Identify mistakes or inefficiencies
3. Provide 3 progressive hints:
   - Hint 1: very vague
   - Hint 2: more specific
   - Hint 3: almost solution-level idea

IMPORTANT:
Return ONLY valid JSON in this format:
{
  "analysis": "...",
  "mistake": "...",
  "hint1": "...",
  "hint2": "...",
  "hint3": "..."
}`,
          },
        ],
      });

      console.log("OPENAI RESPONSE:", response);
      console.log("AI CONTENT:", response.choices?.[0]?.message?.content);

      const rawText = response.choices?.[0]?.message?.content?.trim() || "";
      console.log("AI RAW RESPONSE:", rawText);
      console.log("Parsing AI response...");

      try {
        const parsedData = JSON.parse(rawText);
        const normalizedData = normalizeHints(parsedData);
        console.log("PARSED DATA:", normalizedData);
        return normalizedData;
      } catch (err) {
        console.error("JSON PARSE ERROR:", err);
        console.log("RAW AI RESPONSE:", rawText);

        const fallbackData = normalizeHints({
          analysis: rawText,
          mistake: "Could not parse structured response",
          hint1: "",
          hint2: "",
          hint3: "",
        });

        console.log("PARSED DATA:", fallbackData);
        return fallbackData;
      }
    } catch (error) {
      lastError = error;
      console.error(`OPENAI CALL ERROR (attempt ${attempt}):`, error);

      if (attempt < 3) {
        console.log(`Retrying OpenAI call... Attempt ${attempt + 1}`);
      }
    }
  }

  throw lastError;
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
      return res.status(500).json({
        error: "GROQ_API_KEY is not configured",
      });
    }

    const hints = await getHints(problem, user_code, user_approach);
    return res.json(hints);
  } catch (error) {
    console.error("Error generating hints:", error);

    return res.status(500).json({
      error: "Failed to generate hints",
      details: error.message || "Unknown error",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
