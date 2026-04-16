const BACKEND_URL = "https://code-buddy-six-pearl.vercel.app/get-hints";
const PROBLEM_URL_PREFIX = "https://leetcode.com/problems/";
const ANALYSIS_TIMEOUT_MS = 15000;
const PANEL_HOST_ID = "codebuddy-panel";
const OVERLAY_HOST_ID = "codebuddy-page-overlay";
const STORAGE_KEY = "codebuddy_attempts";

const TITLE_SELECTORS = [
  '[data-cy="question-title"]',
  'main [data-cy="question-title"]',
  'h1 a[href*="/problems/"]',
  "main h1",
  'main [role="heading"]',
];

const DESCRIPTION_SELECTORS = [
  '[data-track-load="description_content"]',
  '[data-key="description-content"]',
  "main article",
  "article",
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

const SUPPORTED_LANGUAGES = new Set(Object.values(LANGUAGE_ALIASES));
const BUTTON_LABELS = {
  idle: "Review my solution",
  loading: "Analyzing…",
};
const STATUS_MESSAGES = {
  loading: "",
  invalidPage: "Open a LeetCode problem page and I can help you there.",
  unreadableProblem:
    "I couldn’t read the problem text. Try a quick refresh and we’ll try again.",
  noCode: "Write a bit of code in the editor first — then I can take a look.",
  apiFailure:
    "Something went wrong on my side. Give it another try in a moment.",
};
const EMPTY_PANEL_RESULTS = {
  analysis:
    "Tap “Review my solution” and I’ll walk through your code with you.",
  mistake:
    "When you’re ready, I’ll share what might be going sideways — gently.",
  progress: "We’ll celebrate what’s working and note what to tighten next.",
};
const PANEL_NOTICES = {
  trust: "AI may occasionally be incorrect. Use hints as guidance.",
  unknownLanguage:
    "We couldn't confidently detect the editor language, so the feedback may be less precise.",
  improving: "You're improving by using fewer hints.",
  fewerHints: "Try solving with fewer hints to keep building confidence.",
};

const PANEL_CSS = `
  :host {
    display: block;
    margin: 0;
    padding: 0;
    border: none;
    overflow: visible;
    pointer-events: none;
    background: transparent;
  }

  * {
    box-sizing: border-box;
  }

  .cb-root {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #e6e6e6;
    line-height: 1.5;
    color-scheme: dark;
  }

  .cb-root > * {
    pointer-events: auto;
  }

  .cb-fab {
    position: fixed;
    right: 20px;
    bottom: 20px;
    width: 52px;
    height: 52px;
    border: none;
    border-radius: 999px;
    background: linear-gradient(145deg, #6c8cff 0%, #5576e6 100%);
    color: #fff;
    cursor: pointer;
    display: grid;
    place-items: center;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.06) inset;
    transition: transform 0.25s ease, box-shadow 0.25s ease, filter 0.25s ease;
  }

  .cb-fab:hover {
    transform: scale(1.06);
    box-shadow: 0 14px 36px rgba(108, 140, 255, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
    filter: brightness(1.05);
  }

  .cb-fab:active {
    transform: scale(0.98);
  }

  .cb-fab:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
    filter: none;
  }

  .cb-fab:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(108, 140, 255, 0.45), 0 10px 28px rgba(0, 0, 0, 0.35);
  }

  .cb-fab svg {
    width: 24px;
    height: 24px;
  }

  .cb-fab-tooltip {
    position: absolute;
    right: 64px;
    bottom: 50%;
    transform: translateY(50%) translateX(6px);
    padding: 8px 12px;
    border-radius: 10px;
    background: #1a1d26;
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #e6e6e6;
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    opacity: 0;
    visibility: hidden;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    transition: opacity 0.22s ease, transform 0.22s ease, visibility 0.22s ease;
    pointer-events: none;
  }

  .cb-fab-wrap {
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 2;
    pointer-events: none;
  }

  .cb-fab-wrap .cb-fab {
    position: static;
    pointer-events: auto;
  }

  .cb-fab-wrap:hover .cb-fab-tooltip,
  .cb-fab-wrap:focus-within .cb-fab-tooltip {
    opacity: 1;
    visibility: visible;
    transform: translateY(50%) translateX(0);
  }

  .cb-drawer {
    position: fixed;
    top: 0;
    right: 0;
    width: min(360px, 100vw);
    height: 100vh;
    max-height: 100dvh;
    background: linear-gradient(165deg, #1e222d 0%, #16181f 50%, #12141a 100%);
    border-left: 1px solid rgba(108, 140, 255, 0.12);
    border-radius: 20px 0 0 20px;
    box-shadow:
      -24px 0 64px rgba(0, 0, 0, 0.55),
      -1px 0 0 rgba(255, 255, 255, 0.04) inset;
    display: flex;
    flex-direction: column;
    transform: translateX(100%);
    transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
    z-index: 1;
    overflow: hidden;
  }

  .cb-root.cb-open .cb-drawer {
    transform: translateX(0);
  }

  @media (max-width: 400px) {
    .cb-drawer {
      border-radius: 0;
      width: 100vw;
    }
  }

  .cb-header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 18px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    background: linear-gradient(180deg, #20242f 0%, #1a1d26 100%);
  }

  .cb-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .cb-brand-mark {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: rgba(108, 140, 255, 0.15);
    border: 1px solid rgba(108, 140, 255, 0.25);
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }

  .cb-brand-mark svg {
    width: 20px;
    height: 20px;
    color: #6c8cff;
  }

  .cb-brand-text {
    min-width: 0;
  }

  .cb-brand-name {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #e6e6e6;
  }

  .cb-brand-tag {
    margin: 2px 0 0;
    font-size: 12px;
    color: #9aa0a6;
    font-weight: 500;
  }

  .cb-icon-btn {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.04);
    color: #9aa0a6;
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
    flex-shrink: 0;
  }

  .cb-icon-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #e6e6e6;
    border-color: rgba(255, 255, 255, 0.12);
  }

  .cb-icon-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(108, 140, 255, 0.45);
  }

  .cb-icon-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .cb-chat {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 16px 18px;
    background: radial-gradient(120% 80% at 100% 0%, rgba(108, 140, 255, 0.06) 0%, transparent 55%), #0f1117;
    scroll-behavior: smooth;
  }

  .cb-chat-messages {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .cb-msg {
    max-width: 100%;
    animation: cb-msg-in 0.28s ease forwards;
    opacity: 0;
    transform: translateY(8px);
  }

  @keyframes cb-msg-in {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .cb-msg-row {
    display: flex;
    gap: 10px;
    align-items: flex-end;
  }

  .cb-msg-row.cb-user {
    flex-direction: row-reverse;
  }

  .cb-avatar {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    font-size: 14px;
  }

  .cb-avatar-ai {
    background: rgba(108, 140, 255, 0.18);
    border: 1px solid rgba(108, 140, 255, 0.28);
  }

  .cb-avatar-user {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .cb-bubble {
    padding: 12px 14px;
    border-radius: 12px;
    font-size: 14px;
    line-height: 1.55;
    word-break: break-word;
    white-space: pre-wrap;
    max-width: calc(100% - 38px);
  }

  .cb-bubble-ai {
    background: #252830;
    border: 1px solid rgba(255, 255, 255, 0.06);
    color: #e6e6e6;
    border-bottom-left-radius: 4px;
  }

  .cb-bubble-user {
    background: #6c8cff;
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-bottom-right-radius: 4px;
    font-weight: 500;
  }

  .cb-bubble-label {
    display: block;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #6c8cff;
    margin-bottom: 6px;
  }

  .cb-bubble-user .cb-bubble-label {
    color: rgba(255, 255, 255, 0.85);
  }

  .cb-bubble.cb-muted {
    color: #9aa0a6;
    font-size: 13px;
  }

  .cb-typing {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 0;
  }

  .cb-typing-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #6c8cff;
    animation: cb-typing 1.1s ease-in-out infinite;
  }

  .cb-typing-dot:nth-child(2) {
    animation-delay: 0.15s;
  }

  .cb-typing-dot:nth-child(3) {
    animation-delay: 0.3s;
  }

  @keyframes cb-typing {
    0%, 60%, 100% {
      transform: translateY(0);
      opacity: 0.35;
    }
    30% {
      transform: translateY(-5px);
      opacity: 1;
    }
  }

  .cb-hint-reveal {
    margin-top: 4px;
    padding: 12px 14px;
    border-radius: 10px;
    background: #14171f;
    border: 1px solid rgba(108, 140, 255, 0.2);
    animation: cb-hint-in 0.32s ease forwards;
    opacity: 0;
    transform: translateY(10px);
  }

  @keyframes cb-hint-in {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .cb-hint-reveal .cb-hint-title {
    margin: 0 0 6px;
    font-size: 12px;
    font-weight: 700;
    color: #6c8cff;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .cb-hint-reveal .cb-section-text {
    margin: 0;
    font-size: 14px;
    color: #e6e6e6;
    line-height: 1.55;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .cb-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 4px;
    max-width: calc(100% - 38px);
    margin-left: 38px;
  }

  .cb-actions.cb-user-offset {
    margin-left: 0;
    margin-right: 38px;
    align-self: flex-end;
    align-items: stretch;
  }

  .cb-button {
    width: 100%;
    border: none;
    border-radius: 10px;
    min-height: 44px;
    padding: 12px 16px;
    background: #6c8cff;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    touch-action: manipulation;
    transition: background 0.22s ease, transform 0.22s ease, opacity 0.22s ease, box-shadow 0.22s ease;
  }

  .cb-button:hover:not(:disabled) {
    background: #7d9aff;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(108, 140, 255, 0.35);
  }

  .cb-button:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(108, 140, 255, 0.35);
  }

  .cb-button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .cb-button-secondary {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #e6e6e6;
  }

  .cb-button-secondary:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    box-shadow: none;
  }

  .cb-composer {
    flex-shrink: 0;
    padding: 14px 18px 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    background: #1a1d26;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .cb-status {
    min-height: 18px;
    margin: 0;
    font-size: 12px;
    color: #9aa0a6;
    line-height: 1.45;
  }

  .cb-note {
    margin: 0;
    font-size: 11px;
    color: #9aa0a6;
    line-height: 1.45;
    text-align: center;
  }

  .cb-footer {
    flex-shrink: 0;
    padding: 0 18px 14px;
    background: #1a1d26;
  }

  .cb-details {
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(15, 17, 23, 0.6);
    overflow: hidden;
  }

  .cb-details summary {
    padding: 10px 12px;
    font-size: 12px;
    font-weight: 600;
    color: #9aa0a6;
    cursor: pointer;
    list-style: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    user-select: none;
    transition: color 0.2s ease, background 0.2s ease;
  }

  .cb-details summary::-webkit-details-marker {
    display: none;
  }

  .cb-details summary:hover {
    color: #e6e6e6;
    background: rgba(255, 255, 255, 0.03);
  }

  .cb-details-body {
    padding: 0 12px 12px;
    display: grid;
    gap: 10px;
  }

  .cb-meta {
    margin: 0;
    font-size: 12px;
    color: #9aa0a6;
    line-height: 1.45;
  }

  .cb-progress-grid {
    display: grid;
    gap: 6px;
  }

  .cb-stat-row,
  .cb-history-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
  }

  .cb-history-row > * {
    min-width: 0;
  }

  .cb-section-text {
    margin: 0;
    font-size: 12px;
    line-height: 1.45;
    color: #e6e6e6;
    word-break: break-word;
  }

  .cb-history-list {
    display: grid;
    gap: 6px;
    max-height: 120px;
    overflow-y: auto;
  }

  .cb-feedback {
    margin: 0;
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(108, 140, 255, 0.12);
    border: 1px solid rgba(108, 140, 255, 0.22);
    color: #c8d4ff;
    font-size: 12px;
    line-height: 1.45;
  }

  .cb-empty {
    color: #9aa0a6;
  }

  .cb-hidden {
    display: none !important;
  }

  .cb-sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .cb-root.cb-ui-locked .cb-drawer button,
  .cb-root.cb-ui-locked .cb-drawer summary,
  .cb-root.cb-ui-locked .cb-fab {
    pointer-events: none;
  }

  .cb-root.cb-ui-locked .cb-analyze {
    pointer-events: none;
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

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isProblemPage() {
  return window.location.href.startsWith(PROBLEM_URL_PREFIX);
}

function isSupportedLanguage(language) {
  return SUPPORTED_LANGUAGES.has(language);
}

function joinMessages(...messages) {
  return messages.filter((message) => hasText(message)).join(" ");
}

function waitForDomReady() {
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
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
    const fallbackBlocks = Array.from(
      document.querySelectorAll("main div, main section"),
    )
      .map((element) => getElementText(element))
      .filter(
        (text) =>
          text.length > 120 && /Example|Constraints|Input|Output/.test(text),
      )
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
  const difficultyMatch = Array.from(
    document.querySelectorAll("main span, main div, main p"),
  )
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

  if (
    /#include\s*</.test(code) ||
    /\bstd::/.test(code) ||
    /\busing namespace std\b/.test(code)
  ) {
    return "C++";
  }

  if (
    /\bSystem\.out\.println\(/.test(code) ||
    /\bpublic\s+class\b/.test(code)
  ) {
    return "Java";
  }

  if (/\bconsole\.log\(/.test(code) || /\bfunction\s+\w+\s*\(/.test(code)) {
    return "JavaScript";
  }

  if (
    /\binterface\s+\w+/.test(code) ||
    /:\s*(number|string|boolean|unknown|any)\b/.test(code)
  ) {
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
    analysis: hasText(data.analysis) ? data.analysis.trim() : "",
    mistake: hasText(data.mistake) ? data.mistake.trim() : "",
    progress: hasText(data.progress) ? data.progress.trim() : "",
    hint1: hasText(data.hint1) ? data.hint1.trim() : "",
    hint2: hasText(data.hint2) ? data.hint2.trim() : "",
    hint3: hasText(data.hint3) ? data.hint3.trim() : "",
  };
}

async function fetchWithTimeout(url, options, timeoutMs = ANALYSIS_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function readAnalysisResponse(response) {
  try {
    return normalizeAnalysis(await response.json());
  } catch {
    return normalizeAnalysis();
  }
}

function sanitizeAttempt(attempt) {
  if (!attempt || typeof attempt !== "object") {
    return null;
  }

  return {
    problem: typeof attempt.problem === "string" ? attempt.problem : "",
    difficulty:
      typeof attempt.difficulty === "string" ? attempt.difficulty : "",
    hints_used:
      typeof attempt.hints_used === "number" &&
      attempt.hints_used >= 0 &&
      attempt.hints_used <= 3
        ? attempt.hints_used
        : 0,
    attempts:
      Number.isInteger(attempt.attempts) && attempt.attempts > 0
        ? attempt.attempts
        : 1,
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
        (entry) => entry.problem === attempt.problem,
      );

      if (existingAttemptIndex === -1) {
        dedupedAttempts.push(attempt);
        continue;
      }

      const existingAttempt = dedupedAttempts[existingAttemptIndex];
      const latestAttempt =
        attempt.timestamp >= existingAttempt.timestamp
          ? attempt
          : existingAttempt;

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
  const existingAttemptIndex = attempts.findIndex(
    (attempt) => attempt.problem === problem,
  );

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
  const attemptIndex = attempts.findIndex(
    (attempt) => attempt.problem === uiState.currentProblem,
  );

  if (attemptIndex === -1) {
    return attempts;
  }

  attempts[attemptIndex] = {
    ...attempts[attemptIndex],
    hints_used: hintsUsed,
    timestamp:
      uiState.currentAttemptTimestamp || attempts[attemptIndex].timestamp,
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
  const totalHintsUsed = attempts.reduce(
    (sum, attempt) => sum + attempt.hints_used,
    0,
  );
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
    return ["- Give balanced hints", "- Use moderate guidance"].join("\n");
  }

  return [
    "- Give more guidance",
    "- Break hints into smaller steps",
    "- Use an encouraging tone",
  ].join("\n");
}

function buildPersonalizedApproach(userProfile, userApproach = "") {
  const sections = [];
  const trimmedApproach =
    typeof userApproach === "string" ? userApproach.trim() : "";

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
    ].join("\n"),
  );

  return sections.join("\n\n");
}

function isHintUsageImproving(attempts) {
  const sortedAttempts = [...attempts].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  if (sortedAttempts.length < 2) {
    return false;
  }

  const midpoint = Math.floor(sortedAttempts.length / 2);
  const earlierAttempts = sortedAttempts.slice(0, midpoint);
  const recentAttempts = sortedAttempts.slice(midpoint);

  if (earlierAttempts.length === 0 || recentAttempts.length === 0) {
    return false;
  }

  return (
    calculateStats(recentAttempts).averageHints <
    calculateStats(earlierAttempts).averageHints
  );
}

function getAdaptiveFeedback(attempts, userProfile) {
  if (isHintUsageImproving(attempts)) {
    return PANEL_NOTICES.improving;
  }

  if (userProfile.avg_hints > 2.5) {
    return PANEL_NOTICES.fewerHints;
  }

  return "";
}

function getLanguageNotice(language) {
  return isSupportedLanguage(language) ? "" : PANEL_NOTICES.unknownLanguage;
}

const CB_ICON_BRAIN = `
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 5a3 3 0 0 0-3 3v1.1a3 3 0 0 0-2 2.8c0 1.2.7 2.2 1.7 2.7-.1.3-.2.7-.2 1.1a3 3 0 0 0 3 3c.5 0 1-.1 1.4-.4.4.3.9.4 1.4.4a3 3 0 0 0 3-3c0-.4-.1-.8-.2-1.1 1-.5 1.7-1.5 1.7-2.7a3 3 0 0 0-2-2.8V8a3 3 0 0 0-3-3Z"/>
    <path d="M9 8V7a3 3 0 0 1 6 0v1"/>
    <path d="M10 18v2M14 18v2"/>
  </svg>
`;

function getPanelElements(shadowRoot) {
  return {
    root: shadowRoot.querySelector(".cb-root"),
    overlay: null,
    drawer: shadowRoot.getElementById("cb-drawer"),
    fab: shadowRoot.getElementById("cb-fab"),
    closeBtn: shadowRoot.getElementById("cb-close"),
    chatMessages: shadowRoot.getElementById("cb-chat-messages"),
    chatScroll: shadowRoot.getElementById("cb-chat-scroll"),
    button: shadowRoot.getElementById("cb-analyze"),
    status: shadowRoot.getElementById("cb-status"),
    feedback: shadowRoot.getElementById("cb-feedback"),
    hintUsage: shadowRoot.getElementById("cb-hint-usage"),
    hintButtonPool: shadowRoot.getElementById("cb-hint-button-pool"),
    hint1Button: shadowRoot.getElementById("cb-reveal-hint1"),
    hint2Button: shadowRoot.getElementById("cb-reveal-hint2"),
    hint3Button: shadowRoot.getElementById("cb-reveal-hint3"),
    hint1: shadowRoot.getElementById("cb-hint1"),
    hint2: shadowRoot.getElementById("cb-hint2"),
    hint3: shadowRoot.getElementById("cb-hint3"),
    problemsAttempted: shadowRoot.getElementById("cb-total-problems"),
    totalHintsUsed: shadowRoot.getElementById("cb-total-hints"),
    averageHints: shadowRoot.getElementById("cb-average-hints"),
    historyList: shadowRoot.getElementById("cb-history-list"),
    resetButton: shadowRoot.getElementById("cb-reset-progress"),
    _loadingNode: null,
    _hintHost: null,
  };
}

function scrollChatToBottom(panel) {
  requestAnimationFrame(() => {
    panel.chatScroll.scrollTop = panel.chatScroll.scrollHeight;
  });
}

function removeTurnMessages(panel) {
  rehomeHintButtons(panel);
  panel._hintHost = null;
  panel.chatMessages
    .querySelectorAll("[data-cb-turn]")
    .forEach((node) => node.remove());
  removeLoadingBubble(panel);
}

function appendUserMessage(panel, text) {
  const wrap = document.createElement("div");
  wrap.className = "cb-msg cb-msg-row cb-user";
  wrap.dataset.cbTurn = "";

  const av = document.createElement("div");
  av.className = "cb-avatar cb-avatar-user";
  av.setAttribute("aria-hidden", "true");
  av.textContent = "You";

  const bubble = document.createElement("div");
  bubble.className = "cb-bubble cb-bubble-user";
  bubble.textContent = text;

  wrap.appendChild(av);
  wrap.appendChild(bubble);
  panel.chatMessages.appendChild(wrap);
  scrollChatToBottom(panel);
}

function appendAiMessage(panel, text, options = {}) {
  const { label = "", isWelcome = false, muted = false } = options;
  const wrap = document.createElement("div");
  wrap.className = "cb-msg cb-msg-row";
  if (!isWelcome) {
    wrap.dataset.cbTurn = "";
  } else {
    wrap.dataset.cbWelcome = "";
  }

  const av = document.createElement("div");
  av.className = "cb-avatar cb-avatar-ai";
  av.setAttribute("aria-hidden", "true");
  av.innerHTML = CB_ICON_BRAIN;

  const bubble = document.createElement("div");
  bubble.className = `cb-bubble cb-bubble-ai${muted ? " cb-muted" : ""}`;

  if (hasText(label)) {
    const lab = document.createElement("span");
    lab.className = "cb-bubble-label";
    lab.textContent = label;
    bubble.appendChild(lab);
  }

  const body = document.createElement("span");
  body.textContent = text;
  bubble.appendChild(body);

  wrap.appendChild(av);
  wrap.appendChild(bubble);
  panel.chatMessages.appendChild(wrap);
  scrollChatToBottom(panel);
}

function showLoadingBubble(panel) {
  removeLoadingBubble(panel);
  const wrap = document.createElement("div");
  wrap.className = "cb-msg cb-msg-row";
  wrap.dataset.cbTurn = "";
  wrap.dataset.cbLoading = "";

  const av = document.createElement("div");
  av.className = "cb-avatar cb-avatar-ai";
  av.setAttribute("aria-hidden", "true");
  av.innerHTML = CB_ICON_BRAIN;

  const bubble = document.createElement("div");
  bubble.className = "cb-bubble cb-bubble-ai cb-muted";
  const label = document.createElement("span");
  label.className = "cb-bubble-label";
  label.textContent = "Analyzing";
  const typing = document.createElement("span");
  typing.className = "cb-typing";
  typing.setAttribute("aria-hidden", "true");
  typing.innerHTML =
    '<span class="cb-typing-dot"></span><span class="cb-typing-dot"></span><span class="cb-typing-dot"></span>';
  const line = document.createElement("div");
  line.appendChild(
    document.createTextNode("Taking a thoughtful look at your solution "),
  );
  line.appendChild(typing);
  bubble.appendChild(label);
  bubble.appendChild(line);

  wrap.appendChild(av);
  wrap.appendChild(bubble);
  panel.chatMessages.appendChild(wrap);
  panel._loadingNode = wrap;
  scrollChatToBottom(panel);
}

function removeLoadingBubble(panel) {
  if (panel._loadingNode?.parentNode) {
    panel._loadingNode.remove();
  }
  panel._loadingNode = null;
  const orphan = panel.chatMessages.querySelector("[data-cb-loading]");
  if (orphan) {
    orphan.remove();
  }
}

function applyPageOverlayBaseStyles(el) {
  Object.assign(el.style, {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    bottom: "0",
    width: "100vw",
    height: "100vh",
    margin: "0",
    padding: "0",
    border: "none",
    boxSizing: "border-box",
    background: "rgba(4, 6, 12, 0.82)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    opacity: "0",
    pointerEvents: "none",
    transition: "opacity 0.3s ease",
    zIndex: "999998",
  });
}

function ensurePageOverlay(panel) {
  if (!panel) {
    return;
  }
  let el = document.getElementById(OVERLAY_HOST_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = OVERLAY_HOST_ID;
    el.setAttribute("aria-hidden", "true");
    applyPageOverlayBaseStyles(el);
    document.body.appendChild(el);
  } else if (el.parentNode !== document.body) {
    document.body.appendChild(el);
  }
  el.onclick = () => setPanelOpen(panel, false);
  panel.overlay = el;
}

function setPanelOpen(panel, open) {
  if (!panel?.root) {
    return;
  }
  panel.root.classList.toggle("cb-open", open);
  if (panel.overlay) {
    panel.overlay.style.opacity = open ? "1" : "0";
    panel.overlay.style.pointerEvents = open ? "auto" : "none";
    panel.overlay.setAttribute("aria-hidden", String(!open));
  }
  if (panel.fab) {
    panel.fab.setAttribute("aria-expanded", String(open));
  }
}

function toggleDrawer(panel) {
  if (!panel?.root) {
    return;
  }
  setPanelOpen(panel, !panel.root.classList.contains("cb-open"));
}

function applyPanelHostSafetyStyles(host) {
  if (!host) {
    return;
  }
  host.style.position = "fixed";
  host.style.right = "20px";
  host.style.bottom = "20px";
  host.style.zIndex = "999999";
  host.style.display = "block";
  host.style.visibility = "visible";
  host.style.opacity = "1";
  host.style.margin = "0";
  host.style.padding = "0";
  host.style.border = "none";
  host.style.outline = "none";
  host.style.background = "transparent";
  host.style.pointerEvents = "none";
  host.style.overflow = "visible";
  host.style.isolation = "isolate";
}

function ensureWelcomeMessage(panel) {
  if (panel.chatMessages.querySelector("[data-cb-welcome]")) {
    return;
  }
  appendAiMessage(
    panel,
    "Hi — I'm CodeBuddy. When you're ready, tap “Review my solution” and I'll go through your code in order: what I see, what to watch for, then hints only if you want them.",
    { isWelcome: true },
  );
}

function setPanelStatus(panel, message) {
  panel.status.textContent = message || "";
}

function setPanelLoading(panel, isLoading) {
  panel.button.disabled = isLoading;
  panel.button.textContent = isLoading
    ? BUTTON_LABELS.loading
    : BUTTON_LABELS.idle;
  panel.button.setAttribute("aria-busy", String(isLoading));
  panel.fab.disabled = isLoading;
  panel.closeBtn.disabled = isLoading;
  panel.root?.classList.toggle("cb-ui-locked", isLoading);
}

function setMentorFeedback(panel, message) {
  panel.feedback.textContent = message || "";
  panel.feedback.classList.toggle("cb-hidden", !hasText(message));
}

function updateHintUsage(panel) {
  panel.hintUsage.textContent = `Hints revealed: ${uiState.hintsUsed} / 3`;
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

  const recentAttempts = [...attempts]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

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
    title.textContent = attempt.problem;

    const hints = document.createElement("span");
    hints.className = "cb-meta";
    hints.textContent = `Hints ${attempt.hints_used} · ${attempt.attempts} run(s)`;

    row.appendChild(title);
    row.appendChild(hints);
    panel.historyList.appendChild(row);
  }
}

function resetHintButtons(panel) {
  panel.hint1Button.classList.add("cb-hidden");
  panel.hint2Button.classList.add("cb-hidden");
  panel.hint3Button.classList.add("cb-hidden");
}

function rehomeHintButtons(panel) {
  panel.hintButtonPool.appendChild(panel.hint1Button);
  panel.hintButtonPool.appendChild(panel.hint2Button);
  panel.hintButtonPool.appendChild(panel.hint3Button);
}

function mountHintHost(panel) {
  rehomeHintButtons(panel);
  if (panel._hintHost) {
    panel._hintHost.remove();
    panel._hintHost = null;
  }
  const wrap = document.createElement("div");
  wrap.className = "cb-msg";
  wrap.dataset.cbTurn = "";

  const intro = document.createElement("div");
  intro.className = "cb-msg-row";
  const av = document.createElement("div");
  av.className = "cb-avatar cb-avatar-ai";
  av.setAttribute("aria-hidden", "true");
  av.innerHTML = CB_ICON_BRAIN;
  const bubble = document.createElement("div");
  bubble.className = "cb-bubble cb-bubble-ai";
  const lab = document.createElement("span");
  lab.className = "cb-bubble-label";
  lab.textContent = "Hints";
  const body = document.createElement("span");
  body.textContent =
    "No pressure — I'll reveal one hint at a time. Tap when you want the next nudge.";
  bubble.appendChild(lab);
  bubble.appendChild(body);
  intro.appendChild(av);
  intro.appendChild(bubble);

  const actions = document.createElement("div");
  actions.className = "cb-actions";
  actions.appendChild(panel.hint1Button);
  actions.appendChild(panel.hint2Button);
  actions.appendChild(panel.hint3Button);

  wrap.appendChild(intro);
  wrap.appendChild(actions);
  panel.chatMessages.appendChild(wrap);
  panel._hintHost = wrap;
  panel.hint1Button.classList.remove("cb-hidden");
  scrollChatToBottom(panel);
}

function resetHintFlow(panel) {
  rehomeHintButtons(panel);
  if (panel._hintHost) {
    panel._hintHost.remove();
    panel._hintHost = null;
  }
  resetHintButtons(panel);
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

  panel.hint1.textContent = normalized.hint1;
  panel.hint2.textContent = normalized.hint2;
  panel.hint3.textContent = normalized.hint3;

  resetHintFlow(panel);

  if (hasText(normalized.hint1)) {
    mountHintHost(panel);
    panel.hint1Button.classList.remove("cb-hidden");
  }
}

async function appendSequentialAnalysis(panel, normalized) {
  const segments = [
    {
      label: "Analysis",
      text: normalized.analysis,
      fallback: EMPTY_PANEL_RESULTS.analysis,
    },
    {
      label: "Mistake",
      text: normalized.mistake,
      fallback: EMPTY_PANEL_RESULTS.mistake,
    },
    {
      label: "Progress",
      text: normalized.progress,
      fallback: EMPTY_PANEL_RESULTS.progress,
    },
  ];

  for (const segment of segments) {
    const value = hasText(segment.text)
      ? segment.text.trim()
      : segment.fallback;
    appendAiMessage(panel, value, { label: segment.label });
    scrollChatToBottom(panel);
    await delay(200);
  }
}

function appendHintBubble(panel, level, text) {
  const wrap = document.createElement("div");
  wrap.className = "cb-msg cb-msg-row";
  wrap.dataset.cbTurn = "";

  const av = document.createElement("div");
  av.className = "cb-avatar cb-avatar-ai";
  av.setAttribute("aria-hidden", "true");
  av.innerHTML = CB_ICON_BRAIN;

  const outer = document.createElement("div");
  outer.style.maxWidth = "calc(100% - 38px)";
  const box = document.createElement("div");
  box.className = "cb-hint-reveal";
  const title = document.createElement("p");
  title.className = "cb-hint-title";
  title.textContent = `Hint ${level}`;
  const p = document.createElement("p");
  p.className = "cb-section-text";
  p.style.fontSize = "14px";
  p.textContent = text;
  box.appendChild(title);
  box.appendChild(p);
  outer.appendChild(box);

  wrap.appendChild(av);
  wrap.appendChild(outer);
  panel.chatMessages.appendChild(wrap);
  scrollChatToBottom(panel);
}

function revealHint(panel, level) {
  const hintEl = panel[`hint${level}`];
  const raw = hintEl?.textContent?.trim() || "";
  if (!raw) {
    return;
  }

  appendHintBubble(panel, level, raw);

  if (level === 1) {
    uiState.hintsUsed = 1;
    panel.hint1Button.classList.add("cb-hidden");
    if (panel.hint2.textContent.trim()) {
      panel.hint2Button.classList.remove("cb-hidden");
    }
  } else if (level === 2) {
    uiState.hintsUsed = 2;
    panel.hint2Button.classList.add("cb-hidden");
    if (panel.hint3.textContent.trim()) {
      panel.hint3Button.classList.remove("cb-hidden");
    }
  } else {
    uiState.hintsUsed = 3;
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
  setPanelOpen(panel, true);
  ensureWelcomeMessage(panel);

  setPanelLoading(panel, true);
  setPanelStatus(panel, "");
  setMentorFeedback(panel, "");
  resetCurrentAttempt(panel);
  setPanelResults(panel, {});
  removeTurnMessages(panel);

  appendUserMessage(panel, "Can you review my solution?");
  showLoadingBubble(panel);

  try {
    const data = await getProblemData();
    const title = typeof data.title === "string" ? data.title.trim() : "";
    const description =
      typeof data.description === "string" ? data.description.trim() : "";
    const code = typeof data.code === "string" ? data.code.trim() : "";

    if (!isProblemPage() || !title) {
      removeLoadingBubble(panel);
      appendAiMessage(panel, STATUS_MESSAGES.invalidPage, { muted: true });
      return;
    }

    if (!description) {
      removeLoadingBubble(panel);
      appendAiMessage(panel, STATUS_MESSAGES.unreadableProblem, {
        muted: true,
      });
      return;
    }

    if (!code) {
      removeLoadingBubble(panel);
      appendAiMessage(panel, STATUS_MESSAGES.noCode, { muted: true });
      return;
    }

    const attempts = loadAttempts();
    const userProfile = buildUserProfile(attempts);
    const adaptiveFeedback = getAdaptiveFeedback(attempts, userProfile);
    const programmingLanguage =
      normalizeLanguage(data.language) ||
      inferLanguageFromCode(code) ||
      "Unknown";
    const languageNotice = getLanguageNotice(programmingLanguage);

    const response = await fetchWithTimeout(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        problem: `${data.title}\n${data.description}`,
        user_code: code,
        user_approach: buildPersonalizedApproach(
          userProfile,
          `Programming Language: ${programmingLanguage}`,
        ),
      }),
    });

    const result = await readAnalysisResponse(response);
    const normalized = normalizeAnalysis(result);

    removeLoadingBubble(panel);

    if (!response.ok) {
      await appendSequentialAnalysis(panel, normalized);
      setPanelResults(panel, result);
      setMentorFeedback(panel, joinMessages(adaptiveFeedback, languageNotice));
      appendAiMessage(panel, STATUS_MESSAGES.apiFailure, { muted: true });
      return;
    }

    await appendSequentialAnalysis(panel, normalized);
    setPanelResults(panel, result);
    saveCurrentAttempt(panel, title, data.difficulty || "");
    setMentorFeedback(panel, joinMessages(adaptiveFeedback, languageNotice));
    setPanelStatus(panel, "");
  } catch (error) {
    console.error("CodeBuddy analysis error:", error);
    removeLoadingBubble(panel);
    appendAiMessage(panel, STATUS_MESSAGES.apiFailure, { muted: true });
    setMentorFeedback(panel, "");
    setPanelResults(panel, {});
  } finally {
    setPanelLoading(panel, false);
  }
}

async function createPanel() {
  await waitForDomReady();

  if (!document.body) {
    await delay(150);
  }

  document.getElementById("codebuddy-panel-host")?.remove();

  let existingHost = document.getElementById(PANEL_HOST_ID);
  if (existingHost?.shadowRoot) {
    const existingRoot = existingHost.shadowRoot.querySelector(".cb-root");
    const existingFab = existingHost.shadowRoot.getElementById("cb-fab");
    if (existingRoot && existingFab) {
      applyPanelHostSafetyStyles(existingHost);
      if (existingHost.parentNode !== document.body) {
        document.body.appendChild(existingHost);
      }
      const existingPanel = getPanelElements(existingHost.shadowRoot);
      ensurePageOverlay(existingPanel);
      applyPanelHostSafetyStyles(existingHost);
      return existingPanel;
    }
    document.getElementById(OVERLAY_HOST_ID)?.remove();
    existingHost.remove();
    existingHost = null;
  }

  document.getElementById(OVERLAY_HOST_ID)?.remove();

  const host = document.createElement("div");
  host.id = PANEL_HOST_ID;
  applyPanelHostSafetyStyles(host);
  document.body.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: "open" });
  shadowRoot.innerHTML = `
    <style>${PANEL_CSS}</style>
    <div class="cb-root">
      <aside id="cb-drawer" class="cb-drawer" role="dialog" aria-label="CodeBuddy assistant">
        <header class="cb-header">
          <div class="cb-brand">
            <div class="cb-brand-mark">${CB_ICON_BRAIN}</div>
            <div class="cb-brand-text">
              <p class="cb-brand-name">CodeBuddy</p>
              <p class="cb-brand-tag">Smart practice partner</p>
            </div>
          </div>
          <button type="button" id="cb-close" class="cb-icon-btn" aria-label="Close assistant">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div id="cb-chat-scroll" class="cb-chat">
          <div id="cb-chat-messages" class="cb-chat-messages" role="log" aria-live="polite" aria-relevant="additions"></div>
        </div>

        <div class="cb-composer">
          <p id="cb-hint-usage" class="cb-meta" style="margin:0;text-align:center">Hints revealed: 0 / 3</p>
          <p id="cb-status" class="cb-status" role="status"></p>
          <button type="button" id="cb-analyze" class="cb-button cb-analyze">Review my solution</button>
          <p class="cb-note">${PANEL_NOTICES.trust}</p>
          <div id="cb-hint-button-pool" class="cb-sr-only" aria-hidden="true">
            <button type="button" id="cb-reveal-hint1" class="cb-button cb-button-secondary cb-hidden">Show hint 1</button>
            <button type="button" id="cb-reveal-hint2" class="cb-button cb-button-secondary cb-hidden">Show hint 2</button>
            <button type="button" id="cb-reveal-hint3" class="cb-button cb-button-secondary cb-hidden">Show hint 3</button>
          </div>
        </div>

        <div class="cb-footer">
          <p id="cb-feedback" class="cb-feedback cb-hidden"></p>
          <details class="cb-details">
            <summary>Your stats &amp; history</summary>
            <div class="cb-details-body">
              <div class="cb-progress-grid">
                <div class="cb-stat-row">
                  <span class="cb-meta">Problems attempted</span>
                  <span id="cb-total-problems" class="cb-section-text">0</span>
                </div>
                <div class="cb-stat-row">
                  <span class="cb-meta">Total hints used</span>
                  <span id="cb-total-hints" class="cb-section-text">0</span>
                </div>
                <div class="cb-stat-row">
                  <span class="cb-meta">Avg hints / problem</span>
                  <span id="cb-average-hints" class="cb-section-text">0</span>
                </div>
              </div>
              <div id="cb-history-list" class="cb-history-list"></div>
              <button type="button" id="cb-reset-progress" class="cb-button cb-button-secondary">Reset progress</button>
            </div>
          </details>
        </div>

        <div class="cb-sr-only">
          <span id="cb-hint1"></span>
          <span id="cb-hint2"></span>
          <span id="cb-hint3"></span>
        </div>
      </aside>

      <div class="cb-fab-wrap">
        <span class="cb-fab-tooltip" role="tooltip">Need help?</span>
        <button
          type="button"
          id="cb-fab"
          class="cb-fab"
          aria-expanded="false"
          aria-controls="cb-drawer"
          aria-label="Need help? Open CodeBuddy"
        >
          ${CB_ICON_BRAIN}
        </button>
      </div>
    </div>
  `;

  const panel = getPanelElements(shadowRoot);
  ensurePageOverlay(panel);
  applyPanelHostSafetyStyles(host);

  const closePanel = () => setPanelOpen(panel, false);

  panel.fab.addEventListener("click", () => {
    toggleDrawer(panel);
  });

  panel.closeBtn.addEventListener("click", () => {
    closePanel();
  });

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

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape" && panel.root?.classList.contains("cb-open")) {
        closePanel();
      }
    },
    true,
  );

  resetCurrentAttempt(panel);
  setPanelResults(panel, {});
  setPanelLoading(panel, false);
  renderProgress(panel, loadAttempts());
  setPanelStatus(panel, "");
  ensureWelcomeMessage(panel);

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
        difficulty: "",
        language: "Unknown",
      });
    });

    return true;
  }
});

function init() {
  console.log("CodeBuddy: init");
  if (document.getElementById(PANEL_HOST_ID)) {
    return;
  }

  (async () => {
    try {
      await createPanel();
      console.log("CodeBuddy: panel created");
    } catch (error) {
      console.error("CodeBuddy: createPanel failed", error);
    }
  })();

  setTimeout(() => {
    if (!document.getElementById(PANEL_HOST_ID)) {
      console.log("Recreating panel...");
      (async () => {
        try {
          await createPanel();
        } catch (error) {
          console.error("CodeBuddy: recreate failed", error);
        }
      })();
    }
  }, 1000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
