const BACKEND_URL = "http://localhost:3000/get-hints";
const PANEL_HOST_ID = "codebuddy-panel-host";
const STORAGE_KEY = "codebuddy_attempts";

const TITLE_SELECTORS = [
  '[data-cy="question-title"]',
  'main [data-cy="question-title"]',
  'h1 a[href*="/problems/"]',
  'main h1',
  'main [role="heading"]',
];

const DESCRIPTION_SELECTORS = [
  '[data-track-load="description_content"]',
  '[data-key="description-content"]',
  'main article',
  'article',
  'main [role="main"] article',
  'main [role="main"] section',
];

const LANGUAGE_SELECTORS = [
  '[data-cy="lang-select"]',
  'button[aria-label*="language" i]',
  '[role="combobox"]',
  'button[aria-haspopup="listbox"]',
  '[role="button"]',
];

const LANGUAGE_ALIASES = {
  Python: "Python",
  Python3: "Python",
  Java: "Java",
  "C++": "C++",
  C: "C",
  "C#": "C#",
  JavaScript: "JavaScript",
  Javascript: "JavaScript",
  TypeScript: "TypeScript",
  Typescript: "TypeScript",
  Go: "Go",
  Kotlin: "Kotlin",
  Rust: "Rust",
  Swift: "Swift",
  PHP: "PHP",
  Ruby: "Ruby",
  Dart: "Dart",
  Scala: "Scala",
};

const PANEL_CSS = `
  :host {
    all: initial;
  }

  * {
    box-sizing: border-box;
  }

  .cb-panel {
    position: fixed;
    top: 24px;
    right: 24px;
    width: 360px;
    max-height: calc(100vh - 48px);
    overflow-y: auto;
    z-index: 2147483647;
    border: 1px solid #2a2f3a;
    border-radius: 8px;
    padding: 16px;
    background: #0f1117;
    box-shadow: 0 16px 24px rgba(0, 0, 0, 0.24);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: #e6e6e6;
  }

  .cb-stack {
    display: grid;
    gap: 16px;
  }

  .cb-card {
    display: grid;
    gap: 16px;
    padding: 16px;
    border-radius: 8px;
    background: #1a1d26;
    border: 1px solid #2a2f3a;
  }

  .cb-card-hero {
    gap: 8px;
  }

  .cb-eyebrow {
    margin: 0;
    color: #9aa4b2;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .cb-title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #e6e6e6;
  }

  .cb-status {
    min-height: 20px;
    margin: 0;
    color: #9aa4b2;
    font-size: 14px;
    line-height: 1.45;
  }

  .cb-button {
    width: 100%;
    border: none;
    border-radius: 6px;
    padding: 12px;
    background: #4f8cff;
    color: #ffffff;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: background-color 0.2s ease, transform 0.2s ease, opacity 0.2s ease;
  }

  .cb-button:hover {
    background: #6a9dff;
    transform: translateY(-1px);
  }

  .cb-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }

  .cb-button-secondary {
    background: #1f2430;
    border: 1px solid #2a2f3a;
    color: #e6e6e6;
  }

  .cb-button-secondary:hover {
    background: #252b38;
  }

  .cb-section {
    display: grid;
    gap: 8px;
    padding: 16px;
    border-radius: 8px;
    background: #1a1d26;
    border: 1px solid #2a2f3a;
  }

  .cb-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .cb-section-title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: #e6e6e6;
  }

  .cb-meta {
    margin: 0;
    font-size: 13px;
    color: #9aa4b2;
    line-height: 1.45;
  }

  .cb-feedback {
    margin: 0;
    padding: 12px;
    border-radius: 6px;
    background: rgba(79, 140, 255, 0.1);
    border: 1px solid rgba(79, 140, 255, 0.2);
    color: #cfe0ff;
    font-size: 13px;
    line-height: 1.45;
  }

  .cb-section-text {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    white-space: pre-wrap;
    color: #e6e6e6;
  }

  .cb-hints {
    display: grid;
    gap: 16px;
  }

  .cb-hint {
    display: grid;
    gap: 8px;
    padding: 16px;
    border-radius: 6px;
    background: #11151d;
    border: 1px solid #2a2f3a;
  }

  .cb-hint-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #9aa4b2;
  }

  .cb-progress-grid {
    display: grid;
    gap: 8px;
  }

  .cb-stat-row,
  .cb-history-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
  }

  .cb-history-list {
    display: grid;
    gap: 8px;
  }

  .cb-reset {
    margin-top: 8px;
  }

  .cb-hidden {
    display: none;
  }
`;

const uiState = {
  currentAttemptTimestamp: null,
  currentProblem: "",
  currentDifficulty: "",
  hintsUsed: 0,
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForDomReady() {
  if (document.readyState === "complete" || document.readyState === "interactive") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    document.addEventListener("DOMContentLoaded", resolve, { once: true });
  });
}

function getElementText(element) {
  return element?.innerText?.trim() || "";
}

function findFirstText(selectors) {
  for (const selector of selectors) {
    console.log(`Trying selector ${selector}...`);
    const text = getElementText(document.querySelector(selector));
    if (text) {
      return text;
    }
  }

  return "";
}

function findLongestText(selectors) {
  let longestText = "";

  for (const selector of selectors) {
    console.log(`Trying selector ${selector}...`);
    const elements = document.querySelectorAll(selector);

    for (const element of elements) {
      const text = getElementText(element);
      if (text.length > longestText.length) {
        longestText = text;
      }
    }
  }

  return longestText;
}

function extractTitle() {
  const title = findFirstText(TITLE_SELECTORS);

  if (!title) {
    console.warn("Problem title not found");
  }

  return title;
}

function extractDescription() {
  let description = findLongestText(DESCRIPTION_SELECTORS);

  if (!description) {
    const fallbackBlocks = Array.from(document.querySelectorAll("main div, main section"))
      .map((element) => getElementText(element))
      .filter((text) => text.length > 120 && /Example|Constraints|Input|Output/.test(text))
      .sort((a, b) => b.length - a.length);

    description = fallbackBlocks[0] || "";
  }

  return description;
}

function extractCode() {
  let code = "";
  const lines = document.querySelectorAll(".view-lines .view-line");

  if (lines.length > 0) {
    code = Array.from(lines)
      .map((line) => line.innerText)
      .join("\n");
  }

  if (!code) {
    const textarea = document.querySelector("textarea");
    if (textarea) {
      code = textarea.value;
    }
  }

  console.log("EXTRACTED CODE:", code);

  return code || "";
}

function extractDifficulty() {
  const difficultyMatch = Array.from(document.querySelectorAll("main span, main div, main p"))
    .map((element) => getElementText(element))
    .find((text) => text === "Easy" || text === "Medium" || text === "Hard");

  return difficultyMatch || "";
}

function normalizeLanguage(language) {
  if (typeof language !== "string") {
    return "";
  }

  const trimmedLanguage = language.trim().replace(/\s+/g, " ");
  return LANGUAGE_ALIASES[trimmedLanguage] || "";
}

function findLanguageInValue(value) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmedValue = value.trim().replace(/\s+/g, " ");

  if (!trimmedValue || trimmedValue.length > 40) {
    return "";
  }

  return normalizeLanguage(trimmedValue);
}

function extractLanguageFromDom() {
  for (const selector of LANGUAGE_SELECTORS) {
    let elements = [];

    try {
      elements = document.querySelectorAll(selector);
    } catch (error) {
      console.warn(`Skipping invalid language selector: ${selector}`, error);
      continue;
    }

    for (const element of elements) {
      const language =
        findLanguageInValue(getElementText(element)) ||
        findLanguageInValue(element.getAttribute("aria-label") || "") ||
        findLanguageInValue(element.getAttribute("title") || "");

      if (language) {
        return language;
      }
    }
  }

  return "";
}

function inferLanguageFromCode(code = "") {
  if (!code.trim()) {
    return "";
  }

  if (/^\s*def\s+\w+\s*\(/m.test(code) || /\bprint\(/.test(code)) {
    return "Python";
  }

  if (/#include\s*</.test(code) || /\bstd::/.test(code) || /\busing namespace std\b/.test(code)) {
    return "C++";
  }

  if (/\bSystem\.out\.println\(/.test(code) || /\bpublic\s+class\b/.test(code)) {
    return "Java";
  }

  if (/\bconsole\.log\(/.test(code) || /\bfunction\s+\w+\s*\(/.test(code)) {
    return "JavaScript";
  }

  if (/\binterface\s+\w+/.test(code) || /:\s*(number|string|boolean|unknown|any)\b/.test(code)) {
    return "TypeScript";
  }

  if (/\bConsole\.WriteLine\(/.test(code) || /\bnamespace\s+\w+/.test(code)) {
    return "C#";
  }

  if (/^\s*func\s+\w+\s*\(/m.test(code) || /\bfmt\./.test(code)) {
    return "Go";
  }

  if (/^\s*fn\s+\w+\s*\(/m.test(code) || /\blet\s+mut\b/.test(code)) {
    return "Rust";
  }

  if (/^\s*<\?php/m.test(code)) {
    return "PHP";
  }

  if (/^\s*puts\s+/m.test(code) || /\bend\s*$/m.test(code)) {
    return "Ruby";
  }

  return "";
}

function extractLanguage(code = "") {
  return extractLanguageFromDom() || inferLanguageFromCode(code) || "Unknown";
}

async function waitForProblemContent(maxAttempts = 8, retryDelayMs = 350) {
  console.log("Waiting for DOM...");
  await waitForDomReady();

  let lastSnapshot = {
    title: "",
    description: "",
    code: "",
    difficulty: "",
    language: "",
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    console.log(`Extracting data attempt ${attempt}`);

    const title = extractTitle();
    const description = extractDescription();
    const code = extractCode();
    const difficulty = extractDifficulty();
    const language = extractLanguage(code);

    lastSnapshot = {
      title: title || "",
      description: description || "",
      code: code || "",
      difficulty: difficulty || "",
      language: language || "",
    };

    if (lastSnapshot.title && lastSnapshot.description) {
      console.log("Extraction success");
      return lastSnapshot;
    }

    if (attempt < maxAttempts) {
      await delay(retryDelayMs);
    }
  }

  console.warn("Extraction failed");

  return {
    title: lastSnapshot.title || document.title || "",
    description: lastSnapshot.description || "",
    code: lastSnapshot.code || "",
    difficulty: lastSnapshot.difficulty || "",
    language: lastSnapshot.language || "",
  };
}

async function getProblemData() {
  console.log("Extracting data");
  const data = await waitForProblemContent();
  console.log("Extraction result", data);

  return {
    title: data.title || document.title || "",
    description: data.description || "",
    code: data.code || "",
    difficulty: data.difficulty || "",
    language: data.language || "",
  };
}

function normalizeAnalysis(data = {}) {
  return {
    analysis: data.analysis || "",
    mistake: data.mistake || "",
    progress: data.progress || "",
    hint1: data.hint1 || "",
    hint2: data.hint2 || "",
    hint3: data.hint3 || "",
  };
}

function sanitizeAttempt(attempt) {
  if (!attempt || typeof attempt !== "object") {
    return null;
  }

  return {
    problem: typeof attempt.problem === "string" ? attempt.problem : "",
    difficulty: typeof attempt.difficulty === "string" ? attempt.difficulty : "",
    hints_used:
      typeof attempt.hints_used === "number" && attempt.hints_used >= 0 && attempt.hints_used <= 3
        ? attempt.hints_used
        : 0,
    attempts: Number.isInteger(attempt.attempts) && attempt.attempts > 0 ? attempt.attempts : 1,
    timestamp: typeof attempt.timestamp === "number" ? attempt.timestamp : 0,
  };
}

function saveAttempts(attempts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
  } catch {
    // Fail silently.
  }
}

function loadAttempts() {
  try {
    const rawAttempts = localStorage.getItem(STORAGE_KEY);

    if (!rawAttempts) {
      return [];
    }

    const parsedAttempts = JSON.parse(rawAttempts);

    if (!Array.isArray(parsedAttempts)) {
      saveAttempts([]);
      return [];
    }

    const sanitizedAttempts = parsedAttempts
      .map((attempt) => sanitizeAttempt(attempt))
      .filter((attempt) => attempt && attempt.problem && attempt.timestamp);
    const dedupedAttempts = [];

    for (const attempt of sanitizedAttempts) {
      const existingAttemptIndex = dedupedAttempts.findIndex(
        (entry) => entry.problem === attempt.problem
      );

      if (existingAttemptIndex === -1) {
        dedupedAttempts.push(attempt);
        continue;
      }

      const existingAttempt = dedupedAttempts[existingAttemptIndex];
      const latestAttempt =
        attempt.timestamp >= existingAttempt.timestamp ? attempt : existingAttempt;

      dedupedAttempts[existingAttemptIndex] = {
        problem: latestAttempt.problem,
        difficulty: latestAttempt.difficulty || existingAttempt.difficulty,
        hints_used: latestAttempt.hints_used,
        attempts: existingAttempt.attempts + attempt.attempts,
        timestamp: latestAttempt.timestamp,
      };
    }

    if (dedupedAttempts.length !== parsedAttempts.length) {
      saveAttempts(dedupedAttempts);
    }

    return dedupedAttempts;
  } catch {
    saveAttempts([]);
    return [];
  }
}

function saveAttempt(problem, difficulty, hintsUsed, timestamp) {
  if (!problem) {
    return loadAttempts();
  }

  const attempts = loadAttempts();
  const existingAttemptIndex = attempts.findIndex((attempt) => attempt.problem === problem);

  if (existingAttemptIndex === -1) {
    attempts.push({
      problem,
      difficulty,
      hints_used: hintsUsed,
      attempts: 1,
      timestamp,
    });
  } else {
    const existingAttempt = attempts[existingAttemptIndex];

    attempts[existingAttemptIndex] = {
      ...existingAttempt,
      difficulty: difficulty || existingAttempt.difficulty,
      hints_used: hintsUsed,
      attempts: existingAttempt.attempts + 1,
      timestamp,
    };
  }

  saveAttempts(attempts);
  return attempts;
}

function updateCurrentAttemptHints(hintsUsed) {
  if (!uiState.currentProblem) {
    return loadAttempts();
  }

  const attempts = loadAttempts();
  const attemptIndex = attempts.findIndex((attempt) => attempt.problem === uiState.currentProblem);

  if (attemptIndex === -1) {
    return attempts;
  }

  attempts[attemptIndex] = {
    ...attempts[attemptIndex],
    hints_used: hintsUsed,
    timestamp: uiState.currentAttemptTimestamp || attempts[attemptIndex].timestamp,
  };

  saveAttempts(attempts);
  return attempts;
}

function calculateAverageHints(totalHintsUsed, totalProblems) {
  if (totalProblems === 0) {
    return 0;
  }

  return Number((totalHintsUsed / totalProblems).toFixed(1));
}

function calculateStats(attempts) {
  const totalProblems = attempts.length;
  const totalHintsUsed = attempts.reduce((sum, attempt) => sum + attempt.hints_used, 0);
  const averageHints = calculateAverageHints(totalHintsUsed, totalProblems);

  return {
    totalProblems,
    totalHintsUsed,
    averageHints,
  };
}

function determineSkillLevel(avgHints, totalProblems) {
  if (totalProblems === 0 || avgHints > 2.5) {
    return "beginner";
  }

  if (avgHints < 1) {
    return "advanced";
  }

  return "intermediate";
}

function buildUserProfile(attempts = loadAttempts()) {
  const stats = calculateStats(attempts);

  return {
    skill_level: determineSkillLevel(stats.averageHints, stats.totalProblems),
    avg_hints: stats.averageHints,
    total_problems: stats.totalProblems,
  };
}

function getMentorStyleInstructions(skillLevel) {
  if (skillLevel === "advanced") {
    return [
      "- Be concise",
      "- Focus on optimization",
      "- Avoid over-explaining",
    ].join("\n");
  }

  if (skillLevel === "intermediate") {
    return [
      "- Give balanced hints",
      "- Use moderate guidance",
    ].join("\n");
  }

  return [
    "- Give more guidance",
    "- Break hints into smaller steps",
    "- Use an encouraging tone",
  ].join("\n");
}

function buildPersonalizedApproach(userProfile, userApproach = "") {
  const sections = [];
  const trimmedApproach = typeof userApproach === "string" ? userApproach.trim() : "";

  if (trimmedApproach) {
    sections.push(trimmedApproach);
  }

  sections.push(
    [
      "User Profile:",
      `- Skill Level: ${userProfile.skill_level}`,
      `- Average Hints Used: ${userProfile.avg_hints}`,
      `- Total Problems: ${userProfile.total_problems}`,
      "",
      "Mentor Guidance:",
      getMentorStyleInstructions(userProfile.skill_level),
    ].join("\n")
  );

  return sections.join("\n\n");
}

function isHintUsageImproving(attempts) {
  const sortedAttempts = [...attempts].sort((a, b) => a.timestamp - b.timestamp);

  if (sortedAttempts.length < 2) {
    return false;
  }

  const midpoint = Math.floor(sortedAttempts.length / 2);
  const earlierAttempts = sortedAttempts.slice(0, midpoint);
  const recentAttempts = sortedAttempts.slice(midpoint);

  if (earlierAttempts.length === 0 || recentAttempts.length === 0) {
    return false;
  }

  return calculateStats(recentAttempts).averageHints < calculateStats(earlierAttempts).averageHints;
}

function getAdaptiveFeedback(attempts, userProfile) {
  if (isHintUsageImproving(attempts)) {
    return "You're improving — using fewer hints 👏";
  }

  if (userProfile.avg_hints > 2.5) {
    return "Try solving with fewer hints to improve";
  }

  return "";
}

function getPanelElements(shadowRoot) {
  return {
    button: shadowRoot.getElementById("cb-analyze"),
    status: shadowRoot.getElementById("cb-status"),
    analysis: shadowRoot.getElementById("cb-analysis"),
    mistake: shadowRoot.getElementById("cb-mistake"),
    progress: shadowRoot.getElementById("cb-progress"),
    feedback: shadowRoot.getElementById("cb-feedback"),
    hintUsage: shadowRoot.getElementById("cb-hint-usage"),
    hint1Button: shadowRoot.getElementById("cb-reveal-hint1"),
    hint2Button: shadowRoot.getElementById("cb-reveal-hint2"),
    hint3Button: shadowRoot.getElementById("cb-reveal-hint3"),
    hint1Block: shadowRoot.getElementById("cb-hint1-block"),
    hint2Block: shadowRoot.getElementById("cb-hint2-block"),
    hint3Block: shadowRoot.getElementById("cb-hint3-block"),
    hint1: shadowRoot.getElementById("cb-hint1"),
    hint2: shadowRoot.getElementById("cb-hint2"),
    hint3: shadowRoot.getElementById("cb-hint3"),
    problemsAttempted: shadowRoot.getElementById("cb-total-problems"),
    totalHintsUsed: shadowRoot.getElementById("cb-total-hints"),
    averageHints: shadowRoot.getElementById("cb-average-hints"),
    historyList: shadowRoot.getElementById("cb-history-list"),
    resetButton: shadowRoot.getElementById("cb-reset-progress"),
  };
}

function setPanelStatus(panel, message) {
  panel.status.textContent = message || "";
}

function setMentorFeedback(panel, message) {
  panel.feedback.textContent = message || "";
  panel.feedback.classList.toggle("cb-hidden", !message);
}

function updateHintUsage(panel) {
  panel.hintUsage.textContent = `Hints used: ${uiState.hintsUsed} / 3`;
}

function resetHintUsage(panel) {
  uiState.hintsUsed = 0;
  updateHintUsage(panel);
}

function renderProgress(panel, attempts = loadAttempts()) {
  const stats = calculateStats(attempts);

  panel.problemsAttempted.textContent = String(stats.totalProblems);
  panel.totalHintsUsed.textContent = String(stats.totalHintsUsed);
  panel.averageHints.textContent = String(stats.averageHints);

  panel.historyList.innerHTML = "";

  const recentAttempts = [...attempts].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

  if (recentAttempts.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "cb-meta";
    emptyState.textContent = "No attempts yet.";
    panel.historyList.appendChild(emptyState);
    return;
  }

  for (const attempt of recentAttempts) {
    const row = document.createElement("div");
    row.className = "cb-history-row";

    const title = document.createElement("span");
    title.className = "cb-section-text";
    title.textContent = `[ ${attempt.problem} ]`;

    const hints = document.createElement("span");
    hints.className = "cb-meta";
    hints.textContent = `Hints: ${attempt.hints_used} | Attempts: ${attempt.attempts}`;

    row.appendChild(title);
    row.appendChild(hints);
    panel.historyList.appendChild(row);
  }
}

function resetHintFlow(panel) {
  panel.hint1Button.classList.add("cb-hidden");
  panel.hint2Button.classList.add("cb-hidden");
  panel.hint3Button.classList.add("cb-hidden");
  panel.hint1Block.classList.add("cb-hidden");
  panel.hint2Block.classList.add("cb-hidden");
  panel.hint3Block.classList.add("cb-hidden");
}

function resetCurrentAttempt(panel) {
  uiState.currentAttemptTimestamp = null;
  uiState.currentProblem = "";
  uiState.currentDifficulty = "";
  resetHintUsage(panel);
  resetHintFlow(panel);
}

function setPanelResults(panel, data = {}) {
  const normalized = normalizeAnalysis(data);

  panel.analysis.textContent = normalized.analysis;
  panel.mistake.textContent = normalized.mistake;
  panel.progress.textContent = normalized.progress;
  panel.hint1.textContent = normalized.hint1;
  panel.hint2.textContent = normalized.hint2;
  panel.hint3.textContent = normalized.hint3;

  resetHintFlow(panel);

  if (normalized.hint1) {
    panel.hint1Button.classList.remove("cb-hidden");
  }
}

function revealHint(panel, level) {
  if (level === 1) {
    uiState.hintsUsed = 1;
    panel.hint1Block.classList.remove("cb-hidden");
    panel.hint1Button.classList.add("cb-hidden");

    if (panel.hint2.textContent.trim()) {
      panel.hint2Button.classList.remove("cb-hidden");
    }
  } else if (level === 2) {
    uiState.hintsUsed = 2;
    panel.hint2Block.classList.remove("cb-hidden");
    panel.hint2Button.classList.add("cb-hidden");

    if (panel.hint3.textContent.trim()) {
      panel.hint3Button.classList.remove("cb-hidden");
    }
  } else {
    uiState.hintsUsed = 3;
    panel.hint3Block.classList.remove("cb-hidden");
    panel.hint3Button.classList.add("cb-hidden");
  }

  updateHintUsage(panel);
  const attempts = updateCurrentAttemptHints(uiState.hintsUsed);
  renderProgress(panel, attempts);
}

function saveCurrentAttempt(panel, title, difficulty) {
  const timestamp = Date.now();
  uiState.currentAttemptTimestamp = timestamp;
  uiState.currentProblem = title;
  uiState.currentDifficulty = difficulty;

  const attempts = saveAttempt(title, difficulty, uiState.hintsUsed, timestamp);
  renderProgress(panel, attempts);
}

function resetStoredProgress(panel) {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Fail silently.
  }

  setMentorFeedback(panel, "");
  renderProgress(panel, []);
}

async function requestAnalysis(panel) {
  panel.button.disabled = true;
  setPanelStatus(panel, "Analyzing...");
  setPanelResults(panel, {});
  setMentorFeedback(panel, "");
  resetCurrentAttempt(panel);

  try {
    const data = await getProblemData();
    const code = data.code.trim();

    if (!data.title || !data.description) {
      setPanelStatus(panel, "Open a LeetCode problem");
      return;
    }

    if (!code) {
      setPanelStatus(panel, "Write some code first");
      return;
    }

    const attempts = loadAttempts();
    const userProfile = buildUserProfile(attempts);
    const adaptiveFeedback = getAdaptiveFeedback(attempts, userProfile);
    const programmingLanguage = data.language || inferLanguageFromCode(code) || "Unknown";

    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        problem: `${data.title}\n${data.description}`,
        user_code: code,
        user_approach: buildPersonalizedApproach(
          userProfile,
          `Programming Language: ${programmingLanguage}`
        ),
      }),
    });

    if (!response.ok) {
      throw new Error("Analysis failed, try again");
    }

    const result = await response.json();
    setPanelResults(panel, result);
    saveCurrentAttempt(panel, data.title, data.difficulty || "");
    setMentorFeedback(panel, adaptiveFeedback);
    setPanelStatus(panel, "");
  } catch (error) {
    console.error("CodeBuddy analysis error:", error);
    setPanelStatus(panel, "Analysis failed, try again");
  } finally {
    panel.button.disabled = false;
  }
}

async function createPanel() {
  await waitForDomReady();

  if (!document.body) {
    await delay(150);
  }

  const existingHost = document.getElementById(PANEL_HOST_ID);
  if (existingHost?.shadowRoot) {
    return getPanelElements(existingHost.shadowRoot);
  }

  const host = document.createElement("div");
  host.id = PANEL_HOST_ID;
  document.body.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: "open" });
  shadowRoot.innerHTML = `
    <style>${PANEL_CSS}</style>
    <div class="cb-panel">
      <div class="cb-stack">
        <section class="cb-card cb-card-hero">
          <p class="cb-eyebrow">Guided Mentor</p>
          <h2 class="cb-title">CodeBuddy &#129504;</h2>
          <p id="cb-status" class="cb-status"></p>
          <button id="cb-analyze" class="cb-button">Analyze Code</button>
        </section>

        <section class="cb-section">
          <h3 class="cb-section-title">Analysis</h3>
          <p id="cb-analysis" class="cb-section-text"></p>
        </section>

        <section class="cb-section">
          <h3 class="cb-section-title">Mistake</h3>
          <p id="cb-mistake" class="cb-section-text"></p>
        </section>

        <section class="cb-section">
          <h3 class="cb-section-title">Progress</h3>
          <p id="cb-progress" class="cb-section-text"></p>
          <p id="cb-feedback" class="cb-feedback cb-hidden"></p>
        </section>

        <section class="cb-section cb-hints">
          <div class="cb-section-header">
            <h3 class="cb-section-title">Hints</h3>
            <p id="cb-hint-usage" class="cb-meta">Hints used: 0 / 3</p>
          </div>

          <button id="cb-reveal-hint1" class="cb-button cb-button-secondary cb-hidden">
            Reveal Hint 1
          </button>
          <div id="cb-hint1-block" class="cb-hint cb-hidden">
            <h4 class="cb-hint-title">Hint 1</h4>
            <p id="cb-hint1" class="cb-section-text"></p>
          </div>

          <button id="cb-reveal-hint2" class="cb-button cb-button-secondary cb-hidden">
            Reveal Hint 2
          </button>
          <div id="cb-hint2-block" class="cb-hint cb-hidden">
            <h4 class="cb-hint-title">Hint 2</h4>
            <p id="cb-hint2" class="cb-section-text"></p>
          </div>

          <button id="cb-reveal-hint3" class="cb-button cb-button-secondary cb-hidden">
            Reveal Hint 3
          </button>
          <div id="cb-hint3-block" class="cb-hint cb-hidden">
            <h4 class="cb-hint-title">Hint 3</h4>
            <p id="cb-hint3" class="cb-section-text"></p>
          </div>
        </section>

        <section class="cb-section">
          <h3 class="cb-section-title">Your Progress</h3>
          <div class="cb-progress-grid">
            <div class="cb-stat-row">
              <span class="cb-meta">Problems Attempted</span>
              <span id="cb-total-problems" class="cb-section-text">0</span>
            </div>
            <div class="cb-stat-row">
              <span class="cb-meta">Total Hints Used</span>
              <span id="cb-total-hints" class="cb-section-text">0</span>
            </div>
            <div class="cb-stat-row">
              <span class="cb-meta">Avg Hints per Problem</span>
              <span id="cb-average-hints" class="cb-section-text">0</span>
            </div>
          </div>
          <div>
            <h4 class="cb-hint-title">Recent Attempts</h4>
            <div id="cb-history-list" class="cb-history-list"></div>
          </div>
          <button id="cb-reset-progress" class="cb-button cb-button-secondary cb-reset">
            Reset Progress
          </button>
        </section>
      </div>
    </div>
  `;

  const panel = getPanelElements(shadowRoot);

  panel.button.addEventListener("click", () => {
    requestAnalysis(panel);
  });

  panel.hint1Button.addEventListener("click", () => {
    revealHint(panel, 1);
  });

  panel.hint2Button.addEventListener("click", () => {
    revealHint(panel, 2);
  });

  panel.hint3Button.addEventListener("click", () => {
    revealHint(panel, 3);
  });

  panel.resetButton.addEventListener("click", () => {
    resetStoredProgress(panel);
  });

  resetCurrentAttempt(panel);
  renderProgress(panel, loadAttempts());
  setPanelStatus(panel, "Ready when you are.");

  return panel;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_DATA") {
    console.log("Message received");

    (async () => {
      const data = await getProblemData();
      sendResponse(data);
    })().catch((error) => {
      console.error("Extraction error:", error);
      sendResponse({
        title: document.title || "",
        description: "",
        code: "",
      });
    });

    return true;
  }
});

(async () => {
  try {
    await createPanel();
  } catch (error) {
    console.error("Failed to create CodeBuddy panel:", error);
  }
})();
