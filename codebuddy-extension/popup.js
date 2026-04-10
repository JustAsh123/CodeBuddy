const BACKEND_URL = "http://localhost:3000/get-hints";
const FETCH_TIMEOUT_MS = 15000;
const PROBLEM_URL_PREFIX = "https://leetcode.com/problems/";
const BUTTON_LABELS = {
  primary: "Analyze Code",
  secondary: "Analyze Again",
  loading: "Analyzing...",
};
const STATUS_MESSAGES = {
  loading: "Analyzing your code...",
  invalidPage: "Open a LeetCode problem to use CodeBuddy.",
  unreadableProblem: "We couldn't read this problem. Refresh the page and try again.",
  noCode: "Write some code before analyzing.",
  apiFailure: "Couldn't analyze your code. Please try again.",
};
const EMPTY_OUTPUT = {
  analysis: "Run an analysis to see what CodeBuddy notices.",
  mistake: "Potential issues will appear here after analysis.",
};
const LANGUAGE_NOTICE =
  "We couldn't confidently detect the editor language, so the feedback may be less precise.";
const SUPPORTED_LANGUAGES = new Set([
  "Python",
  "Java",
  "C++",
  "C",
  "C#",
  "JavaScript",
  "TypeScript",
  "Go",
  "Kotlin",
  "Rust",
  "Swift",
  "PHP",
  "Ruby",
  "Dart",
  "Scala",
]);

const pageInfo = document.getElementById("pageInfo");
const statusEl = document.getElementById("status");
const getHintBtn = document.getElementById("getHintBtn");
const regenerateBtn = document.getElementById("regenerateBtn");
const userApproachEl = document.getElementById("userApproach");
const coachNoteEl = document.getElementById("coachNote");
const hintUsageEl = document.getElementById("hintUsage");
const analysisEl = document.getElementById("analysis");
const mistakeEl = document.getElementById("mistake");
const hint1El = document.getElementById("hint1");
const hint2El = document.getElementById("hint2");
const hint3El = document.getElementById("hint3");
const showHint1Btn = document.getElementById("showHint1");
const showHint2Btn = document.getElementById("showHint2");
const showHint3Btn = document.getElementById("showHint3");
const hint1Box = document.getElementById("hint1Box");
const hint2Box = document.getElementById("hint2Box");
const hint3Box = document.getElementById("hint3Box");
let hintsUsed = 0;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isProblemTab(tab) {
  return Boolean(tab?.id && tab.url?.startsWith(PROBLEM_URL_PREFIX));
}

function isSupportedLanguage(language) {
  return SUPPORTED_LANGUAGES.has(language);
}

function normalizeResult(data = {}) {
  return {
    analysis: hasText(data.analysis) ? data.analysis.trim() : "",
    mistake: hasText(data.mistake) ? data.mistake.trim() : "",
    hint1: hasText(data.hint1) ? data.hint1.trim() : "",
    hint2: hasText(data.hint2) ? data.hint2.trim() : "",
    hint3: hasText(data.hint3) ? data.hint3.trim() : "",
  };
}

function setContentText(element, value, emptyText) {
  const hasValue = hasText(value);
  element.textContent = hasValue ? value.trim() : emptyText;
  element.classList.toggle("empty", !hasValue);
}

function setStatus(message = "") {
  statusEl.textContent = message;
}

function setProblemTitle(title) {
  pageInfo.textContent = title || "Open a LeetCode problem";
}

function setCoachNote(message) {
  coachNoteEl.textContent = message || "";
  coachNoteEl.classList.toggle("hidden", !message);
}

function setOutput(data = {}) {
  const normalized = normalizeResult(data);
  setContentText(analysisEl, normalized.analysis, EMPTY_OUTPUT.analysis);
  setContentText(mistakeEl, normalized.mistake, EMPTY_OUTPUT.mistake);
  hint1El.textContent = normalized.hint1;
  hint2El.textContent = normalized.hint2;
  hint3El.textContent = normalized.hint3;
}

function setLoadingState(isLoading) {
  getHintBtn.disabled = isLoading;
  regenerateBtn.disabled = isLoading;
  getHintBtn.textContent = isLoading ? BUTTON_LABELS.loading : BUTTON_LABELS.primary;
  regenerateBtn.textContent = isLoading ? BUTTON_LABELS.loading : BUTTON_LABELS.secondary;
  getHintBtn.setAttribute("aria-busy", String(isLoading));
  regenerateBtn.setAttribute("aria-busy", String(isLoading));
}

function updateHintUsage() {
  hintUsageEl.textContent = `Hints used: ${hintsUsed}/3`;
}

function incrementHintUsage() {
  hintsUsed = Math.min(3, hintsUsed + 1);
  updateHintUsage();
}

function resetHints() {
  hintsUsed = 0;
  updateHintUsage();
  hint1Box.classList.add("hidden");
  hint2Box.classList.add("hidden");
  hint3Box.classList.add("hidden");
  showHint1Btn.classList.add("hidden");
  showHint2Btn.classList.add("hidden");
  showHint3Btn.classList.add("hidden");
  showHint1Btn.disabled = false;
  showHint2Btn.disabled = false;
  showHint3Btn.disabled = false;
}

function enableHints(data) {
  resetHints();
  regenerateBtn.classList.remove("hidden");

  if (hasText(data.hint1)) {
    showHint1Btn.classList.remove("hidden");
  }
}

function detectPatterns(code) {
  const patterns = [];
  const nestedLoopPattern =
    /(for\s*\([^)]*\)\s*\{[\s\S]{0,400}(for|while)\s*\()|(while\s*\([^)]*\)\s*\{[\s\S]{0,400}(for|while)\s*\()/;
  const repeatedScanningPattern =
    /((for|while)\s*\([^)]*\)[\s\S]{0,250}(\.includes\(|\.indexOf\(|\.find\(|\.filter\(|\.some\(|\.every\())|((\.includes\(|\.indexOf\(|\.find\(|\.filter\(|\.some\(|\.every\().*(\.includes\(|\.indexOf\(|\.find\(|\.filter\(|\.some\(|\.every\())/s;

  if (nestedLoopPattern.test(code)) {
    patterns.push("nested_loop");
  }

  if (repeatedScanningPattern.test(code)) {
    patterns.push("repeated_scanning");
  }

  return patterns;
}

function isPartiallyCorrect(code) {
  const hasStructure = /(function|=>|class\s+)/.test(code);
  const hasLogic = /(if\s*\(|for\s*\(|while\s*\(|return\b)/.test(code);
  return code.trim().length > 60 && hasStructure && hasLogic;
}

function buildCoachMessage(code, detectedPatterns) {
  const closeMessage = isPartiallyCorrect(code)
    ? "You're close. Your structure is there, now focus on tightening the core logic."
    : "";

  if (detectedPatterns.includes("nested_loop")) {
    return closeMessage
      ? `${closeMessage} This looks like O(n^2), can you optimize?`
      : "This looks like O(n^2), can you optimize?";
  }

  return closeMessage;
}

function buildCoachContext(code, language) {
  const detectedPatterns = detectPatterns(code);
  const messages = [];
  const patternMessage = buildCoachMessage(code, detectedPatterns);

  if (patternMessage) {
    messages.push(patternMessage);
  }

  if (!isSupportedLanguage(language)) {
    messages.push(LANGUAGE_NOTICE);
  }

  return {
    detectedPatterns,
    message: messages.join(" "),
  };
}

function getActiveTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(tabs?.[0]);
    });
  });
}

function sendMessageToContent(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(response);
    });
  });
}

function injectContentScript(tabId) {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        files: ["content.js"],
      },
      () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        resolve();
      }
    );
  });
}

async function getTabData(tabId) {
  try {
    return await sendMessageToContent(tabId, { type: "GET_DATA" });
  } catch (error) {
    const message = error.message || "";
    const needsInjection =
      message.includes("Could not establish connection") ||
      message.includes("Receiving end does not exist");

    if (!needsInjection) {
      throw error;
    }

    await injectContentScript(tabId);
    await delay(200);
    return sendMessageToContent(tabId, { type: "GET_DATA" });
  }
}

async function fetchWithTimeout(url, options, timeoutMs = FETCH_TIMEOUT_MS) {
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

async function parseResult(response) {
  try {
    return normalizeResult(await response.json());
  } catch {
    return normalizeResult();
  }
}

async function loadProblemPreview() {
  try {
    const activeTab = await getActiveTab();

    if (!isProblemTab(activeTab)) {
      setProblemTitle("");
      setStatus(STATUS_MESSAGES.invalidPage);
      return;
    }

    const data = await getTabData(activeTab.id);

    if (!hasText(data?.title) || !hasText(data?.description)) {
      setProblemTitle(data?.title || "");
      setStatus(STATUS_MESSAGES.unreadableProblem);
      return;
    }

    setProblemTitle(data.title);
    setStatus("");
  } catch (error) {
    console.error("Preview error:", error);
    setProblemTitle("");
    setStatus(STATUS_MESSAGES.invalidPage);
  }
}

showHint1Btn.addEventListener("click", () => {
  hint1Box.classList.remove("hidden");
  showHint1Btn.disabled = true;
  incrementHintUsage();

  if (hasText(hint2El.textContent)) {
    showHint2Btn.classList.remove("hidden");
  }
});

showHint2Btn.addEventListener("click", () => {
  hint2Box.classList.remove("hidden");
  showHint2Btn.disabled = true;
  incrementHintUsage();

  if (hasText(hint3El.textContent)) {
    showHint3Btn.classList.remove("hidden");
  }
});

showHint3Btn.addEventListener("click", () => {
  hint3Box.classList.remove("hidden");
  showHint3Btn.disabled = true;
  incrementHintUsage();
});

async function requestHints() {
  setLoadingState(true);
  setStatus(STATUS_MESSAGES.loading);
  setOutput({});
  resetHints();
  regenerateBtn.classList.add("hidden");
  setCoachNote("");

  try {
    const activeTab = await getActiveTab();

    if (!isProblemTab(activeTab)) {
      setProblemTitle("");
      setStatus(STATUS_MESSAGES.invalidPage);
      return;
    }

    const data = await getTabData(activeTab.id);

    if (!hasText(data?.title) || !hasText(data?.description)) {
      setProblemTitle(data?.title || "");
      setStatus(STATUS_MESSAGES.unreadableProblem);
      return;
    }

    if (!hasText(data?.code)) {
      setProblemTitle(data.title);
      setStatus(STATUS_MESSAGES.noCode);
      return;
    }

    setProblemTitle(data.title);
    const coachContext = buildCoachContext(data.code, data.language);

    if (coachContext.message) {
      setCoachNote(coachContext.message);
    }

    const response = await fetchWithTimeout(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        problem: `${data.title}\n${data.description}`,
        user_code: data.code,
        user_approach: userApproachEl.value.trim(),
        detected_patterns: coachContext.detectedPatterns,
      }),
    });

    const result = await parseResult(response);

    if (!response.ok) {
      setOutput(result);
      setStatus(STATUS_MESSAGES.apiFailure);
      return;
    }

    setOutput(result);
    enableHints(result);
    setStatus("");
  } catch (error) {
    console.error("Fetch error:", error);
    setOutput({});
    setStatus(STATUS_MESSAGES.apiFailure);
  } finally {
    setLoadingState(false);
  }
}

getHintBtn.addEventListener("click", requestHints);
regenerateBtn.addEventListener("click", requestHints);

setOutput({});
setLoadingState(false);
resetHints();
updateHintUsage();
loadProblemPreview();
